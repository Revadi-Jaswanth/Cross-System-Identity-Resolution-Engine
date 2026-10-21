# -*- coding: utf-8 -*-
"""
Decision Engine.
Interprets confidence scores and returns resolution states.
"""

import logging
from typing import Dict, Any, List
from app.services.matching_strategy import MatchResult

logger = logging.getLogger(__name__)


class DecisionEngine:
    """
    Evaluates strategy match scores against thresholds to produce resolution decisions.
    """

    def __init__(self, exact_threshold: float = 100.0, high_confidence_threshold: float = 85.0,
                 manual_review_threshold: float = 50.0):
        self.exact_threshold = exact_threshold
        self.high_confidence_threshold = high_confidence_threshold
        self.manual_review_threshold = manual_review_threshold

    def evaluate_decision(self, strategy_results: List[MatchResult]) -> Dict[str, Any]:
        """
        Maps matching scores to decision states: EXACT_MATCH, HIGH_CONFIDENCE_MATCH, MANUAL_REVIEW, NEW_CLUSTER.

        Args:
            strategy_results (List[MatchResult]): Match results from executed strategies.

        Returns:
            Dict[str, Any]: Decision state and reason details.
        """
        if not strategy_results:
            return {
                "decision": "NEW_CLUSTER",
                "confidence_score": 0.0,
                "reason": "No match strategy executed."
            }

        # Find the highest confidence score among all strategies
        best_result = max(strategy_results, key=lambda x: x.confidence_score)
        score = best_result.confidence_score

        if score >= self.exact_threshold:
            decision = "EXACT_MATCH"
            reason = f"Exact match verified by strategy '{best_result.strategy_name}'. {best_result.reason}"
        elif score >= self.high_confidence_threshold:
            decision = "HIGH_CONFIDENCE_MATCH"
            reason = f"High confidence match resolved by strategy '{best_result.strategy_name}'. {best_result.reason}"
        elif score >= self.manual_review_threshold:
            decision = "MANUAL_REVIEW"
            reason = f"Moderate confidence score ({score}%) requires manual administrative audit. {best_result.reason}"
        else:
            decision = "NEW_CLUSTER"
            reason = f"Low confidence match ({score}%). Creating new identity cluster."

        return {
            "decision": decision,
            "confidence_score": score,
            "best_strategy": best_result.strategy_name,
            "matched_fields": best_result.matched_fields,
            "matched_identifiers": best_result.matched_identifiers,
            "reason": reason
        }
    
    def get_thresholds(self) -> Dict[str, float]:
        """
        Returns configured threshold metrics.
        """
        return {
            "exact_threshold": self.exact_threshold,
            "high_confidence_threshold": self.high_confidence_threshold,
            "manual_review_threshold": self.manual_review_threshold
        }
