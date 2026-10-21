# -*- coding: utf-8 -*-
"""
Users Management Blueprint Controller (Versioned /api/v1/users).
Binds HTTP endpoints to UserService CRUD and bulk routines.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app.services.user_service import UserService
from app.middleware import rate_limit, require_permission, verify_organization_scope
from app.utils.helpers import HelperUtils
from app.exceptions import InvalidIdentifierException

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__)
user_service = UserService()


@users_bp.route('', methods=['GET'])
@jwt_required()
@require_permission('user:read')
@rate_limit(limit=30, window=60)
def list_users() -> Response:
    """
    Retrieves paginated listing of users scoped by tenant boundaries.
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    search = request.args.get('search', None)
    status = request.args.get('status', None)
    role = request.args.get('role', None)
    org_id = request.args.get('organization_id', None, type=int)
    mfa = request.args.get('mfa_enabled', None)
    created_after = request.args.get('created_after', None)
    created_before = request.args.get('created_before', None)
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    filters = {}
    if status:
        filters["status"] = status
    if role:
        filters["role"] = role
    if org_id:
        filters["organization_id"] = org_id
    if mfa is not None:
        filters["mfa_enabled"] = mfa.lower() == 'true'
    if created_after:
        filters["created_after"] = created_after
    if created_before:
        filters["created_before"] = created_before

    pagination = user_service.list_users(
        current_user=current_user,
        page=page,
        page_size=page_size,
        search=search,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order
    )

    data = [
        {
            "id": user.id,
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "organization_id": user.organization_id,
            "status": user.status,
            "avatar_url": user.avatar_url,
            "mfa_enabled": user.mfa_enabled,
            "roles": [role.name for role in user.roles],
            "version": user.version,
            "created_at": user.created_at.isoformat() + "Z" if user.created_at else None
        }
        for user in pagination.items
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
        message="Users list retrieved successfully.",
        data={"users": data, "metadata": metadata},
        status_code=200
    )


