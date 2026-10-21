# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for VeriSync Conflict Resolution Engine.
Validates single values, trusted source wins, timestamp fallbacks, manual reviews, and setting overrides.
"""

import uuid
import pytest
from datetime import datetime, timedelta

from app import db, create_app
from app.config import Config
from app.models.user import Organization, SystemSetting
from app.models.identity import Identity
from app.services.conflict_resolver import DefaultConflictResolver
from app.security import SecurityService


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
def seed_conflict_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Conflict Org", code="CONF_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_no_conflicts_resolved(app, seed_conflict_data):
    """
    Verifies that matches without conflicts resolve automatically with 100% confidence.
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # Single identity record
    id1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="AadhaarService",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Same Name", key_secret),
        address_encrypted=SecurityService.encrypt_field("Same Address", key_secret),
        version=1
    )

    result = resolver.resolve_conflicts([id1])
    
    assert result.severity == "LOW"
    assert result.overall_confidence == 100.0
    assert len(result.warnings) == 0
    assert result.golden_profile.full_name == "Same Name"
    assert result.golden_profile.traceability["full_name"]["applied_policy"] == "SINGLE_VALUE"


def test_trusted_source_wins(app, seed_conflict_data):
    """
    Verifies that trusted source system rankings determine the resolution outcome.
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # In Config: AadhaarService (1.0) > OtherSource (0.7)
    # Aadhaar record
    id_aadhaar = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="AadhaarService",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Rajesh Kumar (Aadhaar)", key_secret),
        version=1
    )
    # Other source record with conflicting name
    id_other = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="OtherSource",
        system_uid="U2",
        full_name_encrypted=SecurityService.encrypt_field("Rajesh Kumar (Other)", key_secret),
        version=1
    )

    result = resolver.resolve_conflicts([id_aadhaar, id_other])
    
    # Aadhaar value should win
    assert result.golden_profile.full_name == "Rajesh Kumar (Aadhaar)"
    assert result.golden_profile.traceability["full_name"]["selected_source"] == "AadhaarService"


def test_recent_source_wins(app, seed_conflict_data):
    """
    Verifies that the most recent timestamp resolved conflicting fields.
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # In Config, Address default policy is MOST_RECENT_SOURCE
    # Record A (older)
    id_old = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="AadhaarService",
        system_uid="U1",
        address_encrypted=SecurityService.encrypt_field("Old Address Location", key_secret),
        source_timestamp=datetime.utcnow() - timedelta(days=10),
        version=1
    )
    # Record B (newer)
    id_new = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="ABHAService",
        system_uid="U2",
        address_encrypted=SecurityService.encrypt_field("New Address Location", key_secret),
        source_timestamp=datetime.utcnow() - timedelta(days=1),
        version=1
    )

    result = resolver.resolve_conflicts([id_old, id_new])
    
    assert result.golden_profile.address == "New Address Location"
    assert result.golden_profile.traceability["address"]["selected_source"] == "ABHAService"


def test_equal_confidence_and_timestamp_fallbacks(app, seed_conflict_data):
    """
    Verifies that ties in trust scores fall back to timestamps, and ties in timestamps fall back to longest string.
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # Conflicting names on equal trust sources (OtherSource, OtherSource)
    # and identical timestamps -> should fall back to longest string
    id1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="OtherSource", # trust 0.7
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Short Name", key_secret),
        source_timestamp=datetime(2026, 1, 1),
        version=1
    )
    id2 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="OtherSource", # trust 0.7
        system_uid="U2",
        full_name_encrypted=SecurityService.encrypt_field("Longest Name Resolved", key_secret),
        source_timestamp=datetime(2026, 1, 1),
        version=1
    )

    result = resolver.resolve_conflicts([id1, id2])
    
    assert result.golden_profile.full_name == "Longest Name Resolved"


def test_manual_review_escalation(app, seed_conflict_data):
    """
    Verifies that fields configured for MANUAL_REVIEW are flagged as PENDING_MANUAL_REVIEW.
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # Override Name policy dynamically in system settings
    setting = SystemSetting(setting_key="conflict_policy_full_name", setting_value="MANUAL_REVIEW")
    db.session.add(setting)
    db.session.commit()

    id1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="AadhaarService",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Name A", key_secret),
        version=1
    )
    id2 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_conflict_data.id,
        system_source="ABHAService",
        system_uid="U2",
        full_name_encrypted=SecurityService.encrypt_field("Name B", key_secret),
        version=1
    )

    result = resolver.resolve_conflicts([id1, id2])
    
    assert result.golden_profile.full_name == "PENDING_MANUAL_REVIEW"
    assert result.golden_profile.traceability["full_name"]["applied_policy"] == "MANUAL_REVIEW"
    assert len(result.warnings) > 0


def test_multiple_conflicts_severity(app, seed_conflict_data):
    """
    Verifies that overall conflict severity is correctly determined based on conflict types (LOW, MEDIUM, HIGH).
    """
    resolver = DefaultConflictResolver()
    key_secret = Config.ENCRYPTION_KEY

    # 1. DOB Conflict -> severity HIGH
    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=1, organization_id=seed_conflict_data.id,
                   system_source="A", system_uid="1", date_of_birth_encrypted=SecurityService.encrypt_field("1990-01-01", key_secret))
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=1, organization_id=seed_conflict_data.id,
                   system_source="B", system_uid="2", date_of_birth_encrypted=SecurityService.encrypt_field("1991-05-15", key_secret))

    result = resolver.resolve_conflicts([id1, id2])
    assert result.severity == "HIGH"
