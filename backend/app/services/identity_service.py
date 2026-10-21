# -*- coding: utf-8 -*-
"""
Identity Ingestion and Cluster Management Service Layer.
Coordinates raw data validation, field-level encryption, hash normalization,
and cluster linking/deduplication queries.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from app import db
from app.models.identity import Identity, IdentityCluster
from app.repositories import IdentityRepository, IdentityClusterRepository, AuditRepository
from app.validators import IdentityValidator
from app.security import SecurityService
from app.config import Config

logger = logging.getLogger(__name__)


class IdentityServiceInterface:
    """
    Interface defining contract for Identity Ingestion and Cluster Management business operations.
    """
    def ingest_record(self, raw_record_payload: Dict[str, Any], actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Ingests and registers an identity record.

        Args:
            raw_record_payload (Dict[str, Any]): Plaintext and identifier properties.
            actor_user_id (int): ID of the administrative operator user.
            ip_address (str): Requester client IP.

        Returns:
            Dict[str, Any]: Standardized service outcome payload.
        """
        raise NotImplementedError()


class IdentityService(IdentityServiceInterface):
    """
    Concrete implementation of IdentityServiceInterface orchestrating the ingestion pipeline.
    """

    def __init__(self, identity_repo: Optional[IdentityRepository] = None,
                 cluster_repo: Optional[IdentityClusterRepository] = None,
                 audit_repo: Optional[AuditRepository] = None):
        """
        Injects repositories.
        """
        self.identity_repo = identity_repo or IdentityRepository()
        self.cluster_repo = cluster_repo or IdentityClusterRepository()
        self.audit_repo = audit_repo or AuditRepository()

    def ingest_record(self, raw_record_payload: Dict[str, Any], actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Ingests and registers an identity record.
        """
        # Unpack nested attributes if present (frontend alignment)
        if "attributes" in raw_record_payload and isinstance(raw_record_payload["attributes"], dict):
            attrs = raw_record_payload["attributes"]
            payload = dict(raw_record_payload)
            for k, v in attrs.items():
                if k == "name":
                    payload["full_name"] = v
                elif k == "dob":
                    payload["date_of_birth"] = v
                else:
                    payload[k] = v
            raw_record_payload = payload

        # Read keys
        pepper = Config.PEPPER_SECRET
        encryption_key = Config.ENCRYPTION_KEY

        # 1. Hashing Identifiers
        hashed_data = {}
        hash_fields = ["aadhaar", "abha", "digilocker", "mobile", "email"]
        for field in hash_fields:
            raw_val = raw_record_payload.get(field)
            if raw_val:
                hashed_data[f"{field}_hash"] = SecurityService.hash_identifier(raw_val, pepper)
            else:
                hashed_data[f"{field}_hash"] = None

        # 2. Encrypting descriptive PII
        encrypted_data = {}
        enc_fields = ["full_name", "address", "date_of_birth"]
        for field in enc_fields:
            raw_val = raw_record_payload.get(field)
            if raw_val:
                encrypted_data[f"{field}_encrypted"] = SecurityService.encrypt_field(raw_val, encryption_key)
            else:
                encrypted_data[f"{field}_encrypted"] = None

        # 3. Assemble prepared dictionary
        prepared = {
            "system_source": raw_record_payload.get("system_source"),
            "system_uid": raw_record_payload.get("system_uid"),
            "organization_id": raw_record_payload.get("organization_id"),
            "status": raw_record_payload.get("status", "REGISTERED"),
            
            # Source Metadata
            "source_system": raw_record_payload.get("source_system"),
            "source_record_id": raw_record_payload.get("source_record_id"),
            "source_timestamp": raw_record_payload.get("source_timestamp"),

            # Algo Metadata
            "hash_algorithm": "SHA-256",
            "hash_version": "v1",
            "encryption_algorithm": "AES-256-CBC",
            "encryption_key_version": "v1",

            # Hashed Fields
            **hashed_data,

            # Encrypted Fields
            **encrypted_data,

            # Context Plaintext
            "gender": raw_record_payload.get("gender")
        }

        # 4. Run Validator checks on prepared entity
        IdentityValidator.validate_create(prepared)
        if "status" in raw_record_payload:
            IdentityValidator.validate_cluster({"status": raw_record_payload.get("status")})

        # 5. Duplicate Detection & Cluster assignment
        matched_cluster_id = None
        unique_types = ["aadhaar", "abha", "digilocker"]
        for u_type in unique_types:
            h_val = prepared.get(f"{u_type}_hash")
            if h_val:
                existing = self.identity_repo.find_by_hashed_identifier(u_type, h_val)
                if existing:
                    matched_cluster_id = existing.cluster_id
                    logger.info(f"Duplicate hash detected for '{u_type}'. Linking to existing cluster ID: {matched_cluster_id}")
                    break

        # Resolve Parent Cluster
        if matched_cluster_id:
            cluster = self.cluster_repo.get_by_id(matched_cluster_id)
        else:
            cluster = self.cluster_repo.create_cluster(creator_id=actor_user_id)
            logger.info(f"No duplicate unique identifiers matched. Created new Cluster ID: {cluster.id}")

        # 6. Create Identity DB Model
        identity = Identity(
            uuid=str(uuid.uuid4()),
            cluster_id=cluster.id,
            organization_id=prepared["organization_id"],
            system_source=prepared["system_source"],
            system_uid=prepared["system_uid"],
            status=prepared["status"],
            
            source_system=prepared["source_system"],
            source_record_id=prepared["source_record_id"],
            source_timestamp=prepared["source_timestamp"],
            
            hash_algorithm=prepared["hash_algorithm"],
            hash_version=prepared["hash_version"],
            encryption_algorithm=prepared["encryption_algorithm"],
            encryption_key_version=prepared["encryption_key_version"],

            aadhaar_hash=prepared["aadhaar_hash"],
            abha_hash=prepared["abha_hash"],
            digilocker_hash=prepared["digilocker_hash"],
            mobile_hash=prepared["mobile_hash"],
            email_hash=prepared["email_hash"],

            full_name_encrypted=prepared["full_name_encrypted"],
            address_encrypted=prepared["address_encrypted"],
            date_of_birth_encrypted=prepared["date_of_birth_encrypted"],
            gender=prepared["gender"],
            
            created_by=actor_user_id,
            version=1
        )
        self.identity_repo.save(identity)

        # 7. Write Telemetry & Audits
        self.audit_repo.log_audit(
            action="INSERT",
            target_table="identities",
            target_id=identity.id,
            user_id=actor_user_id,
            org_id=prepared["organization_id"],
            new_val={
                "uuid": identity.uuid,
                "system_source": identity.system_source,
                "system_uid": identity.system_uid,
                "cluster_uuid": cluster.uuid
            },
            ip_addr=ip_address
        )

        self.audit_repo.log_activity(
            user_id=actor_user_id,
            activity_type="IDENTITY_INGESTION",
            description=f"Ingested raw record {identity.uuid} resolved to cluster {cluster.uuid}",
            ip_addr=ip_address
        )

        return {
            "success": True,
            "message": "Identity record successfully registered and clustered.",
            "data": {
                "uuid": identity.uuid,
                "cluster_uuid": cluster.uuid,
                "status": identity.status,
                "cluster_status": cluster.status
            }
        }