@users_bp.route('', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def create_user() -> Response:
    """
    Creates a new administrative operator account.
    """
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    org_id = data.get("organization_id")
    role_names = data.get("roles", [])

    if not isinstance(role_names, list):
        role_names = [role_names]

    # Enforce organization boundaries check
    verify_organization_scope(org_id)

    user = user_service.create_user(
        username=username,
        email=email,
        password=password,
        organization_id=org_id,
        creator_user_id=current_user.id,
        role_names=role_names,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Operator user account created successfully.",
        data={
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "organization_id": user.organization_id,
            "roles": [role.name for role in user.roles],
            "version": user.version
        },
        status_code=201
    )


@users_bp.route('/<uuid_str>', methods=['GET'])
@jwt_required()
@require_permission('user:read')
@rate_limit(limit=30, window=60)
def get_user(uuid_str: str) -> Response:
    """
    Retrieves detailed properties of a single user.
    """
    user = user_service.get_user(uuid_str)
    
    # Enforce organization isolation boundary
    verify_organization_scope(user.organization_id)

    return HelperUtils.standard_response(
        success=True,
        message="User profile details retrieved successfully.",
        data={
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "organization_id": user.organization_id,
            "status": user.status,
            "avatar_url": user.avatar_url,
            "mfa_enabled": user.mfa_enabled,
            "roles": [role.name for role in user.roles],
            "permissions": user.get_permissions(),
            "version": user.version,
            "created_at": user.created_at.isoformat() + "Z" if user.created_at else None
        },
        status_code=200
    )


@users_bp.route('/<uuid_str>', methods=['PUT'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def update_user(uuid_str: str) -> Response:
    """
    Updates user profile details, enforcing optimistic locking.
    """
    user = user_service.get_user(uuid_str)
    verify_organization_scope(user.organization_id)

    data = request.get_json() or {}
    email = data.get("email")
    status = data.get("status")
    avatar_url = data.get("avatar_url")
    version = data.get("version", 0)

    updated_user = user_service.update_user(
        uuid_str=uuid_str,
        email=email,
        status=status,
        avatar_url=avatar_url,
        client_version=version,
        updater_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="User profile updated successfully.",
        data={
            "uuid": updated_user.uuid,
            "username": updated_user.username,
            "email": updated_user.email,
            "status": updated_user.status,
            "avatar_url": updated_user.avatar_url,
            "version": updated_user.version
        },
        status_code=200
    )


@users_bp.route('/<uuid_str>', methods=['DELETE'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def delete_user(uuid_str: str) -> Response:
    """
    Soft deletes a user account.
    """
    user = user_service.get_user(uuid_str)
    verify_organization_scope(user.organization_id)

    user_service.delete_user(
        uuid_str=uuid_str,
        deleter_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="User account soft deleted successfully.",
        status_code=200
    )


@users_bp.route('/<uuid_str>/status', methods=['PATCH'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def toggle_status(uuid_str: str) -> Response:
    """
    Updates user account status (active / inactive / locked).
    """
    user = user_service.get_user(uuid_str)
    verify_organization_scope(user.organization_id)

    data = request.get_json() or {}
    status = data.get("status")
    version = data.get("version", 0)

    updated_user = user_service.update_user(
        uuid_str=uuid_str,
        email=None,
        status=status,
        avatar_url=None,
        client_version=version,
        updater_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="User status updated successfully.",
        data={
            "uuid": updated_user.uuid,
            "status": updated_user.status,
            "version": updated_user.version
        },
        status_code=200
    )


@users_bp.route('/<uuid_str>/roles', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=10, window=60)
def assign_roles(uuid_str: str) -> Response:
    """
    Assigns role mappings to a user.
    """
    user = user_service.get_user(uuid_str)
    verify_organization_scope(user.organization_id)

    data = request.get_json() or {}
    role_names = data.get("roles", [])

    if not isinstance(role_names, list):
        role_names = [role_names]

    updated_user = user_service.update_user_roles(
        uuid_str=uuid_str,
        role_names=role_names,
        actor_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="User roles updated successfully.",
        data={
            "uuid": updated_user.uuid,
            "roles": [role.name for role in updated_user.roles],
            "version": updated_user.version
        },
        status_code=200
    )


@users_bp.route('/bulk-status', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def bulk_status() -> Response:
    """
    Idempotent bulk update of user statuses.
    """
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

    # For Org Admins, we verify they only update users in their organization.
    # The service does this by checking each uuid. If there's an organization mismatch,
    # the organization scope checks or individual user checks in service can filter it.
    # To be extremely clean, we let UserService handle it and check permissions.
    summary = user_service.bulk_update_status(
        uuids=uuids,
        status=status,
        actor_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Bulk user status update completed.",
        data=summary,
        status_code=200
    )


@users_bp.route('/bulk-delete', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def bulk_delete() -> Response:
    """
    Idempotent bulk soft deletion of user accounts.
    """
    data = request.get_json() or {}
    uuids = data.get("uuids", [])

    if not uuids or not isinstance(uuids, list):
        return HelperUtils.standard_response(
            success=False,
            message="Invalid bulk request payload. 'uuids' list is required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing 'uuids' list."},
            status_code=400
        )

    summary = user_service.bulk_delete(
        uuids=uuids,
        actor_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Bulk user deletion completed.",
        data=summary,
        status_code=200
    )


@users_bp.route('/bulk-roles', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=5, window=60)
def bulk_roles() -> Response:
    """
    Idempotent bulk role assignment or removal.
    """
    data = request.get_json() or {}
    uuids = data.get("uuids", [])
    role_names = data.get("roles", [])
    action = data.get("action") # ADD or REMOVE

    if not uuids or not isinstance(uuids, list) or not role_names:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid bulk request payload. 'uuids', 'roles', and 'action' are required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing fields."},
            status_code=400
        )

    if not isinstance(role_names, list):
        role_names = [role_names]

    summary = user_service.bulk_update_roles(
        uuids=uuids,
        role_names=role_names,
        action=action,
        actor_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Bulk user roles update completed.",
        data=summary,
        status_code=200
    )


@users_bp.route('/export', methods=['GET'])
@jwt_required()
@require_permission('user:read')
def export_users() -> Response:
    """
    Export user listing in CSV format dynamically from database.
    """
    users_list = user_service.user_repo.model_class.query.all()
    csv_data = "UUID,Username,Email,OrganizationId,Status,MfaEnabled,Roles,CreatedAt\n"
    for user in users_list:
        roles_str = ",".join([role.name for role in user.roles])
        csv_data += f"{user.uuid},{user.username},{user.email},{user.organization_id},{user.status},{user.mfa_enabled},{roles_str},{user.created_at.isoformat() if user.created_at else ''}\n"
    
    response = Response(csv_data, mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=users_export.csv"
    return response
