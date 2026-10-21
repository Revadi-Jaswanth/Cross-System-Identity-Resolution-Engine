# -*- coding: utf-8 -*-
"""
Authentication Blueprint Controller for REST API routing.
Binds HTTP endpoints to AuthService actions and validates request schemas.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, get_jwt, current_user

from app.services.auth_service import AuthService
from app.validators import RequestValidator
from app.middleware import rate_limit, require_permission, verify_organization_scope
from app.utils.helpers import HelperUtils
from app.exceptions import InvalidIdentifierException

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
@require_permission('user:write')
@rate_limit(limit=30, window=60)
def register() -> Response:
    """
    Registers a new administrative user.
    Restricted strictly to operators holding the 'user:write' permission claim.

    Payload format:
    {
      "username": "...",
      "email": "...",
      "password": "...",
      "organization_id": ...
    }
    """
    data = request.get_json() or {}
    try:
        RequestValidator.validate_registration_payload(data)
    except InvalidIdentifierException as e:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid registration payload.",
            error={"code": "VALIDATION_ERROR", "message": str(e)},
            status_code=400
        )

    # Tenant scoping boundary validation
    verify_organization_scope(data["organization_id"])

    user = auth_service.register_user(
        username=data["username"],
        email=data["email"],
        password=data["password"],
        organization_id=data["organization_id"],
        creator_user_id=current_user.id,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Operator account registered successfully.",
        data={
            "id": user.id,
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "organization_id": user.organization_id
        },
        status_code=201
    )


@auth_bp.route('/public-register', methods=['POST'])
@rate_limit(limit=10, window=60)
def public_register() -> Response:
    """
    Public registration endpoint allowing creation of non-Super-Admin accounts.
    Payload: { "username": "...", "email": "...", "password": "...", "role": "..." }
    """
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role_code = data.get("role", "CITIZEN")

    if not username or not email or not password:
        return HelperUtils.standard_response(
            success=False,
            message="Username, Email, and Password are required.",
            status_code=400
        )

    try:
        user = auth_service.register_public_account(
            username=username,
            email=email,
            password=password,
            role_code=role_code,
            ip_address=request.remote_addr
        )

        return HelperUtils.standard_response(
            success=True,
            message="Account created successfully! You can now log in.",
            data={
                "id": user.id,
                "uuid": user.uuid,
                "username": user.username,
                "email": user.email,
                "role": role_code
            },
            status_code=201
        )
    except Exception as e:
        return HelperUtils.standard_response(
            success=False,
            message=str(e),
            status_code=400
        )


@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=5, window=60)
def login() -> Response:
    """
    Validates operator credentials, issuing JWT token sets.

    Payload format:
    {
      "username": "...",
      "password": "..."
    }
    """
    data = request.get_json() or {}
    try:
        RequestValidator.validate_login_payload(data)
    except InvalidIdentifierException as e:
        return HelperUtils.standard_response(
            success=False,
            message="Invalid login request.",
            error={"code": "VALIDATION_ERROR", "message": str(e)},
            status_code=400
        )

    user_agent = request.user_agent.string if request.user_agent else "Unknown"
    user, access_token, refresh_token = auth_service.authenticate_admin(
        username=data["username"],
        password=data["password"],
        ip_address=request.remote_addr,
        user_agent=user_agent
    )

    response_payload = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "organization": {
                "id": user.organization.id,
                "name": user.organization.name,
                "code": user.organization.code
            } if user.organization else None,
            "roles": [role.name for role in user.roles],
            "permissions": user.get_permissions()
        }
    }

    response = HelperUtils.standard_response(
        success=True,
        message="Authentication successful.",
        data=response_payload,
        status_code=200
    )
    
    # Set Refresh Token in secure cookie as defense-in-depth
    response.set_cookie(
        "refresh_token_cookie",
        refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7*24*60*60 # 7 days
    )
    return response


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout() -> Response:
    """
    Revokes the current JWT session.
    Expects refresh_token in payload or cookie context.
    """
    jwt_payload = get_jwt()
    access_jti = jwt_payload["jti"]
    
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token") or request.cookies.get("refresh_token_cookie")
    
    auth_service.logout_user(
        user_id=current_user.id,
        access_jti=access_jti,
        refresh_token_str=refresh_token,
        ip_address=request.remote_addr
    )
    
    response = HelperUtils.standard_response(
        success=True,
        message="Logout successful. JWT revoked.",
        status_code=200
    )
    response.delete_cookie("refresh_token_cookie")
    return response


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@rate_limit(limit=30, window=60)
def refresh() -> Response:
    """
    Performs refresh token rotation.
    Expects a refresh token in header (Authorization: Bearer <refresh_token>) or cookie.
    """
    # Extract the plain string token presented from headers or cookies
    auth_header = request.headers.get("Authorization", "")
    refresh_token = ""
    if auth_header.startswith("Bearer "):
        refresh_token = auth_header.split(" ")[1]
    else:
        refresh_token = request.cookies.get("refresh_token_cookie")

    if not refresh_token:
        return HelperUtils.standard_response(
            success=False,
            message="Refresh token missing from request context.",
            error={"code": "TOKEN_MISSING", "message": "Bearer refresh token is required."},
            status_code=400
        )

    new_access, new_refresh = auth_service.refresh_session(
        old_refresh_token=refresh_token,
        ip_address=request.remote_addr
    )

    response_payload = {
        "access_token": new_access,
        "refresh_token": new_refresh
    }

    response = HelperUtils.standard_response(
        success=True,
        message="Session tokens rotated successfully.",
        data=response_payload,
        status_code=200
    )
    
    # Update secure refresh cookie
    response.set_cookie(
        "refresh_token_cookie",
        new_refresh,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7*24*60*60
    )
    return response


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@rate_limit(limit=5, window=60)
def change_password() -> Response:
    """
    Changes the logged-in user's password.

    Payload format:
    {
      "old_password": "...",
      "new_password": "..."
    }
    """
    data = request.get_json() or {}
    old_pw = data.get("old_password")
    new_pw = data.get("new_password")

    if not old_pw or not new_pw:
        return HelperUtils.standard_response(
            success=False,
            message="Both old_password and new_password are required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing password fields."},
            status_code=400
        )

    auth_service.change_password(
        user_id=current_user.id,
        old_password=old_pw,
        new_password=new_pw,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Password updated successfully.",
        status_code=200
    )


@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(limit=5, window=60)
def forgot_password() -> Response:
    """
    Generates a password recovery reset token.

    Payload format:
    {
      "email": "..."
    }
    """
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return HelperUtils.standard_response(
            success=False,
            message="Email address is required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing email field."},
            status_code=400
        )

    # Triggers recovery generation (logs to console/telemetry, returning success silently to prevent enumeration)
    raw_token = auth_service.request_password_reset(
        email=email,
        ip_address=request.remote_addr
    )

    # For development/testing purposes, we include the token in data under a debug envelope,
    # but in actual production environments we would suppress this.
    data_payload = {"debug_token": raw_token}
    
    return HelperUtils.standard_response(
        success=True,
        message="If the email address exists, a recovery token will be sent shortly.",
        data=data_payload,
        status_code=200
    )


@auth_bp.route('/reset-password', methods=['POST'])
@rate_limit(limit=5, window=60)
def reset_password() -> Response:
    """
    Performs password reset override using recovery token.

    Payload format:
    {
      "token": "...",
      "new_password": "..."
    }
    """
    data = request.get_json() or {}
    token = data.get("token")
    new_pw = data.get("new_password")

    if not token or not new_pw:
        return HelperUtils.standard_response(
            success=False,
            message="Both token and new_password are required.",
            error={"code": "VALIDATION_ERROR", "message": "Missing reset fields."},
            status_code=400
        )

    auth_service.reset_password_with_token(
        token_str=token,
        new_password=new_pw,
        ip_address=request.remote_addr
    )

    return HelperUtils.standard_response(
        success=True,
        message="Password reset successfully completed.",
        status_code=200
    )


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me() -> Response:
    """
    Returns current authenticated user details.
    """
    response_data = {
        "uuid": current_user.uuid,
        "username": current_user.username,
        "email": current_user.email,
        "organization": {
            "id": current_user.organization.id,
            "name": current_user.organization.name,
            "code": current_user.organization.code
        } if current_user.organization else None,
        "roles": [role.name for role in current_user.roles],
        "permissions": current_user.get_permissions(),
        "mfa_enabled": current_user.mfa_enabled
    }

    return HelperUtils.standard_response(
        success=True,
        message="User profile retrieved successfully.",
        data=response_data,
        status_code=200
    )
