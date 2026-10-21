# -*- coding: utf-8 -*-
"""
Candidate Retriever Service.
Queries and ranks candidate clusters sharing matching attributes.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from app.models.identity import Identity, IdentityCluster
from app.repositories import IdentityRepository, IdentityClusterRepository

logger = logging.getLogger(__name__)


class CandidateRetriever:
    """
    Retrieves and groups matching database record candidates by cluster.
    """

    def __init__(self, identity_repo: Optional[IdentityRepository] = None,
                 cluster_repo: Optional[IdentityClusterRepository] = None):
        self.identity_repo = identity_repo or IdentityRepository()
        self.cluster_repo = cluster_repo or IdentityClusterRepository()

    def retrieve_candidates(self, incoming_hashes: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Queries identities matching any input hashes, grouped and ranked by match count.

        Args:
            incoming_hashes (Dict[str, str]): Hashed identifier columns (e.g. {'aadhaar_hash': 'xxx', ...}).

        Returns:
            List[Dict[str, Any]]: List of unique candidate cluster structures ranked by frequency.
        """
        # Fetch matching raw identity records from the DB
        matched_identities = self.identity_repo.find_candidates_by_hashes(incoming_hashes)
        if not matched_identities:
            return []

        # Group identities by parent cluster
        cluster_groups: Dict[int, List[Identity]] = {}
        for identity in matched_identities:
            c_id = identity.cluster_id
            if c_id not in cluster_groups:
                cluster_groups[c_id] = []
            cluster_groups[c_id].append(identity)

        candidates = []
        for c_id, identities in cluster_groups.items():
            cluster = self.cluster_repo.get_by_id(c_id)
            if cluster:
                candidates.append({
                    "cluster": cluster,
                    "match_count": len(identities),
                    "matched_identities": identities
                })

        # Rank candidates: higher match count first
        candidates.sort(key=lambda x: x["match_count"], reverse=True)
        
        logger.info(f"Retrieved {len(candidates)} ranked candidate clusters.")
        return candidates
