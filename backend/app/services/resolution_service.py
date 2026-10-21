# -*- coding: utf-8 -*-
"""
VeriSync Identity Resolution Engine Service.
Orchestrates candidate retrieval, strategy execution, decision mapping, and auditing.
"""

import time
import logging
from typing import Dict, Any, List, Optional

from app.models.identity import Identity, IdentityCluster
from app.repositories import IdentityRepository, IdentityClusterRepository, AuditRepository
from app.services.candidate_retriever import CandidateRetriever
from app.services.matching_engine import MatchingEngine
from app.services.decision_engine import DecisionEngine
from app.security import SecurityService
from app.config import Config

logger = logging.getLogger(__name__)


class IdentityResolutionServiceInterface:
    """
    Interface specifying contract for resolving identity records across systems.
    """
    def resolve_identity(self, incoming_payload: Dict[str, Any], actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        raise NotImplementedError()


class IdentityResolutionService(IdentityResolutionServiceInterface):
    """
    Orchestrates the resolution pipeline combining candidate retrieval, matching, and decisions.
    """

    def __init__(self, identity_repo: Optional[IdentityRepository] = None,
                 cluster_repo: Optional[IdentityClusterRepository] = None,
                 candidate_retriever: Optional[CandidateRetriever] = None,
                 matching_engine: Optional[MatchingEngine] = None,
                 decision_engine: Optional[DecisionEngine] = None,
                 audit_repo: Optional[AuditRepository] = None):
        
        self.identity_repo = identity_repo or IdentityRepository()
        self.cluster_repo = cluster_repo or IdentityClusterRepository()
        self.retriever = candidate_retriever or CandidateRetriever(self.identity_repo, self.cluster_repo)
        self.matching_engine = matching_engine or MatchingEngine()
        self.decision_engine = decision_engine or DecisionEngine()
        self.audit_repo = audit_repo or AuditRepository()

    def resolve_identity(self, incoming_payload: Dict[str, Any], actor_user_id: int, ip_address: str) -> Dict[str, Any]:
        """
        Ingests and resolves an incoming identity record against existing clusters.
        """
        start_time = time.perf_counter()
        pepper = Config.PEPPER_SECRET

        # 1. Normalize and extract hashes from the payload
        hashes = {}
        fields = ["aadhaar", "abha", "digilocker", "mobile", "email"]
        for f in fields:
            raw_val = incoming_payload.get(f)
            if raw_val:
                hashes[f"{f}_hash"] = SecurityService.hash_identifier(raw_val, pepper)
            else:
                # Fallback if already hashed values are sent
                hashed_val = incoming_payload.get(f"{f}_hash")
                if hashed_val:
                    hashes[f"{f}_hash"] = hashed_val

        # 2. Retrieve candidates
        candidates = self.retriever.retrieve_candidates(hashes)
        candidate_count = len(candidates)

        if not candidates:
            # No candidates matched -> Resolve to NEW_CLUSTER
            elapsed = (time.perf_counter() - start_time) * 1000.0
            
            # Audit log trace
            self.audit_repo.log_audit(
                action="MATCH_RESOLVED",
                target_table="identity_clusters",
                target_id=0,
                user_id=actor_user_id,
                new_val={"decision": "NEW_CLUSTER", "confidence_score": 0.0},
                ip_addr=ip_address
            )

            return {
                "decision": "NEW_CLUSTER",
                "cluster_uuid": None,
                "confidence_score": 0.0,
                "matched_fields": [],
                "matched_identifiers": {},
                "candidate_count": 0,
                "strategy_outputs": [],
                "execution_traces": [{
                    "strategy": "ExactHash",
                    "execution_time_ms": elapsed
                }],
                "reason": "No candidate record matches found in the database. A new cluster is required."
            }

        # 3. Match candidates and rank decisions
        evaluated_candidates = []

        for cand_struct in candidates:
            cluster = cand_struct["cluster"]
            identities = cand_struct["matched_identities"]

            # Evaluate each identity in the cluster and pick the best matching score
            best_decision_payload = None
            best_traces = []
            best_score = -1.0

            for identity in identities:
                results, traces = self.matching_engine.evaluate_candidate(hashes, identity)
                decision_payload = self.decision_engine.evaluate_decision(results)
                
                if decision_payload["confidence_score"] > best_score:
                    best_score = decision_payload["confidence_score"]
                    best_decision_payload = decision_payload
                    best_traces = traces

            evaluated_candidates.append({
                "cluster_uuid": cluster.uuid,
                "cluster_id": cluster.id,
                "decision": best_decision_payload["decision"],
                "confidence_score": best_decision_payload["confidence_score"],
                "matched_fields": best_decision_payload["matched_fields"],
                "matched_identifiers": best_decision_payload["matched_identifiers"],
                "strategy_outputs": [r.to_dict() for r in results],
                "execution_traces": best_traces,
                "reason": best_decision_payload["reason"]
            })

        # Rank all candidates by score, pick the best match
        evaluated_candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
        best_candidate = evaluated_candidates[0]

        elapsed_total = (time.perf_counter() - start_time) * 1000.0
        
        # 4. Telemetry audit logging
        self.audit_repo.log_audit(
            action="MATCH_RESOLVED",
            target_table="identity_clusters",
            target_id=best_candidate["cluster_id"],
            user_id=actor_user_id,
            new_val={
                "decision": best_candidate["decision"],
                "confidence_score": best_candidate["confidence_score"],
                "matched_fields": best_candidate["matched_fields"],
                "candidate_count": candidate_count,
                "execution_time_ms": elapsed_total
            },
            ip_addr=ip_address
        )

        logger.info(f"Resolution outcome: {best_candidate['decision']} (Score: {best_candidate['confidence_score']}%)")

        return {
            "decision": best_candidate["decision"],
            "cluster_uuid": best_candidate["cluster_uuid"],
            "confidence_score": best_candidate["confidence_score"],
            "matched_fields": best_candidate["matched_fields"],
            "matched_identifiers": best_candidate["matched_identifiers"],
            "candidate_count": candidate_count,
            "strategy_outputs": best_candidate["strategy_outputs"],
            "execution_traces": best_candidate["execution_traces"],
            "reason": best_candidate["reason"]
        }
