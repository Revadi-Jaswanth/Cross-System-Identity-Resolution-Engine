# -*- coding: utf-8 -*-
"""
Resolution Blueprint (Versioned /api/v1/resolution).
Exposes endpoints for matching candidates, batch resolution, explainability, and resolution history.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app.services.resolution_service import IdentityResolutionService
from app.models.user import AuditLog
from app.middleware import rate_limit, require_permission
from app.utils.helpers import HelperUtils

logger = logging.getLogger(__name__)

resolution_bp = Blueprint('resolution_v1', __name__)
resolution_service = IdentityResolutionService()


@resolution_bp.route('/resolve', methods=['POST'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=20, window=60)
def resolve_identity() -> Response:
    """
    Resolves an incoming raw identity payload against existing clusters.
    """
    payload = request.get_json() or {}
    actor_id = current_user.id if current_user else 1

    try:
        res = resolution_service.resolve_identity(
            incoming_payload=payload,
            actor_user_id=actor_id,
            ip_address=request.remote_addr
        )
        return HelperUtils.standard_response(
            success=True,
            message="Identity resolution check executed successfully.",
            data=res
        )
    except Exception as e:
        logger.exception("Resolution failure.")
        return HelperUtils.standard_response(
            success=False,
            message="Failed to execute identity resolution.",
            error={"code": "RESOLUTION_FAILED", "message": str(e)},
            status_code=500
        )


@resolution_bp.route('/resolve/batch', methods=['POST'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=10, window=60)
def batch_resolve_identities() -> Response:
    """
    Batch resolves multiple identity payloads.
    """
    payload = request.get_json() or {}
    records = payload.get("records", [])
    if not isinstance(records, list) or not records:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid payload. 'records' must be a non-empty list array.",
            error={"code": "VALIDATION_ERROR", "message": "records array is required."},
            status_code=400
        )

    actor_id = current_user.id if current_user else 1
    results = []

    for idx, rec in enumerate(records):
        try:
            res = resolution_service.resolve_identity(
                incoming_payload=rec,
                actor_user_id=actor_id,
                ip_address=request.remote_addr
            )
            results.append({"index": idx, "success": True, "result": res})
        except Exception as e:
            results.append({"index": idx, "success": False, "error": str(e)})

    return HelperUtils.standard_response(
        success=True,
        message="Batch resolution completed.",
        data={"results": results}
    )


@resolution_bp.route('/history', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def resolution_history() -> Response:
    """
    Retrieves history logs of identity resolution matching checks.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)

    query = AuditLog.query.filter_by(action="MATCH_RESOLVED")
    pagination = query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    data = {
        "items": [{
            "id": log.id,
            "target_cluster_id": log.target_id,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
            "details": log.new_value
        } for log in pagination.items],
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
        message="Resolution history listed successfully.",
        data=data
    )


@resolution_bp.route('/explain/<string:uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def explain_resolution(uuid_str: str) -> Response:
    """
    Exposes detailed matching traces explanation for a target cluster/identity.
    """
    # Simple check on audit log records matching target cluster
    logs = AuditLog.query.filter_by(action="MATCH_RESOLVED").order_by(AuditLog.created_at.desc()).all()
    matching_log = None
    for log in logs:
        if log.new_value and log.new_value.get("uuid") == uuid_str:
            matching_log = log
            break

    if not matching_log:
        # Fallback to checking by target_id comparison
        return HelperUtils.standard_response(
            success=False,
            message="No resolution logs found matching the requested target cluster.",
            error={"code": "NOT_FOUND", "message": "No match logs available."},
            status_code=404
        )

    return HelperUtils.standard_response(
        success=True,
        message="Resolution matched trace explanation retrieved.",
        data=matching_log.new_value
    )
