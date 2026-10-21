# -*- coding: utf-8 -*-
"""
User Management and Access Control Service Layer.
Coordinates user CRUD actions, roles mapping, self-lockout prevention, and bulk updates.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from flask_sqlalchemy.pagination import Pagination

from app import db
from app.models.user import User, Role, Organization
from app.repositories import UserRepository, RoleRepository, AuditRepository
from app.exceptions import (
    IdentityResolutionException, ConflictException, ForbiddenException, UserNotFoundException
)
from app.validators import UserValidator
from app.security import SecurityService

logger = logging.getLogger(__name__)


class UserService:
    """
    Business logic for administrative User CRUD, account status toggle, and role mapping.
    """

    def __init__(self, user_repo: UserRepository = None, role_repo: RoleRepository = None,
                 audit_repo: AuditRepository = None):
        self.user_repo = user_repo or UserRepository()
        self.role_repo = role_repo or RoleRepository()
        self.audit_repo = audit_repo or AuditRepository()

    def create_user(self, username: str, email: str, password: Optional[str], organization_id: int,
                    creator_user_id: int, role_names: List[str], ip_address: str) -> User:
        """
        Creates a new user account under the defined tenant organization.

        Args:
            username (str): Account nickname.
            email (str): Email address.
            password (str): Optional raw password. Generates random UUID password if empty.
            organization_id (int): Target Organization ID.
            creator_user_id (int): Operator ID.
            role_names (List[str]): List of roles to map.
            ip_address (str): Requester client IP.

        Returns:
            User: Created User record.
        """
        UserValidator.validate_create({
            "username": username,
            "email": email,
            "organization_id": organization_id,
            "password": password or "DummyPass123!" # Pass criteria checks
        })

        # Check duplicates
        if self.user_repo.get_by_username(username) or self.user_repo.get_by_email(email):
            raise IdentityResolutionException("Username or Email is already registered.", status_code=409)

        # Enforce Org Admin limits: Org Admin cannot assign SUPER_ADMIN
        creator = self.user_repo.get_by_id(creator_user_id)
        if creator:
            creator_roles = [role.name for role in creator.roles]
            if "SUPER_ADMIN" not in creator_roles and "SUPER_ADMIN" in role_names:
                raise ForbiddenException("Access denied: Organization Admin cannot assign the SUPER_ADMIN role.")

        plain_pw = password if password else str(uuid.uuid4())[:12] + "Ab1!"
        hashed_pw = SecurityService.hash_password(plain_pw)

        user = User(
            uuid=str(uuid.uuid4()),
            username=username,
            email=email,
            password_hash=hashed_pw,
            organization_id=organization_id,
            status='ACTIVE',
            created_by=creator_user_id,
            version=1
        )

        # Map Roles
        for r_name in role_names:
            role = self.role_repo.get_role_by_name(r_name)
            if role:
                user.roles.append(role)

        self.user_repo.save(user)

        # Save initial password history
        self.user_repo.add_password_history(user.id, hashed_pw)

        # Log Database Audit
        self.audit_repo.log_audit(
            action="INSERT",
            target_table="users",
            target_id=user.id,
            user_id=creator_user_id,
            org_id=organization_id,
            new_val={"username": username, "email": email, "roles": role_names},
            ip_addr=ip_address
        )

        logger.info(f"User '{username}' created successfully by user ID: {creator_user_id}")
        return user

    def get_user(self, uuid_str: str) -> User:
        """
        Retrieves user details by UUID.
        """
        user = self.user_repo.get_by_uuid(uuid_str)
        if not user:
            raise UserNotFoundException()
        return user

    def update_user(self, uuid_str: str, email: Optional[str], status: Optional[str],
                    avatar_url: Optional[str], client_version: int, updater_user_id: int,
                    ip_address: str) -> User:
        """
        Updates user account with optimistic locking check.
        """
        user = self.user_repo.get_by_uuid(uuid_str)
        if not user:
            raise UserNotFoundException()

        UserValidator.validate_update({"version": client_version, "email": email, "status": status})
        
        # Enforce optimistic locking
        if user.version != client_version:
            logger.warning(f"Optimistic Lock Conflict on User ID {user.id}. Client: {client_version}, DB: {user.version}")
            raise ConflictException()

        # Prevent self-lockout deactivation
        if status and status != user.status:
            if status in ["INACTIVE", "LOCKED", "DELETED"]:
                UserValidator.validate_self_safety(updater_user_id, user.id, "DEACTIVATE")

        old_val = {"email": user.email, "status": user.status, "avatar_url": user.avatar_url, "version": user.version}

        if email:
            user.email = email
        if status:
            user.status = status
        if avatar_url:
            user.avatar_url = avatar_url

        user.version += 1
        user.updated_by = updater_user_id
        db.session.commit()

        # Log database audit
        self.audit_repo.log_audit(
            action="UPDATE",
            target_table="users",
            target_id=user.id,
            user_id=updater_user_id,
            org_id=user.organization_id,
            old_val=old_val,
            new_val={"email": user.email, "status": user.status, "avatar_url": user.avatar_url, "version": user.version},
            ip_addr=ip_address
        )

        logger.info(f"User '{user.username}' updated by user ID: {updater_user_id}")
        return user

    def delete_user(self, uuid_str: str, deleter_user_id: int, ip_address: str) -> None:
        """
        Soft deletes a user, enforcing self-lockout guards.
        """
        user = self.user_repo.get_by_uuid(uuid_str)
        if not user:
            raise UserNotFoundException()

        # Prevent self-lockout deletion
        UserValidator.validate_self_safety(deleter_user_id, user.id, "DELETE")

        old_val = {"status": user.status, "deleted_at": user.deleted_at}

        user.status = 'DELETED'
        user.deleted_at = datetime.utcnow()
        user.deleted_by = deleter_user_id
        db.session.commit()

        # Log delete audit
        self.audit_repo.log_audit(
            action="DELETE",
            target_table="users",
            target_id=user.id,
            user_id=deleter_user_id,
            org_id=user.organization_id,
            old_val=old_val,
            new_val={"status": "DELETED", "deleted_at": user.deleted_at.isoformat()},
            ip_addr=ip_address
        )

        logger.info(f"User '{user.username}' soft deleted by user ID: {deleter_user_id}")

    def update_user_roles(self, uuid_str: str, role_names: List[str], actor_user_id: int, ip_address: str) -> User:
        """
        Updates role associations for a user.
        """
        user = self.user_repo.get_by_uuid(uuid_str)
        if not user:
            raise UserNotFoundException()

        # Prevent self-lockout privilege removal
        UserValidator.validate_self_safety(actor_user_id, user.id, "REMOVE_ADMIN_ROLE")

        # Enforce Org Admin limits: cannot assign/remove SUPER_ADMIN role
        actor = self.user_repo.get_by_id(actor_user_id)
        if actor:
            actor_roles = [role.name for role in actor.roles]
            if "SUPER_ADMIN" not in actor_roles:
                # If actor is not Super Admin, block modifying SUPER_ADMIN role mappings
                existing_roles = [role.name for role in user.roles]
                if "SUPER_ADMIN" in existing_roles or "SUPER_ADMIN" in role_names:
                    raise ForbiddenException("Access denied: Organization Admin cannot modify SUPER_ADMIN role associations.")

        old_roles = [role.name for role in user.roles]

        # Reset roles list and bind target roles
        user.roles = []
        for r_name in role_names:
            role = self.role_repo.get_role_by_name(r_name)
            if role:
                user.roles.append(role)

        user.version += 1
        user.updated_by = actor_user_id
        db.session.commit()

        # Log audit log
        self.audit_repo.log_audit(
            action="UPDATE",
            target_table="users",
            target_id=user.id,
            user_id=actor_user_id,
            org_id=user.organization_id,
            old_val={"roles": old_roles},
            new_val={"roles": role_names},
            ip_addr=ip_address
        )

        logger.info(f"User '{user.username}' roles updated by user ID: {actor_user_id}")
        return user

    def list_users(self, current_user: User, page: int, page_size: int, search: Optional[str] = None,
                   filters: Optional[Dict[str, Any]] = None, sort_by: str = "created_at",
                   sort_order: str = "desc") -> Pagination:
        """
        Lists users with sorting, pagination, and tenant isolation filtering.
        """
        return self.user_repo.list_paginated_users(
            current_user=current_user,
            page=page,
            page_size=page_size,
            search_term=search,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order
        )

    def bulk_update_status(self, uuids: List[str], status: str, actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Performs idempotent bulk update of user account statuses.
        """
        summary = {"processed": 0, "updated": 0, "skipped": 0, "failed": 0, "results": []}

        valid_statuses = ["ACTIVE", "INACTIVE"]
        if status not in valid_statuses:
            raise IdentityResolutionException(f"Invalid target status for bulk action. Must be: {valid_statuses}", status_code=400)

        for u in uuids:
            summary["processed"] += 1
            user = self.user_repo.get_by_uuid(u)

            if not user:
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "User not found."})
                continue

            # Prevent self-lockout deactivation
            if user.id == actor_user_id and status == "INACTIVE":
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "You cannot deactivate your own account."})
                continue

            # Idempotency check: check if already in target status state
            if user.status == status:
                summary["skipped"] += 1
                summary["results"].append({"uuid": u, "status": "SKIPPED", "reason": f"User is already {status}."})
                continue

            # Apply change
            old_status = user.status
            user.status = status
            user.version += 1
            user.updated_by = actor_user_id
            db.session.commit()

            # Audit logging
            self.audit_repo.log_audit(
                action="UPDATE",
                target_table="users",
                target_id=user.id,
                user_id=actor_user_id,
                org_id=user.organization_id,
                old_val={"status": old_status},
                new_val={"status": status},
                ip_addr=ip_address
            )

            summary["updated"] += 1
            summary["results"].append({"uuid": u, "status": "UPDATED", "reason": "Status changed successfully."})

        return summary

    def bulk_delete(self, uuids: List[str], actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Performs idempotent bulk soft deletion of user accounts.
        """
        summary = {"processed": 0, "updated": 0, "skipped": 0, "failed": 0, "results": []}

        for u in uuids:
            summary["processed"] += 1
            user = self.user_repo.get_by_uuid(u)

            if not user:
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "User not found."})
                continue

            # Prevent self-lockout deletion
            if user.id == actor_user_id:
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "You cannot delete your own account."})
                continue

            # Idempotency check: already deleted
            if user.status == "DELETED" or user.deleted_at is not None:
                summary["skipped"] += 1
                summary["results"].append({"uuid": u, "status": "SKIPPED", "reason": "User is already deleted."})
                continue

            # Apply change
            user.status = "DELETED"
            user.deleted_at = datetime.utcnow()
            user.deleted_by = actor_user_id
            user.version += 1
            db.session.commit()

            # Audit logging
            self.audit_repo.log_audit(
                action="DELETE",
                target_table="users",
                target_id=user.id,
                user_id=actor_user_id,
                org_id=user.organization_id,
                old_val={"status": "ACTIVE"},
                new_val={"status": "DELETED"},
                ip_addr=ip_address
            )

            summary["updated"] += 1
            summary["results"].append({"uuid": u, "status": "DELETED", "reason": "User deleted successfully."})

        return summary

    def bulk_update_roles(self, uuids: List[str], role_names: List[str], action: str,
                          actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Performs idempotent bulk role adjustments (ADD / REMOVE).
        """
        summary = {"processed": 0, "updated": 0, "skipped": 0, "failed": 0, "results": []}

        if action not in ["ADD", "REMOVE"]:
            raise IdentityResolutionException("Invalid bulk role action. Must be 'ADD' or 'REMOVE'.", status_code=400)

        actor = self.user_repo.get_by_id(actor_user_id)
        actor_roles = [role.name for role in actor.roles] if actor else []

        # Validate role assignment permissions
        if "SUPER_ADMIN" not in actor_roles and "SUPER_ADMIN" in role_names:
            raise ForbiddenException("Access denied: Organization Admin cannot assign the SUPER_ADMIN role.")

        for u in uuids:
            summary["processed"] += 1
            user = self.user_repo.get_by_uuid(u)

            if not user:
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "User not found."})
                continue

            # Prevent self-lockout privilege adjustment
            if user.id == actor_user_id and action == "REMOVE":
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "You cannot remove roles from your own account."})
                continue

            # Enforce Org Admin limits
            if "SUPER_ADMIN" not in actor_roles:
                user_roles_list = [role.name for role in user.roles]
                if "SUPER_ADMIN" in user_roles_list:
                    summary["failed"] += 1
                    summary["results"].append({"uuid": u, "status": "FAILED", "reason": "Cannot modify SUPER_ADMIN user roles."})
                    continue

            # Process additions
            changed = False
            old_roles = [role.name for role in user.roles]

            if action == "ADD":
                for r_name in role_names:
                    role = self.role_repo.get_role_by_name(r_name)
                    if role and role not in user.roles:
                        user.roles.append(role)
                        changed = True
            elif action == "REMOVE":
                for r_name in role_names:
                    role = self.role_repo.get_role_by_name(r_name)
                    if role and role in user.roles:
                        user.roles.remove(role)
                        changed = True

            if not changed:
                summary["skipped"] += 1
                summary["results"].append({"uuid": u, "status": "SKIPPED", "reason": "Roles already matched the target state."})
                continue

            user.version += 1
            user.updated_by = actor_user_id
            db.session.commit()

            # Audit logging
            self.audit_repo.log_audit(
                action="UPDATE",
                target_table="users",
                target_id=user.id,
                user_id=actor_user_id,
                org_id=user.organization_id,
                old_val={"roles": old_roles},
                new_val={"roles": [role.name for role in user.roles]},
                ip_addr=ip_address
            )

            summary["updated"] += 1
            summary["results"].append({"uuid": u, "status": "UPDATED", "reason": f"Roles successfully adjusted."})

        return summary
