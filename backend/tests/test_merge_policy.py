# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for Merge Policy Engine.
Validates same-cluster merges, archived statuses, version mismatches, circular dependencies, cross-org filters, and risk levels.
"""

import uuid
import pytest
from app import db, create_app
from app.config import Config
from app.models.user import Organization, SystemSetting, AuditLog
from app.models.identity import Identity, IdentityCluster
from app.services.merge_policy import DefaultMergePolicy


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
def seed_policy_data(app):
    """Seeds Organizations for testing multi-tenant boundaries."""
    org1 = Organization(id=1, uuid=str(uuid.uuid4()), name="Org One", code="ORG_1", status="ACTIVE")
    org2 = Organization(id=2, uuid=str(uuid.uuid4()), name="Org Two", code="ORG_2", status="ACTIVE")
    db.session.add_all([org1, org2])
    db.session.commit()
    return org1, org2


def test_self_merge_blocked(app, seed_policy_data):
    """
    Verifies that merging a cluster with itself is BLOCKED.
    """
    policy = DefaultMergePolicy()
    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add(c1)
    db.session.commit()

    decision = policy.evaluate(c1, c1, confidence_score=95.0, source_version=1, target_version=1)
    assert decision.status == "BLOCKED"
    assert "SELF_MERGE_BLOCKED" in decision.blocking_rules
    assert decision.is_eligible is False


def test_inactive_cluster_blocked(app, seed_policy_data):
    """
    Verifies that inactive (ARCHIVED/DELETED) clusters are blocked from merging.
    """
    policy = DefaultMergePolicy()
    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="ARCHIVED", version=1)
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    decision = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert decision.status == "BLOCKED"
    assert "INACTIVE_CLUSTER_MERGE_BLOCKED" in decision.blocking_rules


def test_version_mismatch_blocked(app, seed_policy_data):
    """
    Verifies that cluster version conflicts block merge execution.
    """
    policy = DefaultMergePolicy()
    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=2) # Server has version 2
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    decision = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1) # Client submits source version 1
    assert decision.status == "BLOCKED"
    assert "VERSION_MISMATCH_BLOCKED" in decision.blocking_rules


def test_mismatched_unique_hashes_blocked(app, seed_policy_data):
    """
    Verifies that conflicting unique identifiers (Aadhaar hash) block merge.
    """
    policy = DefaultMergePolicy()
    org1, org2 = seed_policy_data

    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    # Seed conflicting identities
    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=1, organization_id=org1.id, system_source="A", system_uid="1", aadhaar_hash="hash_a")
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=2, organization_id=org1.id, system_source="A", system_uid="2", aadhaar_hash="hash_b")
    db.session.add_all([id1, id2])
    db.session.commit()

    decision = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert decision.status == "BLOCKED"
    assert "UNIQUE_ID_MISMATCH_AADHAAR_BLOCKED" in decision.blocking_rules


def test_circular_merge_blocked(app, seed_policy_data):
    """
    Verifies circular merge detection using audit logs mapping reverse history.
    """
    policy = DefaultMergePolicy()
    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    # Seed an audit log indicating cluster 2 was previously merged into cluster 1
    audit = AuditLog(
        action="CLUSTERS_MERGED",
        target_table="identity_clusters",
        target_id=1,
        old_value={"merged_from_id": 2},
        new_value={"merged_into_id": 1}
    )
    db.session.add(audit)
    db.session.commit()

    # Evaluating merge from cluster 1 into cluster 2 (circular loop)
    decision = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert decision.status == "BLOCKED"
    assert "CIRCULAR_MERGE_BLOCKED" in decision.blocking_rules


def test_cross_organization_boundaries(app, seed_policy_data):
    """
    Verifies that merges across organization boundaries are either BLOCKED or warned depending on setting flags.
    """
    policy = DefaultMergePolicy()
    org1, org2 = seed_policy_data

    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=1, organization_id=org1.id, system_source="A", system_uid="1")
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=2, organization_id=org2.id, system_source="B", system_uid="2")
    db.session.add_all([id1, id2])
    db.session.commit()

    # 1. By default, cross-org merges are disabled (allow_cross_org=False) -> should be BLOCKED
    decision_disabled = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert decision_disabled.status == "BLOCKED"
    assert "CROSS_ORGANIZATION_MERGE_BLOCKED" in decision_disabled.blocking_rules

    # 2. Add setting override in system_settings table to enable cross-org merges
    db.session.add(SystemSetting(setting_key="merge_allow_cross_org", setting_value="True"))
    db.session.commit()

    # Re-evaluate -> should be eligible but escalate to HIGH_CONFIDENCE_REVIEW / MEDIUM_RISK with warning
    decision_enabled = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert decision_enabled.status == "HIGH_CONFIDENCE_REVIEW"
    assert decision_enabled.risk_level == "MEDIUM_RISK"
    assert len(decision_enabled.warnings) > 0


def test_risk_levels_and_states(app, seed_policy_data):
    """
    Verifies decision states (AUTO_MERGE, MANUAL_REVIEW, ROLLBACK_REQUIRED) and risks mapping.
    """
    policy = DefaultMergePolicy()
    org1, org2 = seed_policy_data

    c1 = IdentityCluster(id=1, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    c2 = IdentityCluster(id=2, uuid=str(uuid.uuid4()), status="OPEN", version=1)
    db.session.add_all([c1, c2])
    db.session.commit()

    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=1, organization_id=org1.id, system_source="A", system_uid="1")
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=2, organization_id=org1.id, system_source="B", system_uid="2")
    db.session.add_all([id1, id2])
    db.session.commit()

    # Case A: High score (95.0), low risk -> AUTO_MERGE
    dec_a = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert dec_a.status == "AUTO_MERGE"
    assert dec_a.risk_level == "LOW_RISK"

    # Case B: Moderate score (75.0), low risk -> MANUAL_REVIEW
    dec_b = policy.evaluate(c1, c2, confidence_score=75.0, source_version=1, target_version=1)
    assert dec_b.status == "MANUAL_REVIEW"
    assert dec_b.risk_level == "MEDIUM_RISK"

    # Case C: High score but one cluster status is LOCKED -> HIGH_CONFIDENCE_REVIEW
    c1.status = "LOCKED"
    db.session.commit()
    dec_c = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert dec_c.status == "HIGH_CONFIDENCE_REVIEW"
    assert dec_c.risk_level == "MEDIUM_RISK"

    # Case D: Source is already MERGED -> ROLLBACK_REQUIRED
    c1.status = "MERGED"
    db.session.commit()
    dec_d = policy.evaluate(c1, c2, confidence_score=95.0, source_version=1, target_version=1)
    assert dec_d.status == "ROLLBACK_REQUIRED"
    assert dec_d.risk_level == "HIGH_RISK"
