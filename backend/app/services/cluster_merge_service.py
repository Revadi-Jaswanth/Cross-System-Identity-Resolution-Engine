# -*- coding: utf-8 -*-
"""
Cluster Merge Service.
Coordinates database transactions, invokes MergePolicy, updates associations, soft-deletes source clusters, and tracks history.
"""

import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app import db
from app.models.identity import IdentityCluster, Identity, MergeHistory
from app.models.user import ActivityLog
from app.repositories import (
    IdentityRepository, IdentityClusterRepository,
    MergeHistoryRepository, AuditRepository
)
from app.services.merge_policy import DefaultMergePolicy, MergePolicy
from app.exceptions import ConflictException

logger = logging.getLogger(__name__)


class MergeResult:
    """
    Standardized payload object returned by the cluster merge service.
    """
    def __init__(self, merge_id: Optional[int], source_cluster_uuid: str,
                 destination_cluster_uuid: str, merged_identity_count: int,
                 execution_time_ms: float, audit_reference: Optional[str],
                 rollback_reference: Optional[str], warnings: List[str], status: str):
        self.merge_id = merge_id
        self.source_cluster_uuid = source_cluster_uuid
        self.destination_cluster_uuid = destination_cluster_uuid
        self.merged_identity_count = merged_identity_count
        self.execution_time_ms = execution_time_ms
        self.audit_reference = audit_reference
        self.rollback_reference = rollback_reference
        self.warnings = warnings
        self.status = status  # COMPLETED, BLOCKED, FAILED

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the merge result to serializable dict format.
        """
        return {
            "merge_id": self.merge_id,
            "source_cluster_uuid": self.source_cluster_uuid,
            "destination_cluster_uuid": self.destination_cluster_uuid,
            "merged_identity_count": self.merged_identity_count,
            "execution_time_ms": self.execution_time_ms,
            "audit_reference": self.audit_reference,
            "rollback_reference": self.rollback_reference,
            "warnings": self.warnings,
            "status": self.status
        }


class ClusterMergeService:
    """
    Service coordinating transactional merges between two IdentityClusters.
    """

    def __init__(self, identity_repo: Optional[IdentityRepository] = None,
                 cluster_repo: Optional[IdentityClusterRepository] = None,
                 merge_policy: Optional[MergePolicy] = None,
                 merge_history_repo: Optional[MergeHistoryRepository] = None,
                 audit_repo: Optional[AuditRepository] = None):
        self.identity_repo = identity_repo or IdentityRepository()
        self.cluster_repo = cluster_repo or IdentityClusterRepository()
        self.merge_policy = merge_policy or DefaultMergePolicy()
        self.merge_history_repo = merge_history_repo or MergeHistoryRepository()
        self.audit_repo = audit_repo or AuditRepository()

    def merge_clusters(self, source_cluster: IdentityCluster, target_cluster: IdentityCluster,
                       confidence_score: float, source_version: int, target_version: int,
                       actor_user_id: int, ip_address: str) -> MergeResult:
        """
        Transactional, optimistic locking protected merge between two clusters.
        Evaluates eligibility, updates identity mapping foreign keys, soft-deletes source, logs history.

        Args:
            source_cluster (IdentityCluster): Cluster to merge from (soft-deleted after merge).
            target_cluster (IdentityCluster): Destination cluster to merge into.
            confidence_score (float): Composite match confidence score.
            source_version (int): Client-submitted optimistic locking version of source cluster.
            target_version (int): Client-submitted optimistic locking version of target cluster.
            actor_user_id (int): Operator user ID executing the action.
            ip_address (str): Operator request IP source.

        Returns:
            MergeResult: Detailed merge results and references.
        """
        start_time = time.perf_counter()

        # Check optimistic locking versions immediately to raise ConflictException
        if source_cluster.version != source_version:
            raise ConflictException("Optimistic locking conflict: source cluster version mismatch.")
        if target_cluster.version != target_version:
            raise ConflictException("Optimistic locking conflict: target cluster version mismatch.")

        # 1. Run Merge Policy check
        decision = self.merge_policy.evaluate(
            source_cluster=source_cluster,
            target_cluster=target_cluster,
            confidence_score=confidence_score,
            source_version=source_version,
            target_version=target_version
        )

        if decision.status in ["BLOCKED", "ROLLBACK_REQUIRED"]:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            logger.warning(f"Merge execution rejected by policy. Status: {decision.status}. Rules: {decision.blocking_rules}")
            return MergeResult(
                merge_id=None,
                source_cluster_uuid=source_cluster.uuid,
                destination_cluster_uuid=target_cluster.uuid,
                merged_identity_count=0,
                execution_time_ms=elapsed,
                audit_reference=None,
                rollback_reference=None,
                warnings=decision.blocking_rules + decision.warnings,
                status=decision.status
            )

        # 2. Database Transactional block (with Rollback support)
        try:
            # Recheck optimistic locking server version fields
            if source_cluster.version != source_version:
                raise ConflictException("Optimistic locking conflict: source cluster has been modified.")
            if target_cluster.version != target_version:
                raise ConflictException("Optimistic locking conflict: target cluster has been modified.")

            # Record initial values snapshot for audit
            old_source_val = {
                "id": source_cluster.id,
                "uuid": source_cluster.uuid,
                "status": source_cluster.status,
                "version": source_cluster.version
            }
            old_target_val = {
                "id": target_cluster.id,
                "uuid": target_cluster.uuid,
                "status": target_cluster.status,
                "version": target_cluster.version
            }

            # Gather all active identities linked to the source cluster
            identities = self.identity_repo.find_by_cluster_id(source_cluster.id)
            merged_count = len(identities)

            # Update identity foreign keys
            for identity in identities:
                identity.cluster_id = target_cluster.id
                identity.updated_by = actor_user_id
                identity.version += 1
                self.identity_repo.save(identity)

            # Update destination cluster status and version
            target_cluster.status = "MATCHED"
            target_cluster.updated_by = actor_user_id
            target_cluster.version += 1
            self.cluster_repo.save(target_cluster)

            # Soft-delete the source cluster
            source_cluster.status = "MERGED"
            source_cluster.deleted_at = datetime.utcnow()
            source_cluster.deleted_by = actor_user_id
            source_cluster.version += 1
            self.cluster_repo.save(source_cluster)

            # Record MergeHistory logging
            history = MergeHistory(
                source_cluster_id=source_cluster.id,
                destination_cluster_id=target_cluster.id,
                source_cluster_uuid=source_cluster.uuid,
                destination_cluster_uuid=target_cluster.uuid,
                merged_identity_count=merged_count,
                status="COMPLETED",
                created_by=actor_user_id
            )
            self.merge_history_repo.save(history)

            # Record audit log trace
            audit_log = self.audit_repo.log_audit(
                action="CLUSTERS_MERGED",
                target_table="identity_clusters",
                target_id=target_cluster.id,
                user_id=actor_user_id,
                old_val={"source": old_source_val, "target": old_target_val},
                new_val={
                    "source": {
                        "id": source_cluster.id,
                        "status": source_cluster.status,
                        "version": source_cluster.version
                    },
                    "target": {
                        "id": target_cluster.id,
                        "status": target_cluster.status,
                        "version": target_cluster.version
                    },
                    "merged_identity_ids": [i.id for i in identities],
                    "merge_history_uuid": history.uuid
                },
                ip_addr=ip_address
            )

            # Record ActivityLog trace
            activity = ActivityLog(
                user_id=actor_user_id,
                activity_type="MERGE_CLUSTERS",
                description=f"Successfully merged cluster {source_cluster.uuid} into {target_cluster.uuid}.",
                ip_address=ip_address
            )
            db.session.add(activity)

            # Commit the session transaction
            db.session.commit()

            elapsed = (time.perf_counter() - start_time) * 1000.0
            logger.info(f"Merged cluster {source_cluster.uuid} into {target_cluster.uuid} successfully.")

            return MergeResult(
                merge_id=history.id,
                source_cluster_uuid=source_cluster.uuid,
                destination_cluster_uuid=target_cluster.uuid,
                merged_identity_count=merged_count,
                execution_time_ms=elapsed,
                audit_reference=str(audit_log.id) if audit_log else None,
                rollback_reference=history.uuid,
                warnings=decision.warnings,
                status="COMPLETED"
            )

        except Exception as err:
            # Transaction Rollback
            db.session.rollback()
            logger.exception(f"Transaction failed during cluster merge: {str(err)}. Rollback triggered.")
            raise err
