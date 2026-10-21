# -*- coding: utf-8 -*-
"""
SQLAlchemy ORM Models for Authentication, Authorization (RBAC), and Audit Logging.
Defines models for Organizations, Users, Roles, Permissions, Tokens, and History.
"""

import uuid
from datetime import datetime
from typing import List
from app import db


# -----------------------------------------------------------------------------
# Association Tables for Many-to-Many Relationships
# -----------------------------------------------------------------------------

user_roles = db.Table(
    'user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

role_permissions = db.Table(
    'role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)


# -----------------------------------------------------------------------------
# Core Organization and Access Control Models
# -----------------------------------------------------------------------------

class Organization(db.Model):
    """
    Represents an isolated tenant / division within the platform.
    """
    __tablename__ = 'organizations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='ACTIVE')

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    # Relationships
    users = db.relationship('User', back_populates='organization', foreign_keys='User.organization_id')

    def __repr__(self) -> str:
        return f"<Organization {self.code}>"


class Role(db.Model):
    """
    Groups permission claims for access control.
    """
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    # Relationships
    permissions = db.relationship('Permission', secondary=role_permissions, back_populates='roles')

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class Permission(db.Model):
    """
    Represents an atomic action capability claim.
    """
    __tablename__ = 'permissions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    # Relationships
    roles = db.relationship('Role', secondary=role_permissions, back_populates='permissions')

    def __repr__(self) -> str:
        return f"<Permission {self.name}>"


# -----------------------------------------------------------------------------
# User Credential and Account Models
# -----------------------------------------------------------------------------

class User(db.Model):
    """
    Platform operator account metadata and credentials.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='ACTIVE')

    # Security controls
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    
    # Scaffolding fields for future MFA integration
    mfa_enabled = db.Column(db.Boolean, default=False, nullable=False)
    mfa_secret = db.Column(db.String(100), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    # Relationships
    organization = db.relationship('Organization', back_populates='users', foreign_keys=[organization_id])
    roles = db.relationship('Role', secondary=user_roles, lazy='joined')
    password_history = db.relationship('PasswordHistory', back_populates='user', cascade="all, delete-orphan", order_by="desc(PasswordHistory.created_at)")

    def get_permissions(self) -> List[str]:
        """
        Collects all atomic permission name strings across the user's roles.

        Returns:
            List[str]: List of unique permission names (e.g. ['identity:ingest']).
        """
        permission_names = set()
        for role in self.roles:
            for perm in role.permissions:
                permission_names.add(perm.name)
        return list(permission_names)

    def is_locked(self) -> bool:
        """
        Evaluates lock status checks.

        Returns:
            bool: True if account lockout state is active.
        """
        if self.status == 'LOCKED':
            if self.locked_until and self.locked_until > datetime.utcnow():
                return True
            else:
                # Automatic unlock duration threshold expired
                return False
        return False

    def __repr__(self) -> str:
        return f"<User {self.username}>"


class PasswordHistory(db.Model):
    """
    Saves historical password hashes to block reuse patterns.
    """
    __tablename__ = 'password_histories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='password_history')


# -----------------------------------------------------------------------------
# Token Management and Blacklisting
# -----------------------------------------------------------------------------

class RefreshToken(db.Model):
    """
    Tracks and validates refresh tokens during rotation.
    """
    __tablename__ = 'refresh_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False) # SHA-256
    expires_at = db.Column(db.DateTime, nullable=False)
    is_revoked = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')


class PasswordResetToken(db.Model):
    """
    Tracks and validates password recovery tokens.
    """
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False) # SHA-256
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')


class JWTBlocklist(db.Model):
    """
    Database blocklist check values for JWT access tokens.
    """
    __tablename__ = 'jwt_blocklist'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti = db.Column(db.String(36), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class APIKey(db.Model):
    """
    Saves external programmatic API clients.
    """
    __tablename__ = 'api_keys'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    key_hash = db.Column(db.String(64), unique=True, nullable=False) # SHA-256
    status = db.Column(db.String(50), nullable=False, default='ACTIVE')
    expires_at = db.Column(db.DateTime, nullable=True)

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    organization = db.relationship('Organization')
    user = db.relationship('User', foreign_keys=[user_id])


# -----------------------------------------------------------------------------
# System Logging and Config Settings
# -----------------------------------------------------------------------------

class LoginHistory(db.Model):
    """
    Saves session audit history logs for compliance tracking.
    """
    __tablename__ = 'login_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='SUCCESS') # SUCCESS, FAILED_PASSWORD, LOCKED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')


class ActivityLog(db.Model):
    """
    Operator actions activity trace.
    """
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    activity_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')


class AuditLog(db.Model):
    """
    System transaction changes logger.
    """
    __tablename__ = 'audit_logs'

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True, autoincrement=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False) # INSERT, UPDATE, DELETE
    target_table = db.Column(db.String(100), nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    old_value = db.Column(db.JSON, nullable=True)
    new_value = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SystemSetting(db.Model):
    """
    Key-Value database configs.
    """
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    # Auditing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)
