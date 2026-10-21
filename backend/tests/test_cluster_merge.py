# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for ClusterMergeService.
Tests successful merges, policy blocking, transactional rollback, optimistic conflicts, and audit metrics.
"""

import uuid
import pytest
from unittest.mock import patch

from app import db, create_app
from app.config import Config
from app.models.user import Organization, AuditLog, ActivityLog
from app.models.identity import IdentityCluster, Identity, MergeHistory
from app.services.cluster_merge_service import ClusterMergeService
from app.exceptions import ConflictException


class TestingConfig(Config):
    """
    Testing Configuration overrides.
    """
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
def seed_merge_service_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Merge Service Org", code="MERGE_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_successful_cluster_merge(app, seed_merge_service_data):
    """
    Verifies that a valid merge updates identities, soft-deletes source, logs history, and records audit trails.
    """
    service = ClusterMergeService()

    # 1. Create clusters
    c_source = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c_dest = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c_source, c_dest])
    db.session.commit()

    # 2. Link identities to clusters
    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=c_source.id, organization_id=seed_merge_service_data.id, system_source="A", system_uid="1")
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=c_dest.id, organization_id=seed_merge_service_data.id, system_source="B", system_uid="2")
    db.session.add_all([id1, id2])
    db.session.commit()

    # Execute merge
    res = service.merge_clusters(
        source_cluster=c_source,
        target_cluster=c_dest,
        confidence_score=95.0,
        source_version=1,
        target_version=1,
        actor_user_id=1,
        ip_address="127.0.0.1"
    )

    assert res.status == "COMPLETED"
    assert res.merged_identity_count == 1
    assert res.merge_id is not None
    assert res.audit_reference is not None

    # Check Database Updates
    db_source = IdentityCluster.query.filter_by(uuid=c_source.uuid).first()
    assert db_source.status == "MERGED"
    assert db_source.deleted_at is not None

    db_dest = IdentityCluster.query.filter_by(uuid=c_dest.uuid).first()
    assert db_dest.status == "MATCHED"

    # Identities reassignment check
    assert Identity.query.filter_by(cluster_id=c_dest.id).count() == 2
    assert Identity.query.filter_by(cluster_id=c_source.id).count() == 0

    # Merge history trace exists
    history = MergeHistory.query.filter_by(uuid=res.rollback_reference).first()
    assert history is not None
    assert history.source_cluster_id == c_source.id

    # Audit Log exists
    audit = AuditLog.query.filter_by(id=int(res.audit_reference)).first()
    assert audit is not None
    assert audit.action == "CLUSTERS_MERGED"

    # Activity Log exists
    activity = ActivityLog.query.filter_by(activity_type="MERGE_CLUSTERS").first()
    assert activity is not None


def test_merge_blocked_by_policy(app, seed_merge_service_data):
    """
    Verifies that merge rejects and aborts immediately on BLOCKED/ROLLBACK status from policy.
    """
    service = ClusterMergeService()

    # Self-merge check: source is same as target
    c1 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add(c1)
    db.session.commit()

    res = service.merge_clusters(
        source_cluster=c1,
        target_cluster=c1,
        confidence_score=95.0,
        source_version=1,
        target_version=1,
        actor_user_id=1,
        ip_address="127.0.0.1"
    )

    assert res.status == "BLOCKED"
    assert res.merge_id is None
    assert "SELF_MERGE_BLOCKED" in res.warnings


def test_optimistic_locking_conflict(app, seed_merge_service_data):
    """
    Verifies that a version mismatch throws ConflictException and rolls back.
    """
    service = ClusterMergeService()

    c_source = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c_dest = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c_source, c_dest])
    db.session.commit()

    # Source has version 1 in DB, but client submits version 2
    with pytest.raises(ConflictException):
        service.merge_clusters(
            source_cluster=c_source,
            target_cluster=c_dest,
            confidence_score=95.0,
            source_version=2,
            target_version=1,
            actor_user_id=1,
            ip_address="127.0.0.1"
        )


def test_transactional_rollback_on_failure(app, seed_merge_service_data):
    """
    Verifies database session rolls back completely if saving fails.
    """
    service = ClusterMergeService()

    c_source = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c_dest = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c_source, c_dest])
    db.session.commit()

    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=c_source.id, organization_id=seed_merge_service_data.id, system_source="A", system_uid="1")
    db.session.add(id1)
    db.session.commit()

    # Mock saving to database to raise an error and trigger rollback
    with patch.object(service.identity_repo, "save", side_effect=Exception("DB Failure")):
        with pytest.raises(Exception, match="DB Failure"):
            service.merge_clusters(
                source_cluster=c_source,
                target_cluster=c_dest,
                confidence_score=95.0,
                source_version=1,
                target_version=1,
                actor_user_id=1,
                ip_address="127.0.0.1"
            )

    # Verify no state changes occurred (source cluster is still OPEN, deleted_at is None, identity is still with source)
    db_source = IdentityCluster.query.filter_by(uuid=c_source.uuid).first()
    assert db_source.status == "OPEN"
    assert db_source.deleted_at is None

    db_identity = Identity.query.filter_by(uuid=id1.uuid).first()
    assert db_identity.cluster_id == c_source.id
