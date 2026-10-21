# -*- coding: utf-8 -*-
"""
Organizations Management Blueprint Controller (Versioned /api/v1/organizations).
Binds HTTP endpoints to OrganizationService CRUD and bulk routines.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app.services.organization_service import OrganizationService
from app.middleware import rate_limit, require_permission, require_role, verify_organization_scope
from app.utils.helpers import HelperUtils

logger = logging.getLogger(__name__)

organizations_bp = Blueprint('organizations', __name__)
org_service = OrganizationService()


@organizations_bp.route('', methods=['GET'])
@jwt_required()
@require_permission('user:read')
@rate_limit(limit=30, window=60)
def list_organizations() -> Response:
    """
    Retrieves paginated listing of organizations (Super Admin only).
    """
    # Enforce Super Admin check: only Super Admins can list organizations globally
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Global organizations list is restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Insufficient role level."},
            status_code=403
        )

    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    search = request.args.get('search', None)
    status = request.args.get('status', None)
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    filters = {}
    if status:
        filters["status"] = status

    pagination = org_service.list_organizations(
        page=page,
        page_size=page_size,
        search=search,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order
    )

    data = [
        {
            "id": org.id,
            "uuid": org.uuid,
            "name": org.name,
            "code": org.code,
            "status": org.status,
            "created_at": org.created_at.isoformat() + "Z" if org.created_at else None,
            "version": org.version
        }
        for org in pagination.items
    ]

    metadata = {
        "page": pagination.page,
        "page_size": pagination.per_page,
        "total_records": pagination.total,
        "total_pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }

    return HelperUtils.standard_response(
        success=True,
        message="Organizations list retrieved successfully.",
        data={"organizations": data, "metadata": metadata},
        status_code=200
    )


@organizations_bp.route('', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def create_organization() -> Response:
    """
    Creates a new Organization (Super Admin only).
    """
    # Enforce Super Admin only
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Creation of organizations is restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Super Admin role required."},
            status_code=403
        )

    data = request.get_json() or {}
    name = data.get("name")
    code = data.get("code")

    org = org_service.create_organization(
        name=name,
        code=code,
        creator_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Organization successfully created.",
        data={
            "uuid": org.uuid,
            "name": org.name,
            "code": org.code,
            "status": org.status,
            "version": org.version
        },
        status_code=201
    )


@organizations_bp.route('/<uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('user:read')
@rate_limit(limit=30, window=60)
def get_organization(uuid_str: str) -> Response:
    """
    Retrieves details of a single organization.
    """
    org = org_service.get_organization(uuid_str)
    
    # Isolation scope validation
    verify_organization_scope(org.id)

    return HelperUtils.standard_response(
        success=True,
        message="Organization retrieved successfully.",
        data={
            "uuid": org.uuid,
            "name": org.name,
            "code": org.code,
            "status": org.status,
            "version": org.version,
            "created_at": org.created_at.isoformat() + "Z" if org.created_at else None
        },
        status_code=200
    )


@organizations_bp.route('/<uuid_str>', methods=['PUT'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def update_organization(uuid_str: str) -> Response:
    """
    Updates Organization profile details, enforcing optimistic locking.
    """
    org = org_service.get_organization(uuid_str)
    
    # Tenant scope check
    verify_organization_scope(org.id)

    data = request.get_json() or {}
    name = data.get("name")
    status = data.get("status")
    version = data.get("version", 0)

    updated_org = org_service.update_organization(
        uuid_str=uuid_str,
        name=name,
        status=status,
        client_version=version,
        updater_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Organization successfully updated.",
        data={
            "uuid": updated_org.uuid,
            "name": updated_org.name,
            "code": updated_org.code,
            "status": updated_org.status,
            "version": updated_org.version
        },
        status_code=200
    )


@organizations_bp.route('/<uuid_str>', methods=['DELETE'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def delete_organization(uuid_str: str) -> Response:
    """
    Soft deletes an organization (Super Admin only).
    """
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Deletion of organizations is restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Super Admin role required."},
            status_code=403
        )

    org_service.delete_organization(
        uuid_str=uuid_str,
        deleter_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Organization successfully deleted.",
        status_code=200
    )


@organizations_bp.route('/<uuid_str>/status', methods=['PATCH'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def update_status(uuid_str: str) -> Response:
    """
    Toggles organization status (Super Admin only).
    """
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Status toggles are restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Super Admin role required."},
            status_code=403
        )

    data = request.get_json() or {}
    status = data.get("status")
    version = data.get("version", 0)

    updated_org = org_service.update_organization(
        uuid_str=uuid_str,
        name=None,
        status=status,
        client_version=version,
        updater_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Organization status successfully updated.",
        data={
            "uuid": updated_org.uuid,
            "status": updated_org.status,
            "version": updated_org.version
        },
        status_code=200
    )


@organizations_bp.route('/bulk-status', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def bulk_status() -> Response:
    """
    Idempotent bulk update of organization statuses.
    """
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Bulk actions are restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Super Admin role required."},
            status_code=403
        )

    data = request.get_json() or {}
    uuids = data.get("uuids", [])
    status = data.get("status")

    if not uuids or not isinstance(uuids, list):
        return HelperUtils.standard_response(
            success=False,
            message="Invalid bulk request payload. 'uuids' list is required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing 'uuids' list."},
            status_code=400
        )

    summary = org_service.bulk_update_status(
        uuids=uuids,
        status=status,
        actor_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Bulk organization status update completed.",
        data=summary,
        status_code=200
    )


@organizations_bp.route('/export', methods=['GET'])
@jwt_required()
@require_permission('user:read')
def export_organizations() -> Response:
    """
    Scaffolds export of organization listings in CSV format.
    TODO: Add full CSV data mapping dynamically from Database.
    """
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" not in user_roles:
        return HelperUtils.standard_response(
            success=False,
            message="Access denied: Exports are restricted to Super Administrators.",
            error={"code": "FORBIDDEN", "message": "Super Admin role required."},
            status_code=403
        )

    csv_data = "UUID,Name,Code,Status,CreatedAt\n"
    csv_data += "f47ac10b-58cc-4372-a567-0e02b2c3d479,National Identity Authority,NIA_ROOT,ACTIVE,2026-07-07T12:00:00Z\n"
    
    response = Response(csv_data, mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=organizations_export.csv"
    return response
