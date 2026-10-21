# -*- coding: utf-8 -*-
"""
VeriSync Conflict Resolution Engine.
Identifies attribute disagreements, resolves conflicts using configurable policies,
and builds Golden Profiles with full source traceability and audit logs.
"""

import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from app import db
from app.models.identity import Identity
from app.models.user import SystemSetting
from app.security import SecurityService
from app.config import Config

logger = logging.getLogger(__name__)


class GoldenProfile:
    """
    Represents the constructed Golden Profile containing resolved fields and field-level traceability metadata.
    """
    def __init__(self, full_name: Optional[str] = None, address: Optional[str] = None,
                 date_of_birth: Optional[str] = None, email: Optional[str] = None,
                 mobile: Optional[str] = None, gender: Optional[str] = None,
                 traceability: Optional[Dict[str, Any]] = None):
        self.full_name = full_name
        self.address = address
        self.date_of_birth = date_of_birth
        self.email = email
        self.mobile = mobile
        self.gender = gender
        self.traceability = traceability or {}

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the Golden Profile to serializable dict format.
        """
        return {
            "full_name": self.full_name,
            "address": self.address,
            "date_of_birth": self.date_of_birth,
            "email": self.email,
            "mobile": self.mobile,
            "gender": self.gender,
            "traceability": self.traceability
        }


class ConflictResolutionResult:
    """
    Standardized payload object returned by the conflict resolver.
    """
    def __init__(self, golden_profile: GoldenProfile, severity: str,
                 overall_confidence: float, warnings: List[str], audit_entries: List[Dict[str, Any]]):
        self.golden_profile = golden_profile
        self.severity = severity  # LOW, MEDIUM, HIGH, CRITICAL
        self.overall_confidence = overall_confidence
        self.warnings = warnings
        self.audit_entries = audit_entries

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the conflict resolution result to serializable dict format.
        """
        return {
            "golden_profile": self.golden_profile.to_dict(),
            "severity": self.severity,
            "overall_confidence": self.overall_confidence,
            "warnings": self.warnings,
            "audit_entries": self.audit_entries
        }


class ConflictResolver:
    """
    Interface specifying contract for VeriSync conflict resolution engine.
    """
    def resolve_conflicts(self, identities: List[Identity]) -> ConflictResolutionResult:
        """
        Analyzes and resolves conflicting attributes across raw identities to build a Golden Profile.
        """
        raise NotImplementedError()


