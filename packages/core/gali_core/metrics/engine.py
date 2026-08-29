"""Task 4.12 & 4.13 — Metric Pipeline Orchestrator & Blue/Green Publishing Engine.

Executes end-to-end calculation of M1–M9 metrics across the active universe, applies
strict integrity and sanity validation gates, and atomically publishes the run pointer.
"""

from __future__ import annotations

import datetime as dt
import math
import uuid
from typing import Any

from sqlalchemy import desc, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from gali_core.config import ASSUMPTIONS
from gali_core.db.models import (
    CommodityPrice,
    CompanyFinancials,
    CompanyPerformance,
    CompanyProduct,
    ForeignFlow,
    IdxCompany,
    Issuer,
    IssuerMetrics,
    IssuerMiningLink,
    MetricRun,
    MiningContract,
    MiningLicense,
    PublishedPointer,
    RawResponse,
    SalesDestination,
)
from gali_core.metrics.cash_cost import build_national_cost_curve, compute_issuer_cash_cost
from gali_core.metrics.contracts import compute_contractor_risk
from gali_core.metrics.destination import compute_destination_hhi
from gali_core.metrics.evidence import build_evidence_payload
from gali_core.metrics.license_cliff import compute_license_cliff
from gali_core.metrics.market_divergence import compute_market_divergence
from gali_core.metrics.quality import compute_quality_adjustment
from gali_core.metrics.rbv import compute_rbv
from gali_core.metrics.rli import compute_rli
from gali_core.metrics.score import compute_ground_truth_scores


class MetricValidationError(Exception):
    """Raised when a metric run fails sanity check validation."""

    pass


