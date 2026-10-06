"""Build the offline product dataset with the same M1-M9 engines as production.

No database, upstream requests, API credits, or existing data are modified.
The resulting JSON is bundled into Next.js only for explicit simulation mode.
Run from the repository root with the Python core/API dependencies installed.
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from gali_api.derive import data_quality_label
from gali_api.schemas.cost_curve import CostCurveResponse
from gali_api.schemas.coverage import DataCoverageResponse
from gali_api.schemas.flow_overlay import FlowOverlayResponse
from gali_api.schemas.graph import IssuerGraphResponse
from gali_api.schemas.issuers import IssuerDetail, IssuerSummary
from gali_api.schemas.scenario import ScenarioResponse
from gali_api.schemas.sites import GeoJSONFeatureCollection
from gali_core.config import ASSUMPTIONS
from gali_core.metrics.cash_cost import build_national_cost_curve, compute_issuer_cash_cost
from gali_core.metrics.contracts import compute_contractor_risk
from gali_core.metrics.destination import compute_destination_hhi
from gali_core.metrics.license_cliff import compute_license_cliff
from gali_core.metrics.market_divergence import compute_market_divergence
from gali_core.metrics.quality import compute_quality_adjustment
from gali_core.metrics.rbv import compute_rbv
from gali_core.metrics.rli import compute_rli
from gali_core.metrics.score import compute_ground_truth_scores
from gali_core.scenario.engine import ScenarioShockParams, simulate_scenario_shock

ROOT = Path(__file__).resolve().parents[1]


def build_dataset() -> dict[str, Any]:
    inputs = json.loads((ROOT / "data/simulation/inputs.json").read_text())
    as_of = dt.date.fromisoformat(inputs["as_of"])
    run_id = inputs["version"]
    assumptions = ASSUMPTIONS.model_dump()
    profiles = inputs["issuers"]
    details: dict[str, dict[str, Any]] = {}
    graphs: dict[str, dict[str, Any]] = {}
    sites: list[dict[str, Any]] = []
    cost_results = []
    scenario_inputs = []
    raw_entities: dict[str, list[dict[str, Any]]] = {}

    for index, profile in enumerate(profiles):
        symbol = profile["symbol"]
        links, performance, financials, licenses, destinations, contracts, products = [], {}, {}, [], [], [], []
        nodes = [{"id": symbol, "label": symbol, "type": "issuer", "properties": {"source_type": "synthetic"}}]
        edges = []
        operators = []

        for operator_index, (volume_share, reserve_share, ownership) in enumerate(
            [(0.62, 0.58, 100), (0.38, 0.42, 75)]
        ):
            slug = f"scenario-{symbol.lower()}-operator-{operator_index + 1}"
            name = f"Koridor {symbol} {'Utama' if operator_index == 0 else 'Timur'}"
            link = {
                "company_slug": slug,
                "effective_ownership_pct": ownership,
                "confidence": 1.0,
                "method": "synthetic_explicit_link",
            }
            links.append(link)
            sales = profile["sales_mt"] * volume_share
            production = profile["production_mt"] * volume_share
            reserve = (
                profile["production_mt"] * profile["reserve_years"] * reserve_share
                if profile["reserve_years"] is not None
                else None
            )
            performance[slug] = {
                "production_volume": production,
                "sales_volume": sales,
                "total_reserves_mt": reserve,
                "proven_reserves_mt": reserve * 0.7 if reserve is not None else None,
                "probable_reserves_mt": reserve * 0.3 if reserve is not None else None,
                "year": inputs["year"],
            }
            if profile["realized_price"] is not None:
                price_factor = 1.04 if operator_index == 0 else 1 - 0.04 * 0.62 / (0.38 * 0.75)
                cost_factor = 0.95 if operator_index == 0 else 1 + 0.05 * 0.62 / (0.38 * 0.75)
                financials[slug] = {
                    "revenue_usd": sales * 1e6 * profile["realized_price"] * price_factor,
                    "cost_of_revenue_usd": sales * 1e6 * profile["unit_cost"] * cost_factor,
                    "year": inputs["year"],
                }
            products.append(
                {
                    "product_name": f"Coal {symbol}",
                    "cv_kcal_min": profile["cv"] - 100,
                    "cv_kcal_max": profile["cv"] + 100,
                }
            )
            for country, pct in profile["destinations"].items():
                destinations.append(
                    {"country": country, "volume": sales * ownership / 100 * pct / 100, "pct_of_sales_volume": pct}
                )
            operator = {
                "slug": slug,
                "name": name,
                "ownership_pct": ownership,
                "performance": performance[slug],
                "financials": financials.get(slug),
                "destinations": profile["destinations"],
            }
            operators.append(operator)
            nodes.append(
                {
                    "id": slug,
                    "label": name,
                    "type": "operating_company",
                    "properties": {"effective_ownership_pct": ownership, "source_type": "synthetic"},
                }
            )
            edges.append({"source": symbol, "target": slug, "label": f"{ownership}% ownership", "weight": ownership})

            for site_index, site_share in enumerate([0.57, 0.43]):
                lon, lat = profile["location"]
                lon += (operator_index * 0.26) + (site_index * 0.14) + (index % 3) * 0.04
                lat += operator_index * 0.11 - site_index * 0.16
                site_slug = f"{slug}-site-{site_index + 1}"
                site_name = f"Blok {symbol}-{operator_index + 1}{chr(65 + site_index)}"
                sites.append(
                    {
                        "type": "Feature",
                        "id": site_slug,
                        "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
                        "properties": {
                            "slug": site_slug,
                            "name": site_name,
                            "commodity": "Coal",
                            "company_slug": slug,
                            "company_name": name,
                            "issuer_symbol": symbol,
                            "issuer_symbols": [symbol],
                            "province": profile["province"],
                            "city": "Koridor produksi",
                            "project_name": f"Portofolio {symbol}",
                            "production_volume_mt": round(production * site_share, 4),
                            "is_in_universe": True,
                        },
                    }
                )
                nodes.append(
                    {
                        "id": site_slug,
                        "label": site_name,
                        "type": "mining_site",
                        "properties": {
                            "coordinates": [lon, lat],
                            "production_volume_mt": production * site_share,
                            "source_type": "synthetic",
                        },
                    }
                )
                edges.append({"source": slug, "target": site_slug, "label": "operates", "weight": site_share * 100})

            cliff1, cliff3, cliff5 = profile["cliffs"]
            for license_index, area_share in enumerate([cliff1, cliff3 - cliff1, cliff5 - cliff3, 100 - cliff5]):
                if area_share <= 0:
                    continue
                expiry = [
                    dt.date(2027, 3, 31),
                    dt.date(2028, 5, 31),
                    dt.date(2030, 1, 31),
                    dt.date(2038 + index % 4, 9, 30),
                ][license_index]
                license_id = f"SIM-{symbol}-{operator_index + 1}-{license_index + 1}"
                license_row = {
                    "wiup_code": license_id,
                    "company_slug": slug,
                    "licensed_area_ha": round((14000 + index * 1700) * volume_share * area_share / 100, 2),
                    "license_expiry_date": expiry.isoformat(),
                    "activity": "Operasi Produksi",
                    "cnc": "CNC",
                    "match_confidence": 1.0,
                }
                licenses.append(license_row)
                nodes.append(
                    {
                        "id": license_id,
                        "label": f"Izin {license_index + 1} · {expiry.year}",
                        "type": "license",
                        "properties": {**license_row, "source_type": "synthetic"},
                    }
                )
                edges.append({"source": slug, "target": license_id, "label": "licensed by"})

        contractor_nodes = set()
        for contract_index, contractor_index in enumerate(profile["contractors"]):
            contractor = f"Kontraktor Koridor {contractor_index + 1}"
            contractor_slug = f"scenario-contractor-{contractor_index + 1}"
            end = (
                dt.date(2027, 2, 28)
                if contract_index < profile["expiring_contracts"]
                else dt.date(2030 + contract_index % 3, 6, 30)
            )
            end_date = None if profile.get("missing_contract_date") and contract_index == 5 else end.isoformat()
            owner = links[contract_index % 2]["company_slug"]
            contracts.append(
                {
                    "contractor_name": contractor,
                    "contractor_slug": contractor_slug,
                    "mine_owner_slug": owner,
                    "contract_period_end": end_date,
                }
            )
            if contractor_slug not in contractor_nodes:
                nodes.append(
                    {
                        "id": contractor_slug,
                        "label": contractor,
                        "type": "contractor",
                        "properties": {"source_type": "synthetic"},
                    }
                )
                contractor_nodes.add(contractor_slug)
            edges.append(
                {
                    "source": owner,
                    "target": contractor_slug,
                    "label": "mining contract",
                    "properties": {"contract_period_end": end_date},
                }
            )

        rli = compute_rli(symbol, links, performance)
        rbv = compute_rbv(
            symbol,
            rli.rli_years,
            links,
            financials,
            profile["market_cap_usd"] * assumptions["fx_idr_usd"],
            discount_rate=assumptions["discount_rate"],
            fx_idr_usd=assumptions["fx_idr_usd"],
        )
        cliff = compute_license_cliff(symbol, licenses, as_of)
        cost = compute_issuer_cash_cost(symbol, links, financials, performance, inputs["benchmark_prices"]["Coal"])
        quality = compute_quality_adjustment(
            symbol, products, cost.realized_price_per_ton_usd, inputs["benchmark_prices"]
        )
        destination = compute_destination_hhi(symbol, destinations)
        contractor = compute_contractor_risk(symbol, contracts, as_of)
        cost_results.append(cost)

        fields = {}
        for metric in (rli, rbv, cliff, cost, quality, destination, contractor):
            fields.update(asdict(metric))
        # Each metric's "null_reason" is kept next to its affected field instead of
        # being overwritten by a later metric's generic attribute.
        null_fields = [
            {"field": field, "reason": reason}
            for field, value, reason in [
                ("rli_years", rli.rli_years, rli.null_reason),
                ("reserve_backed_value_usd", rbv.reserve_backed_value_usd, rbv.null_reason),
                ("cash_cost_per_ton_usd", cost.cash_cost_per_ton_usd, cost.null_reason),
                ("contract_cliff_12m", contractor.contract_cliff_12m, contractor.null_reason),
            ]
            if value is None
        ]
        revenue = (
            sum(
                financials[link["company_slug"]]["revenue_usd"] * link["effective_ownership_pct"] / 100
                for link in links
                if link["company_slug"] in financials
            )
            if financials
            else None
        )
        costs = (
            sum(
                financials[link["company_slug"]]["cost_of_revenue_usd"] * link["effective_ownership_pct"] / 100
                for link in links
                if link["company_slug"] in financials
            )
            if financials
            else None
        )
        snapshot = {
            "attributable_revenue_usd": revenue,
            "attributable_cost_usd": costs,
            "destinations": destination.destinations,
            "discount_rate": assumptions["discount_rate"],
        }
        scenario_inputs.append(
            {
                "symbol": symbol,
                "rli_years": rli.rli_years,
                "attributable_gross_profit_usd": rbv.attributable_gross_profit_usd,
                "market_cap_usd": rbv.market_cap_usd,
                "destinations": destination.destinations,
                "attributable_revenue_usd": revenue,
                "attributable_cost_usd": costs,
                "baseline_discount_rate": assumptions["discount_rate"],
                "baseline_rbv_usd": rbv.reserve_backed_value_usd,
                "license_cliff_3y": cliff.license_cliff_3y,
            }
        )
        details[symbol] = {
            **fields,
            "symbol": symbol,
            "name": profile["name"],
            "sub_sector": "Coal",
            "as_of": as_of.isoformat(),
            "run_id": run_id,
            "market_cap_idr": profile["market_cap_usd"] * assumptions["fx_idr_usd"],
            "data_quality": data_quality_label(
                rli_years=rli.rli_years,
                reserve_backed_value_usd=rbv.reserve_backed_value_usd,
                cash_cost_per_ton_usd=cost.cash_cost_per_ton_usd,
            ),
            "linked_entities": [{**link, "name": op["name"]} for link, op in zip(links, operators, strict=True)],
            "evidence": {
                "symbol": symbol,
                "derived_at": f"{as_of.isoformat()}T09:00:00+00:00",
                "audit_version": "synthetic-inputs/core-M1-M9",
                "source_type": "synthetic",
                "source_description": inputs["description"],
                "source_raw_response_ids": [],
                "source_references": [
                    {"endpoint": "data/simulation/inputs.json", "type": "local_synthetic_input", "id": symbol}
                ],
                "assumptions": assumptions,
                "null_fields": null_fields,
                "provenance": {
                    "source_type": "synthetic",
                    "input_file": "data/simulation/inputs.json",
                    "archetype": profile["archetype"],
                    "performance_years": {link["company_slug"]: inputs["year"] for link in links},
                    "financial_years": {slug: inputs["year"] for slug in financials},
                    "cost_curve_annual_volume_mt": cost.annual_volume_mt,
                    "total_licensed_area_ha": cliff.total_licensed_area_ha,
                    "attributable_reserves_mt": rli.attributable_reserves_mt,
                    "attributable_production_mt": rli.attributable_production_mt,
                    "benchmark_grade": quality.benchmark_grade,
                    "benchmark_price_usd": quality.benchmark_price_usd,
                    "ownership_method": "explicit synthetic links",
                    "quality_note": "CV mapping is a general coal reference; premium product realizations can reflect contract and product mix.",
                    "rbv_model": {
                        "basis": "gross_profit_annuity_proxy",
                        "financial_coverage_pct": rbv.financial_coverage_pct,
                        "warnings": list(rbv.warnings),
                        "scope": "Gross profit excludes overhead, tax, reinvestment and the enterprise-to-equity bridge; not fair value.",
                    },
                },
                "scenario_inputs": snapshot,
                "operating_entities": operators,
                "licenses": licenses,
                "contracts": contracts,
                "destination_breakdown": destination.destinations,
            },
        }
        graphs[symbol] = IssuerGraphResponse.model_validate(
            {"symbol": symbol, "nodes": nodes, "edges": edges}
        ).model_dump(mode="json")
        raw_entities[symbol] = operators

    costs = {item.symbol: item for item in build_national_cost_curve(cost_results)}
    for symbol, detail in details.items():
        detail["cost_curve_percentile"] = costs[symbol].cost_curve_percentile
    scores = compute_ground_truth_scores(list(details.values()))
    for score in scores:
        details[score.symbol].update(
            {
                "ground_truth_score": score.ground_truth_score,
                "component_scores": score.component_scores,
                "confidence": score.confidence,
            }
        )
    divergence = compute_market_divergence(
        list(details.values()), {profile["symbol"]: profile["foreign_flow_idr"] for profile in profiles}
    )
    for item in divergence:
        details[item.symbol]["evidence"]["provenance"]["quadrant"] = item.quadrant

    summaries = [
        IssuerSummary.model_validate(
            {**detail, "confidence_pct": detail["confidence"]["effective_weight"] * 100}
        ).model_dump(mode="json")
        for detail in details.values()
    ]
    validated_details = {
        symbol: IssuerDetail.model_validate(detail).model_dump(mode="json") for symbol, detail in details.items()
    }
    cost_curve = CostCurveResponse.model_validate(
        {
            "commodity": "Coal",
            "run_id": run_id,
            "benchmark_price_usd": inputs["benchmark_prices"]["Coal"],
            "points": [
                {**asdict(costs[symbol]), "name": details[symbol]["name"]}
                for symbol in costs
                if costs[symbol].cash_cost_per_ton_usd is not None
            ],
            "partial_issuers_excluded": [symbol for symbol in costs if costs[symbol].cash_cost_per_ton_usd is None],
        }
    ).model_dump(mode="json")
    geojson = GeoJSONFeatureCollection.model_validate(
        {"type": "FeatureCollection", "features": sites, "total_features": len(sites)}
    ).model_dump(mode="json")
    flow_overlay = FlowOverlayResponse.model_validate(
        {
            "run_id": run_id,
            "as_of": as_of,
            "issuers": [
                {
                    **asdict(item),
                    "name": details[item.symbol]["name"],
                    "ground_truth_score": details[item.symbol]["ground_truth_score"],
                    "rbv_gap_pct": details[item.symbol]["rbv_gap_pct"],
                    "market_cap_idr": details[item.symbol]["market_cap_idr"],
                }
                for item in divergence
            ],
        }
    ).model_dump(mode="json")

    def coverage_row(entity: str, numerator: int, denominator: int, description: str) -> dict[str, Any]:
        return {
            "layer": "simulation",
            "entity": entity,
            "numerator": numerator,
            "denominator": denominator,
            "coverage_pct": round(numerator / denominator * 100, 2),
            "description": description,
        }

    coverage = DataCoverageResponse.model_validate(
        {
            "gate_decision": "9 emiten · 7 lengkap · 2 parsial",
            "updated_at": f"{as_of.isoformat()}T09:00:00Z",
            "credits_used": 0,
            "credits_cap": 0,
            "metrics": [
                coverage_row(
                    "Cadangan dan produksi",
                    8,
                    9,
                    "Satu profil sengaja tidak memiliki data cadangan; RLI dan RBV tetap kosong.",
                ),
                coverage_row(
                    "Pendapatan dan biaya",
                    8,
                    9,
                    "Satu profil sengaja tidak memiliki finansial; biaya dan RBV tidak diestimasi.",
                ),
                coverage_row(
                    "Linked operating entities", 18, 18, "Dua operator per emiten dengan kepemilikan 100% dan 75%."
                ),
                coverage_row(
                    "Lokasi dengan koordinat",
                    len(sites),
                    len(sites),
                    "Koordinat sintetis dalam koridor Indonesia untuk uji peta dan penelusuran emiten.",
                ),
                coverage_row("Tujuan penjualan", 9, 9, "Porsi volume per negara berjumlah 100% untuk tiap profil."),
                coverage_row(
                    "Tanggal kontrak", 53, 54, "Satu tanggal akhir kontrak tidak tersedia; tidak dianggap berisiko nol."
                ),
                coverage_row(
                    "Metrik utama lengkap",
                    7,
                    9,
                    "Kelengkapan RLI, RBV, dan cash cost dihitung dari field yang tersedia.",
                ),
            ],
            "in_universe_issuers": [
                {
                    "symbol": summary["symbol"],
                    "name": summary["name"],
                    "quality": summary["data_quality"],
                    "source_type": "synthetic",
                }
                for summary in summaries
            ],
        }
    ).model_dump(mode="json")
    dataset = {
        "meta": {
            "mode": "simulation",
            "source_type": "synthetic",
            "as_of": as_of.isoformat(),
            "year": inputs["year"],
            "version": run_id,
            "label": "Dataset simulasi",
            "description": inputs["description"],
            "issuer_count": 9,
            "operator_count": 18,
            "site_count": len(sites),
            "license_count": sum(len(detail["evidence"]["licenses"]) for detail in details.values()),
            "assumptions": assumptions,
        },
        "issuers": summaries,
        "details": validated_details,
        "graphs": graphs,
        "sites": geojson,
        "cost_curve": cost_curve,
        "flow_overlay": flow_overlay,
        "coverage": coverage,
        "scenario_inputs": scenario_inputs,
        "entities": raw_entities,
    }
    return dataset


def reference_cases(dataset: dict[str, Any]) -> list[dict[str, Any]]:
    params = [
        {},
        {"price_shock_pct": -0.2},
        {"price_shock_pct": -0.25},
        {"price_shock_pct": 0.2},
        {"price_shock_pct": -1},
        {"price_shock_pct": 2},
        {"destination_shocks": {"China": 0.3}},
        {"destination_shocks": {"china": 0.3, "India": 0.2}},
        {"destination_shocks": {"Atlantis": 1}},
        {
            "destination_shocks": {
                "China": 1,
                "India": 1,
                "Indonesia": 1,
                "Japan": 1,
                "Korea": 1,
                "Philippines": 1,
                "Malaysia": 1,
            }
        },
        {"license_cliff_expiry_shock": True},
        {"discount_rate": 0.18},
        {"destination_shocks": {"China": 0.3}, "variable_cost_share": 0},
        {"destination_shocks": {"China": 0.3}, "variable_cost_share": 1},
        {
            "price_shock_pct": -0.15,
            "destination_shocks": {"China": 0.3, "India": 0.2},
            "license_cliff_expiry_shock": True,
            "discount_rate": 0.16,
        },
    ]
    cases = []
    for request in params:
        shock = ScenarioShockParams(**request)
        result = simulate_scenario_shock(dataset["scenario_inputs"], shock)
        response = ScenarioResponse.model_validate(
            {
                "params": asdict(shock),
                "impacts": [asdict(impact) for impact in result.issuer_impacts],
                "execution_time_ms": result.execution_time_ms,
            }
        ).model_dump(mode="json")
        response.pop("execution_time_ms")
        cases.append({"request": request, "expected": response})
    return cases


if __name__ == "__main__":
    dataset = build_dataset()
    destination = ROOT / "packages/web/lib/simulation/dataset.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(dataset, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    cases_path = ROOT / "data/simulation/scenario-reference.json"
    cases_path.write_text(json.dumps(reference_cases(dataset), indent=2, allow_nan=False) + "\n")
    print(
        f"Built {destination}: {len(dataset['issuers'])} issuers, {dataset['meta']['site_count']} sites, {dataset['meta']['license_count']} licenses."
    )
    for issuer in dataset["issuers"]:
        print(
            f"{issuer['symbol']}: RLI={issuer['rli_years']}, cost={issuer['cash_cost_per_ton_usd']}, score={issuer['ground_truth_score']}, RBV gap={issuer['rbv_gap_pct']}"
        )
