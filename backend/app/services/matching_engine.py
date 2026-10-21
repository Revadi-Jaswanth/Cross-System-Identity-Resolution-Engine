# -*- coding: utf-8 -*-
"""
Matching Engine.
Executes the configured matching strategies on candidate records and measures performance metrics.
"""

import time
import logging
from typing import List, Dict, Any, Tuple
from app.services.matching_strategy import MatchingStrategy, MatchResult, ExactHashStrategy, FuzzyMatchingStrategy, WeightedScoringStrategy

logger = logging.getLogger(__name__)


class MatchingEngine:
    """
    Orchestrates the matching strategies pipeline on retrieved candidates.
    """

    def __init__(self, strategies: List[MatchingStrategy] = None):
        """
        Initializes the engine with a configurable strategy pipeline.
        """
        self.strategies = strategies or [
            ExactHashStrategy(),
            FuzzyMatchingStrategy(),
            WeightedScoringStrategy()
        ]

    def evaluate_candidate(self, incoming: Dict[str, Any], candidate: Any) -> Tuple[List[MatchResult], List[Dict[str, Any]]]:
        """
        Evaluates incoming records against database candidate using active matching strategies.

        Args:
            incoming (Dict[str, Any]): Normalized incoming record dictionary.
            candidate (Any): Database record candidate entity.

        Returns:
            Tuple[List[MatchResult], List[Dict[str, Any]]]: Strategy outcomes and execution metrics.
        """
        results = []
        traces = []

        for strategy in self.strategies:
            start_time = time.perf_counter()
            
            # Execute match strategy comparison
            result = strategy.match(incoming, candidate)
            
            elapsed = (time.perf_counter() - start_time) * 1000.0 # milliseconds
            
            results.append(result)
            traces.append({
                "strategy": result.strategy_name,
                "confidence_score": result.confidence_score,
                "matched_fields": result.matched_fields,
                "execution_time_ms": elapsed
            })

            logger.debug(f"Strategy '{result.strategy_name}' executed in {elapsed:.3f} ms. Score: {result.confidence_score}")

        return results, traces
