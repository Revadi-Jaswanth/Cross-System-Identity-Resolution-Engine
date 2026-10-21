# -*- coding: utf-8 -*-
"""
System Blueprint (Versioned /api/v1/system).
Exposes endpoints for diagnostics health checks, stats, metadata, and dynamic settings.
"""

import logging
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, current_user

from app import db
from app.models.user import SystemSetting
from app.models.identity import IdentityCluster, Identity, MergeHistory
from app.middleware import rate_limit, require_permission, require_role
from app.utils.helpers import HelperUtils

logger = logging.getLogger(__name__)

system_bp = Blueprint('system_v1', __name__)


@system_bp.route('/health', methods=['GET'])
@rate_limit(limit=10, window=10)
def health_check() -> Response:
    """
    Diagnostics ping status check.
    Checks DB connection and returns metadata.
    """
    db_status = "CONNECTED"
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_status = "DISCONNECTED"

    data = {
        "status": "UP" if db_status == "CONNECTED" else "DOWN",
        "database": db_status,
        "version": "1.0.0",
        "metadata": {
            "environment": "production",
            "release": "identity-resolution-engine-core-v1"
        }
    }

    return HelperUtils.standard_response(
        success=db_status == "CONNECTED",
        message="System diagnostics ping checked.",
        data=data,
        status_code=200 if db_status == "CONNECTED" else 500
    )


@system_bp.route('/stats', methods=['GET'])
@jwt_required()
@require_permission('identity:read')
def system_statistics() -> Response:
    """
    Retrieves execution metrics and counts of database records.
    """
    try:
        clusters_count = IdentityCluster.query.filter_by(deleted_at=None).count()
        identities_count = Identity.query.filter_by(deleted_at=None).count()
        merges_count = MergeHistory.query.count()

        data = {
            "total_active_clusters": clusters_count,
            "total_active_identities": identities_count,
            "total_merges_completed": merges_count,
            "engine_version": "v1.0"
        }

        return HelperUtils.standard_response(
            success=True,
            message="System statistics retrieved.",
            data=data
        )
    except Exception as e:
        logger.exception("Failed to query statistics.")
        return HelperUtils.standard_response(
            success=False,
            message="Failed to query database statistics.",
            error={"code": "STATS_QUERY_FAILED", "message": str(e)},
            status_code=500
        )


@system_bp.route('/settings', methods=['GET'])
@jwt_required()
@require_role('Super Admin')
def list_settings() -> Response:
    """
    Lists dynamic configurations in system_settings table.
    """
    settings = SystemSetting.query.all()
    data = [{
        "setting_key": s.setting_key,
        "setting_value": s.setting_value,
        "description": s.description,
        "version": s.version
    } for s in settings]

    return HelperUtils.standard_response(
        success=True,
        message="System settings retrieved.",
        data=data
    )


@system_bp.route('/settings/<string:key>', methods=['PUT'])
@jwt_required()
@require_role('Super Admin')
def update_setting(key: str) -> Response:
    """
    Updates value of dynamic system configuration setting.
    Supports optimistic locking.
    """
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    if not setting:
        return HelperUtils.standard_response(
            success=False,
            message="System setting key not found.",
            error={"code": "NOT_FOUND", "message": f"Setting key '{key}' does not exist."},
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

    if setting.version != client_version:
        return HelperUtils.standard_response(
            success=False,
            message="Optimistic locking conflict: setting has been modified by another administrator.",
            error={"code": "CONFLICT", "message": "Version mismatch."},
            status_code=409
        )

    if "setting_value" in payload:
        setting.setting_value = str(payload["setting_value"])

    setting.version += 1
    actor_id = current_user.id if current_user else 1
    setting.updated_by = actor_id
    db.session.commit()

    return HelperUtils.standard_response(
        success=True,
        message="System setting updated successfully.",
        data={"setting_key": setting.setting_key, "version": setting.version}
    )
