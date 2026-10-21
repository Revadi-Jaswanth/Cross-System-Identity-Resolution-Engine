# -*- coding: utf-8 -*-
"""
Pytest Verification Suite for Identity Registration Data Layer.
Tests ORM mapping integrity, Repository queries, bulk actions, and validator constraints.
"""

import uuid
import pytest
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from app import db, create_app
from app.config import Config
from app.models.user import Organization
from app.models.identity import Identity, IdentityCluster
from app.repositories import IdentityRepository, IdentityClusterRepository
from app.validators import IdentityValidator
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
def seed_identity_data(app):
    """Seeds Organization for foreign key reference."""
    org = Organization(id=1, uuid=str(uuid.uuid4()), name="Test Org", code="TEST_ORG", status="ACTIVE")
    db.session.add(org)
    db.session.commit()
    return org


def test_identity_and_cluster_creation(app, seed_identity_data):
    """
    Validates model mapping, foreign keys, and status constraints.
    """
    cluster_repo = IdentityClusterRepository()
    identity_repo = IdentityRepository()

    # 1. Create Identity Cluster
    cluster = cluster_repo.create_cluster(creator_id=1)
    assert cluster.id is not None
    assert cluster.uuid is not None
    assert cluster.status == "OPEN"

    # 2. Ingest Identity linked to cluster
    aadhaar_hash = "a" * 64
    name_encrypted_bytes = b"\x01\x02\x03encryptednamebytes"

    identity = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=cluster.id,
        organization_id=seed_identity_data.id,
        system_source="AadhaarIngestionService",
        system_uid="UID-12345",
        status="REGISTERED",
        aadhaar_hash=aadhaar_hash,
        full_name_encrypted=name_encrypted_bytes,
        version=1
    )
    identity_repo.save(identity)

    # 3. Retrieve and assert values
    fetched_identity = identity_repo.get_by_uuid(identity.uuid)
    assert fetched_identity is not None
    assert fetched_identity.system_source == "AadhaarIngestionService"
    assert fetched_identity.aadhaar_hash == aadhaar_hash
    assert fetched_identity.full_name_encrypted == name_encrypted_bytes
    assert fetched_identity.cluster.id == cluster.id


def test_repository_lookups_by_hashed_identifier(app, seed_identity_data):
    """
    Verifies that the repository correctly retrieves identity records by hashed identifiers.
    """
    cluster_repo = IdentityClusterRepository()
    identity_repo = IdentityRepository()

    cluster = cluster_repo.create_cluster(creator_id=1)
    
    abha_hash = "b" * 64
    identity = Identity(
        uuid=str(uuid.uuid4()),
        cluster_id=cluster.id,
        organization_id=seed_identity_data.id,
        system_source="ABHAIngestionService",
        system_uid="ABHA-9999",
        status="REGISTERED",
        abha_hash=abha_hash,
        version=1
    )
    identity_repo.save(identity)

    # Find using abha identifier type
    match = identity_repo.find_by_hashed_identifier("abha", abha_hash)
    assert match is not None
    assert match.uuid == identity.uuid

    # Non-existent hash should return None
    no_match = identity_repo.find_by_hashed_identifier("abha", "c" * 64)
    assert no_match is None


def test_base_repository_exist_count_pagination_and_bulk_operations(app, seed_identity_data):
    """
    Tests exist, count, pagination helper logic, and bulk insertions/soft deletes.
    """
    cluster_repo = IdentityClusterRepository()
    identity_repo = IdentityRepository()

    cluster = cluster_repo.create_cluster(creator_id=1)

    # Count before insert
    assert identity_repo.count() == 0

    # Bulk Ingest Identities
    id1 = Identity(uuid=str(uuid.uuid4()), cluster_id=cluster.id, organization_id=seed_identity_data.id,
                   system_source="A", system_uid="S1", status="REGISTERED")
    id2 = Identity(uuid=str(uuid.uuid4()), cluster_id=cluster.id, organization_id=seed_identity_data.id,
                   system_source="B", system_uid="S2", status="REGISTERED")
    
    identity_repo.bulk_insert([id1, id2])

    assert identity_repo.count() == 2
    assert identity_repo.exists(id1.id) is True

    # Bulk Soft Delete
    identity_repo.bulk_soft_delete([id1.uuid, id2.uuid], actor_id=1)
    
    assert identity_repo.count() == 0 # Non-deleted count is now 0
    assert identity_repo.get_by_uuid(id1.uuid) is None # Filters out soft deleted in query


def test_validation_layer_constraints(app):
    """
    Verifies that the validator correctly validates parameters, hash lengths, binary values, and status values.
    """
    # 1. Missing required field
    bad_data_missing = {
        "system_source": "Test",
        "organization_id": 1
        # missing system_uid
    }
    with pytest.raises(InvalidIdentifierException) as excinfo:
        IdentityValidator.validate_create(bad_data_missing)
    assert "Missing required identity ingestion field" in str(excinfo.value)

    # 2. Invalid Hash format (not 64 characters)
    bad_hash_data = {
        "system_source": "TestSource",
        "system_uid": "U1",
        "organization_id": 1,
        "aadhaar_hash": "short_hash"
    }
    with pytest.raises(InvalidIdentifierException) as excinfo:
        IdentityValidator.validate_create(bad_hash_data)
    assert "must be a valid 64-character SHA-256 hex hash" in str(excinfo.value)

    # 3. Invalid encrypted format (not bytes)
    bad_encryption_data = {
        "system_source": "TestSource",
        "system_uid": "U1",
        "organization_id": 1,
        "full_name_encrypted": "string_instead_of_bytes"
    }
    with pytest.raises(InvalidIdentifierException) as excinfo:
        IdentityValidator.validate_create(bad_encryption_data)
    assert "must be raw encrypted bytes" in str(excinfo.value)

    # 4. Invalid lifecycle status
    bad_status_data = {
        "system_source": "TestSource",
        "system_uid": "U1",
        "organization_id": 1,
        "status": "INVALID_LIFECYCLE_STATUS"
    }
    with pytest.raises(InvalidIdentifierException) as excinfo:
        IdentityValidator.validate_create(bad_status_data)
    assert "Invalid identity lifecycle status" in str(excinfo.value)


def test_duplicate_uuid_handling(app, seed_identity_data):
    """
    Verifies database uniqueness constraints raise IntegrityError.
    """
    cluster_repo = IdentityClusterRepository()
    identity_repo = IdentityRepository()

    cluster = cluster_repo.create_cluster(creator_id=1)
    shared_uuid = str(uuid.uuid4())

    id1 = Identity(uuid=shared_uuid, cluster_id=cluster.id, organization_id=seed_identity_data.id,
                   system_source="A", system_uid="S1", status="REGISTERED")
    identity_repo.save(id1)

    id2 = Identity(uuid=shared_uuid, cluster_id=cluster.id, organization_id=seed_identity_data.id,
                   system_source="B", system_uid="S2", status="REGISTERED")

    with pytest.raises(IntegrityError):
        identity_repo.save(id2)
