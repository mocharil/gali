"""Routers for Live Parametric Scenario Studio Simulation."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from gali_api.dependencies import get_db, get_published_run_id
from gali_api.schemas.scenario import (
    IssuerScenarioImpactSchema,
    ScenarioResponse,
    ScenarioShockRequest,
)
from gali_core.db.models import IssuerMetrics, IssuerMiningLink, SalesDestination
from gali_core.scenario.engine import ScenarioShockParams, simulate_scenario_shock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/scenario", tags=["Scenario Studio & Live Shocks"])


@router.post("", response_model=ScenarioResponse)
async def run_scenario_simulation(
    request: ScenarioShockRequest,
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
) -> ScenarioResponse:
    """Execute live parametric macroeconomic, trade restriction, and concession shock simulations."""
    # 1. Fetch active issuer metrics
    stmt = select(IssuerMetrics).where(IssuerMetrics.run_id == run_id)
    metrics_rows = (await db.execute(stmt)).scalars().all()

    # 2. Fetch sales destinations for destination shock calculations
    dest_stmt = select(SalesDestination)
    dest_rows = (await db.execute(dest_stmt)).scalars().all()

    link_stmt = select(IssuerMiningLink)
    links = (await db.execute(link_stmt)).scalars().all()

    # Map symbol -> destinations
    slug_to_symbol = {lnk.company_slug: lnk.symbol for lnk in links}
    symbol_dests: dict[str, list[dict[str, Any]]] = {m.symbol: [] for m in metrics_rows}

    for dst in dest_rows:
        sym = slug_to_symbol.get(dst.company_slug)
        if sym and sym in symbol_dests:
            symbol_dests[sym].append(
                {
                    "country": dst.country,
                    "pct_of_sales_volume": dst.pct_of_sales_volume or 0.0,
                    "volume": dst.volume or 0.0,
                }
            )

    # 3. Assemble inputs for scenario engine
    base_issuers: list[dict[str, Any]] = []
    for m in metrics_rows:
        base_issuers.append(
            {
                "symbol": m.symbol,
                "rli_years": m.rli_years,
                "attributable_gross_profit_usd": m.attributable_gross_profit_usd,
                "revenue_usd": None,  # Will fallback to base_gp
                "cost_of_revenue_usd": (m.cash_cost_per_ton_usd * (m.rli_years or 1.0) * 1e6)
                if m.cash_cost_per_ton_usd
                else 0.0,
                "market_cap_usd": m.market_cap_usd,
                "destinations": symbol_dests.get(m.symbol, []),
                "license_cliff_3y": m.license_cliff_3y,
            }
        )

    # 4. Convert request to ScenarioShockParams
    params = ScenarioShockParams(
        price_shock_pct=request.price_shock_pct,
        destination_shocks=request.destination_shocks,
        discount_rate=request.discount_rate,
        variable_cost_share=request.variable_cost_share,
        license_cliff_expiry_shock=request.license_cliff_expiry_shock,
    )

    # 5. Run simulation
    sim_result = simulate_scenario_shock(base_issuers, params)

    impact_schemas = [
        IssuerScenarioImpactSchema(
            symbol=imp.symbol,
            baseline_rbv_usd=imp.baseline_rbv_usd,
            post_shock_rbv_usd=imp.post_shock_rbv_usd,
            delta_rbv_usd=imp.delta_rbv_usd,
            delta_rbv_pct=imp.delta_rbv_pct,
            baseline_rank=imp.baseline_rank,
            post_shock_rank=imp.post_shock_rank,
            rank_change=imp.rank_change,
            volume_at_risk_pct=imp.volume_at_risk_pct,
            revenue_at_risk_usd=imp.revenue_at_risk_usd,
            post_shock_gp_usd=imp.post_shock_gp_usd,
            is_partial=imp.is_partial,
        )
        for imp in sim_result.issuer_impacts
    ]

    return ScenarioResponse(
        params=request,
        impacts=impact_schemas,
        execution_time_ms=sim_result.execution_time_ms,
    )
