# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for VeriSync Identity Resolution Engine Core.
Tests candidate retrievals, strategy pipelines, decision states, and explainability.
"""

import uuid
import pytest
from app import db, create_app
from app.config import Config
from app.models.user import Organization
from app.models.identity import Identity, IdentityCluster
from app.services.resolution_service import IdentityResolutionService
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
def client(app):
    """Testing client fixture."""
    return app.test_client()


@pytest.fixture
def seed_resolution_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Resolution Org", code="RESOLVE_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_exact_hash_unique_identifier_match(app, seed_resolution_data):
    """
    Verifies that matching unique identifiers resolves to EXACT_MATCH (100.0 score).
    """
    service = IdentityResolutionService()
    pepper = Config.PEPPER_SECRET

    # 1. Create existing cluster and identity
    c1 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN")
    db.session.add(c1)
    db.session.commit()

    aadhaar_num = "123456789012"
    aadhaar_h = SecurityService.hash_identifier(aadhaar_num, pepper)
    
    id1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=c1.id,
        organization_id=seed_resolution_data.id,
        system_source="IngestSource",
        system_uid="UID-1",
        status="REGISTERED",
        aadhaar_hash=aadhaar_h
    )
    db.session.add(id1)
    db.session.commit()

    # 2. Resolve incoming record with same Aadhaar
    payload = {
        "system_source": "NewIngest",
        "system_uid": "UID-2",
        "organization_id": seed_resolution_data.id,
        "aadhaar": aadhaar_num
    }

    result = service.resolve_identity(payload, actor_user_id=1, ip_address="127.0.0.1")
    
    assert result["decision"] == "EXACT_MATCH"
    assert result["cluster_uuid"] == c1.uuid
    assert result["confidence_score"] == 100.0
    assert "aadhaar_hash" in result["matched_fields"]
    assert result["candidate_count"] == 1
    assert "ExactHash" in [output["strategy_name"] for output in result["strategy_outputs"]]


def test_potential_match_non_unique_identifier(app, seed_resolution_data):
    """
    Verifies that matching non-unique identifiers (Mobile) maps to MANUAL_REVIEW (70.0 score).
    """
    service = IdentityResolutionService()
    pepper = Config.PEPPER_SECRET

    c1 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN")
    db.session.add(c1)
    db.session.commit()

    mobile_num = "9876543210"
    mobile_h = SecurityService.hash_identifier(mobile_num, pepper)
    
    id1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=c1.id,
        organization_id=seed_resolution_data.id,
        system_source="IngestSource",
        system_uid="UID-1",
        status="REGISTERED",
        mobile_hash=mobile_h
    )
    db.session.add(id1)
    db.session.commit()

    payload = {
        "system_source": "NewIngest",
        "system_uid": "UID-2",
        "organization_id": seed_resolution_data.id,
        "mobile": mobile_num
    }

    result = service.resolve_identity(payload, actor_user_id=1, ip_address="127.0.0.1")
    
    # 70.0 score falls inside the [50.0, 84.9] MANUAL_REVIEW range
    assert result["decision"] == "MANUAL_REVIEW"
    assert result["cluster_uuid"] == c1.uuid
    assert result["confidence_score"] == 70.0
    assert "mobile_hash" in result["matched_fields"]


def test_multiple_candidates_ranking(app, seed_resolution_data):
    """
    Verifies CandidateRetriever groups, ranks, and resolves matching clusters based on match counts and rules.
    """
    service = IdentityResolutionService()
    pepper = Config.PEPPER_SECRET

    # Cluster 1: matches both Aadhaar and Mobile (Aadhaar unique match)
    c1 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN")
    # Cluster 2: matches only Mobile
    c2 = IdentityCluster(uuid=str(uuid.uuid4()), status="OPEN")
    db.session.add_all([c1, c2])
    db.session.commit()

    aadhaar_num = "111122223333"
    mobile_num = "9999888877"
    
    a_hash = SecurityService.hash_identifier(aadhaar_num, pepper)
    m_hash = SecurityService.hash_identifier(mobile_num, pepper)

    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=c1.id, organization_id=seed_resolution_data.id,
                   system_source="S", system_uid="U1", status="REGISTERED", aadhaar_hash=a_hash, mobile_hash=m_hash)
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=c2.id, organization_id=seed_resolution_data.id,
                   system_source="S", system_uid="U2", status="REGISTERED", mobile_hash=m_hash)
    
    db.session.add_all([id1, id2])
    db.session.commit()

    payload = {
        "system_source": "Test",
        "system_uid": "U3",
        "organization_id": seed_resolution_data.id,
        "aadhaar": aadhaar_num,
        "mobile": mobile_num
    }

    result = service.resolve_identity(payload, actor_user_id=1, ip_address="127.0.0.1")
    
    # Best candidate is c1 (100.0 Exact unique match vs 70.0 mobile match in c2)
    assert result["decision"] == "EXACT_MATCH"
    assert result["cluster_uuid"] == c1.uuid
    assert result["confidence_score"] == 100.0
    assert result["candidate_count"] == 2 # 2 candidate clusters matched mobile hash


def test_no_matches_resolved(app, seed_resolution_data):
    """
    Verifies that unique payloads return NEW_CLUSTER decision state.
    """
    service = IdentityResolutionService()
    
    payload = {
        "system_source": "IngestSource",
        "system_uid": "UID-10",
        "organization_id": seed_resolution_data.id,
        "aadhaar": "888888888888" # Unseeded unique hash
    }

    result = service.resolve_identity(payload, actor_user_id=1, ip_address="127.0.0.1")
    
    assert result["decision"] == "NEW_CLUSTER"
    assert result["cluster_uuid"] is None
    assert result["confidence_score"] == 0.0
    assert result["candidate_count"] == 0
