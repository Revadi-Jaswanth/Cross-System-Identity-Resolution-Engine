# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for RapidFuzz Ingestion Matching Strategy.
Tests normalization (accents, punctuation, spacing), weights, missing fields, and multilingual.
"""

import uuid
import pytest
from app import db, create_app
from app.config import Config
from app.models.user import Organization
from app.models.identity import Identity, IdentityCluster
from app.services.matching_strategy import RapidFuzzStrategy, MatchResult
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
def seed_fuzzy_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="National Authority", code="NAT_AUTH", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_text_normalization_edges():
    """
    Verifies punctuation removal, accent stripping, casing, and spacing trim.
    """
    # 1. Accent stripping & capitalization
    assert RapidFuzzStrategy.normalize_text("Râjêsh Kumâr") == "rajesh kumar"
    assert RapidFuzzStrategy.normalize_text("JOHN DOE") == "john doe"

    # 2. Punctuation removal
    assert RapidFuzzStrategy.normalize_text("V.P. Road, Mumbai - 400004.") == "vp road mumbai 400004"
    assert RapidFuzzStrategy.normalize_text("No. 12/B, Block-A!") == "no 12b blocka"

    # 3. Collapse extra whitespace
    assert RapidFuzzStrategy.normalize_text("  new    delhi  ") == "new delhi"

    # 4. Punctuation-only string
    assert RapidFuzzStrategy.normalize_text(",.-!#$") == ""


def test_fuzzy_matching_skipped_missing_fields(app, seed_fuzzy_data):
    """
    Verifies that missing optional fields (like org name) are skipped rather than scored as 0.
    """
    strategy = RapidFuzzStrategy()
    key_secret = Config.ENCRYPTION_KEY

    # Candidate record has only Name and Address, org name is empty
    candidate = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_fuzzy_data.id,
        system_source="Test",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Rajesh Verma", key_secret),
        address_encrypted=SecurityService.encrypt_field("Sector 15, Noida, UP", key_secret),
        version=1
    )

    # Incoming payload has name, address, but no organization_name
    incoming = {
        "full_name": "Rajesh Verma",
        "address": "Sector 15, Noida, UP"
    }

    result = strategy.match(incoming, candidate)
    
    assert result.confidence_score >= 99.0
    assert "organization_name" in result.skipped_fields
    assert len(result.skipped_fields) == 1
    # Full Name and Address should be mapped under field_scores
    assert "full_name" in result.field_scores
    assert "address" in result.field_scores
    assert "organization_name" not in result.field_scores


def test_fuzzy_matching_address_normalization_and_weights(app, seed_fuzzy_data):
    """
    Verifies address components joining and configurable scoring weights.
    """
    key_secret = Config.ENCRYPTION_KEY

    # 1. Configurable custom weights
    custom_weights = {
        "wratio": 1.0,
        "token_set_ratio": 0.0,
        "token_sort_ratio": 0.0,
        "partial_ratio": 0.0,
        "jaro_winkler": 0.0
    }
    strategy = RapidFuzzStrategy(weights=custom_weights)

    candidate = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_fuzzy_data.id,
        system_source="Test",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("Arun Sharma", key_secret),
        address_encrypted=SecurityService.encrypt_field("A-50, Ring Road, Delhi, 110001", key_secret),
        version=1
    )

    # Incoming has address split in components
    incoming = {
        "full_name": "Arun Sharma",
        "address": "A-50, Ring Road",
        "city": "Delhi",
        "state": "Delhi",
        "postal_code": "110001"
    }

    result = strategy.match(incoming, candidate)
    assert result.confidence_score >= 95.0
    
    # Confirm WRatio similarity was executed and dominated the weight calculation
    scores = result.field_scores["address"]
    assert scores["weighted_average"] == scores["wratio"]


def test_fuzzy_matching_multilingual_input(app, seed_fuzzy_data):
    """
    Verifies matches on multilingual strings and accented parameters.
    """
    strategy = RapidFuzzStrategy()
    key_secret = Config.ENCRYPTION_KEY

    candidate = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_fuzzy_data.id,
        system_source="Test",
        system_uid="U1",
        full_name_encrypted=SecurityService.encrypt_field("José François", key_secret),
        address_encrypted=SecurityService.encrypt_field("Champs-Élysées, Paris", key_secret),
        version=1
    )

    # Plain ASCII incoming
    incoming = {
        "full_name": "Jose Francois",
        "address": "Champs Elysees Paris"
    }

    result = strategy.match(incoming, candidate)
    # Accent stripping normalization maps both to 'jose francois' and 'champs elysees paris'
    assert result.confidence_score >= 98.0
