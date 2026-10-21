# -*- coding: utf-8 -*-
"""
Identities Controller Blueprint (Versioned /api/v1/identities).
Exposes REST endpoints for single/bulk ingestion, retrieval, listing, updates, and soft deletions.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app import db
from app.models.identity import Identity
from app.repositories import IdentityRepository
from app.services.identity_service import IdentityService
from app.middleware import rate_limit, require_permission
from app.utils.helpers import HelperUtils

logger = logging.getLogger(__name__)

identity_bp = Blueprint('identity_v1', __name__)
identity_service = IdentityService()
identity_repo = IdentityRepository()


@identity_bp.route('/ingest', methods=['POST'])
@jwt_required()
@require_permission('identity:write')
@rate_limit(limit=20, window=60)
def ingest_identity() -> Response:
    """
    Ingests and registers a single raw identity payload.
    """
    payload = request.get_json() or {}
    # Basic payload validation
    required = ["system_source", "system_uid", "organization_id"]
    for field in required:
        if field not in payload:
            return HelperUtils.standard_response(
                success=False,
                message=f"Missing required parameter: '{field}'.",
                error={"code": "VALIDATION_ERROR", "message": f"'{field}' is required."},
                status_code=400
            )

    try:
        actor_id = current_user.id if current_user else 1
        res = identity_service.ingest_record(
            raw_record_payload=payload,
            actor_user_id=actor_id,
            ip_address=request.remote_addr
        )
        return HelperUtils.standard_response(
            success=True,
            message="Identity record ingested and resolved successfully.",
            data=res["data"],
            status_code=201
        )
    except Exception as e:
        logger.exception("Ingest failed.")
        return HelperUtils.standard_response(
            success=False,
            message="Failed to ingest identity record.",
            error={"code": "INGEST_FAILED", "message": str(e)},
            status_code=500
        )


@identity_bp.route('/ingest/bulk', methods=['POST'])
@jwt_required()
@require_permission('identity:write')
@rate_limit(limit=10, window=60)
def bulk_ingest_identities() -> Response:
    """
    Ingests multiple identity records in bulk.
    """
    payload = request.get_json() or {}
    records = payload.get("records", [])
    if not isinstance(records, list) or not records:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid payload. 'records' must be a non-empty array list.",
            error={"code": "VALIDATION_ERROR", "message": "records array is required."},
            status_code=400
        )

    processed = 0
    failed_records = []
    actor_id = current_user.id if current_user else 1

    for idx, rec in enumerate(records):
        try:
            identity_service.ingest_record(
                raw_record_payload=rec,
                actor_user_id=actor_id,
                ip_address=request.remote_addr
            )
            processed += 1
        except Exception as e:
            failed_records.append({"index": idx, "error": str(e)})

    summary = {
        "total": len(records),
        "processed": processed,
        "failed": len(failed_records),
        "failures": failed_records
    }

    return HelperUtils.standard_response(
        success=len(failed_records) == 0,
        message=f"Bulk ingestion finished. Processed: {processed}, Failed: {len(failed_records)}.",
        data=summary,
        status_code=200 if len(failed_records) == 0 else 207
    )


@identity_bp.route('', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
@rate_limit(limit=30, window=60)
def list_identities() -> Response:
    """
    Retrieves paginated, filtered listing of raw identities.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    system_source = request.args.get('system_source')
    org_id = request.args.get('organization_id', type=int)
    status = request.args.get('status')

    query = Identity.query.filter_by(deleted_at=None)
    if system_source:
        query = query.filter_by(system_source=system_source)
    if org_id:
        query = query.filter_by(organization_id=org_id)
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Identity.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)
    
    data = {
        "items": [{
            "id": item.id,
            "uuid": item.uuid,
            "cluster_id": item.cluster_id,
            "organization_id": item.organization_id,
            "system_source": item.system_source,
            "system_uid": item.system_uid,
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
        message="Identities listed successfully.",
        data=data
    )


@identity_bp.route('/<string:uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def get_identity_by_uuid(uuid_str: str) -> Response:
    """
    Retrieves detailed identity information by UUID.
    """
    identity = identity_repo.get_by_uuid(uuid_str)
    if not identity:
        return HelperUtils.standard_response(
            success=False,
            message="Identity record not found.",
            error={"code": "NOT_FOUND", "message": "Identity UUID does not exist."},
            status_code=404
        )

    data = {
        "id": identity.id,
        "uuid": identity.uuid,
        "cluster_id": identity.cluster_id,
        "organization_id": identity.organization_id,
        "system_source": identity.system_source,
        "system_uid": identity.system_uid,
        "status": identity.status,
        "hash_algorithm": identity.hash_algorithm,
        "encryption_algorithm": identity.encryption_algorithm,
        "version": identity.version,
        "created_at": identity.created_at.isoformat()
    }

    return HelperUtils.standard_response(
        success=True,
        message="Identity record retrieved successfully.",
        data=data
    )


@identity_bp.route('/<string:uuid_str>', methods=['PUT'])
@jwt_required()
@require_permission('identity:write')
def update_identity(uuid_str: str) -> Response:
    """
    Updates mutable identity fields (status or system metadata).
    """
    identity = identity_repo.get_by_uuid(uuid_str)
    if not identity:
        return HelperUtils.standard_response(
            success=False,
            message="Identity record not found.",
            error={"code": "NOT_FOUND", "message": "Identity UUID does not exist."},
            status_code=404
        )

    payload = request.get_json() or {}
    client_version = payload.get("version")
    if client_version is None:
        return HelperUtils.standard_response(
            success=False,
            message="Missing version parameter for optimistic locking checks.",
            error={"code": "LOCKING_ERROR", "message": "version is required."},
            status_code=400
        )

    if identity.version != client_version:
        return HelperUtils.standard_response(
            success=False,
            message="Optimistic locking conflict: record has been updated by another transaction.",
            error={"code": "CONFLICT", "message": "Version mismatch."},
            status_code=409
        )

    if "status" in payload:
        identity.status = payload["status"]
    
    identity.version += 1
    actor_id = current_user.id if current_user else 1
    identity.updated_by = actor_id
    identity_repo.save(identity)

    return HelperUtils.standard_response(
        success=True,
        message="Identity record updated successfully.",
        data={"uuid": identity.uuid, "version": identity.version}
    )


@identity_bp.route('/<string:uuid_str>', methods=['DELETE'])
@jwt_required()
@require_permission('identity:write')
def delete_identity(uuid_str: str) -> Response:
    """
    Soft deletes an identity record.
    """
    identity = identity_repo.get_by_uuid(uuid_str)
    if not identity:
        return HelperUtils.standard_response(
            success=False,
            message="Identity record not found.",
            error={"code": "NOT_FOUND", "message": "Identity UUID does not exist."},
            status_code=404
        )

    identity.deleted_at = db.func.now()
    actor_id = current_user.id if current_user else 1
    identity.deleted_by = actor_id
    identity.status = "DELETED"
    identity.version += 1
    identity_repo.save(identity)

    return HelperUtils.standard_response(
        success=True,
        message="Identity record soft deleted successfully.",
        data={"uuid": identity.uuid}
    )
