# -*- coding: utf-8 -*-
"""
Merge Policy Engine.
Evaluates merge eligibility, checks validation constraints, determines risk levels, and returns MergeDecisions.
"""

import time
import logging
from typing import List, Dict, Any, Optional

from app.models.identity import IdentityCluster
from app.models.user import AuditLog, SystemSetting
from app.config import Config

logger = logging.getLogger(__name__)


class MergeDecision:
    """
    Standardized payload object returned by every merge policy evaluation.
    """
    def __init__(self, status: str, risk_level: str, confidence_score: float,
                 is_eligible: bool, blocking_rules: List[str], warnings: List[str],
                 reasons: List[str], policy_name: str = "DefaultMergePolicy",
                 score_model_version: str = "v1"):
        self.status = status  # AUTO_MERGE, HIGH_CONFIDENCE_REVIEW, MANUAL_REVIEW, BLOCKED, ROLLBACK_REQUIRED
        self.risk_level = risk_level  # LOW_RISK, MEDIUM_RISK, HIGH_RISK
        self.confidence_score = confidence_score
        self.is_eligible = is_eligible
        self.blocking_rules = blocking_rules
        self.warnings = warnings
        self.reasons = reasons
        self.policy_name = policy_name
        self.score_model_version = score_model_version

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the merge decision to serializable dict format.
        """
        return {
            "status": self.status,
            "risk_level": self.risk_level,
            "confidence_score": self.confidence_score,
            "is_eligible": self.is_eligible,
            "blocking_rules": self.blocking_rules,
            "warnings": self.warnings,
            "reasons": self.reasons,
            "policy_name": self.policy_name,
            "score_model_version": self.score_model_version
        }


class MergePolicy:
    """
    Interface specifying core contract for merge evaluation.
    """
    def evaluate(self, source_cluster: IdentityCluster, target_cluster: IdentityCluster,
                 confidence_score: float, source_version: int, target_version: int) -> MergeDecision:
        """
        Evaluates merge eligibility between two clusters without modifying data.
        """
        raise NotImplementedError()


class DefaultMergePolicy(MergePolicy):
    """
    Concrete implementation of MergePolicy checking constraints, circular references, risk levels, and thresholds.
    """

    def __init__(self):
        self.policy_name = "DefaultMergePolicy"
        self.score_model_version = "v1"

    def _load_setting(self, key: str, default: Any) -> Any:
        """
        Loads merge configuration options from database system_settings table.
        """
        try:
            setting = SystemSetting.query.filter_by(setting_key=key).first()
            if setting and setting.setting_value:
                if isinstance(default, float):
                    return float(setting.setting_value)
                if isinstance(default, bool):
                    return setting.setting_value.lower() in ('true', '1', 't')
                return setting.setting_value
        except Exception:
            pass
        return default

    def _check_circular_merge(self, source_id: int, target_id: int) -> bool:
        """
        Circular merge detection: queries database audit history to see if target was previously merged from source.
        """
        try:
            # Query AuditLog to find if a reverse merge occurred previously (target merged into source)
            match_str_into = f'"merged_into_id": {source_id}'
            match_str_from = f'"merged_from_id": {target_id}'
            
            log = AuditLog.query.filter(
                AuditLog.target_table == 'identity_clusters',
                AuditLog.action == 'CLUSTERS_MERGED',
                AuditLog.new_value.like(f"%{match_str_into}%"),
                AuditLog.old_value.like(f"%{match_str_from}%")
            ).first()
            if log:
                return True
        except Exception:
            pass
        return False

    def evaluate(self, source_cluster: IdentityCluster, target_cluster: IdentityCluster,
                 confidence_score: float, source_version: int, target_version: int) -> MergeDecision:
        start_time = time.perf_counter()
        
        # 1. Load Thresholds & Rules configurations
        auto_threshold = self._load_setting("merge_auto_threshold", Config.MERGE_AUTO_THRESHOLD)
        review_threshold = self._load_setting("merge_review_threshold", Config.MERGE_REVIEW_THRESHOLD)
        allow_cross_org = self._load_setting("merge_allow_cross_org", Config.MERGE_ALLOW_CROSS_ORG)

        blocking_rules = []
        warnings = []
        reasons = []

        # Rule 1: Self-merge check
        if source_cluster.id == target_cluster.id:
            blocking_rules.append("SELF_MERGE_BLOCKED")
            reasons.append("Source and target clusters represent the exact same entity instance.")

        # Rule 2: Archived and Deleted statuses check
        inactive_states = ["ARCHIVED", "DELETED"]
        if source_cluster.status in inactive_states or target_cluster.status in inactive_states:
            blocking_rules.append("INACTIVE_CLUSTER_MERGE_BLOCKED")
            reasons.append(f"Merge target/source cluster has inactive status (Source: {source_cluster.status}, Target: {target_cluster.status}).")

        # Rule 3: Version mismatch check (Optimistic locking validation)
        if source_cluster.version != source_version or target_cluster.version != target_version:
            blocking_rules.append("VERSION_MISMATCH_BLOCKED")
            reasons.append(f"Cluster version conflict. Source Client Version: {source_version} vs Server Version: {source_cluster.version}; Target Client Version: {target_version} vs Server Version: {target_cluster.version}.")

        # Rule 4: Circular merge check
        if self._check_circular_merge(source_cluster.id, target_cluster.id):
            blocking_rules.append("CIRCULAR_MERGE_BLOCKED")
            reasons.append(f"Circular reference detected: target cluster '{target_cluster.id}' was previously merged from source cluster '{source_cluster.id}'.")

        # Rule 5: Unique Identifiers Mismatches Check
        # Gather distinct unique hashes from both clusters' raw identities list
        source_hashes = {"aadhaar": set(), "abha": set(), "digilocker": set()}
        target_hashes = {"aadhaar": set(), "abha": set(), "digilocker": set()}

        for identity in source_cluster.identities:
            if identity.aadhaar_hash: source_hashes["aadhaar"].add(identity.aadhaar_hash)
            if identity.abha_hash: source_hashes["abha"].add(identity.abha_hash)
            if identity.digilocker_hash: source_hashes["digilocker"].add(identity.digilocker_hash)

        for identity in target_cluster.identities:
            if identity.aadhaar_hash: target_hashes["aadhaar"].add(identity.aadhaar_hash)
            if identity.abha_hash: target_hashes["abha"].add(identity.abha_hash)
            if identity.digilocker_hash: target_hashes["digilocker"].add(identity.digilocker_hash)

        for identifier_name in ["aadhaar", "abha", "digilocker"]:
            common = source_hashes[identifier_name].intersection(target_hashes[identifier_name])
            # If both clusters have values for this unique hash, but no overlap -> mismatch conflict!
            if source_hashes[identifier_name] and target_hashes[identifier_name] and not common:
                blocking_rules.append(f"UNIQUE_ID_MISMATCH_{identifier_name.upper()}_BLOCKED")
                reasons.append(f"Conflicting values detected for unique identifier '{identifier_name}'.")

        # Rule 6: Cross-Organization boundary validations
        source_orgs = {id_rec.organization_id for id_rec in source_cluster.identities}
        target_orgs = {id_rec.organization_id for id_rec in target_cluster.identities}
        is_cross_org = len(source_orgs.union(target_orgs)) > 1

        if is_cross_org:
            if not allow_cross_org:
                blocking_rules.append("CROSS_ORGANIZATION_MERGE_BLOCKED")
                reasons.append("Cross-organization merges are administratively disabled.")
            else:
                warnings.append("Merge crosses organization/tenant boundaries.")

        # Determine Eligibility
        is_eligible = len(blocking_rules) == 0

        # Rollback check: If source/target status is already MERGED
        if source_cluster.status == "MERGED" or target_cluster.status == "MERGED":
            status = "ROLLBACK_REQUIRED"
            risk_level = "HIGH_RISK"
            is_eligible = False
            blocking_rules.append("CLUSTER_ALREADY_MERGED_BLOCKED")
            reasons.append("One or both clusters are in a 'MERGED' state. Manual rollback may be required.")
        elif not is_eligible:
            status = "BLOCKED"
            risk_level = "HIGH_RISK"
        else:
            # Risk Evaluation Classifier
            if is_cross_org or confidence_score < auto_threshold or source_cluster.status == "LOCKED" or target_cluster.status == "LOCKED":
                risk_level = "MEDIUM_RISK"
            else:
                risk_level = "LOW_RISK"

            # Warnings check
            if source_cluster.status == "LOCKED" or target_cluster.status == "LOCKED":
                warnings.append("Evaluating merge on a cluster with LOCKED status restriction.")

            # Resolve Decision Status State
            if confidence_score >= auto_threshold and risk_level == "LOW_RISK":
                status = "AUTO_MERGE"
                reasons.append("Fuzzy/exact match score exceeds auto-merge threshold with low risks.")
            elif confidence_score >= auto_threshold and risk_level == "MEDIUM_RISK":
                status = "HIGH_CONFIDENCE_REVIEW"
                reasons.append("High confidence match contains warnings or cross-org boundary risk factors.")
            elif confidence_score >= review_threshold:
                status = "MANUAL_REVIEW"
                reasons.append("Moderate match score requires human verification.")
            else:
                status = "BLOCKED"
                risk_level = "HIGH_RISK"
                is_eligible = False
                blocking_rules.append("LOW_CONFIDENCE_SCORE_BLOCKED")
                reasons.append(f"Confidence score {confidence_score:.1f}% is below the review threshold of {review_threshold:.1f}%.")

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        logger.info(f"MergePolicy evaluation finished in {elapsed_ms:.2f} ms. Status: {status}, Risk: {risk_level}")

        return MergeDecision(
            status=status,
            risk_level=risk_level,
            confidence_score=confidence_score,
            is_eligible=is_eligible,
            blocking_rules=blocking_rules,
            warnings=warnings,
            reasons=reasons,
            policy_name=self.policy_name,
            score_model_version=self.score_model_version
        )
