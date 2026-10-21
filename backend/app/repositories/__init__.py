# -*- coding: utf-8 -*-
"""
Repository Layer for Database Interactions in VeriSync.
Implements the Data Access Object (DAO) pattern to decouple database queries from business logic.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from flask_sqlalchemy.pagination import Pagination
from app import db
from app.models.user import (
    User, RefreshToken, PasswordResetToken, PasswordHistory,
    AuditLog, ActivityLog, LoginHistory, Role, Organization
)
from app.models.identity import Identity, IdentityCluster, MergeHistory


class BaseRepository:
    """
    Generic/Reusable repository interface for standard CRUD, lookups, existence checks, and pagination.
    """
    def __init__(self, model_class):
        self.model_class = model_class

    def get_by_id(self, id_val: Any) -> Optional[Any]:
        """
        Retrieves a database entity by integer ID.
        """
        return db.session.get(self.model_class, id_val)

    def get_by_uuid(self, uuid_str: str) -> Optional[Any]:
        """
        Retrieves a database entity by UUID string.
        """
        return self.model_class.query.filter_by(uuid=uuid_str, deleted_at=None).first()

    def exists(self, id_val: Any) -> bool:
        """
        Checks if an entity with the specified ID exists in the database.
        """
        return db.session.query(db.exists().where(self.model_class.id == id_val)).scalar()

    def count(self) -> int:
        """
        Counts non-deleted records of the model.
        """
        return self.model_class.query.filter(self.model_class.deleted_at == None).count()

    def save(self, entity: Any) -> None:
        """
        Persists a single database record and commits.
        """
        db.session.add(entity)
        db.session.commit()

    def bulk_insert(self, entities: List[Any]) -> None:
        """
        Persists multiple records efficiently.
        """
        db.session.add_all(entities)
        db.session.commit()

    def bulk_update(self, entities: List[Any]) -> None:
        """
        Commits updates across loaded entities.
        """
        db.session.commit()

    def bulk_soft_delete(self, uuids: List[str], actor_id: int) -> None:
        """
        Flags multiple database records as deleted.
        """
        self.model_class.query.filter(self.model_class.uuid.in_(uuids)).update({
            "deleted_at": datetime.utcnow(),
            "status": "DELETED",
            "deleted_by": actor_id
        }, synchronize_session=False)
        db.session.commit()


class UserRepositoryInterface:
    """
    Interface/Base class specifying data access patterns for User credentials.
    """
    def get_by_id(self, user_id: int) -> Optional[User]:
        raise NotImplementedError()

    def get_by_username(self, username: str) -> Optional[User]:
        raise NotImplementedError()

    def get_by_email(self, email: str) -> Optional[User]:
        raise NotImplementedError()

    def save(self, user: User) -> None:
        raise NotImplementedError()


class UserRepository(BaseRepository, UserRepositoryInterface):
    """
    SQLAlchemy ORM implementation for User entity persistence operations.
    """
    def __init__(self):
        super().__init__(User)

    def get_by_id(self, user_id: int) -> Optional[User]:
        return User.query.filter_by(id=user_id, deleted_at=None).first()

    def get_by_username(self, username: str) -> Optional[User]:
        return User.query.filter_by(username=username, deleted_at=None).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return User.query.filter_by(email=email, deleted_at=None).first()

    def get_all_active(self) -> List[User]:
        return User.query.filter_by(deleted_at=None).all()

    def add_password_history(self, user_id: int, password_hash: str) -> None:
        history = PasswordHistory(user_id=user_id, password_hash=password_hash)
        db.session.add(history)
        db.session.commit()

    def list_paginated_users(self, current_user: User, page: int, page_size: int,
                             search_term: Optional[str] = None, filters: Optional[Dict[str, Any]] = None,
                             sort_by: str = "created_at", sort_order: str = "desc") -> Pagination:
        query = User.query.filter(User.deleted_at == None)

        user_roles = [role.name for role in current_user.roles]
        if "SUPER_ADMIN" not in user_roles:
            query = query.filter(User.organization_id == current_user.organization_id)

        if search_term:
            term = f"%{search_term}%"
            query = query.filter((User.username.like(term)) | (User.email.like(term)))

        if filters:
            if "status" in filters and filters["status"]:
                query = query.filter(User.status == filters["status"])
            if "organization_id" in filters and filters["organization_id"]:
                if "SUPER_ADMIN" in user_roles:
                    query = query.filter(User.organization_id == filters["organization_id"])
            if "role" in filters and filters["role"]:
                query = query.join(User.roles).filter(Role.name == filters["role"])
            if "mfa_enabled" in filters:
                query = query.filter(User.mfa_enabled == filters["mfa_enabled"])
            if "created_after" in filters and filters["created_after"]:
                query = query.filter(User.created_at >= filters["created_after"])
            if "created_before" in filters and filters["created_before"]:
                query = query.filter(User.created_at <= filters["created_before"])

        col = getattr(User, sort_by, User.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(col.desc())
        else:
            query = query.order_by(col.asc())

        return query.paginate(page=page, per_page=page_size, error_out=False)


class TokenRepository:
    """
    Handles JWT Refresh and Reset Token database records.
    """
    @staticmethod
    def get_refresh_token_by_hash(token_hash: str) -> Optional[RefreshToken]:
        return RefreshToken.query.filter_by(token_hash=token_hash).first()

    @staticmethod
    def save_refresh_token(token: RefreshToken) -> None:
        db.session.add(token)
        db.session.commit()

    @staticmethod
    def revoke_all_refresh_tokens_for_user(user_id: int) -> None:
        RefreshToken.query.filter_by(user_id=user_id, is_revoked=False).update({"is_revoked": True})
        db.session.commit()

    @staticmethod
    def get_reset_token_by_hash(token_hash: str) -> Optional[PasswordResetToken]:
        return PasswordResetToken.query.filter_by(token_hash=token_hash).first()

    @staticmethod
    def save_reset_token(token: PasswordResetToken) -> None:
        db.session.add(token)
        db.session.commit()

    @staticmethod
    def revoke_all_reset_tokens_for_user(user_id: int) -> None:
        PasswordResetToken.query.filter_by(user_id=user_id, is_used=False).update({"is_used": True})
        db.session.commit()


class AuditRepository:
    """
    Handles system transaction, compliance logging, and admin session auditing.
    """
    @staticmethod
    def log_audit(action: str, target_table: str, target_id: int, user_id: Optional[int] = None,
                  org_id: Optional[int] = None, old_val: Optional[dict] = None,
                  new_val: Optional[dict] = None, ip_addr: Optional[str] = None) -> AuditLog:
        log = AuditLog(
            action=action,
            target_table=target_table,
            target_id=target_id,
            user_id=user_id,
            organization_id=org_id,
            old_value=old_val,
            new_value=new_val,
            ip_address=ip_addr
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def log_activity(user_id: int, activity_type: str, description: str, ip_addr: Optional[str] = None) -> None:
        log = ActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            ip_address=ip_addr
        )
        db.session.add(log)
        db.session.commit()

    @staticmethod
    def log_login(user_id: int, ip_addr: str, user_agent: Optional[str], status: str) -> None:
        log = LoginHistory(
            user_id=user_id,
            ip_address=ip_addr,
            user_agent=user_agent,
            status=status
        )
        db.session.add(log)
        db.session.commit()


class RoleRepository:
    """
    Handles Role & Permission claims metadata queries.
    """
    @staticmethod
    def get_role_by_name(name: str) -> Optional[Role]:
        return Role.query.filter_by(name=name).first()


class OrganizationRepository(BaseRepository):
    """
    Handles Tenant Organization metadata queries.
    """
    def __init__(self):
        super().__init__(Organization)

    def get_by_id(self, org_id: int) -> Optional[Organization]:
        return Organization.query.filter_by(id=org_id, deleted_at=None).first()

    def get_by_code(self, code_str: str) -> Optional[Organization]:
        return Organization.query.filter_by(code=code_str, deleted_at=None).first()

    def list_paginated_organizations(self, page: int, page_size: int, search_term: Optional[str] = None,
                                    filters: Optional[Dict[str, Any]] = None, sort_by: str = "created_at",
                                    sort_order: str = "desc") -> Pagination:
        query = Organization.query.filter(Organization.deleted_at == None)

        if search_term:
            term = f"%{search_term}%"
            query = query.filter((Organization.name.like(term)) | (Organization.code.like(term)))

        if filters:
            if "status" in filters and filters["status"]:
                query = query.filter(Organization.status == filters["status"])
            if "created_after" in filters and filters["created_after"]:
                query = query.filter(Organization.created_at >= filters["created_after"])
            if "created_before" in filters and filters["created_before"]:
                query = query.filter(Organization.created_at <= filters["created_before"])

        col = getattr(Organization, sort_by, Organization.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(col.desc())
        else:
            query = query.order_by(col.asc())

        return query.paginate(page=page, per_page=page_size, error_out=False)


class IdentityClusterRepositoryInterface:
    """
    Interface specifying query mapping methods on Person clusters.
    """
    def get_by_id(self, cluster_id: int) -> Optional[IdentityCluster]:
        raise NotImplementedError()

    def get_by_uuid(self, uuid_str: str) -> Optional[IdentityCluster]:
        raise NotImplementedError()

    def save(self, cluster: IdentityCluster) -> None:
        raise NotImplementedError()

    def create_cluster(self, creator_id: int) -> IdentityCluster:
        raise NotImplementedError()


class IdentityClusterRepository(BaseRepository, IdentityClusterRepositoryInterface):
    """
    Concrete data persistent repository implementation for IdentityCluster entities.
    """
    def __init__(self):
        super().__init__(IdentityCluster)

    def create_cluster(self, creator_id: int) -> IdentityCluster:
        cluster = IdentityCluster(
            uuid=str(uuid.uuid4()),
            status='OPEN',
            created_by=creator_id,
            version=1
        )
        self.save(cluster)
        return cluster


class IdentityRepositoryInterface:
    """
    Interface specifying query mapping methods on raw ingested identities.
    """
    def get_by_id(self, identity_id: int) -> Optional[Identity]:
        raise NotImplementedError()

    def get_by_uuid(self, uuid_str: str) -> Optional[Identity]:
        raise NotImplementedError()

    def save(self, identity: Identity) -> None:
        raise NotImplementedError()

    def find_by_hashed_identifier(self, identifier_type: str, hashed_value: str) -> Optional[Identity]:
        raise NotImplementedError()

    def find_by_cluster_id(self, cluster_id: int) -> List[Identity]:
        raise NotImplementedError()

    def link_to_cluster(self, identity_id: int, cluster_id: int, actor_id: int) -> None:
        raise NotImplementedError()

    def find_candidates_by_hashes(self, hashes: Dict[str, str]) -> List[Identity]:
        raise NotImplementedError()


class IdentityRepository(BaseRepository, IdentityRepositoryInterface):
    """
    Concrete data persistent repository implementation for Identity entities.
    """
    def __init__(self):
        super().__init__(Identity)

    def find_by_hashed_identifier(self, identifier_type: str, hashed_value: str) -> Optional[Identity]:
        col_name = f"{identifier_type}_hash"
        if not hasattr(Identity, col_name):
            return None
        col = getattr(Identity, col_name)
        return Identity.query.filter(col == hashed_value, Identity.deleted_at == None).first()

    def find_by_cluster_id(self, cluster_id: int) -> List[Identity]:
        return Identity.query.filter_by(cluster_id=cluster_id, deleted_at=None).all()

    def link_to_cluster(self, identity_id: int, cluster_id: int, actor_id: int) -> None:
        identity = self.get_by_id(identity_id)
        if identity:
            identity.cluster_id = cluster_id
            identity.updated_by = actor_id
            identity.version += 1
            self.save(identity)

    def find_candidates_by_hashes(self, hashes: Dict[str, str]) -> List[Identity]:
        from sqlalchemy import or_
        filters = []
        for field, val in hashes.items():
            if val:
                col_name = f"{field}_hash" if not field.endswith("_hash") else field
                if hasattr(Identity, col_name):
                    filters.append(getattr(Identity, col_name) == val)
        if not filters:
            return []
        return Identity.query.filter(or_(*filters), Identity.deleted_at == None).all()


class MergeHistoryRepositoryInterface:
    def get_by_id(self, history_id: int) -> Optional[MergeHistory]:
        raise NotImplementedError()

    def get_by_uuid(self, uuid_str: str) -> Optional[MergeHistory]:
        raise NotImplementedError()

    def save(self, record: MergeHistory) -> None:
        raise NotImplementedError()


class MergeHistoryRepository(BaseRepository, MergeHistoryRepositoryInterface):
    def __init__(self):
        super().__init__(MergeHistory)
