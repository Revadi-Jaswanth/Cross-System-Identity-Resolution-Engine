# -*- coding: utf-8 -*-
"""
Database ORM Models for Identity Clusters and Ingested Identity Records.
Defines deterministic hashed fields and encrypted PII binary fields.
"""

import uuid
from datetime import datetime
from app import db


class IdentityCluster(db.Model):
    """
    Groups raw identities from multiple systems that resolve to the same person.
    """
    __tablename__ = 'identity_clusters'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    status = db.Column(db.String(50), nullable=False, default='OPEN') # OPEN, MATCHED, MERGED, LOCKED, ARCHIVED, DELETED

    # Audit & Concurrency fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    # Relationships
    identities = db.relationship('Identity', backref='cluster', cascade="all, delete-orphan", lazy='joined')

    def __repr__(self):
        return f"<IdentityCluster {self.uuid} [Status: {self.status}]>"


class Identity(db.Model):
    """
    Individual identity records ingested from external source systems.
    Contains deterministic hashes and encrypted PII binary values.
    """
    __tablename__ = 'identities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    cluster_id = db.Column(db.Integer, db.ForeignKey('identity_clusters.id', ondelete='CASCADE'), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    system_source = db.Column(db.String(100), nullable=False) # e.g. 'Aadhaar', 'ABHA', 'DigiLocker'
    system_uid = db.Column(db.String(100), nullable=False)    # Source unique identifier (non-PII metadata)
    status = db.Column(db.String(50), nullable=False, default='REGISTERED') # REGISTERED, VERIFIED, PENDING, REJECTED, MERGED, ARCHIVED, DELETED

    # Source Record Metadata
    source_system = db.Column(db.String(100), nullable=True)
    source_record_id = db.Column(db.String(100), nullable=True)
    source_timestamp = db.Column(db.DateTime, nullable=True)

    # Cryptographic Hashing and Encryption Metadata
    hash_algorithm = db.Column(db.String(50), nullable=True, default='SHA-256')
    hash_version = db.Column(db.String(20), nullable=True, default='v1')
    encryption_algorithm = db.Column(db.String(50), nullable=True, default='AES-256-CBC')
    encryption_key_version = db.Column(db.String(20), nullable=True, default='v1')

    # One-Way Deterministic Hashed Identifiers (SHA-256 + Pepper)
    aadhaar_hash = db.Column(db.String(64), nullable=True, index=True)
    abha_hash = db.Column(db.String(64), nullable=True, index=True)
    digilocker_hash = db.Column(db.String(64), nullable=True, index=True)
    mobile_hash = db.Column(db.String(64), nullable=True, index=True)
    email_hash = db.Column(db.String(64), nullable=True, index=True)

    # AES-256 Encrypted PII values (Binary Ciphertexts)
    full_name_encrypted = db.Column(db.LargeBinary(512), nullable=True)
    address_encrypted = db.Column(db.LargeBinary(1024), nullable=True)
    date_of_birth_encrypted = db.Column(db.LargeBinary(128), nullable=True)

    # Plaintext context meta
    gender = db.Column(db.String(10), nullable=True)

    # Audit & Concurrency fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    def __repr__(self):
        return f"<Identity {self.uuid} Source: {self.system_source} [Status: {self.status}]>"


class MergeHistory(db.Model):
    """
    Tracks and validates the history of cluster merges for compliance and rollback support.
    """
    __tablename__ = 'merge_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    source_cluster_id = db.Column(db.Integer, nullable=False)
    destination_cluster_id = db.Column(db.Integer, nullable=False)
    source_cluster_uuid = db.Column(db.String(36), nullable=False)
    destination_cluster_uuid = db.Column(db.String(36), nullable=False)
    merged_identity_count = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='COMPLETED') # COMPLETED, ROLLBACK
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f"<MergeHistory {self.uuid} Source: {self.source_cluster_uuid} -> Dest: {self.destination_cluster_uuid}>"


class VerificationRequest(db.Model):
    """
    Saves verification request parameters and payload signatures.
    """
    __tablename__ = 'verification_requests'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='PENDING') # PENDING, COMPLETED, FAILED
    request_signature = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, nullable=True)
    version = db.Column(db.Integer, default=1, nullable=False)

    results = db.relationship('VerificationResult', backref='request', cascade="all, delete-orphan", lazy='joined')


class VerificationResult(db.Model):
    """
    Saves identity resolution result match metrics.
    """
    __tablename__ = 'verification_results'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    verification_request_id = db.Column(db.Integer, db.ForeignKey('verification_requests.id', ondelete='CASCADE'), nullable=False)
    matched_cluster_id = db.Column(db.Integer, db.ForeignKey('identity_clusters.id', ondelete='SET NULL'), nullable=True)
    match_score = db.Column(db.Numeric(5, 2), nullable=True)
    matched_attributes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


