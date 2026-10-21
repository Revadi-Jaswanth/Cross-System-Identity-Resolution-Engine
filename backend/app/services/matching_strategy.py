# -*- coding: utf-8 -*-
"""
Identity Matching Strategy Pattern Implementations.
Defines base interfaces and specific matching strategy implementations (Exact, Fuzzy, Weighted).
"""

import re
import time
import unicodedata
from typing import List, Dict, Any, Optional

import rapidfuzz
from rapidfuzz.distance import JaroWinkler

from app import db
from app.config import Config
from app.security import SecurityService
from app.repositories import OrganizationRepository


class MatchResult:
    """
    Standardized payload object returned by every matching strategy implementation.
    """
    def __init__(self, strategy_name: str, confidence_score: float,
                 matched_fields: List[str], matched_identifiers: Dict[str, Any], reason: Any,
                 candidate_uuid: Optional[str] = None, normalized_score: Optional[float] = None,
                 skipped_fields: Optional[List[str]] = None, field_scores: Optional[Dict[str, Any]] = None,
                 score_breakdown: Optional[Dict[str, Any]] = None, confidence_level: Optional[str] = None,
                 confidence_percentage: Optional[float] = None, recommendation: Optional[str] = None,
                 score_model_version: str = "v1", weights_used: Optional[Dict[str, float]] = None,
                 performance_metrics: Optional[Dict[str, float]] = None):
        self.strategy_name = strategy_name
        self.confidence_score = confidence_score
        self.matched_fields = matched_fields
        self.matched_identifiers = matched_identifiers
        self.reason = reason
        self.candidate_uuid = candidate_uuid
        self.normalized_score = normalized_score if normalized_score is not None else confidence_score
        self.skipped_fields = skipped_fields or []
        self.field_scores = field_scores or {}
        self.score_breakdown = score_breakdown or {}
        self.confidence_level = confidence_level
        self.confidence_percentage = confidence_percentage if confidence_percentage is not None else confidence_score
        self.recommendation = recommendation
        self.score_model_version = score_model_version
        self.weights_used = weights_used or {}
        self.performance_metrics = performance_metrics or {}

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the match result to serializable dict format.
        """
        return {
            "strategy_name": self.strategy_name,
            "confidence_score": self.confidence_score,
            "normalized_score": self.normalized_score,
            "confidence_level": self.confidence_level,
            "confidence_percentage": self.confidence_percentage,
            "recommendation": self.recommendation,
            "score_model_version": self.score_model_version,
            "matched_fields": self.matched_fields,
            "matched_identifiers": self.matched_identifiers,
            "skipped_fields": self.skipped_fields,
            "field_scores": self.field_scores,
            "score_breakdown": self.score_breakdown,
            "weights_used": self.weights_used,
            "performance_metrics": self.performance_metrics,
            "reason": self.reason,
            "candidate_uuid": self.candidate_uuid
        }


class MatchingStrategy:
    """
    Interface/Base class specifying execution pattern for matching strategies.
    """
    def match(self, incoming: Dict[str, Any], candidate: Any) -> MatchResult:
        """
        Calculates confidence match properties between incoming record payload and database entity candidate.
        """
        raise NotImplementedError()


class ExactHashStrategy(MatchingStrategy):
    """
    Identifies exact matches on deterministic hash strings.
    """
    def match(self, incoming: Dict[str, Any], candidate: Any) -> MatchResult:
        candidate_uuid = getattr(candidate, "uuid", None)
        
        # 1. Evaluate Unique Identifiers (Aadhaar, ABHA, DigiLocker)
        unique_fields = ["aadhaar_hash", "abha_hash", "digilocker_hash"]
        for field in unique_fields:
            in_val = incoming.get(field)
            cand_val = getattr(candidate, field, None)
            if in_val and cand_val and in_val == cand_val:
                return MatchResult(
                    strategy_name="ExactHash",
                    confidence_score=100.0,
                    matched_fields=[field],
                    matched_identifiers={field: in_val},
                    candidate_uuid=candidate_uuid,
                    reason=f"Exact match verified on unique identifier: '{field}'."
                )

        # 2. Evaluate Non-Unique Identifiers (Mobile, Email)
        non_unique_fields = ["mobile_hash", "email_hash"]
        matched_non_unique = []
        matched_ids = {}
        for field in non_unique_fields:
            in_val = incoming.get(field)
            cand_val = getattr(candidate, field, None)
            if in_val and cand_val and in_val == cand_val:
                matched_non_unique.append(field)
                matched_ids[field] = in_val

        if matched_non_unique:
            return MatchResult(
                strategy_name="ExactHash",
                confidence_score=70.0,
                matched_fields=matched_non_unique,
                matched_identifiers=matched_ids,
                candidate_uuid=candidate_uuid,
                reason=f"Exact match verified on non-unique identifier(s): {matched_non_unique}."
            )

        return MatchResult(
            strategy_name="ExactHash",
            confidence_score=0.0,
            matched_fields=[],
            matched_identifiers={},
            candidate_uuid=candidate_uuid,
            reason="No exact matching hashes resolved."
        )


class RapidFuzzStrategy(MatchingStrategy):
    """
    Executes fuzzy string matching on decrypted PII fields using configurable weights.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None, threshold: Optional[float] = None):
        self.weights = weights or Config.RAPIDFUZZ_WEIGHTS
        self.threshold = threshold or Config.DEFAULT_MATCH_THRESHOLD
        self.org_repo = OrganizationRepository()

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Performs Unicode normalization, accent stripping, punctuation removal, and trims extra spaces.
        """
        if not text:
            return ""
        
        # Unicode decomposition to strip accents
        n_text = unicodedata.normalize('NFKD', str(text))
        ascii_text = n_text.encode('ascii', 'ignore').decode('utf-8')
        
        # Lowercase conversion
        lowered = ascii_text.lower()
        
        # Strip all punctuation and non-alphanumeric chars (excluding spaces)
        no_punct = re.sub(r'[^\w\s]', '', lowered)
        
        # Collapse multiple spaces, tabs, and trims
        collapsed = re.sub(r'\s+', ' ', no_punct).strip()
        return collapsed

    def _calculate_fuzzy_similarity(self, s1: str, s2: str) -> Dict[str, float]:
        """
        Runs the 5 RapidFuzz algorithms and returns individual scores.
        """
        token_set = float(rapidfuzz.fuzz.token_set_ratio(s1, s2))
        token_sort = float(rapidfuzz.fuzz.token_sort_ratio(s1, s2))
        partial = float(rapidfuzz.fuzz.partial_ratio(s1, s2))
        wratio = float(rapidfuzz.fuzz.WRatio(s1, s2))
        
        # Jaro-Winkler similarity (0.0 to 1.0 range, normalized to 100.0)
        jaro_wk = float(JaroWinkler.similarity(s1, s2) * 100.0)

        # Apply configurable algorithm weights
        w_total = sum(self.weights.values())
        weighted_score = 0.0
        if w_total > 0:
            weighted_score = (
                wratio * self.weights.get("wratio", 0.0) +
                token_set * self.weights.get("token_set_ratio", 0.0) +
                token_sort * self.weights.get("token_sort_ratio", 0.0) +
                partial * self.weights.get("partial_ratio", 0.0) +
                jaro_wk * self.weights.get("jaro_winkler", 0.0)
            ) / w_total

        return {
            "token_set_ratio": token_set,
            "token_sort_ratio": token_sort,
            "partial_ratio": partial,
            "wratio": wratio,
            "jaro_winkler": jaro_wk,
            "weighted_average": weighted_score
        }

    def match(self, incoming: Dict[str, Any], candidate: Any) -> MatchResult:
        key_secret = Config.ENCRYPTION_KEY
        candidate_uuid = getattr(candidate, "uuid", None)

        # 1. Resolve Inbound Name vs Candidate Name
        in_name = incoming.get("full_name")
        cand_name = SecurityService.decrypt_field(candidate.full_name_encrypted, key_secret)

        # 2. Resolve Inbound Address vs Candidate Address
        # Build normalized comparison address string from parts
        addr_parts = []
        for key in ["address", "city", "state", "postal_code"]:
            val = incoming.get(key)
            if val:
                norm_val = self.normalize_text(str(val))
                if norm_val:
                    addr_parts.append(norm_val)
        
        # If parts were assembled, use that, else check "address" raw
        if addr_parts:
            in_address = " ".join(addr_parts)
        else:
            in_address = self.normalize_text(incoming.get("address", ""))

        cand_address = self.normalize_text(
            SecurityService.decrypt_field(candidate.address_encrypted, key_secret)
        )

        # 3. Resolve Inbound Org Name vs Candidate Org Name (Optional)
        in_org = incoming.get("organization_name")
        org_obj = self.org_repo.get_by_id(candidate.organization_id)
        cand_org = org_obj.name if org_obj else ""

        # Fields evaluation dictionary
        comparisons = {
            "full_name": (self.normalize_text(in_name), self.normalize_text(cand_name)),
            "address": (in_address, cand_address),
            "organization_name": (self.normalize_text(in_org), self.normalize_text(cand_org))
        }

        field_scores = {}
        skipped_fields = []
        matched_fields = []
        matched_identifiers = {}

        # Run comparison calculations, excluding missing fields
        for field, (val1, val2) in comparisons.items():
            if not val1 or not val2:
                skipped_fields.append(field)
                continue

            scores = self._calculate_fuzzy_similarity(val1, val2)
            field_scores[field] = scores
            
            # If the calculated similarity exceeds the threshold, mark as matched
            if scores["weighted_average"] >= self.threshold:
                matched_fields.append(field)
                matched_identifiers[field] = val1

        # Calculate final overall normalized similarity score
        active_fields = [f for f in field_scores.keys()]
        if not active_fields:
            overall_score = 0.0
            reason = "All comparison fields were missing or empty. Evaluation skipped."
        else:
            overall_score = sum(field_scores[f]["weighted_average"] for f in active_fields) / len(active_fields)
            reason = f"Fuzzy matching completed across fields: {active_fields}. Skipped fields: {skipped_fields}."

        return MatchResult(
            strategy_name="FuzzyMatching", # Retain name for pipeline backward-compatibility
            confidence_score=overall_score,
            matched_fields=matched_fields,
            matched_identifiers=matched_identifiers,
            reason=reason,
            candidate_uuid=candidate_uuid,
            normalized_score=overall_score,
            skipped_fields=skipped_fields,
            field_scores=field_scores
        )


# Alias FuzzyMatchingStrategy to RapidFuzzStrategy
FuzzyMatchingStrategy = RapidFuzzStrategy


class WeightedScoringStrategy(MatchingStrategy):
    """
    Executes a configurable weighted composite score calculation combining
    Exact Hash matching, RapidFuzz scoring, source reliability, and completeness metrics.
    """

    def __init__(self, fallback_weights: Optional[Dict[str, float]] = None):
        self.fallback_weights = fallback_weights or Config.WEIGHTED_SCORING_DEFAULT_WEIGHTS
        self.org_repo = OrganizationRepository()

    def _load_settings_weight(self, field_name: str) -> float:
        """
        Config Loader: queries system_settings table for dynamic weight factors.
        """
        try:
            from app.models.user import SystemSetting
            setting = SystemSetting.query.filter_by(setting_key=f"weight_factor_{field_name}").first()
            if setting and setting.setting_value:
                return float(setting.setting_value)
        except Exception:
            pass
        return self.fallback_weights.get(field_name, 0.0)

    def _load_source_reliability(self, source_name: str) -> float:
        """
        Loads the reliability score for the source system.
        """
        try:
            from app.models.user import SystemSetting
            setting = SystemSetting.query.filter_by(setting_key=f"reliability_{source_name}").first()
            if setting and setting.setting_value:
                return float(setting.setting_value)
        except Exception:
            pass
        return Config.SOURCE_RELIABILITY_SCORES.get(source_name, 0.70)

    def match(self, incoming: Dict[str, Any], candidate: Any) -> MatchResult:
        start_time = time.perf_counter()
        candidate_uuid = getattr(candidate, "uuid", None)
        key_secret = Config.ENCRYPTION_KEY

        # 1. Load Configurations & Weights (Measuring Config Load Performance)
        config_start = time.perf_counter()
        raw_weights = {}
        for factor in self.fallback_weights.keys():
            raw_weights[factor] = self._load_settings_weight(factor)
        config_load_time = (time.perf_counter() - config_start) * 1000.0

        # Validate and normalize configured weights to sum to 1.0
        w_sum = sum(raw_weights.values())
        if w_sum <= 0.0:
            raise ValueError("WeightedScoringStrategy config error: Sum of weights must be greater than 0.")
        
        normalized_weights = {k: v / w_sum for k, v in raw_weights.items()}

        scoring_start = time.perf_counter()
        
        # Comparison factors arrays
        scores = {}
        skipped_fields = []
        reasons_list = []

        # -- Evaluation 1: Deterministic Hashes (Aadhaar, ABHA, DigiLocker, Mobile, Email) --
        hash_keys = ["aadhaar", "abha", "digilocker", "mobile", "email"]
        for key in hash_keys:
            in_val = incoming.get(f"{key}_hash")
            cand_val = getattr(candidate, f"{key}_hash", None)
            if not in_val or not cand_val:
                skipped_fields.append(key)
                continue

            if in_val == cand_val:
                scores[key] = 100.0
                reasons_list.append(f"Exact match verified on '{key}_hash'.")
            else:
                scores[key] = 0.0
                reasons_list.append(f"Mismatch on '{key}_hash'.")

        # -- Evaluation 2: Fuzzy String Matching (Full Name, Address) --
        fuzzy_strategy = RapidFuzzStrategy()
        fuzzy_res = fuzzy_strategy.match(incoming, candidate)

        # Full Name
        if "full_name" in fuzzy_res.skipped_fields:
            skipped_fields.append("full_name")
        else:
            scores["full_name"] = fuzzy_res.field_scores["full_name"]["weighted_average"]
            reasons_list.append(f"Fuzzy name score: {scores['full_name']:.1f}%.")

        # Address
        if "address" in fuzzy_res.skipped_fields:
            skipped_fields.append("address")
        else:
            scores["address"] = fuzzy_res.field_scores["address"]["weighted_average"]
            reasons_list.append(f"Fuzzy address score: {scores['address']:.1f}%.")

        # -- Evaluation 3: Date of Birth --
        in_dob = incoming.get("date_of_birth")
        cand_dob_enc = getattr(candidate, "date_of_birth_encrypted", None)
        cand_dob = SecurityService.decrypt_field(cand_dob_enc, key_secret) if cand_dob_enc else None

        if not in_dob or not cand_dob:
            skipped_fields.append("date_of_birth")
        else:
            if str(in_dob).strip() == str(cand_dob).strip():
                scores["date_of_birth"] = 100.0
                reasons_list.append("Date of Birth matched exactly.")
            else:
                scores["date_of_birth"] = 0.0
                reasons_list.append("Date of Birth mismatch.")

        # 2. Weighted Score Aggregation (skipping non-present fields)
        active_factors = [f for f in scores.keys()]
        if not active_factors:
            raw_score = 0.0
            reasons_list.append("All scoring factors were skipped.")
        else:
            active_weight_sum = sum(normalized_weights[f] for f in active_factors)
            if active_weight_sum <= 0:
                raw_score = 0.0
            else:
                weighted_sum = sum(scores[f] * normalized_weights[f] for f in active_factors)
                raw_score = weighted_sum / active_weight_sum

        # 3. Source Reliability Multiplier
        cand_source = getattr(candidate, "system_source", "OtherSource")
        reliability = self._load_source_reliability(cand_source)
        reasons_list.append(f"Source system reliability multiplier: {reliability} ({cand_source}).")

        # 4. Identity Completeness Multiplier
        # Count non-empty fields in incoming payload (out of 8 fields)
        total_possible = 8
        populated_count = 0
        completeness_keys = ["aadhaar", "abha", "digilocker", "mobile", "email", "full_name", "address", "date_of_birth"]
        for key in completeness_keys:
            if incoming.get(key) or incoming.get(f"{key}_hash") or incoming.get(f"{key}_encrypted"):
                populated_count += 1
        
        completeness_fraction = populated_count / total_possible
        # Minor scale modifier ensuring multiplier falls between [0.80 and 1.0]
        completeness_multiplier = 0.80 + 0.20 * completeness_fraction
        reasons_list.append(f"Completeness multiplier: {completeness_multiplier:.2f} ({populated_count}/{total_possible} fields populated).")

        # Calculate final composite score
        final_score = raw_score * reliability * completeness_multiplier

        scoring_time = (time.perf_counter() - scoring_start) * 1000.0
        total_time = (time.perf_counter() - start_time) * 1000.0

        # Map to Confidence Levels and recommendations
        if final_score >= 85.0:
            confidence_level = "HIGH"
            recommendation = "AUTO_MERGE"
        elif final_score >= 50.0:
            confidence_level = "MODERATE"
            recommendation = "MANUAL_REVIEW"
        else:
            confidence_level = "LOW"
            recommendation = "NEW_CLUSTER"

        # Build ScoreBreakdown showing configured weight and calculated score
        score_breakdown = {}
        for f in completeness_keys:
            score_breakdown[f] = {
                "score": scores.get(f, None), # None means skipped
                "configured_weight": raw_weights[f],
                "normalized_weight": normalized_weights[f],
                "skipped": f in skipped_fields
            }

        matched_fields = [f for f, s in scores.items() if s >= 85.0]
        matched_identifiers = {f: incoming.get(f"{f}_hash") or incoming.get(f) for f in matched_fields if incoming.get(f"{f}_hash") or incoming.get(f)}

        performance_metrics = {
            "config_load_time_ms": config_load_time,
            "scoring_time_ms": scoring_time,
            "total_time_ms": total_time
        }

        return MatchResult(
            strategy_name="WeightedScoring",
            confidence_score=final_score,
            matched_fields=matched_fields,
            matched_identifiers=matched_identifiers,
            reason={
                "reasons": reasons_list,
                "overall_score": final_score,
                "confidence_level": confidence_level,
                "recommendation": recommendation
            },
            candidate_uuid=candidate_uuid,
            normalized_score=final_score,
            skipped_fields=skipped_fields,
            field_scores=scores,
            score_breakdown=score_breakdown,
            confidence_level=confidence_level,
            confidence_percentage=final_score,
            recommendation=recommendation,
            score_model_version="v1",
            weights_used=normalized_weights,
            performance_metrics=performance_metrics
        )
