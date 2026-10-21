# -*- coding: utf-8 -*-
"""
API Integration tests verifying RBAC access controls, JWT, validation, and resolution flows.
"""

import uuid
import pytest
from datetime import datetime
from flask_jwt_extended import create_access_token

from app import db, create_app
from app.config import Config
from app.models.user import Organization, Role, Permission, User, SystemSetting
from app.models.identity import IdentityCluster, Identity
from app.security import SecurityService


class TestingConfig(Config):
    """Testing override configurations."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    PRESERVE_CONTEXT_ON_EXCEPTION = False


@pytest.fixture
def app():
    """App factory fixture."""
    flask_app = create_app(TestingConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Testing client fixture."""
    return app.test_client()


@pytest.fixture
def seed_api_data(app):
    """Seeds organizational and RBAC data for REST API integrations."""
    # 1. Organization
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Authority API Org", code="API_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()

    # 2. Roles & Permissions
    r_super = Role(uuid=str(uuid.uuid4()), name="Super Admin", description="Global access")
    r_operator = Role(uuid=str(uuid.uuid4()), name="Operator", description="Limited access")
    db.session.add_all([r_super, r_operator])

    p_id_write = Permission(uuid=str(uuid.uuid4()), name="identity:write", description="Ingest identity records")
    p_id_read = Permission(uuid=str(uuid.uuid4()), name="identity:read", description="Query identity matches")
    p_merge = Permission(uuid=str(uuid.uuid4()), name="cluster:merge", description="Merge identity clusters")
    db.session.add_all([p_id_write, p_id_read, p_merge])
    db.session.commit()

    r_super.permissions.extend([p_id_write, p_id_read, p_merge])
    r_operator.permissions.extend([p_id_read])
    db.session.commit()

    # 3. Users
    user_super = User(
        id=1, uuid=str(uuid.uuid4()), organization_id=org.id,
        username="super_api_user", email="super@resolution.gov.in",
        password_hash="hashed_val", status="ACTIVE"
    )
    user_operator = User(
        id=2, uuid=str(uuid.uuid4()), organization_id=org.id,
        username="operator_api_user", email="operator@resolution.gov.in",
        password_hash="hashed_val", status="ACTIVE"
    )
    db.session.add_all([user_super, user_operator])
    db.session.commit()

    user_super.roles.append(r_super)
    user_operator.roles.append(r_operator)
    db.session.commit()

    # 4. Settings seed
    sett = SystemSetting(setting_key="conflict_policy_full_name", setting_value="MOST_TRUSTED_SOURCE", version=1)
    db.session.add(sett)
    db.session.commit()

    return {
        "org": org,
        "super_user": user_super,
        "operator_user": user_operator
    }


def test_api_unauthorized_call(client):
    """
    Verifies that requests without Bearer tokens fail with HTTP 401.
    """
    res = client.get("/api/v1/identities")
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["error"]["code"] == "UNAUTHORIZED"


def test_api_insufficient_permissions(client, seed_api_data):
    """
    Verifies that users lacking required permissions receive HTTP 403.
    """
    # Operator role only has identity:read, not identity:write.
    # Attempting to call identities/ingest should return HTTP 403.
    token = create_access_token(identity=seed_api_data["operator_user"].username)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/identities/ingest", json={}, headers=headers)
    assert res.status_code == 403
    assert res.get_json()["success"] is False


