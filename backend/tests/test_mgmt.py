# -*- coding: utf-8 -*-
"""
Pytest Unit and Integration Tests for User & Organization Management.
Validates CRUD, tenant scoping, bulk actions, optimistic locks, and self-lockout guards.
"""

import uuid
import pytest
from app import db, create_app
from app.config import Config
from app.models.user import User, Organization, Role, Permission
from flask_jwt_extended import create_access_token


class TestingConfig(Config):
    """
    Testing Configuration overrides.
    """
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test_jwt_secret_key_mgmt!"
    PEPPER_SECRET = "test_pepper_secret_mgmt!"
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
def seed_mgmt_data(app):
    """Populates basic organizations, roles, users for management test scenarios."""
    # 1. Add Root Org and Secondary Org
    org_root = Organization(id=1, uuid=str(uuid.uuid4()), name="Authority Root", code="NIA_ROOT", status="ACTIVE")
    org_two = Organization(id=2, uuid=str(uuid.uuid4()), name="Partner Agency Two", code="PARTNER_TWO", status="ACTIVE")
    db.session.add_all([org_root, org_two])
    db.session.commit()

    # 2. Add Roles
    super_admin_role = Role(uuid=str(uuid.uuid4()), name="SUPER_ADMIN", description="Global administrator")
    org_admin_role = Role(uuid=str(uuid.uuid4()), name="ORG_ADMIN", description="Org administrator")
    operator_role = Role(uuid=str(uuid.uuid4()), name="INGEST_OPERATOR", description="Operator")
    db.session.add_all([super_admin_role, org_admin_role, operator_role])
    db.session.commit()

    # 3. Add Permissions
    p_write = Permission(uuid=str(uuid.uuid4()), name="user:write", description="Write operator users")
    p_read = Permission(uuid=str(uuid.uuid4()), name="user:read", description="Read operator users")
    db.session.add_all([p_write, p_read])
    db.session.commit()

    # Link Permissions
    super_admin_role.permissions.extend([p_write, p_read])
    org_admin_role.permissions.extend([p_write, p_read])
    operator_role.permissions.append(p_read)
    db.session.commit()

    # 4. Add Users
    # user_super (Org 1, SUPER_ADMIN)
    user_super = User(
        id=1,
        uuid=str(uuid.uuid4()),
        organization_id=org_root.id,
        username="superadmin",
        email="superadmin@resolution.gov.in",
        password_hash="hashedpassword",
        status="ACTIVE"
    )
    # user_org1_admin (Org 1, ORG_ADMIN)
    user_org1_admin = User(
        id=2,
        uuid=str(uuid.uuid4()),
        organization_id=org_root.id,
        username="admin1",
        email="admin1@resolution.gov.in",
        password_hash="hashedpassword",
        status="ACTIVE"
    )
    # user_org2_admin (Org 2, ORG_ADMIN)
    user_org2_admin = User(
        id=3,
        uuid=str(uuid.uuid4()),
        organization_id=org_two.id,
        username="admin2",
        email="admin2@resolution.gov.in",
        password_hash="hashedpassword",
        status="ACTIVE"
    )

    db.session.add_all([user_super, user_org1_admin, user_org2_admin])
    db.session.commit()

    user_super.roles.append(super_admin_role)
    user_org1_admin.roles.append(org_admin_role)
    user_org2_admin.roles.append(org_admin_role)
    db.session.commit()

    return {
        "org_root": org_root,
        "org_two": org_two,
        "super_user": user_super,
        "org1_admin": user_org1_admin,
        "org2_admin": user_org2_admin
    }


def test_create_organization_restricted(client, seed_mgmt_data):
    """
    Verifies that only Super Admin accounts can create new Organizations.
    """
    # 1. Accessing via Org Admin (Should return HTTP 403 Forbidden)
    token_org_admin = create_access_token(identity=seed_mgmt_data["org1_admin"].username)
    headers_org = {"Authorization": f"Bearer {token_org_admin}"}

    payload = {"name": "New Org Three", "code": "ORG_THREE"}
    res_forbidden = client.post("/api/v1/organizations", json=payload, headers=headers_org)
    assert res_forbidden.status_code == 403

    # 2. Accessing via Super Admin (Should succeed with HTTP 201 Created)
    token_super = create_access_token(identity=seed_mgmt_data["super_user"].username)
    headers_super = {"Authorization": f"Bearer {token_super}"}

    res_ok = client.post("/api/v1/organizations", json=payload, headers=headers_super)
    assert res_ok.status_code == 201
    json_data = res_ok.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["code"] == "ORG_THREE"


