"""M8 — Ground Truth Score (0–100) Engine.

Aggregates fundamental, operational, and supply-chain metrics into an objective 0–100 score.
Components with missing upstream data are dropped, weights are dynamically re-normalized,
and effective weight confidence is explicitly tracked.

Weights & Directions:
    - RLI: 25% (Higher is better)
    - License Cliff 3y: 20% (Lower risk is better)
    - Cost Curve Percentile: 25% (Lower/cheaper is better)
    - Destination HHI: 15% (Lower concentration is better)
    - Contractor Risk: 15% (Lower risk is better)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

BASE_WEIGHTS: dict[str, float] = {
    "rli": 0.25,
    "license_cliff_3y": 0.20,
    "cost_curve_percentile": 0.25,
    "destination_hhi": 0.15,
    "contractor_risk": 0.15,
}


@dataclass(frozen=True)
class ScoreResult:
    """Computed M8 Ground Truth Score result for an issuer."""

    symbol: str
    ground_truth_score: float | None
    component_scores: dict[str, float | None]
    confidence: dict[str, Any]


def percentile_rank_ascending(values: list[float | None], val: float | None) -> float | None:
    """Compute percentile rank [0, 100] where higher numerical value gives higher score."""
    if val is None:
        return None
    valid = [v for v in values if v is not None]
    if not valid:
        return 50.0
    if len(valid) == 1:
        return 100.0
    count_lower = sum(1 for v in valid if v < val)
    count_equal = sum(1 for v in valid if v == val)
    return ((count_lower + 0.5 * count_equal) / len(valid)) * 100.0


def percentile_rank_descending(values: list[float | None], val: float | None) -> float | None:
    """Compute percentile rank [0, 100] where lower numerical value (less risk/cost) gives higher score."""
    if val is None:
        return None
    valid = [v for v in values if v is not None]
    if not valid:
        return 50.0
    if len(valid) == 1:
        return 100.0
    count_higher = sum(1 for v in valid if v > val)
    count_equal = sum(1 for v in valid if v == val)
    return ((count_higher + 0.5 * count_equal) / len(valid)) * 100.0


def compute_ground_truth_scores(
    issuer_metrics_list: list[dict[str, Any]],
) -> list[ScoreResult]:
    """Compute M8 Ground Truth Scores across the active universe.

    Args:
        issuer_metrics_list: List of dicts containing:
            symbol, rli_years, license_cliff_3y, cost_curve_percentile,
            destination_hhi, contractor_hhi, contract_cliff_12m.

    Returns:
        List of ScoreResult for each issuer.
    """
    # Extract universe arrays for ranking
    all_rli = [m.get("rli_years") for m in issuer_metrics_list]
    all_cliff = [m.get("license_cliff_3y") for m in issuer_metrics_list]
    all_cost = [m.get("cost_curve_percentile") for m in issuer_metrics_list]
    all_dest = [m.get("destination_hhi") for m in issuer_metrics_list]

    # Combine contractor risk into a single metric (average of HHI pct and cliff 12m)
    all_contractor_risk: list[float | None] = []
    for m in issuer_metrics_list:
        hhi = m.get("contractor_hhi")
        cliff = m.get("contract_cliff_12m")
        if hhi is not None or cliff is not None:
            # HHI normalized from 0-10000 to 0-100
            hhi_norm = (hhi / 100.0) if hhi is not None else 50.0
            cliff_val = cliff if cliff is not None else 0.0
            all_contractor_risk.append((hhi_norm + cliff_val) / 2.0)
        else:
            all_contractor_risk.append(None)

    results: list[ScoreResult] = []

    for idx, m in enumerate(issuer_metrics_list):
        symbol = m["symbol"]

        # Sub-scores (0-100, where 100 is best)
        rli_score = percentile_rank_ascending(all_rli, m.get("rli_years"))
        cliff_score = percentile_rank_descending(all_cliff, m.get("license_cliff_3y"))
        cost_score = percentile_rank_descending(all_cost, m.get("cost_curve_percentile"))
        dest_score = percentile_rank_descending(all_dest, m.get("destination_hhi"))
        contract_score = percentile_rank_descending(all_contractor_risk, all_contractor_risk[idx])

        raw_scores: dict[str, float | None] = {
            "rli": rli_score,
            "license_cliff_3y": cliff_score,
            "cost_curve_percentile": cost_score,
            "destination_hhi": dest_score,
            "contractor_risk": contract_score,
        }

        # Weight Re-normalization: drop null components
        available_weights: dict[str, float] = {}
        dropped_components: list[str] = []

        for comp, weight in BASE_WEIGHTS.items():
            if raw_scores.get(comp) is not None:
                available_weights[comp] = weight
            else:
                dropped_components.append(comp)

        total_effective_weight = sum(available_weights.values())

        if total_effective_weight <= 0:
            results.append(
                ScoreResult(
                    symbol=symbol,
                    ground_truth_score=None,
                    component_scores={k: (round(v, 2) if v is not None else None) for k, v in raw_scores.items()},
                    confidence={
                        "effective_weight": 0.0,
                        "dropped_components": dropped_components,
                        "normalized_weights": {},
                        "is_complete": False,
                    },
                )
            )
            continue

        # Re-normalize available weights to sum to 1.0 (100%)
        normalized_weights: dict[str, float] = {
            comp: w / total_effective_weight for comp, w in available_weights.items()
        }

        weighted_score = 0.0
        for comp, norm_w in normalized_weights.items():
            sc_val = raw_scores.get(comp)
            if sc_val is not None:
                weighted_score += float(sc_val) * norm_w

        results.append(
            ScoreResult(
                symbol=symbol,
                ground_truth_score=round(weighted_score, 2),
                component_scores={k: (round(v, 2) if v is not None else None) for k, v in raw_scores.items()},
                confidence={
                    "effective_weight": round(total_effective_weight, 2),
                    "dropped_components": dropped_components,
                    "normalized_weights": {k: round(v, 4) for k, v in normalized_weights.items()},
                    "is_complete": len(dropped_components) == 0,
                },
            )
        )

    return results
