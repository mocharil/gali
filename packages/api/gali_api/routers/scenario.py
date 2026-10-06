"""Routers for Live Parametric Scenario Studio Simulation."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends
from gali_api.dependencies import get_db, get_published_run_id
from gali_api.schemas.scenario import (
    IssuerScenarioImpactSchema,
    ScenarioResponse,
    ScenarioShockRequest,
)
from gali_core.config import ASSUMPTIONS
from gali_core.db.models import CompanyFinancials, IssuerMetrics, IssuerMiningLink, SalesDestination
from gali_core.metrics.destination import compute_destination_hhi
from gali_core.metrics.periods import latest_year_rows
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

    # A company can belong to several issuers; preserve every ownership link.
    slug_to_links: dict[str, list[Any]] = {}
    for link in links:
        if link.confidence is not None and link.confidence >= ASSUMPTIONS.min_match_confidence:
            slug_to_links.setdefault(link.company_slug, []).append(link)
    symbol_dests: dict[str, list[dict[str, Any]]] = {m.symbol: [] for m in metrics_rows}

    for dst in latest_year_rows(dest_rows):
        for link in slug_to_links.get(dst.company_slug, []):
            if link.symbol not in symbol_dests:
                continue
            ownership = link.effective_ownership_pct / 100.0
            symbol_dests[link.symbol].append(
                {
                    "country": dst.country,
                    "pct_of_sales_volume": (dst.pct_of_sales_volume or 0.0) * ownership,
                    "volume": (dst.volume or 0.0) * ownership,
                }
            )

    financial_rows = (await db.execute(select(CompanyFinancials))).scalars().all()
    financial_map = {row.company_slug: row for row in latest_year_rows(financial_rows)}

    # 3. Prefer published inputs. Legacy runs are visibly marked by the engine.
    base_issuers: list[dict[str, Any]] = []
    for m in metrics_rows:
        snapshot = (m.evidence or {}).get("scenario_inputs")
        if snapshot is None:
            revenue, costs = 0.0, 0.0
            has_financials = False
            for link in links:
                if (
                    link.symbol != m.symbol
                    or link.confidence is None
                    or link.confidence < ASSUMPTIONS.min_match_confidence
                ):
                    continue
                financials = financial_map.get(link.company_slug)
                if financials and financials.revenue_usd is not None and financials.cost_of_revenue_usd is not None:
                    revenue += financials.revenue_usd * link.effective_ownership_pct / 100.0
                    costs += financials.cost_of_revenue_usd * link.effective_ownership_pct / 100.0
                    has_financials = True
            import math

            reconciled = (
                has_financials
                and m.attributable_gross_profit_usd is not None
                and math.isclose(revenue - costs, m.attributable_gross_profit_usd, rel_tol=1e-6, abs_tol=1.0)
            )
            snapshot = {
                "attributable_revenue_usd": revenue if reconciled else None,
                "attributable_cost_usd": costs if reconciled else None,
                "destinations": compute_destination_hhi(m.symbol, symbol_dests.get(m.symbol, [])).destinations,
                "discount_rate": (m.evidence or {})
                .get("assumptions", {})
                .get("discount_rate", ASSUMPTIONS.discount_rate),
            }
        base_issuers.append(
            {
                "symbol": m.symbol,
                "rli_years": m.rli_years,
                "attributable_gross_profit_usd": m.attributable_gross_profit_usd,
                "market_cap_usd": m.market_cap_usd,
                "destinations": snapshot.get("destinations", []),
                "attributable_revenue_usd": snapshot.get("attributable_revenue_usd"),
                "attributable_cost_usd": snapshot.get("attributable_cost_usd"),
                "baseline_discount_rate": snapshot.get("discount_rate", ASSUMPTIONS.discount_rate),
                "baseline_rbv_usd": m.reserve_backed_value_usd,
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

    impact_schemas = [IssuerScenarioImpactSchema.model_validate(asdict(imp)) for imp in sim_result.issuer_impacts]

    return ScenarioResponse(
        params=request,
        impacts=impact_schemas,
        execution_time_ms=sim_result.execution_time_ms,
    )
