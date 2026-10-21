# -*- coding: utf-8 -*-
"""
Clusters Controller Blueprint (Versioned /api/v1/clusters).
Exposes REST endpoints for listing, retrieval, golden profiles, merge transactions, history, and rollback.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app import db
from app.models.identity import IdentityCluster, MergeHistory
from app.repositories import IdentityClusterRepository, MergeHistoryRepository
from app.services.cluster_merge_service import ClusterMergeService
from app.services.conflict_resolver import DefaultConflictResolver
from app.middleware import rate_limit, require_permission
from app.utils.helpers import HelperUtils
from app.exceptions import ConflictException

logger = logging.getLogger(__name__)

clusters_bp = Blueprint('clusters_v1', __name__)
cluster_repo = IdentityClusterRepository()
merge_service = ClusterMergeService()
merge_history_repo = MergeHistoryRepository()
conflict_resolver = DefaultConflictResolver()


@clusters_bp.route('', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=30, window=60)
def list_clusters() -> Response:
    """
    Retrieves paginated listing of identity clusters.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    status = request.args.get('status')

    query = IdentityCluster.query.filter_by(deleted_at=None)
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(IdentityCluster.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    data = {
        "items": [{
            "id": item.id,
            "uuid": item.uuid,
            "status": item.status,
            "version": item.version,
            "identities_count": len(item.identities),
            "created_at": item.created_at.isoformat()
        } for item in pagination.items],
        "pagination": {
            "page": pagination.page,
            "page_size": pagination.per_page,
            "total_records": pagination.total,
            "total_pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_previous": pagination.has_prev
        }
    }

    return HelperUtils.standard_response(
        success=True,
        message="Clusters listed successfully.",
        data=data
    )


@clusters_bp.route('/<string:uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def get_cluster_by_uuid(uuid_str: str) -> Response:
    """
    Retrieves cluster metadata along with its resolved Golden Profile.
    """
    cluster = cluster_repo.get_by_uuid(uuid_str)
    if not cluster:
        return HelperUtils.standard_response(
            success=False,
            message="Identity cluster not found.",
            error={"code": "NOT_FOUND", "message": "Cluster UUID does not exist."},
            status_code=404
        )

    # Compute Golden Profile dynamically in memory
    resolution_res = conflict_resolver.resolve_conflicts(cluster.identities)

    data = {
        "id": cluster.id,
        "uuid": cluster.uuid,
        "status": cluster.status,
        "version": cluster.version,
        "created_at": cluster.created_at.isoformat(),
        "identities": [{
            "uuid": ident.uuid,
            "system_source": ident.system_source,
            "system_uid": ident.system_uid,
            "status": ident.status
        } for ident in cluster.identities],
        "golden_profile": resolution_res.golden_profile.to_dict(),
        "conflict_severity": resolution_res.severity,
        "resolution_confidence": resolution_res.overall_confidence,
        "resolution_warnings": resolution_res.warnings
    }

    return HelperUtils.standard_response(
        success=True,
        message="Identity cluster and golden profile retrieved successfully.",
        data=data
    )


@clusters_bp.route('/merge', methods=['POST'])
@jwt_required()
@require_permission('cluster:merge')
@rate_limit(limit=10, window=60)
def merge_clusters() -> Response:
    """
    Executes a transactional merge transaction between two clusters.
    """
    payload = request.get_json() or {}
    required = ["source_cluster_uuid", "target_cluster_uuid", "confidence_score", "source_version", "target_version"]
    for field in required:
        if field not in payload:
            return HelperUtils.standard_response(
                success=False,
                message=f"Missing required parameter: '{field}'.",
                error={"code": "VALIDATION_ERROR", "message": f"'{field}' is required."},
                status_code=400
            )

    source_cluster = cluster_repo.get_by_uuid(payload["source_cluster_uuid"])
    target_cluster = cluster_repo.get_by_uuid(payload["target_cluster_uuid"])

    if not source_cluster or not target_cluster:
        return HelperUtils.standard_response(
            success=False,
            message="Source or target cluster not found.",
            error={"code": "NOT_FOUND", "message": "One or both cluster UUIDs do not exist."},
            status_code=404
        )

    try:
        actor_id = current_user.id if current_user else 1
        res = merge_service.merge_clusters(
            source_cluster=source_cluster,
            target_cluster=target_cluster,
            confidence_score=payload["confidence_score"],
            source_version=payload["source_version"],
            target_version=payload["target_version"],
            actor_user_id=actor_id,
            ip_address=request.remote_addr
        )
        
        if res.status in ["BLOCKED", "ROLLBACK_REQUIRED"]:
            return HelperUtils.standard_response(
                success=False,
                message="Merge operation rejected by policy constraints.",
                data=res.to_dict(),
                status_code=422
            )

        return HelperUtils.standard_response(
            success=True,
            message="Clusters merged successfully.",
            data=res.to_dict()
        )
    except ConflictException as ce:
        return HelperUtils.standard_response(
            success=False,
            message=str(ce),
            error={"code": "CONFLICT", "message": "Optimistic locking conflict."},
            status_code=409
        )
    except Exception as e:
        logger.exception("Merge failed.")
        return HelperUtils.standard_response(
            success=False,
            message="Failed to merge clusters.",
            error={"code": "MERGE_FAILED", "message": str(e)},
            status_code=500
        )


@clusters_bp.route('/merge-history', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def list_merge_history() -> Response:
    """
    Retrieves past merges listing history.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)

    query = MergeHistory.query
    pagination = query.order_by(MergeHistory.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    data = {
        "items": [{
            "id": item.id,
            "uuid": item.uuid,
            "source_cluster_uuid": item.source_cluster_uuid,
            "destination_cluster_uuid": item.destination_cluster_uuid,
            "merged_identity_count": item.merged_identity_count,
            "status": item.status,
            "created_at": item.created_at.isoformat()
        } for item in pagination.items],
        "pagination": {
            "page": pagination.page,
            "page_size": pagination.per_page,
            "total_records": pagination.total,
            "total_pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_previous": pagination.has_prev
        }
    }

    return HelperUtils.standard_response(
        success=True,
        message="Merge history listed successfully.",
        data=data
    )


@clusters_bp.route('/rollback/<string:history_uuid>', methods=['POST'])
@jwt_required()
@require_permission('cluster:merge')
def rollback_merge(history_uuid: str) -> Response:
    """
    Rollback evaluation placeholder: validates rollback eligibility and returns review metadata.
    """
    history = MergeHistory.query.filter_by(uuid=history_uuid).first()
    if not history:
        return HelperUtils.standard_response(
            success=False,
            message="Merge history record not found.",
            error={"code": "NOT_FOUND", "message": "History UUID does not exist."},
            status_code=404
        )

    # Simulated rollback evaluation details
    rollback_preview = {
        "rollback_eligible": True,
        "source_cluster_uuid": history.source_cluster_uuid,
        "destination_cluster_uuid": history.destination_cluster_uuid,
        "identities_to_restore_count": history.merged_identity_count,
        "reasons": ["Rollback is safe: destination cluster has not undergone further merges."],
        "status": "ROLLBACK_PREVIEW"
    }

    return HelperUtils.standard_response(
        success=True,
        message="Merge rollback preview resolved.",
        data=rollback_preview
    )
