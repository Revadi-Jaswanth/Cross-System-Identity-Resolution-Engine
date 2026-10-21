# -*- coding: utf-8 -*-
"""
Middleware, Request Interceptors, Rate Limiters, and RBAC Decorators.
Provides granular role and permission checks with organization-level isolation.
"""

import uuid
import logging
from datetime import datetime
from functools import wraps
from flask import request, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, current_user

from app.utils.helpers import HelperUtils
from app.exceptions import (
    InsufficientPermissionsException, ForbiddenException,
    OrganizationMismatchException, AuthenticationException
)

logger = logging.getLogger(__name__)

# Simple in-memory rate limiting dictionary cache
# TODO: Integrate with Redis for horizontal scaling and clustering support
RATE_LIMIT_CACHE = {}


def register_middleware(app):
    """
    Registers global request hooks, request ID generation, and telemetry logging.
    """
    @app.before_request
    def attach_request_id():
        """Attaches a unique Request UUID to the request context."""
        import time
        setattr(request, 'start_time', time.perf_counter())
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        setattr(request, 'request_id', req_id)
        
        # Telemetry logs
        logger.info(
            f"Incoming Request: {request.method} {request.path} | IP: {request.remote_addr} | ID: {req_id}"
        )

    @app.after_request
    def log_response_telemetry(response):
        """Logs response status and injects request ID into headers."""
        req_id = getattr(request, 'request_id', '-')
        response.headers["X-Request-ID"] = req_id
        
        logger.info(
            f"Response Sent: {request.method} {request.path} | Status: {response.status_code} | ID: {req_id}"
        )
        return response


def rate_limit(limit: int = 60, window: int = 60):
    """
    Rate-limiting decorator (in-memory sliding window placeholder).
    Locks clients temporarily if they exceed request counts per window time.

    Args:
        limit (int): Maximum request count in window.
        window (int): Time duration in seconds.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Bypass rate limiting during test executions
            if current_app.config.get("TESTING"):
                return f(*args, **kwargs)

            # Fetch client IP identifier
            ip = request.remote_addr
            now = datetime.utcnow().timestamp()
            
            if ip not in RATE_LIMIT_CACHE:
                RATE_LIMIT_CACHE[ip] = []
            
            # Filter timestamps outside the active sliding window
            timestamps = [t for t in RATE_LIMIT_CACHE[ip] if now - t < window]
            RATE_LIMIT_CACHE[ip] = timestamps
            
            if len(timestamps) >= limit:
                logger.warning(f"Rate limit exceeded for IP: {ip} | Limit: {limit}/{window}s")
                return HelperUtils.standard_response(
                    success=False,
                    message="Too many requests. Please try again later.",
                    error={"code": "TOO_MANY_REQUESTS", "message": "Rate limit exceeded."},
                    status_code=429
                )
            
            RATE_LIMIT_CACHE[ip].append(now)
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_role(*roles: str):
    """
    Restricts route access to administrators holding specific Roles.
    Implicitly runs JWT validations.

    Args:
        *roles (str): Alphanumeric role names (e.g. 'SUPER_ADMIN').
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return HelperUtils.standard_response(
                    success=False,
                    message="Missing or invalid authentication credentials.",
                    error={"code": "UNAUTHORIZED", "message": str(e)},
                    status_code=401
                )
                
            if not current_user:
                return HelperUtils.standard_response(
                    success=False,
                    message="User context not loaded.",
                    error={"code": "UNAUTHORIZED", "message": "User not authenticated."},
                    status_code=401
                )

            # Check if any user role matches requested list
            user_roles = [role.name for role in current_user.roles]
            if not any(r in user_roles for r in roles):
                logger.warning(
                    f"RBAC Role check failed for User: {current_user.username} | Required: {roles} | Found: {user_roles}"
                )
                return HelperUtils.standard_response(
                    success=False,
                    message="Your account does not possess the role required for this action.",
                    error={"code": "FORBIDDEN", "message": "Role requirement check failed."},
                    status_code=403
                )
                
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(*permissions: str):
    """
    Restricts route access to administrators holding specific Permissions.
    Implicitly runs JWT validations.

    Args:
        *permissions (str): Alphanumeric permission names (e.g. 'identity:ingest').
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return HelperUtils.standard_response(
                    success=False,
                    message="Missing or invalid authentication credentials.",
                    error={"code": "UNAUTHORIZED", "message": str(e)},
                    status_code=401
                )

            if not current_user:
                return HelperUtils.standard_response(
                    success=False,
                    message="User context not loaded.",
                    error={"code": "UNAUTHORIZED", "message": "User not authenticated."},
                    status_code=401
                )

            # Check permission claims
            user_permissions = current_user.get_permissions()
            mapped_permissions = []
            for p in permissions:
                mapped_permissions.append(p)
                if p == 'identity:read':
                    mapped_permissions.append('identity:resolve')
                elif p == 'identity:write':
                    mapped_permissions.append('identity:ingest')

            if not any(p in user_permissions for p in mapped_permissions):
                logger.warning(
                    f"RBAC Permission check failed for User: {current_user.username} | Required: {permissions} (Mapped: {mapped_permissions})"
                )
                return HelperUtils.standard_response(
                    success=False,
                    message="Your account does not possess the permissions required for this action.",
                    error={"code": "FORBIDDEN", "message": "Permission requirement check failed."},
                    status_code=403
                )

            return f(*args, **kwargs)
        return wrapper
    return decorator


def verify_organization_scope(target_organization_id: int) -> None:
    """
    Validates tenant context isolation boundaries.
    Unless the actor user belongs to SUPER_ADMIN role, access to foreign organization IDs is blocked.

    Args:
        target_organization_id (int): DB ID of organization requested.

    Raises:
        OrganizationMismatchException: When users attempt cross-tenant reads or writes.
    """
    if not current_user:
        raise AuthenticationException("Active user session required for scope validation.")
        
    user_roles = [role.name for role in current_user.roles]
    if "SUPER_ADMIN" in user_roles:
        # Super admin bypassed
        return

    if current_user.organization_id != target_organization_id:
        logger.warning(
            f"Tenant Isolation Violation! User: {current_user.username} (Org ID: {current_user.organization_id}) "
            f"attempted to read target Org ID: {target_organization_id}"
        )
        raise OrganizationMismatchException()
