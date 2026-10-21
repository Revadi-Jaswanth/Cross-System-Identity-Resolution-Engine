# -*- coding: utf-8 -*-
"""
Organization Management Service Layer.
Handles CRUD operations, optimistic locking, idempotent bulk updates, and status checks.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from flask_sqlalchemy.pagination import Pagination

from app import db
from app.models.user import Organization, User
from app.repositories import OrganizationRepository, AuditRepository
from app.exceptions import (
    IdentityResolutionException, ConflictException, ForbiddenException, UserNotFoundException
)
from app.validators import OrganizationValidator

logger = logging.getLogger(__name__)


class OrganizationService:
    """
    Business logic for Organization profile CRUD and configuration modifications.
    """

    def __init__(self, org_repo: OrganizationRepository = None, audit_repo: AuditRepository = None):
        self.org_repo = org_repo or OrganizationRepository()
        self.audit_repo = audit_repo or AuditRepository()

    def create_organization(self, name: str, code: str, creator_user_id: int, ip_address: str) -> Organization:
        """
        Creates a new tenant Organization (Super Admin only).

        Args:
            name (str): Organization display name.
            code (str): Unique routing code.
            creator_user_id (int): DB user ID initiating transaction.
            ip_address (str): Requester client IP.

        Returns:
            Organization: Created Organization database record.
        """
        # Enforce validation checks
        OrganizationValidator.validate_create({"name": name, "code": code})

        # Check duplicate code
        if self.org_repo.get_by_code(code):
            raise IdentityResolutionException(f"Organization code '{code}' is already registered.", status_code=409)

        org = Organization(
            uuid=str(uuid.uuid4()),
            name=name,
            code=code,
            status='ACTIVE',
            created_by=creator_user_id,
            version=1
        )
        self.org_repo.save(org)

        # Log Database Audit entry
        self.audit_repo.log_audit(
            action="INSERT",
            target_table="organizations",
            target_id=org.id,
            user_id=creator_user_id,
            new_val={"name": name, "code": code, "status": "ACTIVE"},
            ip_addr=ip_address
        )

        logger.info(f"Organization '{code}' created by Super Admin ID: {creator_user_id}")
        return org

    def get_organization(self, uuid_str: str) -> Organization:
        """
        Retrieves organization details by UUID.
        """
        org = self.org_repo.get_by_uuid(uuid_str)
        if not org:
            raise IdentityResolutionException("Organization not found.", status_code=404)
        return org

    def update_organization(self, uuid_str: str, name: Optional[str], status: Optional[str],
                            client_version: int, updater_user_id: int, ip_address: str) -> Organization:
        """
        Updates organization profile with optimistic locking support.

        Args:
            uuid_str (str): Target organization UUID.
            name (str): New name.
            status (str): Target status (e.g. INACTIVE).
            client_version (int): Stale check version provided by the client.
            updater_user_id (int): Operator ID.
            ip_address (str): Requester IP.

        Returns:
            Organization: Updated organization record.
        """
        org = self.org_repo.get_by_uuid(uuid_str)
        if not org:
            raise IdentityResolutionException("Organization not found.", status_code=404)

        # Enforce optimistic locking
        OrganizationValidator.validate_update({"version": client_version, "status": status})
        if org.version != client_version:
            logger.warning(f"Optimistic Lock Conflict on Org ID {org.id}. Client: {client_version}, DB: {org.version}")
            raise ConflictException()

        # Organization Integrity Checks
        if status and status != org.status:
            # Prevent deactivation of Root Org
            if org.id == 1 and status in ["INACTIVE", "DELETED"]:
                raise ForbiddenException("Self-lockout protection: Cannot deactivate or delete the system root organization.")
            
            # Prevent deactivation if active users exist
            if status in ["INACTIVE", "DELETED"]:
                active_users_count = User.query.filter_by(organization_id=org.id, deleted_at=None).filter(User.status != "DELETED").count()
                if active_users_count > 0:
                    raise ForbiddenException(f"Cannot deactivate or delete organization '{org.code}' because it has {active_users_count} active user accounts.")

        old_val = {"name": org.name, "status": org.status, "version": org.version}

        if name:
            org.name = name
        if status:
            org.status = status

        # Increment lock version
        org.version += 1
        org.updated_by = updater_user_id
        db.session.commit()

        # Log database changes
        self.audit_repo.log_audit(
            action="UPDATE",
            target_table="organizations",
            target_id=org.id,
            user_id=updater_user_id,
            old_val=old_val,
            new_val={"name": org.name, "status": org.status, "version": org.version},
            ip_addr=ip_address
        )

        logger.info(f"Organization '{org.code}' updated by user ID: {updater_user_id}")
        return org

    def delete_organization(self, uuid_str: str, deleter_user_id: int, ip_address: str) -> None:
        """
        Soft deletes organization if it has no active users.

        Args:
            uuid_str (str): Target organization UUID.
            deleter_user_id (int): Operator ID.
            ip_address (str): Requester IP.
        """
        org = self.org_repo.get_by_uuid(uuid_str)
        if not org:
            raise IdentityResolutionException("Organization not found.", status_code=404)

        if org.id == 1:
            raise ForbiddenException("Self-lockout protection: Cannot delete the system root organization.")

        active_users_count = User.query.filter_by(organization_id=org.id, deleted_at=None).filter(User.status != "DELETED").count()
        if active_users_count > 0:
            raise ForbiddenException(f"Cannot delete organization '{org.code}' because it contains {active_users_count} active user accounts.")

        old_val = {"status": org.status, "deleted_at": org.deleted_at}

        org.status = 'DELETED'
        org.deleted_at = datetime.utcnow()
        org.deleted_by = deleter_user_id
        db.session.commit()

        # Log delete audit
        self.audit_repo.log_audit(
            action="DELETE",
            target_table="organizations",
            target_id=org.id,
            user_id=deleter_user_id,
            old_val=old_val,
            new_val={"status": "DELETED", "deleted_at": org.deleted_at.isoformat()},
            ip_addr=ip_address
        )

        logger.info(f"Organization '{org.code}' soft deleted by user ID: {deleter_user_id}")

    def list_organizations(self, page: int, page_size: int, search: Optional[str] = None,
                           filters: Optional[Dict[str, Any]] = None, sort_by: str = "created_at",
                           sort_order: str = "desc") -> Pagination:
        """
        Retrieves paginated listing of organizations matching search and filter parameters.
        """
        return self.org_repo.list_paginated_organizations(
            page=page,
            page_size=page_size,
            search_term=search,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order
        )

    def bulk_update_status(self, uuids: List[str], status: str, actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Performs idempotent bulk update of organization statuses.

        Args:
            uuids (List[str]): List of target UUIDs.
            status (str): Target status (e.g. INACTIVE).
            actor_user_id (int): Action operator.
            ip_address (str): Client IP.

        Returns:
            Dict[str, Any]: Summary output showing counts of processed, updated, skipped, and failed records.
        """
        summary = {"processed": 0, "updated": 0, "skipped": 0, "failed": 0, "results": []}
        
        valid_statuses = ["ACTIVE", "INACTIVE"]
        if status not in valid_statuses:
            raise IdentityResolutionException(f"Invalid target status for bulk action. Must be: {valid_statuses}", status_code=400)

        for u in uuids:
            summary["processed"] += 1
            org = self.org_repo.get_by_uuid(u)
            
            if not org:
                summary["failed"] += 1
                summary["results"].append({"uuid": u, "status": "FAILED", "reason": "Organization not found."})
                continue

            # Idempotency check: check if already in target status state
            if org.status == status:
                summary["skipped"] += 1
                summary["results"].append({"uuid": u, "status": "SKIPPED", "reason": f"Organization is already {status}."})
                continue

            # Status deactivation checks
            if status == "INACTIVE":
                if org.id == 1:
                    summary["failed"] += 1
                    summary["results"].append({"uuid": u, "status": "FAILED", "reason": "Root organization cannot be deactivated."})
                    continue

                active_users_count = User.query.filter_by(organization_id=org.id, deleted_at=None).filter(User.status != "DELETED").count()
                if active_users_count > 0:
                    summary["failed"] += 1
                    summary["results"].append({"uuid": u, "status": "FAILED", "reason": f"Organization contains {active_users_count} active user accounts."})
                    continue

            # Apply change
            old_status = org.status
            org.status = status
            org.version += 1
            org.updated_by = actor_user_id
            db.session.commit()

            # Audit logging
            self.audit_repo.log_audit(
                action="UPDATE",
                target_table="organizations",
                target_id=org.id,
                user_id=actor_user_id,
                old_val={"status": old_status},
                new_val={"status": status},
                ip_addr=ip_address
            )

            summary["updated"] += 1
            summary["results"].append({"uuid": u, "status": "UPDATED", "reason": "Status changed successfully."})

        return summary