def test_optimistic_locking_organization_update(client, seed_mgmt_data):
    """
    Verifies that updates with matching version numbers succeed while outdated versions return 409 Conflict.
    """
    token_super = create_access_token(identity=seed_mgmt_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token_super}"}

    org_uuid = seed_mgmt_data["org_two"].uuid
    
    # 1. Update with matching version (DB version is 1)
    payload_ok = {
        "name": "Partner Agency Two Updated",
        "version": 1
    }
    res_ok = client.put(f"/api/v1/organizations/{org_uuid}", json=payload_ok, headers=headers)
    assert res_ok.status_code == 200
    assert res_ok.get_json()["data"]["version"] == 2

    # 2. Update using stale version 1 again (Should return HTTP 409 Conflict)
    payload_stale = {
        "name": "Another Stale Update attempt",
        "version": 1
    }
    res_conflict = client.put(f"/api/v1/organizations/{org_uuid}", json=payload_stale, headers=headers)
    assert res_conflict.status_code == 409
    assert "modified" in res_conflict.get_json()["message"].lower()


def test_tenant_scoping_boundaries(client, seed_mgmt_data):
    """
    Verifies that Org Admins cannot manage resources belonging to other organizations.
    """
    # 1. Login as Org 2 Admin
    token_admin2 = create_access_token(identity=seed_mgmt_data["org2_admin"].username)
    headers_admin2 = {"Authorization": f"Bearer {token_admin2}"}

    # 2. Attempt to read Org 1 User profile details (Should return HTTP 403 Forbidden)
    org1_user_uuid = seed_mgmt_data["org1_admin"].uuid
    res_read_blocked = client.get(f"/api/v1/users/{org1_user_uuid}", headers=headers_admin2)
    assert res_read_blocked.status_code == 403

    # 3. Attempt to update Org 1 User status (Should return HTTP 403 Forbidden)
    payload = {"status": "INACTIVE", "version": 1}
    res_write_blocked = client.patch(f"/api/v1/users/{org1_user_uuid}/status", json=payload, headers=headers_admin2)
    assert res_write_blocked.status_code == 403


def test_prevent_self_lockout(client, seed_mgmt_data):
    """
    Verifies that operators are blocked from deactivating or deleting their own accounts.
    """
    token_admin1 = create_access_token(identity=seed_mgmt_data["org1_admin"].username)
    headers = {"Authorization": f"Bearer {token_admin1}"}
    admin1_uuid = seed_mgmt_data["org1_admin"].uuid

    # 1. Attempt to self-deactivate (Should fail with HTTP 403 Forbidden)
    payload = {"status": "INACTIVE", "version": 1}
    res_deactivate_fail = client.patch(f"/api/v1/users/{admin1_uuid}/status", json=payload, headers=headers)
    assert res_deactivate_fail.status_code == 403

    # 2. Attempt to self-delete (Should fail with HTTP 403 Forbidden)
    res_delete_fail = client.delete(f"/api/v1/users/{admin1_uuid}", headers=headers)
    assert res_delete_fail.status_code == 403


def test_organization_deactivation_integrity(client, seed_mgmt_data):
    """
    Verifies deactivating the root organization or any organization containing active users is blocked.
    """
    token_super = create_access_token(identity=seed_mgmt_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token_super}"}

    # 1. Attempt to deactivate Root organization NIA_ROOT (Should return HTTP 403 Forbidden)
    root_uuid = seed_mgmt_data["org_root"].uuid
    payload_root = {"status": "INACTIVE", "version": 1}
    res_root_blocked = client.patch(f"/api/v1/organizations/{root_uuid}/status", json=payload_root, headers=headers)
    assert res_root_blocked.status_code == 403

    # 2. Attempt to deactivate Org 2 which has active user admin2 (Should return HTTP 403 Forbidden)
    org2_uuid = seed_mgmt_data["org_two"].uuid
    payload_org2 = {"status": "INACTIVE", "version": 1}
    res_org2_blocked = client.patch(f"/api/v1/organizations/{org2_uuid}/status", json=payload_org2, headers=headers)
    assert res_org2_blocked.status_code == 403


def test_idempotent_bulk_operations(client, seed_mgmt_data):
    """
    Verifies that bulk deactivations process successfully, skip redundant actions, and report proper counts.
    """
    token_super = create_access_token(identity=seed_mgmt_data["super_user"].username)
    headers = {"Authorization": f"Bearer {token_super}"}

    # Create dummy users for deactivation testing (active by default)
    user_uuid2 = seed_mgmt_data["org1_admin"].uuid
    user_uuid3 = seed_mgmt_data["org2_admin"].uuid

    # 1. Run deactivation (2 users are active, so both should transition: updated = 2, skipped = 0)
    payload_bulk = {
        "uuids": [user_uuid2, user_uuid3],
        "status": "INACTIVE"
    }
    res_bulk1 = client.post("/api/v1/users/bulk-status", json=payload_bulk, headers=headers)
    assert res_bulk1.status_code == 200
    data1 = res_bulk1.get_json()["data"]
    assert data1["updated"] == 2
    assert data1["skipped"] == 0

    # 2. Re-run identical bulk payload (idempotency check: both already inactive, should skip: updated = 0, skipped = 2)
    res_bulk2 = client.post("/api/v1/users/bulk-status", json=payload_bulk, headers=headers)
    assert res_bulk2.status_code == 200
    data2 = res_bulk2.get_json()["data"]
    assert data2["updated"] == 0
    assert data2["skipped"] == 2