async def run_metric_pipeline(
    session: AsyncSession,
    as_of: dt.date | None = None,
) -> uuid.UUID:
    """Execute complete M1-M9 metric calculation and atomic Blue/Green publication.

    Args:
        session: Active SQLAlchemy AsyncSession.
        as_of: Evaluation date (defaults to today).

    Returns:
        UUID of the published MetricRun.
    """
    today = as_of or dt.date.today()
    run_id = uuid.uuid4()

    assumptions_snapshot = {
        "discount_rate": ASSUMPTIONS.discount_rate,
        "variable_cost_share": ASSUMPTIONS.variable_cost_share,
        "fx_idr_usd": ASSUMPTIONS.fx_idr_usd,
        "min_match_confidence": ASSUMPTIONS.min_match_confidence,
        "low_match_floor": ASSUMPTIONS.low_match_floor,
        "max_ownership_depth": ASSUMPTIONS.max_ownership_depth,
    }

    # 1. Initialize run in 'building' status
    run_obj = MetricRun(
        id=run_id,
        code_version="v1.0.0",
        data_version="v2.0",
        assumptions=assumptions_snapshot,
        status="building",
    )
    session.add(run_obj)
    await session.flush()

    # 2. Fetch active in-universe issuers (9 coal titans)
    res_issuers = await session.execute(
        select(Issuer).where(
            Issuer.symbol.in_(["AADI", "ADMR", "ADRO", "BUMI", "BYAN", "GEMS", "ITMG", "PTBA", "DSSA"])
        )
    )
    issuers = res_issuers.scalars().all()
    symbols = [i.symbol for i in issuers]

    # 3. Fetch graph links
    res_links = await session.execute(select(IssuerMiningLink).where(IssuerMiningLink.symbol.in_(symbols)))
    all_links = res_links.scalars().all()
    links_by_symbol: dict[str, list[dict[str, Any]]] = {s: [] for s in symbols}
    all_company_slugs: set[str] = set()
    for edge_link in all_links:
        links_by_symbol[edge_link.symbol].append(
            {
                "company_slug": edge_link.company_slug,
                "effective_ownership_pct": edge_link.effective_ownership_pct,
                "confidence": edge_link.confidence,
                "method": edge_link.method,
            }
        )
        all_company_slugs.add(edge_link.company_slug)

    # 4. Fetch performance, financials, products, licenses, destinations, contracts
    res_perf = await session.execute(
        select(CompanyPerformance).where(CompanyPerformance.company_slug.in_(list(all_company_slugs)))
    )
    perf_map: dict[str, dict[str, Any]] = {}
    for p in res_perf.scalars().all():
        perf_map[p.company_slug] = {
            "total_reserves_mt": p.total_reserves_mt,
            "proven_reserves_mt": p.proven_reserves_mt,
            "probable_reserves_mt": p.probable_reserves_mt,
            "production_volume": p.production_volume,
            "sales_volume": p.sales_volume,
            "year": p.year,
        }

    res_fin = await session.execute(
        select(CompanyFinancials).where(CompanyFinancials.company_slug.in_(list(all_company_slugs)))
    )
    fin_map: dict[str, dict[str, Any]] = {}
    for f in res_fin.scalars().all():
        fin_map[f.company_slug] = {
            "revenue_usd": f.revenue_usd,
            "cost_of_revenue_usd": f.cost_of_revenue_usd,
            "cost_of_revenue_breakdown": f.cost_of_revenue_breakdown,
            "profit_usd": f.profit_usd,
            "year": f.year,
        }

    res_prod = await session.execute(
        select(CompanyProduct).where(CompanyProduct.company_slug.in_(list(all_company_slugs)))
    )
    prod_map: dict[str, list[dict[str, Any]]] = {slug: [] for slug in all_company_slugs}
    for pr in res_prod.scalars().all():
        prod_map[pr.company_slug].append(
            {
                "product_name": pr.product_name,
                "cv_kcal_min": pr.cv_kcal_min,
                "cv_kcal_max": pr.cv_kcal_max,
                "year": pr.year,
            }
        )

    res_lic = await session.execute(
        select(MiningLicense).where(MiningLicense.company_slug.in_(list(all_company_slugs)))
    )
    lic_map: dict[str, list[dict[str, Any]]] = {slug: [] for slug in all_company_slugs}
    for lic in res_lic.scalars().all():
        if lic.company_slug:
            lic_map[lic.company_slug].append(
                {
                    "wiup_code": lic.wiup_code,
                    "licensed_area_ha": lic.licensed_area_ha,
                    "license_expiry_date": lic.license_expiry_date,
                    "activity": lic.activity,
                    "cnc": lic.cnc,
                    "match_confidence": lic.match_confidence,
                }
            )

    res_dest = await session.execute(
        select(SalesDestination).where(SalesDestination.company_slug.in_(list(all_company_slugs)))
    )
    dest_map: dict[str, list[dict[str, Any]]] = {slug: [] for slug in all_company_slugs}
    for dst in res_dest.scalars().all():
        dest_map[dst.company_slug].append(
            {
                "country": dst.country,
                "volume": dst.volume,
                "pct_of_sales_volume": dst.pct_of_sales_volume,
                "year": dst.year,
            }
        )

    res_cont = await session.execute(
        select(MiningContract).where(
            MiningContract.mine_owner_slug.in_(list(all_company_slugs))
            | MiningContract.contractor_slug.in_(list(all_company_slugs))
        )
    )
    cont_map: dict[str, list[dict[str, Any]]] = {slug: [] for slug in all_company_slugs}
    for ct in res_cont.scalars().all():
        cont_dict = {
            "contractor_name": ct.contractor_name,
            "contractor_slug": ct.contractor_slug,
            "mine_owner_name": ct.mine_owner_name,
            "mine_owner_slug": ct.mine_owner_slug,
            "contract_period_end": ct.contract_period_end,
        }
        if ct.mine_owner_slug in cont_map:
            cont_map[ct.mine_owner_slug].append(cont_dict)
        if ct.contractor_slug in cont_map:
            cont_map[ct.contractor_slug].append(cont_dict)

    # 5. Fetch market cap & foreign flows
    res_mcap = await session.execute(select(IdxCompany).where(IdxCompany.symbol.in_(symbols)))
    mcap_map: dict[str, float] = {c.symbol: float(c.market_cap_idr or 0.0) for c in res_mcap.scalars().all()}

    res_flows = await session.execute(
        select(ForeignFlow.symbol, text("SUM(net_foreign_inflow)"))
        .where(ForeignFlow.symbol.in_(symbols))
        .group_by(ForeignFlow.symbol)
    )
    flow_map: dict[str, float] = {row[0]: float(row[1] or 0.0) for row in res_flows.all()}

    # 6. Fetch latest commodity benchmark prices
    res_prices = await session.execute(
        select(CommodityPrice).order_by(CommodityPrice.commodity, desc(CommodityPrice.observed_on))
    )
    bench_price_map: dict[str, float] = {}
    for bp in res_prices.scalars().all():
        if bp.commodity not in bench_price_map:
            bench_price_map[bp.commodity] = float(bp.price)

    coal_bench_price = bench_price_map.get("Coal", 102.87)

    # 7. Compute M1 to M7 per issuer
    rli_results: dict[str, Any] = {}
    rbv_results: dict[str, Any] = {}
    cliff_results: dict[str, Any] = {}
    cash_cost_list: list[Any] = []
    quality_results: dict[str, Any] = {}
    dest_results: dict[str, Any] = {}
    contract_results: dict[str, Any] = {}

    for sym in symbols:
        l_list = links_by_symbol.get(sym, [])

        # M1
        rli_res = compute_rli(sym, l_list, perf_map)
        rli_results[sym] = rli_res

        # M2
        mcap_idr = mcap_map.get(sym)
        rbv_res = compute_rbv(
            symbol=sym,
            rli_years=rli_res.rli_years,
            links=l_list,
            financials_map=fin_map,
            market_cap_idr=mcap_idr,
            discount_rate=ASSUMPTIONS.discount_rate,
            fx_idr_usd=ASSUMPTIONS.fx_idr_usd,
        )
        rbv_results[sym] = rbv_res

        # M3
        all_sym_lics: list[dict[str, Any]] = []
        for lnk in l_list:
            all_sym_lics.extend(lic_map.get(lnk["company_slug"], []))
        cliff_res = compute_license_cliff(
            sym, all_sym_lics, as_of=today, min_confidence=ASSUMPTIONS.min_match_confidence
        )
        cliff_results[sym] = cliff_res

        # M4
        cc_res = compute_issuer_cash_cost(
            symbol=sym,
            links=l_list,
            financials_map=fin_map,
            performance_map=perf_map,
            benchmark_price_usd=coal_bench_price,
        )
        cash_cost_list.append(cc_res)

        # M5
        all_sym_prods: list[dict[str, Any]] = []
        for lnk in l_list:
            all_sym_prods.extend(prod_map.get(lnk["company_slug"], []))
        qual_res = compute_quality_adjustment(
            symbol=sym,
            products=all_sym_prods,
            realized_price_per_ton_usd=cc_res.realized_price_per_ton_usd,
            benchmark_prices_map=bench_price_map,
            default_benchmark_price=coal_bench_price,
        )
        quality_results[sym] = qual_res

        # M6
        all_sym_dests: list[dict[str, Any]] = []
        for lnk in l_list:
            all_sym_dests.extend(dest_map.get(lnk["company_slug"], []))
        dest_res = compute_destination_hhi(sym, all_sym_dests)
        dest_results[sym] = dest_res

        # M7
        all_sym_conts: list[dict[str, Any]] = []
        for lnk in l_list:
            all_sym_conts.extend(cont_map.get(lnk["company_slug"], []))
        cont_res = compute_contractor_risk(sym, all_sym_conts, as_of=today)
        contract_results[sym] = cont_res

    # 8. Build National Cost Curve (M4 percentiles)
    cost_curve_results = build_national_cost_curve(cash_cost_list)
    cost_curve_map = {r.symbol: r for r in cost_curve_results}

    # 9. Compute M8 Ground Truth Scores
    score_inputs = [
        {
            "symbol": sym,
            "rli_years": rli_results[sym].rli_years,
            "license_cliff_3y": cliff_results[sym].license_cliff_3y,
            "cost_curve_percentile": cost_curve_map[sym].cost_curve_percentile,
            "destination_hhi": dest_results[sym].destination_hhi,
            "contractor_hhi": contract_results[sym].contractor_hhi,
            "contract_cliff_12m": contract_results[sym].contract_cliff_12m,
        }
        for sym in symbols
    ]
    score_results_list = compute_ground_truth_scores(score_inputs)
    score_map = {s.symbol: s for s in score_results_list}

    # 10. Compute M9 Market Divergence
    div_inputs = [
        {
            "symbol": sym,
            "rbv_gap_pct": rbv_results[sym].rbv_gap_pct,
            "ground_truth_score": score_map[sym].ground_truth_score,
        }
        for sym in symbols
    ]
    div_results_list = compute_market_divergence(div_inputs, foreign_flows_map=flow_map)
    div_map = {d.symbol: d for d in div_results_list}

    # 11. Fetch raw_response_ids for evidence mapping
    res_raw = await session.execute(select(RawResponse.id, RawResponse.endpoint).where(RawResponse.status_code == 200))
    raw_responses_lookup = res_raw.all()
    all_raw_ids = [r[0] for r in raw_responses_lookup]

    # 12. Assemble and write IssuerMetrics rows
    created_metric_rows: list[IssuerMetrics] = []

    for sym in symbols:
        rli = rli_results[sym]
        rbv = rbv_results[sym]
        cliff = cliff_results[sym]
        cc = cost_curve_map[sym]
        qual = quality_results[sym]
        dst = dest_results[sym]
        ct = contract_results[sym]
        sc = score_map[sym]
        div = div_map[sym]

        null_fields: list[dict[str, str]] = []
        if rli.rli_years is None:
            null_fields.append({"field": "rli_years", "reason": rli.null_reason or "missing reserves/production data"})
        if rbv.reserve_backed_value_usd is None:
            null_fields.append(
                {"field": "reserve_backed_value_usd", "reason": rbv.null_reason or "missing financials or RLI"}
            )
        if cc.cash_cost_per_ton_usd is None:
            null_fields.append(
                {"field": "cash_cost_per_ton_usd", "reason": cc.null_reason or "missing cost of revenue"}
            )
        if dst.destination_hhi is None:
            null_fields.append(
                {"field": "destination_hhi", "reason": dst.null_reason or "no sales destination data reported"}
            )
        if ct.contractor_hhi is None:
            null_fields.append(
                {"field": "contractor_hhi", "reason": ct.null_reason or "no mining contractor contracts recorded"}
            )

        field_prov = {
            "linked_operating_entities": [lnk["company_slug"] for lnk in links_by_symbol.get(sym, [])],
            "benchmark_grade": qual.benchmark_grade,
            "benchmark_price_usd": qual.benchmark_price_usd,
            "cost_curve_annual_volume_mt": cc.annual_volume_mt,
            "total_licensed_area_ha": cliff.total_licensed_area_ha,
            "top_export_country": dst.top_destination,
            "top_export_country_pct": dst.top_destination_pct,
            "quadrant": div.quadrant,
        }

        evidence_payload = build_evidence_payload(
            symbol=sym,
            raw_response_ids=all_raw_ids[:20],  # Link to verified cached responses
            field_provenance=field_prov,
            null_fields=null_fields,
            assumptions=assumptions_snapshot,
        )

        row = IssuerMetrics(
            run_id=run_id,
            symbol=sym,
            as_of=today,
            # M1
            rli_years=rli.rli_years,
            # M2
            implied_life_years=rbv.implied_life_years,
            reserve_life_gap_years=rbv.reserve_life_gap_years,
            attributable_gross_profit_usd=rbv.attributable_gross_profit_usd,
            reserve_backed_value_usd=rbv.reserve_backed_value_usd,
            market_cap_usd=rbv.market_cap_usd,
            rbv_gap_pct=rbv.rbv_gap_pct,
            # M3
            license_cliff_1y=cliff.license_cliff_1y,
            license_cliff_3y=cliff.license_cliff_3y,
            license_cliff_5y=cliff.license_cliff_5y,
            cnc_coverage_pct=cliff.cnc_coverage_pct,
            weighted_days_to_expiry=cliff.weighted_days_to_expiry,
            # M4
            cash_cost_per_ton_usd=cc.cash_cost_per_ton_usd,
            realized_price_per_ton_usd=cc.realized_price_per_ton_usd,
            unit_margin_usd=cc.unit_margin_usd,
            breakeven_benchmark_price_usd=cc.breakeven_benchmark_price_usd,
            cost_curve_percentile=cc.cost_curve_percentile,
            # M5
            weighted_cv_kcal=qual.weighted_cv_kcal,
            benchmark_grade=qual.benchmark_grade,
            benchmark_price_usd=qual.benchmark_price_usd,
            quality_discount_pct=qual.quality_discount_pct,
            # M6
            destination_hhi=dst.destination_hhi,
            top_destination=dst.top_destination,
            top_destination_pct=dst.top_destination_pct,
            # M7
            contractor_hhi=ct.contractor_hhi,
            contract_cliff_12m=ct.contract_cliff_12m,
            # M8
            ground_truth_score=sc.ground_truth_score,
            component_scores=sc.component_scores,
            confidence=sc.confidence,
            evidence=evidence_payload,
        )
        session.add(row)
        created_metric_rows.append(row)

    await session.flush()

    # 13. Task 4.13: Sanity Gate Validation Check
    for r in created_metric_rows:
        # Check RLI range [0, 200]
        if r.rli_years is not None and not (0.0 <= r.rli_years <= 200.0):
            run_obj.status = "failed"
            await session.commit()
            raise MetricValidationError(f"Sanity check failed: {r.symbol} RLI {r.rli_years} out of range [0, 200]")

        # Check no NaN or Inf
        for field_name in (
            "rli_years",
            "reserve_backed_value_usd",
            "cash_cost_per_ton_usd",
            "ground_truth_score",
            "license_cliff_3y",
            "destination_hhi",
        ):
            val = getattr(r, field_name)
            if val is not None and (math.isnan(val) or math.isinf(val)):
                run_obj.status = "failed"
                await session.commit()
                raise MetricValidationError(f"Sanity check failed: {r.symbol} {field_name} is NaN or Inf")

        # Check evidence is non-empty
        if not r.evidence or not isinstance(r.evidence, dict):
            run_obj.status = "failed"
            await session.commit()
            raise MetricValidationError(f"Sanity check failed: {r.symbol} evidence payload is empty")

    # 14. Gate validation passed -> flip Blue/Green published pointer
    run_obj.status = "validated"
    await session.flush()

    pointer_stmt = insert(PublishedPointer).values(singleton=True, run_id=run_id)
    pointer_stmt = pointer_stmt.on_conflict_do_update(
        index_elements=["singleton"],
        set_={"run_id": pointer_stmt.excluded.run_id},
    )
    await session.execute(pointer_stmt)

    run_obj.status = "published"
    await session.commit()

    return run_id
