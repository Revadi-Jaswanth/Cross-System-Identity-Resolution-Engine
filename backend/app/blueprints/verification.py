# -*- coding: utf-8 -*-
"""
Verification Controller Blueprint (Versioned /api/v1/verification).
Exposes REST endpoints for single/batch verification requests, results, and history.
"""

import logging
import hashlib
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app import db
from app.models.identity import VerificationRequest, VerificationResult, IdentityCluster
from app.services.resolution_service import IdentityResolutionService
from app.middleware import rate_limit, require_permission
from app.utils.helpers import HelperUtils

logger = logging.getLogger(__name__)

verification_bp = Blueprint('verification_v1', __name__)
resolution_service = IdentityResolutionService()


@verification_bp.route('/verify', methods=['POST'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=20, window=60)
def verify_identity() -> Response:
    """
    Submits a single verification check request.
    Uses IdentityResolutionService to compute matching details.
    """
    payload = request.get_json() or {}
    # Simple signature creation from payload string representation
    sig_input = str(payload).encode('utf-8')
    sig = hashlib.sha256(sig_input).hexdigest()

    org_id = payload.get("organization_id")
    if not org_id:
        return HelperUtils.standard_response(
            success=False,
            message="Missing required parameter: 'organization_id'.",
            error={"code": "VALIDATION_ERROR", "message": "organization_id is required."},
            status_code=400
        )

    actor_id = current_user.id if current_user else 1

    try:
        # 1. Resolve match details using matching engine
        res = resolution_service.resolve_identity(
            incoming_payload=payload,
            actor_user_id=actor_id,
            ip_address=request.remote_addr
        )

        # 2. Record VerificationRequest and VerificationResult entries
        status = "COMPLETED"
        if res["decision"] == "NEW_CLUSTER":
            status = "FAILED"

        req = VerificationRequest(
            organization_id=org_id,
            requested_by=actor_id,
            status=status,
            request_signature=sig,
            created_by=actor_id
        )
        db.session.add(req)
        db.session.flush()

        matched_id = None
        if res["cluster_uuid"]:
            c = IdentityCluster.query.filter_by(uuid=res["cluster_uuid"]).first()
            if c:
                matched_id = c.id

        result_entry = VerificationResult(
            verification_request_id=req.id,
            matched_cluster_id=matched_id,
            match_score=res["confidence_score"],
            matched_attributes=",".join(res["matched_fields"])
        )
        db.session.add(result_entry)
        db.session.commit()

        data = {
            "request_uuid": req.uuid,
            "result_uuid": result_entry.uuid,
            "status": req.status,
            "match_score": float(result_entry.match_score) if result_entry.match_score else 0.0,
            "matched_attributes": result_entry.matched_attributes,
            "resolution_payload": res
        }

        return HelperUtils.standard_response(
            success=True,
            message="Verification check executed successfully.",
            data=data
        )

    except Exception as e:
        db.session.rollback()
        logger.exception("Verification request failed.")
        return HelperUtils.standard_response(
            success=False,
            message="Failed to process verification request.",
            error={"code": "VERIFICATION_FAILED", "message": str(e)},
            status_code=500
        )


@verification_bp.route('/verify/batch', methods=['POST'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=10, window=60)
def batch_verify_identities() -> Response:
    """
    Submits a batch of verification request payloads.
    """
    payload = request.get_json() or {}
    records = payload.get("records", [])
    org_id = payload.get("organization_id")

    if not org_id:
        return HelperUtils.standard_response(
            success=False,
            message="Missing required parameter: 'organization_id'.",
            error={"code": "VALIDATION_ERROR", "message": "organization_id is required."},
            status_code=400
        )

    if not isinstance(records, list) or not records:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid payload. 'records' must be a non-empty array list.",
            error={"code": "VALIDATION_ERROR", "message": "records array is required."},
            status_code=400
        )

    actor_id = current_user.id if current_user else 1
    results = []

    for idx, rec in enumerate(records):
        try:
            # Re-inject organization_id
            rec["organization_id"] = org_id
            sig_input = str(rec).encode('utf-8')
            sig = hashlib.sha256(sig_input).hexdigest()

            res = resolution_service.resolve_identity(
                incoming_payload=rec,
                actor_user_id=actor_id,
                ip_address=request.remote_addr
            )

            status = "COMPLETED"
            if res["decision"] == "NEW_CLUSTER":
                status = "FAILED"

            req = VerificationRequest(
                organization_id=org_id,
                requested_by=actor_id,
                status=status,
                request_signature=sig,
                created_by=actor_id
            )
            db.session.add(req)
            db.session.flush()

            matched_id = None
            if res["cluster_uuid"]:
                c = IdentityCluster.query.filter_by(uuid=res["cluster_uuid"]).first()
                if c:
                    matched_id = c.id

            result_entry = VerificationResult(
                verification_request_id=req.id,
                matched_cluster_id=matched_id,
                match_score=res["confidence_score"],
                matched_attributes=",".join(res["matched_fields"])
            )
            db.session.add(result_entry)
            
            results.append({
                "index": idx,
                "request_uuid": req.uuid,
                "status": req.status,
                "match_score": float(result_entry.match_score) if result_entry.match_score else 0.0,
                "resolution": res
            })
        except Exception as e:
            results.append({"index": idx, "success": False, "error": str(e)})

    db.session.commit()

    return HelperUtils.standard_response(
        success=True,
        message="Batch verification request processed.",
        data={"results": results}
    )


@verification_bp.route('/requests/<string:uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def get_verification_details(uuid_str: str) -> Response:
    """
    Retrieves verification request details and results by request UUID.
    """
    req = VerificationRequest.query.filter_by(uuid=uuid_str).first()
    if not req:
        return HelperUtils.standard_response(
            success=False,
            message="Verification request not found.",
            error={"code": "NOT_FOUND", "message": "Request UUID does not exist."},
            status_code=404
        )

    data = {
        "uuid": req.uuid,
        "organization_id": req.organization_id,
        "requested_by": req.requested_by,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
        "results": [{
            "uuid": res.uuid,
            "matched_cluster_id": res.matched_cluster_id,
            "match_score": float(res.match_score) if res.match_score else 0.0,
            "matched_attributes": res.matched_attributes,
            "created_at": res.created_at.isoformat()
        } for res in req.results]
    }

    return HelperUtils.standard_response(
        success=True,
        message="Verification request details retrieved.",
        data=data
    )


@verification_bp.route('/history', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def verification_history() -> Response:
    """
    Retrieves listing of verification requests log.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)

    query = VerificationRequest.query
    pagination = query.order_by(VerificationRequest.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    data = {
        "items": [{
            "uuid": req.uuid,
            "organization_id": req.organization_id,
            "requested_by": req.requested_by,
            "status": req.status,
            "created_at": req.created_at.isoformat()
        } for req in pagination.items],
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
        message="Verification history retrieved.",
        data=data
    )
