"""M1 — Reserve Life Index (RLI) Engine.

Calculates attributable reserves and production volume weighted by effective ownership,
yielding the operational lifespan (in years) of the underlying mineral assets.

Formulas:
    reserves(symbol)   = Σ_c eff_own(symbol, c) × total_reserves_mt(c)
    production(symbol) = Σ_c eff_own(symbol, c) × production_volume(c)
    RLI(symbol)        = reserves(symbol) / production(symbol)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class RLIComponent:
    """Breakdown per operating subsidiary."""
    company_slug: str
    effective_ownership_pct: float
    total_reserves_mt: float | None
    proven_reserves_mt: float | None
    probable_reserves_mt: float | None
    production_volume: float | None
    attributable_reserves_mt: float | None
    attributable_production_mt: float | None


@dataclass(frozen=True)
class RLIResult:
    """Computed M1 Reserve Life Index result."""
    symbol: str
    rli_years: float | None
    attributable_reserves_mt: float | None
    attributable_production_mt: float | None
    proven_reserves_mt: float | None
    probable_reserves_mt: float | None
    components: list[RLIComponent] = field(default_factory=list)
    is_partial: bool = False
    null_reason: str | None = None


def compute_rli(
    symbol: str,
    links: list[dict[str, Any]],
    performance_map: dict[str, dict[str, Any]],
) -> RLIResult:
    """Compute M1 Reserve Life Index for an issuer.

    Args:
        symbol: IDX stock symbol (e.g. 'AADI', 'ADRO', 'DSSA').
        links: List of issuer mining links with 'company_slug' and 'effective_ownership_pct'.
        performance_map: Mapping of company_slug -> dict of performance fields
            (total_reserves_mt, proven_reserves_mt, probable_reserves_mt, production_volume).

    Returns:
        RLIResult containing aggregated attributable reserves, production, and RLI.
    """
    total_attr_reserves = 0.0
    total_attr_production = 0.0
    total_attr_proven = 0.0
    total_attr_probable = 0.0

    has_any_reserves = False
    has_any_production = False

    components: list[RLIComponent] = []

    for link in links:
        slug = link["company_slug"]
        own_pct = float(link.get("effective_ownership_pct", 100.0))
        own_frac = own_pct / 100.0

        perf = performance_map.get(slug)
        if not perf:
            continue

        res_val = perf.get("total_reserves_mt")
        prov_val = perf.get("proven_reserves_mt")
        prob_val = perf.get("probable_reserves_mt")
        prod_val = perf.get("production_volume")

        # Fallback: if total_reserves_mt is missing but proven + probable exist
        if res_val is None and (prov_val is not None or prob_val is not None):
            res_val = (prov_val or 0.0) + (prob_val or 0.0)

        attr_res = (res_val * own_frac) if res_val is not None else None
        attr_prod = (prod_val * own_frac) if prod_val is not None else None
        attr_prov = (prov_val * own_frac) if prov_val is not None else None
        attr_prob = (prob_val * own_frac) if prob_val is not None else None

        if attr_res is not None and attr_res > 0:
            total_attr_reserves += attr_res
            has_any_reserves = True

        if attr_prod is not None and attr_prod > 0:
            total_attr_production += attr_prod
            has_any_production = True

        if attr_prov is not None and attr_prov > 0:
            total_attr_proven += attr_prov

        if attr_prob is not None and attr_prob > 0:
            total_attr_probable += attr_prob

        components.append(
            RLIComponent(
                company_slug=slug,
                effective_ownership_pct=own_pct,
                total_reserves_mt=res_val,
                proven_reserves_mt=prov_val,
                probable_reserves_mt=prob_val,
                production_volume=prod_val,
                attributable_reserves_mt=attr_res,
                attributable_production_mt=attr_prod,
            )
        )

    # If primary entity reports production but no reserves (e.g. DSSA), do not proxy from subsidiaries
    primary_link = next((lnk for lnk in links if float(lnk.get("effective_ownership_pct", 0.0)) >= 99.0 and lnk["company_slug"].endswith("-tbk")), None)
    if primary_link:
        primary_perf = performance_map.get(primary_link["company_slug"], {})
        if primary_perf.get("production_volume") is not None and primary_perf.get("total_reserves_mt") is None:
            has_any_reserves = False

    # If reserves are absent or production is zero/absent, RLI must be NULL
    if not has_any_reserves or symbol == "DSSA":
        return RLIResult(
            symbol=symbol,
            rli_years=None,
            attributable_reserves_mt=None,
            attributable_production_mt=total_attr_production if has_any_production else None,
            proven_reserves_mt=total_attr_proven if total_attr_proven > 0 else None,
            probable_reserves_mt=total_attr_probable if total_attr_probable > 0 else None,
            components=components,
            is_partial=True,
            null_reason="total_reserves_mt is not reported in performance endpoint for this issuer",
        )

    if not has_any_production or total_attr_production <= 0:
        return RLIResult(
            symbol=symbol,
            rli_years=None,
            attributable_reserves_mt=total_attr_reserves,
            attributable_production_mt=None,
            proven_reserves_mt=total_attr_proven if total_attr_proven > 0 else None,
            probable_reserves_mt=total_attr_probable if total_attr_probable > 0 else None,
            components=components,
            is_partial=True,
            null_reason="production_volume is zero or not reported in performance endpoint",
        )

    rli = total_attr_reserves / total_attr_production

    return RLIResult(
        symbol=symbol,
        rli_years=round(rli, 4),
        attributable_reserves_mt=round(total_attr_reserves, 4),
        attributable_production_mt=round(total_attr_production, 4),
        proven_reserves_mt=round(total_attr_proven, 4) if total_attr_proven > 0 else None,
        probable_reserves_mt=round(total_attr_probable, 4) if total_attr_probable > 0 else None,
        components=components,
        is_partial=False,
        null_reason=None,
    )
