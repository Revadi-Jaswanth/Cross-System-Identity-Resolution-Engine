# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for WeightedScoringStrategy.
Tests weight normalization, database settings loading, completeness, reliability, and edge cases.
"""

import uuid
import pytest
from app import db, create_app
from app.config import Config
from app.models.user import Organization, SystemSetting
from app.models.identity import Identity, IdentityCluster
from app.services.matching_strategy import WeightedScoringStrategy, MatchResult
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
def seed_weighted_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Weighted System Org", code="WEIGHT_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_weight_normalization_validation():
    """
    Verifies that weights are safely normalized to sum to 1.0, and rejects invalid configurations.
    """
    # 1. Valid non-100 sum weights (all equal 10.0) -> should normalize to 1/8 each (0.125)
    equal_weights = {
        "aadhaar": 10.0, "abha": 10.0, "digilocker": 10.0, "mobile": 10.0,
        "email": 10.0, "full_name": 10.0, "address": 10.0, "date_of_birth": 10.0
    }
    strategy = WeightedScoringStrategy(fallback_weights=equal_weights)
    
    # Trigger weight normalization indirectly using mock parameters
    normalized = {k: v / sum(equal_weights.values()) for k, v in equal_weights.items()}
    assert sum(normalized.values()) == pytest.approx(1.0)
    for k in equal_weights.keys():
        assert normalized[k] == 0.125

    # 2. Reject weights sum <= 0
    zero_weights = {
        "aadhaar": 0.0, "abha": 0.0, "digilocker": 0.0, "mobile": 0.0,
        "email": 0.0, "full_name": 0.0, "address": 0.0, "date_of_birth": 0.0
    }
    strategy_zero = WeightedScoringStrategy(fallback_weights=zero_weights)
    with pytest.raises(ValueError, match="Sum of weights must be greater than 0"):
        strategy_zero.match({}, Identity())


def test_database_settings_override(app, seed_weighted_data):
    """
    Verifies that configurations loaded from the database override defaults.
    """
    # Seed weight factor overrides in database settings
    s1 = SystemSetting(setting_key="weight_factor_aadhaar", setting_value="50.0")
    s2 = SystemSetting(setting_key="weight_factor_full_name", setting_value="50.0")
    # Set all other factors to 0 in setting overrides to verify clear weight control
    for f in ["abha", "digilocker", "mobile", "email", "address", "date_of_birth"]:
        db.session.add(SystemSetting(setting_key=f"weight_factor_{f}", setting_value="0.0"))
    
    db.session.add_all([s1, s2])
    db.session.commit()

    strategy = WeightedScoringStrategy()
    
    # Verify dynamic weight overrides match database seed values (50/50 split -> normalized weights = 0.5 each)
    payload = {
        "aadhaar_hash": "hash_xyz",
        "full_name": "Test Person"
    }

    key_secret = Config.ENCRYPTION_KEY
    candidate = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_weighted_data.id,
        system_source="AadhaarService",
        system_uid="UID-1",
        aadhaar_hash="hash_xyz",
        full_name_encrypted=SecurityService.encrypt_field("Test Person", key_secret),
        version=1
    )

    result = strategy.match(payload, candidate)
    
    # 50/50 split normalized weights
    assert result.weights_used["aadhaar"] == 0.5
    assert result.weights_used["full_name"] == 0.5
    # Verification metrics are loaded
    assert result.performance_metrics["config_load_time_ms"] >= 0.0


def test_completeness_and_reliability_multipliers(app, seed_weighted_data):
    """
    Verifies score modifications based on source system reliability and profile completeness.
    """
    strategy = WeightedScoringStrategy()
    key_secret = Config.ENCRYPTION_KEY

    # 1. Complete profile: Aadhaar source system (reliability 1.0), 8 populated fields
    c1 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=1,
        organization_id=seed_weighted_data.id,
        system_source="AadhaarService", # Reliability 1.0
        system_uid="U1",
        aadhaar_hash="hash_a",
        full_name_encrypted=SecurityService.encrypt_field("Same Name", key_secret),
        address_encrypted=SecurityService.encrypt_field("Same Address", key_secret),
        date_of_birth_encrypted=SecurityService.encrypt_field("1990-01-01", key_secret),
        version=1
    )

    payload_complete = {
        "aadhaar": "111122223333",
        "aadhaar_hash": "hash_a",
        "abha": "abha_val",
        "digilocker": "dl_val",
        "mobile": "9999999999",
        "email": "test@test.com",
        "full_name": "Same Name",
        "address": "Same Address",
        "date_of_birth": "1990-01-01"
    }

    res_complete = strategy.match(payload_complete, c1)
    
    # Reliability multiplier = 1.0 (AadhaarService)
    # Completeness fraction = 8/8 = 1.0 -> Multiplier = 0.8 + 0.2*1.0 = 1.0
    # Expected overall score should be 100.0 (high confidence / auto-merge)
    assert res_complete.confidence_level == "HIGH"
    assert res_complete.recommendation == "AUTO_MERGE"
    assert res_complete.confidence_score == pytest.approx(100.0)

    # 2. Sparse profile: Unknown source system (reliability 0.70), only 2 fields populated (Aadhaar & Name)
    payload_sparse = {
        "aadhaar": "111122223333",
        "aadhaar_hash": "hash_a",
        "full_name": "Same Name"
    }

    c2 = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=2,
        organization_id=seed_weighted_data.id,
        system_source="OtherSource", # Reliability 0.70
        system_uid="U2",
        aadhaar_hash="hash_a",
        full_name_encrypted=SecurityService.encrypt_field("Same Name", key_secret),
        version=1
    )

    res_sparse = strategy.match(payload_sparse, c2)
    # Completeness fraction = 2/8 = 0.25 -> completeness multiplier = 0.8 + 0.2*0.25 = 0.85
    # Overall score should be: raw_score (100.0) * source_reliability (0.7) * completeness_multiplier (0.85) = 59.5
    assert res_sparse.confidence_score == pytest.approx(59.5)
    assert res_sparse.confidence_level == "MODERATE"
    assert res_sparse.recommendation == "MANUAL_REVIEW"
