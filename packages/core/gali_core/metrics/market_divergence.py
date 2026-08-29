"""M9 — Market Divergence Engine.

Measures the spread between market valuation premia (RBV Gap) and fundamental asset quality
(Ground Truth Score), overlaid with institutional and insider capital flows.

Formulas:
    divergence(s) = percentile(rbv_gap_pct) − percentile(ground_truth_score)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from gali_core.metrics.score import percentile_rank_ascending


@dataclass(frozen=True)
class DivergenceResult:
    """Computed M9 Market Divergence result for an issuer."""
    symbol: str
    divergence_spread: float | None
    rbv_gap_percentile: float | None
    score_percentile: float | None
    quadrant: str | None
    net_foreign_flow_30d_idr: float | None = None
    insider_sentiment: str | None = None
    null_reason: str | None = None


def compute_market_divergence(
    issuer_metrics_list: list[dict[str, Any]],
    foreign_flows_map: dict[str, float] | None = None,
) -> list[DivergenceResult]:
    """Compute M9 Market Divergence across universe issuers.

    Args:
        issuer_metrics_list: List of dicts with 'symbol', 'rbv_gap_pct', 'ground_truth_score'.
        foreign_flows_map: Optional map of symbol -> 30d net foreign flow in IDR.
    """
    flows = foreign_flows_map or {}
    all_gaps = [m.get("rbv_gap_pct") for m in issuer_metrics_list]
    all_scores = [m.get("ground_truth_score") for m in issuer_metrics_list]

    results: list[DivergenceResult] = []

    for m in issuer_metrics_list:
        symbol = m["symbol"]
        gap = m.get("rbv_gap_pct")
        score = m.get("ground_truth_score")

        gap_pct = percentile_rank_ascending(all_gaps, gap)
        score_pct = percentile_rank_ascending(all_scores, score)

        if gap_pct is None or score_pct is None:
            results.append(
                DivergenceResult(
                    symbol=symbol,
                    divergence_spread=None,
                    rbv_gap_percentile=gap_pct,
                    score_percentile=score_pct,
                    quadrant=None,
                    net_foreign_flow_30d_idr=flows.get(symbol),
                    null_reason="rbv_gap_pct or ground_truth_score is NULL",
                )
            )
            continue

        spread = gap_pct - score_pct

        # Quadrant classification
        if gap_pct >= 50.0 and score_pct < 50.0:
            quadrant = "Overvalued Premia / Weak Ground Truth"
        elif gap_pct < 50.0 and score_pct >= 50.0:
            quadrant = "Deep Value Discount / Strong Ground Truth"
        elif gap_pct >= 50.0 and score_pct >= 50.0:
            quadrant = "Quality Premium / Strong Ground Truth"
        else:
            quadrant = "Discount / Weak Ground Truth"

        results.append(
            DivergenceResult(
                symbol=symbol,
                divergence_spread=round(spread, 2),
                rbv_gap_percentile=round(gap_pct, 2),
                score_percentile=round(score_pct, 2),
                quadrant=quadrant,
                net_foreign_flow_30d_idr=flows.get(symbol),
                null_reason=None,
            )
        )

    return results
