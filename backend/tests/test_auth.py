# -*- coding: utf-8 -*-
"""
Pytest Unit and Integration Tests for the Authentication and RBAC Module.
Tests logins, token refreshes, password policies, lockouts, and permissions.
"""

import uuid
from datetime import datetime, timedelta
import pytest
from flask import Flask
from flask_jwt_extended import create_access_token

from app import db, create_app
from app.config import Config
from app.models.user import User, Organization, Role, Permission, PasswordHistory, RefreshToken, PasswordResetToken
from app.services.auth_service import AuthService
from app.security import SecurityService
from app.exceptions import InvalidCredentialsException, AccountLockedException, PasswordReuseException


class TestingConfig(Config):
    """
    Overrides configuration parameters for automated unit tests.
    """
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test_jwt_secret_key_1234_!"
    PEPPER_SECRET = "test_pepper_secret_1234_!"
    MAX_LOGIN_ATTEMPTS = 3
    LOCKOUT_DURATION_MINUTES = 1
    PASSWORD_HISTORY_LIMIT = 3
    PRESERVE_CONTEXT_ON_EXCEPTION = False


@pytest.fixture
def app():
    """
    Instantiates the Flask application inside a testing context.
    """
    flask_app = create_app(TestingConfig)
    
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """
    Provides a Flask test client context.
    """
    return app.test_client()


@pytest.fixture
def seed_data(app):
    """
    Populates test tables with mock organizations, roles, and administrative users.
    """
    # 1. Add Organization
    org = Organization(
        uuid=str(uuid.uuid4()),
        name="Test Administration Authority",
        code="TAA_TEST",
        status="ACTIVE"
    )
    db.session.add(org)
    db.session.commit()

    # 2. Add Roles
    super_admin_role = Role(uuid=str(uuid.uuid4()), name="SUPER_ADMIN", description="System administrator")
    data_op_role = Role(uuid=str(uuid.uuid4()), name="INGEST_OPERATOR", description="Data operator")
    db.session.add_all([super_admin_role, data_op_role])
    db.session.commit()

    # 3. Add Permissions
    p_write = Permission(uuid=str(uuid.uuid4()), name="user:write", description="Create users")
    p_ingest = Permission(uuid=str(uuid.uuid4()), name="identity:ingest", description="Ingest data")
    db.session.add_all([p_write, p_ingest])
    db.session.commit()

    # Link Permissions
    super_admin_role.permissions.extend([p_write, p_ingest])
    data_op_role.permissions.append(p_ingest)
    db.session.commit()

    # 4. Add Users
    admin_pw = SecurityService.hash_password("SecureAdmin1!")
    op_pw = SecurityService.hash_password("SecureOperator2!")

    admin_user = User(
        uuid=str(uuid.uuid4()),
        organization_id=org.id,
        username="admin_test",
        email="admin@test.gov.in",
        password_hash=admin_pw,
        status="ACTIVE"
    )
    op_user = User(
        uuid=str(uuid.uuid4()),
        organization_id=org.id,
        username="operator_test",
        email="operator@test.gov.in",
        password_hash=op_pw,
        status="ACTIVE"
    )

    db.session.add_all([admin_user, op_user])
    db.session.commit()

    # Bind Roles
    admin_user.roles.append(super_admin_role)
    op_user.roles.append(data_op_role)
    db.session.commit()

    # Ingest password history seeds
    hist_admin = PasswordHistory(user_id=admin_user.id, password_hash=admin_pw)
    hist_op = PasswordHistory(user_id=op_user.id, password_hash=op_pw)
    db.session.add_all([hist_admin, hist_op])
    db.session.commit()

    return {
        "org": org,
        "admin": admin_user,
        "operator": op_user,
        "admin_raw_pw": "SecureAdmin1!",
        "op_raw_pw": "SecureOperator2!"
    }


