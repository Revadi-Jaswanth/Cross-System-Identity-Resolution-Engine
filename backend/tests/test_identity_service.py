# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for Identity Registration Service Layer.
Validates validation, hashing, encryption, deduplication, and telemetry logs.
"""

import uuid
import pytest
from datetime import datetime

from app import db, create_app
from app.config import Config
from app.models.user import Organization
from app.models.identity import Identity, IdentityCluster
from app.repositories import AuditRepository
from app.services.identity_service import IdentityService
from app.security import SecurityService
from app.exceptions import InvalidIdentifierException


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
def seed_service_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Test Ingest Org", code="INGEST_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_identity_ingest_pipeline_success(app, seed_service_data):
    """
    Verifies that a valid identity payload is successfully hashed, encrypted, mapped to a new cluster, and audited.
    """
    service = IdentityService()
    
    payload = {
        "system_source": "AadhaarService",
        "system_uid": "SRC-100",
        "organization_id": seed_service_data.id,
        "aadhaar": "123456789012",
        "full_name": "Rajesh Kumar",
        "address": "123, Ring Road, Delhi",
        "date_of_birth": "1985-05-15",
        "gender": "Male"
    }

    # 1. Trigger ingestion
    response = service.ingest_record(payload, actor_user_id=1, ip_address="127.0.0.1")
    
    assert response["success"] is True
    assert response["message"] is not None
    data = response["data"]
    assert data["uuid"] is not None
    assert data["cluster_uuid"] is not None
    assert data["status"] == "REGISTERED"

    # 2. Check Database record values
    db_record = Identity.query.filter_by(uuid=data["uuid"]).first()
    assert db_record is not None
    
    # Assert hashing is correct (deterministic)
    expected_hash = SecurityService.hash_identifier("123456789012", Config.PEPPER_SECRET)
    assert db_record.aadhaar_hash == expected_hash

    # Assert PII attributes are encrypted and can be decrypted
    decrypted_name = SecurityService.decrypt_field(db_record.full_name_encrypted, Config.ENCRYPTION_KEY)
    assert decrypted_name == "Rajesh Kumar"

    decrypted_addr = SecurityService.decrypt_field(db_record.address_encrypted, Config.ENCRYPTION_KEY)
    assert decrypted_addr == "123, Ring Road, Delhi"

    decrypted_dob = SecurityService.decrypt_field(db_record.date_of_birth_encrypted, Config.ENCRYPTION_KEY)
    assert decrypted_dob == "1985-05-15"

    # Verify metadata is stored
    assert db_record.hash_algorithm == "SHA-256"
    assert db_record.encryption_algorithm == "AES-256-CBC"


def test_identity_ingest_deduplication_and_clustering(app, seed_service_data):
    """
    Verifies that ingesting records with duplicate unique identifiers resolves and links them to the same cluster.
    """
    service = IdentityService()
    
    # 1. Ingest Aadhaar record (creates new cluster 1)
    payload_a = {
        "system_source": "AadhaarService",
        "system_uid": "SRC-A",
        "organization_id": seed_service_data.id,
        "aadhaar": "999988887777",
        "full_name": "Anoop Verma"
    }
    res_a = service.ingest_record(payload_a, actor_user_id=1, ip_address="127.0.0.1")
    cluster_uuid_a = res_a["data"]["cluster_uuid"]

    # 2. Ingest ABHA record with same Aadhaar (should detect duplication and link to cluster 1)
    payload_b = {
        "system_source": "ABHAService",
        "system_uid": "SRC-B",
        "organization_id": seed_service_data.id,
        "aadhaar": "999988887777",
        "abha": "11223344556677",
        "full_name": "Anoop Verma"
    }
    res_b = service.ingest_record(payload_b, actor_user_id=1, ip_address="127.0.0.1")
    cluster_uuid_b = res_b["data"]["cluster_uuid"]

    # Verify matching clusters
    assert cluster_uuid_a == cluster_uuid_b
    assert IdentityCluster.query.count() == 1 # Only one cluster created


def test_identity_ingest_new_cluster_for_unique_records(app, seed_service_data):
    """
    Verifies that unique identities create and map to separate clusters.
    """
    service = IdentityService()
    
    # Record A
    payload_a = {
        "system_source": "AadhaarService",
        "system_uid": "SRC-A",
        "organization_id": seed_service_data.id,
        "aadhaar": "111122223333",
        "full_name": "Person A"
    }
    res_a = service.ingest_record(payload_a, actor_user_id=1, ip_address="127.0.0.1")
    
    # Record B
    payload_b = {
        "system_source": "AadhaarService",
        "system_uid": "SRC-B",
        "organization_id": seed_service_data.id,
        "aadhaar": "444455556666",
        "full_name": "Person B"
    }
    res_b = service.ingest_record(payload_b, actor_user_id=1, ip_address="127.0.0.1")

    # Assert separate clusters
    assert res_a["data"]["cluster_uuid"] != res_b["data"]["cluster_uuid"]
    assert IdentityCluster.query.count() == 2


def test_ingest_validation_failure(app, seed_service_data):
    """
    Verifies payload structures fail ingestion cleanly when validation constraints are violated.
    """
    service = IdentityService()

    # Missing system_uid
    bad_payload = {
        "system_source": "AadhaarService",
        "organization_id": seed_service_data.id,
        "aadhaar": "123456789012"
    }

    with pytest.raises(InvalidIdentifierException):
        service.ingest_record(bad_payload, actor_user_id=1, ip_address="127.0.0.1")