class DefaultConflictResolver(ConflictResolver):
    """
    Default implementation of ConflictResolver mapping configurable field-level policies,
    traceability tracking, audit entries, and conflict severity levels.
    """

    def __init__(self):
        self.policy_name = "DefaultConflictResolver"
        self.model_version = "v1"

    def _load_setting(self, key: str, default: Any) -> Any:
        """
        Loads configuration overrides from database system_settings table.
        """
        try:
            setting = SystemSetting.query.filter_by(setting_key=key).first()
            if setting and setting.setting_value:
                return setting.setting_value
        except Exception:
            pass
        return default

    def _load_field_policy(self, field_name: str) -> str:
        """
        Resolves field-specific policy with global fallback.
        """
        default_policy = self._load_setting("conflict_default_policy", Config.CONFLICT_DEFAULT_POLICY)
        fallback_field_policy = Config.CONFLICT_FIELD_POLICIES.get(field_name, default_policy)
        return self._load_setting(f"conflict_policy_{field_name}", fallback_field_policy)

    def _decrypt_field_value(self, identity: Identity, field_name: str, key_secret: bytes) -> Optional[str]:
        """
        Helper method to extract and decrypt PII fields from Identity record.
        """
        enc_col = f"{field_name}_encrypted"
        if hasattr(identity, enc_col):
            ciphertext = getattr(identity, enc_col)
            if ciphertext:
                return SecurityService.decrypt_field(ciphertext, key_secret)
        
        # Plain text attributes fallback (email, mobile, gender, hashes etc.)
        if hasattr(identity, field_name):
            val = getattr(identity, field_name)
            if val:
                return str(val)
        
        hash_col = f"{field_name}_hash"
        if hasattr(identity, hash_col):
            val = getattr(identity, hash_col)
            if val:
                return str(val)

        return None

    def resolve_conflicts(self, identities: List[Identity]) -> ConflictResolutionResult:
        """
        Main conflict resolution sequence separating detection, resolution, and profile construction.
        """
        if not identities:
            return ConflictResolutionResult(
                golden_profile=GoldenProfile(),
                severity="LOW",
                overall_confidence=0.0,
                warnings=["No identities provided for conflict resolution."],
                audit_entries=[]
            )

        key_secret = Config.ENCRYPTION_KEY
        fields_to_resolve = ["full_name", "address", "date_of_birth", "email", "mobile", "gender"]
        
        # 1. Responsibilities Step A: Conflict Detection
        raw_values: Dict[str, List[Dict[str, Any]]] = {f: [] for f in fields_to_resolve}
        
        for identity in identities:
            for field in fields_to_resolve:
                val = self._decrypt_field_value(identity, field, key_secret)
                if val is not None and str(val).strip() != "":
                    raw_values[field].append({
                        "identity_uuid": identity.uuid,
                        "value": str(val).strip(),
                        "system_source": identity.system_source,
                        "source_timestamp": identity.source_timestamp or identity.created_at or datetime.utcnow(),
                        "created_at": identity.created_at or datetime.utcnow(),
                        "raw_record": identity
                    })

        conflicting_fields = {}
        severity_map = {
            "email": "LOW",
            "mobile": "LOW",
            "full_name": "MEDIUM",
            "address": "MEDIUM",
            "gender": "LOW",
            "date_of_birth": "HIGH"
        }
        detected_severities = []

        # Detect fields with disagreements
        for field in fields_to_resolve:
            unique_vals = list(set(item["value"].lower() for item in raw_values[field]))
            if len(unique_vals) > 1:
                conflicting_fields[field] = [item["value"] for item in raw_values[field]]
                detected_severities.append(severity_map.get(field, "LOW"))

        # Determine overall conflict severity
        if not detected_severities:
            overall_severity = "LOW"
        elif "CRITICAL" in detected_severities:
            overall_severity = "CRITICAL"
        elif "HIGH" in detected_severities:
            overall_severity = "HIGH"
        elif "MEDIUM" in detected_severities:
            overall_severity = "MEDIUM"
        else:
            overall_severity = "LOW"

        # 2. Responsibilities Step B & C: Conflict Resolution & Profile Construction
        resolved_profile_values = {}
        traceability = {}
        audit_entries = []
        warnings = []
        field_confidence_scores = []

        for field in fields_to_resolve:
            items = raw_values[field]
            if not items:
                # No data present for this field, skip
                traceability[field] = {
                    "value": None,
                    "selected_source": None,
                    "applied_policy": "NO_DATA",
                    "confidence": 0.0,
                    "reason": "No data available in any source identity record."
                }
                continue

            unique_vals = list(set(item["value"].lower() for item in items))
            policy = self._load_field_policy(field)

            # Case 1: No Conflict (Single value found)
            if len(unique_vals) == 1:
                selected_item = items[0]
                resolved_profile_values[field] = selected_item["value"]
                traceability[field] = {
                    "value": selected_item["value"],
                    "selected_source": selected_item["system_source"],
                    "applied_policy": "SINGLE_VALUE",
                    "confidence": 100.0,
                    "reason": "Single source value resolved automatically."
                }
                field_confidence_scores.append(100.0)
                continue

            # Case 2: Conflict detected -> Apply Policy Resolution Rules
            reasons_trace = []
            selected_item = None
            field_confidence = 80.0

            if policy == "MANUAL_REVIEW":
                selected_item = None
                resolved_profile_values[field] = "PENDING_MANUAL_REVIEW"
                warnings.append(f"Conflict on field '{field}' escalated to MANUAL_REVIEW.")
                traceability[field] = {
                    "value": "PENDING_MANUAL_REVIEW",
                    "selected_source": None,
                    "applied_policy": "MANUAL_REVIEW",
                    "confidence": 0.0,
                    "reason": f"Attribute disagreement on values: {list(set(i['value'] for i in items))}. Escalated to administrator review."
                }
                field_confidence_scores.append(0.0)
                
                # Audit entry for manual review escalation
                audit_entries.append({
                    "field": field,
                    "original_values": [i["value"] for i in items],
                    "selected_value": "PENDING_MANUAL_REVIEW",
                    "applied_policy": "MANUAL_REVIEW",
                    "timestamp": datetime.utcnow().isoformat(),
                    "reason": "Disagreement escalated to manual review."
                })
                continue

            elif policy == "MOST_TRUSTED_SOURCE":
                # Sort items by source trust rank (lower score means lower rank)
                # AadhaarService (1.0) > ABHAService (0.95) > OtherSource (0.7)
                trust_scores = Config.SOURCE_RELIABILITY_SCORES
                
                # Sort descending by trust value
                sorted_items = sorted(
                    items, 
                    key=lambda x: trust_scores.get(x["system_source"], 0.70), 
                    reverse=True
                )
                
                # Check for equal-confidence conflict (top 2 sources have identical trust rankings)
                if len(sorted_items) > 1:
                    top_trust = trust_scores.get(sorted_items[0]["system_source"], 0.70)
                    second_trust = trust_scores.get(sorted_items[1]["system_source"], 0.70)
                    
                    if top_trust == second_trust and sorted_items[0]["value"].lower() != sorted_items[1]["value"].lower():
                        # Fallback rule: MOST_RECENT_SOURCE
                        reasons_trace.append("Equal trust scores. Falling back to MOST_RECENT_SOURCE.")
                        # Filter to only top trusted items
                        top_items = [i for i in sorted_items if trust_scores.get(i["system_source"], 0.70) == top_trust]
                        
                        # Sort by timestamp descending
                        sorted_by_time = sorted(top_items, key=lambda x: x["source_timestamp"], reverse=True)
                        
                        # Check for equal timestamp conflict
                        if len(sorted_by_time) > 1 and sorted_by_time[0]["source_timestamp"] == sorted_by_time[1]["source_timestamp"] and sorted_by_time[0]["value"].lower() != sorted_by_time[1]["value"].lower():
                            reasons_trace.append("Equal timestamps. Falling back to LONGEST_NON_EMPTY_VALUE.")
                            top_time_items = [i for i in sorted_by_time if i["source_timestamp"] == sorted_by_time[0]["source_timestamp"]]
                            selected_item = sorted(top_time_items, key=lambda x: len(x["value"]), reverse=True)[0]
                        else:
                            selected_item = sorted_by_time[0]
                    else:
                        selected_item = sorted_items[0]
                else:
                    selected_item = sorted_items[0]

                field_confidence = 90.0
                reasons_trace.append(f"Resolved using source trust rankings. Selected source: {selected_item['system_source']}.")

            elif policy == "MOST_RECENT_SOURCE":
                # Sort descending by source timestamp
                sorted_items = sorted(items, key=lambda x: x["source_timestamp"], reverse=True)
                
                # Check for equal timestamp conflicts
                if len(sorted_items) > 1 and sorted_items[0]["source_timestamp"] == sorted_items[1]["source_timestamp"] and sorted_items[0]["value"].lower() != sorted_items[1]["value"].lower():
                    reasons_trace.append("Equal timestamps. Falling back to LONGEST_NON_EMPTY_VALUE.")
                    top_time_items = [i for i in sorted_items if i["source_timestamp"] == sorted_items[0]["source_timestamp"]]
                    selected_item = sorted(top_time_items, key=lambda x: len(x["value"]), reverse=True)[0]
                else:
                    selected_item = sorted_items[0]

                field_confidence = 85.0
                reasons_trace.append(f"Resolved using source timestamp: {selected_item['source_timestamp'].isoformat()}.")

            elif policy == "LONGEST_NON_EMPTY_VALUE" or policy == "HIGHEST_CONFIDENCE":
                # Default to longest string comparator
                selected_item = sorted(items, key=lambda x: len(x["value"]), reverse=True)[0]
                field_confidence = 80.0
                reasons_trace.append("Resolved using longest non-empty string metric.")

            # Record final resolved choice
            resolved_profile_values[field] = selected_item["value"]
            traceability[field] = {
                "value": selected_item["value"],
                "selected_source": selected_item["system_source"],
                "applied_policy": policy,
                "confidence": field_confidence,
                "reason": " -> ".join(reasons_trace)
            }
            field_confidence_scores.append(field_confidence)

            # Record audit log trace
            audit_entries.append({
                "field": field,
                "original_values": [i["value"] for i in items],
                "selected_value": selected_item["value"],
                "applied_policy": policy,
                "timestamp": datetime.utcnow().isoformat(),
                "reason": f"Conflict resolved using policy '{policy}'. Detail: " + " -> ".join(reasons_trace)
            })

        # Calculate overall resolution confidence score (average of non-empty field scores)
        overall_confidence = sum(field_confidence_scores) / len(field_confidence_scores) if field_confidence_scores else 100.0

        # Construct final Golden Profile model object
        golden_profile = GoldenProfile(
            full_name=resolved_profile_values.get("full_name"),
            address=resolved_profile_values.get("address"),
            date_of_birth=resolved_profile_values.get("date_of_birth"),
            email=resolved_profile_values.get("email"),
            mobile=resolved_profile_values.get("mobile"),
            gender=resolved_profile_values.get("gender"),
            traceability=traceability
        )

        return ConflictResolutionResult(
            golden_profile=golden_profile,
            severity=overall_severity,
            overall_confidence=overall_confidence,
            warnings=warnings,
            audit_entries=audit_entries
        )