def test_login_success(client, seed_data):
    """
    Verifies that a user with valid credentials successfully authenticates.
    """
    payload = {
        "username": "admin_test",
        "password": seed_data["admin_raw_pw"]
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert "access_token" in json_data["data"]
    assert "refresh_token" in json_data["data"]
    assert json_data["data"]["user"]["username"] == "admin_test"


def test_login_invalid_password(client, seed_data):
    """
    Verifies that logging in with incorrect credentials fails with 401.
    """
    payload = {
        "username": "admin_test",
        "password": "WrongPassword123!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data.get("data") is None


def test_login_nonexistent_user(client, seed_data):
    """
    Verifies authentication fails immediately when the user is not found in database.
    """
    payload = {
        "username": "ghost_operator",
        "password": "SomePassword1!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False


def test_account_lockout(client, seed_data):
    """
    Verifies that users are locked out after exceeding the maximum failed attempts limit.
    """
    payload = {
        "username": "operator_test",
        "password": "InvalidPassword!"
    }
    
    # Trigger 2 failed login attempts (MAX_LOGIN_ATTEMPTS is set to 3 in TestingConfig)
    for _ in range(2):
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 401

    # The 3rd attempt exceeds limit, locks the account, and returns 403
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 403
    json_data = response.get_json()
    assert json_data["success"] is False
    assert "locked" in json_data["message"].lower() or "lock" in json_data["message"].lower()

    # The 4th attempt remains blocked (returns 403)
    response2 = client.post("/api/auth/login", json=payload)
    assert response2.status_code == 403


def test_token_refresh_rotation(client, seed_data):
    """
    Verifies that calling /refresh rotates both access and refresh tokens.
    """
    # 1. Login to get initial refresh token
    login_payload = {
        "username": "admin_test",
        "password": seed_data["admin_raw_pw"]
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    tokens = login_res.get_json()["data"]
    refresh_token = tokens["refresh_token"]

    # 2. Call /refresh using the old refresh token
    refresh_headers = {"Authorization": f"Bearer {refresh_token}"}
    refresh_res = client.post("/api/auth/refresh", headers=refresh_headers)
    assert refresh_res.status_code == 200
    rotated_tokens = refresh_res.get_json()["data"]
    assert "access_token" in rotated_tokens
    assert "refresh_token" in rotated_tokens

    # 3. Double-spend check: presenting the old refresh token a second time should fail (HTTP 401)
    repeat_res = client.post("/api/auth/refresh", headers=refresh_headers)
    assert repeat_res.status_code == 401


def test_password_policy_and_reuse_check(client, seed_data):
    """
    Verifies that password changes enforce complexity rules and block reuse of historic hashes.
    """
    # Login to retrieve token
    login_payload = {
        "username": "operator_test",
        "password": seed_data["op_raw_pw"]
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    headers = {"Authorization": f"Bearer {login_res.get_json()['data']['access_token']}"}

    # 1. Enforces strength complexity checks (weak password should fail with HTTP 400)
    change_payload_weak = {
        "old_password": seed_data["op_raw_pw"],
        "new_password": "weak"
    }
    change_res_weak = client.post("/api/auth/change-password", json=change_payload_weak, headers=headers)
    assert change_res_weak.status_code == 400
    assert "password" in change_res_weak.get_json()["message"].lower()

    # 2. Enforces reuse checks (cannot reuse the current password)
    change_payload_reuse = {
        "old_password": seed_data["op_raw_pw"],
        "new_password": seed_data["op_raw_pw"]
    }
    change_res_reuse = client.post("/api/auth/change-password", json=change_payload_reuse, headers=headers)
    assert change_res_reuse.status_code == 400

    # 3. Successful change with valid new password
    change_payload_ok = {
        "old_password": seed_data["op_raw_pw"],
        "new_password": "NewSecureOperator3!"
    }
    change_res_ok = client.post("/api/auth/change-password", json=change_payload_ok, headers=headers)
    assert change_res_ok.status_code == 200


def test_rbac_endpoint_permissions(client, seed_data):
    """
    Verifies that role/permission middleware checks block users lacking permissions.
    """
    # 1. Login as Read-Only/Data Operator (operator_test holds 'identity:ingest' but lacks 'user:write')
    login_op = client.post("/api/auth/login", json={
        "username": "operator_test",
        "password": seed_data["op_raw_pw"]
    })
    token_op = login_op.get_json()["data"]["access_token"]
    headers_op = {"Authorization": f"Bearer {token_op}"}

    # 2. Attempt registration (which requires user:write permission)
    reg_payload = {
        "username": "new_subadmin",
        "email": "subadmin@test.gov.in",
        "password": "SecureSubpassword1!",
        "organization_id": seed_data["org"].id
    }
    reg_res_blocked = client.post("/api/auth/register", json=reg_payload, headers=headers_op)
    assert reg_res_blocked.status_code == 403 # Lacks permission claim

    # 3. Login as Super Admin (holds all permission claims)
    login_admin = client.post("/api/auth/login", json={
        "username": "admin_test",
        "password": seed_data["admin_raw_pw"]
    })
    token_admin = login_admin.get_json()["data"]["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # 4. Attempt registration as Super Admin (should succeed with HTTP 201)
    reg_res_ok = client.post("/api/auth/register", json=reg_payload, headers=headers_admin)
    assert reg_res_ok.status_code == 201
