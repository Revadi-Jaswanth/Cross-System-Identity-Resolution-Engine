# -*- coding: utf-8 -*-
"""
Authentication & Authorization Business Logic Service Layer.
Coordinates JWT sessions, password policies, lockouts, and auditing.
"""

import uuid
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token

from app import db
from app.models.user import User, RefreshToken, PasswordResetToken, JWTBlocklist
from app.repositories import UserRepository, TokenRepository, AuditRepository
from app.security import SecurityService
from app.validators import RequestValidator
from app.exceptions import (
    UserNotFoundException, InvalidCredentialsException, AccountLockedException,
    PasswordReuseException, TokenRevokedException, AuthenticationException
)

logger = logging.getLogger(__name__)


class AuthService:
    """
    Orchestrates authentication checks, rate limits, audit logs, and token validations.
    """

    def __init__(self, user_repo: UserRepository = None, token_repo: TokenRepository = None,
                 audit_repo: AuditRepository = None):
        self.user_repo = user_repo or UserRepository()
        self.token_repo = token_repo or TokenRepository()
        self.audit_repo = audit_repo or AuditRepository()

    def register_user(self, username: str, email: str, password: str, organization_id: int,
                      creator_user_id: int, ip_address: str) -> User:
        """
        Creates a new operator account (Admin-created account only).

        Args:
            username (str): Account nickname.
            email (str): Target email contact.
            password (str): Target password string.
            organization_id (int): Organization ID tenant association.
            creator_user_id (int): Administrative user executing creation.
            ip_address (str): Remote client IP.

        Returns:
            User: Created User record.
        """
        # Ensure user does not already exist
        if self.user_repo.get_by_username(username) or self.user_repo.get_by_email(email):
            raise AuthenticationException("Username or Email is already registered.", status_code=400)

        # Enforce strength check
        RequestValidator.validate_password_strength(password)

        hashed = SecurityService.hash_password(password)
        
        user = User(
            uuid=str(uuid.uuid4()),
            username=username,
            email=email,
            password_hash=hashed,
            organization_id=organization_id,
            status='ACTIVE',
            created_by=creator_user_id,
            version=1
        )
        
        self.user_repo.save(user)

        # Save initial password history entry
        self.user_repo.add_password_history(user.id, hashed)

        # Audit Event Logging
        self.audit_repo.log_audit(
            action="INSERT",
            target_table="users",
            target_id=user.id,
            user_id=creator_user_id,
            org_id=organization_id,
            new_val={"username": username, "email": email},
            ip_addr=ip_address
        )

        logger.info(f"User '{username}' registered successfully by Admin ID: {creator_user_id}")
        return user

    def register_public_account(self, username: str, email: str, password: str, role_code: str, ip_address: str) -> User:
        """
        Public account registration for non-Super-Admin roles.
        Allowed role_codes: ORG_ADMIN, INGEST_OPERATOR, AUDITOR, CITIZEN
        Super Admin role is strictly forbidden.
        """
        forbidden_roles = ["SUPER_ADMIN", "SUPER ADMIN", "ROOT", "SUPERADMIN"]
        if role_code.upper() in forbidden_roles:
            raise AuthenticationException("Registration of Super Admin role is strictly forbidden.", status_code=403)
        
        if self.user_repo.get_by_username(username) or self.user_repo.get_by_email(email):
            raise AuthenticationException("Username or Email is already registered.", status_code=400)
            
        hashed = SecurityService.hash_password(password)
        
        from app.models.user import Role
        role = Role.query.filter((Role.name == role_code) | (Role.name == role_code.upper())).first()
        if not role:
            role = Role(uuid=str(uuid.uuid4()), name=role_code.upper(), description=f"Role for {role_code}")
            db.session.add(role)
            db.session.commit()
            
        user = User(
            uuid=str(uuid.uuid4()),
            username=username,
            email=email,
            password_hash=hashed,
            organization_id=1,
            status='ACTIVE',
            version=1
        )
        user.roles.append(role)
        db.session.add(user)
        db.session.commit()
        
        self.audit_repo.log_audit(
            action="PUBLIC_REGISTER",
            target_table="users",
            target_id=user.id,
            user_id=user.id,
            org_id=1,
            new_val={"username": username, "email": email, "role": role.name},
            ip_addr=ip_address
        )
        return user

    def authenticate_admin(self, username: str, password: str, ip_address: str, user_agent: str) -> Tuple[User, str, str]:
        """
        Validates operator credentials, locking out after configured failed attempts.

        Args:
            username (str): Nickname string.
            password (str): Cleartext password value.
            ip_address (str): Requester terminal IP.
            user_agent (str): Requester User Agent.

        Returns:
            Tuple[User, str, str]: The authenticated user, JWT access token, and refresh token.
        """
        user = self.user_repo.get_by_username(username)
        if not user:
            logger.warning(f"Login failed: user '{username}' does not exist.")
            raise InvalidCredentialsException()

        # Check Lockout policies
        max_attempts = current_app.config.get("MAX_LOGIN_ATTEMPTS", 5)
        lockout_minutes = current_app.config.get("LOCKOUT_DURATION_MINUTES", 15)

        if user.is_locked():
            logger.warning(f"Login blocked: user '{username}' account is locked.")
            raise AccountLockedException(f"Account is locked. Try again after {user.locked_until} UTC.")

        # If locked status is set but lockout duration threshold passed, auto-unlock
        if user.status == 'LOCKED' and user.locked_until and user.locked_until <= datetime.utcnow():
            user.status = 'ACTIVE'
            user.failed_login_attempts = 0
            user.locked_until = None
            self.user_repo.save(user)

        if not SecurityService.verify_password(password, user.password_hash):
            # Mismatch password increment logic
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= max_attempts:
                user.status = 'LOCKED'
                user.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
                logger.warning(f"User account locked: '{username}' (Attempts: {user.failed_login_attempts})")
                
                self.user_repo.save(user)
                self.audit_repo.log_login(user.id, ip_address, user_agent, "LOCKED")
                self.audit_repo.log_activity(user.id, "LOCKOUT", "User account locked due to consecutive failed attempts.", ip_address)
                raise AccountLockedException(f"Account locked due to too many failed attempts. Locked for {lockout_minutes} minutes.")
            
            self.user_repo.save(user)
            self.audit_repo.log_login(user.id, ip_address, user_agent, "FAILED_PASSWORD")
            raise InvalidCredentialsException()

        # Successful Login Actions
        user.failed_login_attempts = 0
        user.locked_until = None
        user.status = 'ACTIVE'
        self.user_repo.save(user)

        # Generate tokens
        access_token = create_access_token(identity=user.username)
        refresh_token = create_refresh_token(identity=user.username)

        # Store Refresh Token hash in DB
        refresh_jti = decode_token(refresh_token)["jti"]
        hashed_refresh = hashlib.sha256(refresh_token.encode('utf-8')).hexdigest()
        
        db_token = RefreshToken(
            uuid=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=datetime.utcnow() + current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=7)),
            is_revoked=False
        )
        self.token_repo.save_refresh_token(db_token)

        # Auditing Log entries
        self.audit_repo.log_login(user.id, ip_address, user_agent, "SUCCESS")
        self.audit_repo.log_activity(user.id, "LOGIN", "Successful login session initiated.", ip_address)
        
        logger.info(f"User '{username}' authenticated successfully.")
        return user, access_token, refresh_token

    def logout_user(self, user_id: int, access_jti: str, refresh_token_str: str, ip_address: str) -> None:
        """
        Revokes the active refresh token and blacklists the current access token.

        Args:
            user_id (int): DB user ID.
            access_jti (str): Access JWT JTI token key identifier.
            refresh_token_str (str): Plain refresh token string value.
            ip_address (str): Remote request IP.
        """
        # Revoke Refresh Token in database
        if refresh_token_str:
            hashed_refresh = hashlib.sha256(refresh_token_str.encode('utf-8')).hexdigest()
            db_refresh = self.token_repo.get_refresh_token_by_hash(hashed_refresh)
            if db_refresh:
                db_refresh.is_revoked = True
                db.session.commit()

        # Blocklist access token JTI key
        blocked = JWTBlocklist(jti=access_jti)
        db.session.add(blocked)
        db.session.commit()

        self.audit_repo.log_activity(user_id, "LOGOUT", "User logged out successfully. Tokens revoked.", ip_address)
        logger.info(f"User ID {user_id} logged out successfully. Access JWT blocked.")

    def refresh_session(self, old_refresh_token: str, ip_address: str) -> Tuple[str, str]:
        """
        Executes Refresh Token Rotation.
        Validates the hash, revokes the old token, and issues a new access-refresh set.

        Args:
            old_refresh_token (str): Current refresh token.
            ip_address (str): Requester client IP.

        Returns:
            Tuple[str, str]: New Access Token and New Refresh Token.
        """
        hashed_old = hashlib.sha256(old_refresh_token.encode('utf-8')).hexdigest()
        db_token = self.token_repo.get_refresh_token_by_hash(hashed_old)
        
        if not db_token or db_token.is_revoked or db_token.expires_at < datetime.utcnow():
            logger.warning("Session refresh failed: token missing, revoked or expired.")
            raise TokenRevokedException()

        # Invalidate old token (Rotation enforce)
        db_token.is_revoked = True
        db.session.commit()

        user = self.user_repo.get_by_id(db_token.user_id)
        if not user or user.status != 'ACTIVE':
            raise AuthenticationException("User account is inactive or deleted.")

        # Issue new token pair
        new_access = create_access_token(identity=user.username)
        new_refresh = create_refresh_token(identity=user.username)

        # Hash and store new refresh token
        hashed_new = hashlib.sha256(new_refresh.encode('utf-8')).hexdigest()
        new_db_token = RefreshToken(
            uuid=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hashed_new,
            expires_at=datetime.utcnow() + current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=7)),
            is_revoked=False
        )
        self.token_repo.save_refresh_token(new_db_token)

        self.audit_repo.log_activity(user.id, "TOKEN_REFRESH", "Rotated refresh token, issued new session.", ip_address)
        logger.info(f"Tokens rotated successfully for User ID: {user.id}")
        return new_access, new_refresh

    def change_password(self, user_id: int, old_password: str, new_password: str, ip_address: str) -> None:
        """
        Updates user password, verifying history checks (last 3 cannot be reused).

        Args:
            user_id (int): Target user database ID.
            old_password (str): Cleartext old password input.
            new_password (str): Cleartext new password input.
            ip_address (str): Requester client IP.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundException()

        # Verify old password
        if not SecurityService.verify_password(old_password, user.password_hash):
            raise InvalidCredentialsException("Current password verification failed.")

        # Verify strength policy
        RequestValidator.validate_password_strength(new_password)

        # Check reuse policy
        history_limit = current_app.config.get("PASSWORD_HISTORY_LIMIT", 3)
        history_entries = user.password_history[:history_limit]
        
        # Check current password hash too
        if SecurityService.verify_password(new_password, user.password_hash):
            raise PasswordReuseException("New password cannot match your current password.")

        for history in history_entries:
            if SecurityService.verify_password(new_password, history.password_hash):
                raise PasswordReuseException()

        # Save new hash
        new_hashed = SecurityService.hash_password(new_password)
        
        # Save old values first to history before updating user model
        self.user_repo.add_password_history(user.id, new_hashed)
        
        user.password_hash = new_hashed
        self.user_repo.save(user)

        self.audit_repo.log_activity(user.id, "PASSWORD_CHANGE", "Operator password updated successfully.", ip_address)
        logger.info(f"Password changed successfully for User ID: {user_id}")

    def request_password_reset(self, email: str, ip_address: str) -> str:
        """
        Generates a secure password reset token (SHA-256 stored).

        Args:
            email (str): Target email contact.
            ip_address (str): Requester IP.

        Returns:
            str: Cleartext reset token value (to mock/email out).
        """
        user = self.user_repo.get_by_email(email)
        if not user:
            logger.warning(f"Reset request: email '{email}' does not exist. Bypassing silently.")
            # Standard security: return dummy token or mock return, but let's generate to verify tests
            return "silent-bypass-token"

        # Invalidate old reset requests
        self.token_repo.revoke_all_reset_tokens_for_user(user.id)

        # Issue new token
        raw_token = str(uuid.uuid4())
        hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        
        reset_token = PasswordResetToken(
            uuid=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hashed_token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_used=False
        )
        self.token_repo.save_reset_token(reset_token)

        self.audit_repo.log_activity(user.id, "PASSWORD_RESET_REQUEST", "Password recovery reset token issued.", ip_address)
        logger.info(f"Password reset token issued for user ID {user.id}.")
        return raw_token

    def reset_password_with_token(self, token_str: str, new_password: str, ip_address: str) -> None:
        """
        Overrides account password using reset token.

        Args:
            token_str (str): Raw reset token.
            new_password (str): Target password.
            ip_address (str): Client IP.
        """
        hashed_token = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
        db_token = self.token_repo.get_reset_token_by_hash(hashed_token)
        
        if not db_token or db_token.is_used or db_token.expires_at < datetime.utcnow():
            logger.warning("Reset password failed: invalid, used, or expired token.")
            raise TokenRevokedException("Password reset token is invalid or expired.")

        user = self.user_repo.get_by_id(db_token.user_id)
        if not user:
            raise UserNotFoundException()

        # Enforce strength policies
        RequestValidator.validate_password_strength(new_password)

        # Check reuse policies (against current and history)
        history_limit = current_app.config.get("PASSWORD_HISTORY_LIMIT", 3)
        history_entries = user.password_history[:history_limit]
        
        if SecurityService.verify_password(new_password, user.password_hash):
            raise PasswordReuseException("New password cannot match your current password.")

        for history in history_entries:
            if SecurityService.verify_password(new_password, history.password_hash):
                raise PasswordReuseException()

        new_hashed = SecurityService.hash_password(new_password)
        
        # Save password history
        self.user_repo.add_password_history(user.id, new_hashed)

        # Update User
        user.password_hash = new_hashed
        user.status = 'ACTIVE'
        user.failed_login_attempts = 0
        user.locked_until = None
        self.user_repo.save(user)

        # Mark token as used
        db_token.is_used = True
        db.session.commit()

        # Revoke all current refresh sessions (session invalidation)
        self.token_repo.revoke_all_refresh_tokens_for_user(user.id)

        self.audit_repo.log_activity(user.id, "PASSWORD_RESET_COMPLETE", "Password overridden using reset token.", ip_address)
        logger.info(f"Password reset successfully completed for user ID: {user.id}")