def test_api_ingest_and_resolution_flow(client, seed_api_data):
    """
    Verifies full lifecycle of ingestion and resolution querying through versioned endpoints.
    """
    token = create_access_token(identity=seed_api_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Ingest an identity
    payload = {
        "system_source": "AadhaarService",
        "system_uid": "A123",
        "organization_id": seed_api_data["org"].id,
        "full_name": "Ingest Test Name",
        "aadhaar": "123456789012"
    }
    res_ingest = client.post("/api/v1/identities/ingest", json=payload, headers=headers)
    assert res_ingest.status_code == 201
    json_ingest = res_ingest.get_json()
    assert json_ingest["success"] is True
    assert "execution_time_ms" in json_ingest
    cluster_uuid = json_ingest["data"]["cluster_uuid"]

    # 2. Query resolution match
    res_resolve = client.post("/api/v1/resolution/resolve", json={
        "system_source": "ABHAService",
        "system_uid": "AB55",
        "organization_id": seed_api_data["org"].id,
        "full_name": "Ingest Test Name",
        "aadhaar": "123456789012"
    }, headers=headers)
    assert res_resolve.status_code == 200
    json_resolve = res_resolve.get_json()
    assert json_resolve["success"] is True
    assert json_resolve["data"]["decision"] == "EXACT_MATCH"
    assert json_resolve["data"]["cluster_uuid"] == cluster_uuid


def test_api_cluster_retrieval_and_golden_profile(client, seed_api_data):
    """
    Verifies cluster lookup dynamically constructs its resolved golden profile details in memory.
    """
    token = create_access_token(identity=seed_api_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token}"}
    key_secret = Config.ENCRYPTION_KEY

    # Create cluster and identity records directly in db
    c = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add(c)
    db.session.commit()

    id_rec = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=c.id,
        organization_id=seed_api_data["org"].id,
        system_source="AadhaarService",
        system_uid="S1",
        full_name_encrypted=SecurityService.encrypt_field("Golden Profile Name Test", key_secret),
        version=1
    )
    db.session.add(id_rec)
    db.session.commit()

    res = client.get(f"/api/v1/clusters/{c.uuid}", headers=headers)
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["golden_profile"]["full_name"] == "Golden Profile Name Test"


def test_api_cluster_merge_optimistic_locking(client, seed_api_data):
    """
    Verifies that cluster merge transactional updates enforce optimistic concurrency checks.
    """
    token = create_access_token(identity=seed_api_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token}"}

    # Create clusters
    c1 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c2 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    # Call merge with wrong client source_version (2 instead of 1) -> Conflict 409
    payload = {
        "source_cluster_uuid": c1.uuid,
        "target_cluster_uuid": c2.uuid,
        "confidence_score": 95.0,
        "source_version": 2,
        "target_version": 1
    }
    res_conflict = client.post("/api/v1/clusters/merge", json=payload, headers=headers)
    assert res_conflict.status_code == 409
    assert res_conflict.get_json()["success"] is False


def test_api_verification_flow(client, seed_api_data):
    """
    Verifies that submitting verification checks correctly records history verification logs.
    """
    token = create_access_token(identity=seed_api_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "organization_id": seed_api_data["org"].id,
        "system_source": "OtherSource",
        "system_uid": "S12",
        "full_name": "Verification Test Name",
        "mobile": "+919999999999"
    }

    res_verify = client.post("/api/v1/verification/verify", json=payload, headers=headers)
    assert res_verify.status_code == 200
    json_verify = res_verify.get_json()
    assert json_verify["success"] is True
    req_uuid = json_verify["data"]["request_uuid"]

    # Retrieve request details
    res_details = client.get(f"/api/v1/verification/requests/{req_uuid}", headers=headers)
    assert res_details.status_code == 200
    assert res_details.get_json()["data"]["uuid"] == req_uuid


def test_api_system_diagnostics(client, seed_api_data):
    """
    Verifies that system health checks and statistics report valid metrics.
    """
    # 1. Health check (unauthenticated)
    res_health = client.get("/api/v1/system/health")
    assert res_health.status_code == 200
    assert res_health.get_json()["data"]["status"] == "UP"

    # 2. Settings update with optimistic locking checks
    token = create_access_token(identity=seed_api_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token}"}

    res_settings = client.put("/api/v1/system/settings/conflict_policy_full_name", json={
        "setting_value": "MOST_RECENT_SOURCE",
        "version": 1
    }, headers=headers)
    assert res_settings.status_code == 200
    assert res_settings.get_json()["data"]["version"] == 2
