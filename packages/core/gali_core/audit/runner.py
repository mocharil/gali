"""Phase 1: Data Truth Audit Runner.

Executes sequential, budget-capped probes against Sectors API to verify ground-truth data availability.
All responses are permanently cached to raw.responses (0 credits on re-run).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import rapidfuzz
import structlog

from gali_core.config import get_settings
from gali_core.sectors.client import SectorsClient, SectorsNotFoundError

logger = structlog.get_logger(__name__)


@dataclass
class AuditCompanyCandidate:
    slug: str
    name: str
    symbol: str | None = None
    commodity: str | None = None
    has_symbol: bool = False
    is_idx_listed: bool = False

    # Probe results
    performance_ok: bool = False
    has_reserves: bool = False
    has_production: bool = False
    reserves_mt: float | None = None
    production_mt: float | None = None
    strip_ratio: float | None = None
    calorific_value_kcal: float | None = None

    financials_ok: bool = False
    has_revenue: bool = False
    has_cost: bool = False
    has_sales_vol: bool = False
    revenue_usd: float | None = None
    cost_usd: float | None = None
    sales_vol: float | None = None

    ownership_ok: bool = False
    ownership_tree_len: int = 0
    parents_count: int = 0
    subsidiaries_count: int = 0

    destination_ok: bool = False
    destination_countries: list[str] = field(default_factory=list)

    @property
    def is_fully_qualified(self) -> bool:
        """Candidate has complete reserves + production + financial records."""
        return self.has_reserves and self.has_production and self.has_revenue and self.has_cost


@dataclass
class AuditResult:
    # 1.1 Mining Companies
    total_mining_companies: int = 0
    companies_with_symbol_count: int = 0
    mining_companies: list[dict[str, Any]] = field(default_factory=list)
    symbol_to_slug: dict[str, str] = field(default_factory=dict)

    # Candidates probed
    candidates: dict[str, AuditCompanyCandidate] = field(default_factory=dict)
    qualified_issuers: list[str] = field(default_factory=list)

    # 1.8 Commodities & Prices
    commodities: list[dict[str, Any]] = field(default_factory=list)
    commodity_prices: dict[str, Any] = field(default_factory=dict)

    # 1.9 Contracts
    total_contracts: int = 0
    contract_edges: list[dict[str, Any]] = field(default_factory=list)
    contracts_touching_issuers: int = 0

    # 1.6 Sites
    total_sites: int = 0
    sites_with_coords: int = 0
    sites_with_production: int = 0
    sites_with_strip_ratio: int = 0
    sites: list[dict[str, Any]] = field(default_factory=list)

    # 1.5 Licenses
    total_licenses_probed: int = 0
    licenses_with_slug: int = 0
    fuzzy_match_scores: list[float] = field(default_factory=list)

    # Credit realization & Decision
    credits_spent: int = 0
    gate_decision: str = "PENDING"  # GO, GO_MENYEMPIT, NO_GO


class AuditRunner:
    """Orchestrates Phase 1 Data Truth Audit."""

    def __init__(self, client: SectorsClient | None = None) -> None:
        settings = get_settings()
        live_settings = settings.model_copy(update={"gali_dry_run": False})
        self.client = client or SectorsClient(settings=live_settings)
        self.result = AuditResult()

    async def run(self, max_credits: int = 200) -> AuditResult:
        """Run the full Phase 1 audit sequence."""
        run_id = "phase1_data_truth_audit"
        logger.info("audit_start", max_credits=max_credits, run_id=run_id)

        try:
            # Step 1.1: Pull all mining companies (offset pagination)
            await self._audit_1_1_companies(run_id)

            # Step 1.8: Probe commodities & prices
            await self._audit_1_8_commodities(run_id)

            # Step 1.9: Probe contracts
            await self._audit_1_9_contracts(run_id)

            # Step 1.6: Probe sites (offset pagination)
            await self._audit_1_6_sites(run_id)

            # Step 1.2 - 1.4 & 1.7: Probe candidate companies (Warm tier)
            await self._audit_candidates_deep_probe(run_id)

            # Step 1.5: Probe licenses sample / paginated within remaining budget
            await self._audit_1_5_licenses(run_id)

            # Evaluate Exit Criteria
            self._evaluate_decision_gate()

        finally:
            await self.client.close()

        logger.info(
            "audit_completed",
            total_companies=self.result.total_mining_companies,
            candidates_probed=len(self.result.candidates),
            qualified_issuers=len(self.result.qualified_issuers),
            decision=self.result.gate_decision,
        )

        return self.result

    async def _audit_1_1_companies(self, run_id: str) -> None:
        """Task 1.1: Pull /v2/mining/companies/ with offset pagination."""
        logger.info("audit_step_1_1_start")
        offset = 0
        limit = 30
        all_companies: list[dict[str, Any]] = []

        while True:
            try:
                res = await self.client.get(
                    endpoint="/v2/mining/companies/",
                    params={"limit": limit, "offset": offset},
                    tier="cold",
                    credit_cost=1,
                    run_id=run_id,
                )
            except Exception as e:
                logger.error("audit_companies_page_failed", offset=offset, error=str(e))
                break

            items: list[dict[str, Any]] = []
            has_next = False
            if isinstance(res, dict):
                raw_items = res.get("results", [])
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]
                pagination = res.get("pagination", {})
                if isinstance(pagination, dict):
                    has_next = bool(pagination.get("has_next", False))
            elif isinstance(res, list):
                items = [x for x in res if isinstance(x, dict)]

            if not items:
                break

            all_companies.extend(items)
            logger.info("audit_companies_page", offset=offset, items_count=len(items), total_so_far=len(all_companies))

            if not has_next or len(items) < limit:
                break
            offset += limit

        self.result.total_mining_companies = len(all_companies)
        self.result.mining_companies = all_companies

        for c in all_companies:
            slug = str(c.get("slug") or "")
            name = str(c.get("name") or c.get("company_name") or "")
            sym = c.get("symbol")
            comm_list = c.get("commodity_type") or c.get("commodity")
            comm_str = ", ".join(comm_list) if isinstance(comm_list, list) else (str(comm_list) if comm_list else None)

            if sym and str(sym).strip():
                clean_sym = str(sym).strip().upper()
                self.result.companies_with_symbol_count += 1
                self.result.symbol_to_slug[clean_sym] = slug

                # Register as candidate
                self.result.candidates[slug] = AuditCompanyCandidate(
                    slug=slug,
                    name=name,
                    symbol=clean_sym,
                    commodity=comm_str,
                    has_symbol=True,
                    is_idx_listed=True,
                )
            elif "tbk" in name.lower():
                # Listed Indonesian Tbk company candidate
                self.result.candidates[slug] = AuditCompanyCandidate(
                    slug=slug,
                    name=name,
                    symbol=None,
                    commodity=comm_str,
                    has_symbol=False,
                    is_idx_listed=True,
                )

        logger.info(
            "audit_step_1_1_done",
            total=self.result.total_mining_companies,
            with_symbol=self.result.companies_with_symbol_count,
            candidates=len(self.result.candidates),
        )

    async def _audit_1_8_commodities(self, run_id: str) -> None:
        """Task 1.8: Pull /v2/mining/commodities/ and price benchmarks."""
        logger.info("audit_step_1_8_start")
        try:
            res = await self.client.get(
                endpoint="/v2/mining/commodities/",
                tier="cold",
                credit_cost=1,
                run_id=run_id,
            )
            items: list[dict[str, Any]] = []
            if isinstance(res, list):
                items = [x for x in res if isinstance(x, dict)]
            elif isinstance(res, dict):
                raw_items = res.get("results", res.get("items", []))
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]

            self.result.commodities = items

            # Probe prices for major commodities
            for comm in items:
                name = comm.get("name") or comm.get("slug")
                if not name:
                    continue
                try:
                    price_res = await self.client.get(
                        endpoint=f"/v2/mining/commodities/{name}/price/",
                        tier="hot",
                        credit_cost=1,
                        run_id=run_id,
                    )
                    self.result.commodity_prices[str(name)] = price_res
                except SectorsNotFoundError:
                    logger.warning("commodity_price_not_found", commodity=name)
                except Exception as exc:
                    logger.warning("commodity_price_error", commodity=name, error=str(exc))

            logger.info(
                "audit_step_1_8_done",
                commodities_count=len(items),
                price_series=list(self.result.commodity_prices.keys()),
            )
        except Exception as e:
            logger.error("audit_commodities_failed", error=str(e))

    async def _audit_1_9_contracts(self, run_id: str) -> None:
        """Task 1.9: Pull /v2/mining/contracts/ (unpaginated list)."""
        logger.info("audit_step_1_9_start")
        try:
            res = await self.client.get(
                endpoint="/v2/mining/contracts/",
                tier="cold",
                credit_cost=1,
                run_id=run_id,
            )
            items: list[dict[str, Any]] = []
            if isinstance(res, list):
                items = [x for x in res if isinstance(x, dict)]
            elif isinstance(res, dict):
                raw_items = res.get("results", res.get("items", []))
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]

            self.result.total_contracts = len(items)
            self.result.contract_edges = items

            candidate_slugs = set(self.result.candidates.keys())
            touching = 0
            for contract in items:
                owner = contract.get("mine_owner_slug") or contract.get("owner_slug") or ""
                contractor = contract.get("contractor_slug") or ""
                if owner in candidate_slugs or contractor in candidate_slugs:
                    touching += 1
            self.result.contracts_touching_issuers = touching

            logger.info("audit_step_1_9_done", total_contracts=len(items), touching_issuers=touching)
        except Exception as e:
            logger.error("audit_contracts_failed", error=str(e))

    async def _audit_1_6_sites(self, run_id: str) -> None:
        """Task 1.6: Pull /v2/mining/sites/ with offset pagination."""
        logger.info("audit_step_1_6_start")
        offset = 0
        limit = 30
        all_sites: list[dict[str, Any]] = []

        while True:
            try:
                res = await self.client.get(
                    endpoint="/v2/mining/sites/",
                    params={"limit": limit, "offset": offset},
                    tier="cold",
                    credit_cost=1,
                    run_id=run_id,
                )
            except Exception as e:
                logger.error("audit_sites_failed", offset=offset, error=str(e))
                break

            items: list[dict[str, Any]] = []
            has_next = False
            if isinstance(res, dict):
                raw_items = res.get("results", [])
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]
                pagination = res.get("pagination", {})
                if isinstance(pagination, dict):
                    has_next = bool(pagination.get("has_next", False))
            elif isinstance(res, list):
                items = [x for x in res if isinstance(x, dict)]

            if not items:
                break

            all_sites.extend(items)
            if not has_next or len(items) < limit:
                break
            offset += limit

        self.result.total_sites = len(all_sites)
        self.result.sites = all_sites

        for s in all_sites:
            lat = s.get("latitude")
            lon = s.get("longitude")
            prod = s.get("production_volume") or s.get("annual_production_Mt")
            sr = s.get("strip_ratio")

            if lat is not None and lon is not None:
                self.result.sites_with_coords += 1
            if prod is not None:
                self.result.sites_with_production += 1
            if sr is not None:
                self.result.sites_with_strip_ratio += 1

        logger.info(
            "audit_step_1_6_done",
            total_sites=len(all_sites),
            with_coords=self.result.sites_with_coords,
            with_prod=self.result.sites_with_production,
            with_sr=self.result.sites_with_strip_ratio,
        )

    async def _audit_candidates_deep_probe(self, run_id: str) -> None:
        """Tasks 1.2, 1.3, 1.4, 1.7: Deep probe performance, financials, ownership, destinations."""
        logger.info("audit_deep_probe_start", candidates_count=len(self.result.candidates))

        for slug, cand in list(self.result.candidates.items()):
            logger.info("probing_candidate", slug=slug, symbol=cand.symbol)

            # 1.2 Performance probe
            try:
                perf = await self.client.get(
                    endpoint=f"/v2/mining/companies/performance/{slug}/",
                    tier="warm",
                    credit_cost=1,
                    run_id=run_id,
                )
                cand.performance_ok = True
                if isinstance(perf, dict):
                    data = perf.get("data")
                    # data can be list of year records or dict
                    records: list[dict[str, Any]] = []
                    if isinstance(data, list):
                        records = [x for x in data if isinstance(x, dict)]
                    elif isinstance(data, dict):
                        records = [data]

                    for rec in records:
                        stats = rec.get("commodity_stats", rec)
                        if isinstance(stats, dict):
                            prod_vol = stats.get("production_volume")
                            sr = stats.get("strip_ratio")
                            if prod_vol is not None:
                                cand.has_production = True
                                cand.production_mt = float(prod_vol)
                            if sr is not None:
                                cand.strip_ratio = float(sr)

                            reserves = stats.get("resources_reserves")
                            if isinstance(reserves, dict):
                                tot_res = reserves.get("total_reserves_Mt") or reserves.get("total_reserves")
                                if tot_res is not None:
                                    cand.has_reserves = True
                                    cand.reserves_mt = float(tot_res)

                            # Quality CV
                            products = stats.get("products", [])
                            if isinstance(products, list) and products:
                                for p in products:
                                    if isinstance(p, dict):
                                        cv = p.get("calorific_value_kcal")
                                        if isinstance(cv, dict):
                                            cand.calorific_value_kcal = float(cv.get("max") or cv.get("min") or 0)
                                            break
            except SectorsNotFoundError:
                cand.performance_ok = False
            except Exception as e:
                logger.warning("performance_probe_error", slug=slug, error=str(e))

            # 1.3 Financials probe
            try:
                fin = await self.client.get(
                    endpoint=f"/v2/mining/companies/financials/{slug}/",
                    tier="warm",
                    credit_cost=1,
                    run_id=run_id,
                )
                cand.financials_ok = True
                if isinstance(fin, dict):
                    fin_data = fin.get("data", fin)
                    if isinstance(fin_data, dict):
                        rev = fin_data.get("revenue_usd") or fin_data.get("mining_revenue_usd")
                        cost = fin_data.get("cost_of_revenue_usd") or fin_data.get("cash_cost_usd")
                        sym = fin_data.get("symbol")
                        if sym and not cand.symbol:
                            cand.symbol = str(sym).replace(".JK", "").upper()

                        if rev is not None:
                            cand.has_revenue = True
                            cand.revenue_usd = float(rev)
                        if cost is not None:
                            cand.has_cost = True
                            cand.cost_usd = float(cost)
            except SectorsNotFoundError:
                cand.financials_ok = False
            except Exception as e:
                logger.warning("financials_probe_error", slug=slug, error=str(e))

            # 1.4 Ownership probe
            try:
                own = await self.client.get(
                    endpoint=f"/v2/mining/companies/ownership/{slug}/",
                    tier="warm",
                    credit_cost=1,
                    run_id=run_id,
                )
                cand.ownership_ok = True
                if isinstance(own, dict):
                    parents = own.get("parents", [])
                    subs = own.get("subsidiaries", [])
                    cand.parents_count = len(parents) if isinstance(parents, list) else 0
                    cand.subsidiaries_count = len(subs) if isinstance(subs, list) else 0
                    cand.ownership_tree_len = cand.parents_count + cand.subsidiaries_count
            except SectorsNotFoundError:
                cand.ownership_ok = False
            except Exception as e:
                logger.warning("ownership_probe_error", slug=slug, error=str(e))

            # 1.7 Sales Destination probe
            try:
                dest = await self.client.get(
                    endpoint=f"/v2/mining/sales-destination/{slug}/",
                    tier="warm",
                    credit_cost=1,
                    run_id=run_id,
                )
                cand.destination_ok = True
                if isinstance(dest, dict):
                    dest_data = dest.get("data", dest)
                    if isinstance(dest_data, dict):
                        cand.destination_countries = list(dest_data.keys())
            except SectorsNotFoundError:
                cand.destination_ok = False
            except Exception as e:
                logger.warning("destination_probe_error", slug=slug, error=str(e))

            if cand.is_fully_qualified:
                self.result.qualified_issuers.append(cand.symbol or cand.slug)

        logger.info(
            "audit_deep_probe_done",
            total_probed=len(self.result.candidates),
            fully_qualified=len(self.result.qualified_issuers),
        )

    async def _audit_1_5_licenses(self, run_id: str) -> None:
        """Task 1.5: Probe /v2/mining/licenses/ with offset pagination."""
        logger.info("audit_step_1_5_start")
        offset = 0
        limit = 30
        max_license_pages = 25  # ~750 licenses sample to evaluate coverage
        all_licenses: list[dict[str, Any]] = []
        page_count = 0

        while page_count < max_license_pages:
            try:
                res = await self.client.get(
                    endpoint="/v2/mining/licenses/",
                    params={"limit": limit, "offset": offset},
                    tier="cold",
                    credit_cost=1,
                    run_id=run_id,
                )
            except Exception as e:
                logger.error("audit_licenses_failed", offset=offset, error=str(e))
                break

            items: list[dict[str, Any]] = []
            has_next = False
            if isinstance(res, dict):
                raw_items = res.get("results", [])
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]
                pagination = res.get("pagination", {})
                if isinstance(pagination, dict):
                    has_next = bool(pagination.get("has_next", False))
            elif isinstance(res, list):
                items = [x for x in res if isinstance(x, dict)]

            if not items:
                break

            all_licenses.extend(items)
            page_count += 1
            if not has_next or len(items) < limit:
                break
            offset += limit

        self.result.total_licenses_probed = len(all_licenses)
        known_company_names = [str(c.get("name", "")).lower() for c in self.result.mining_companies if c.get("name")]

        with_slug = 0
        scores: list[float] = []
        for lic in all_licenses:
            c_slug = lic.get("company_slug")
            c_name = str(lic.get("company_name", ""))
            if c_slug:
                with_slug += 1
            elif c_name and known_company_names:
                match = rapidfuzz.process.extractOne(
                    c_name.lower(),
                    known_company_names,
                    scorer=rapidfuzz.fuzz.token_sort_ratio,
                )
                if match:
                    score = float(match[1]) / 100.0
                    scores.append(score)

        self.result.licenses_with_slug = with_slug
        self.result.fuzzy_match_scores = scores

        logger.info(
            "audit_step_1_5_done",
            total_licenses=len(all_licenses),
            with_slug=with_slug,
            with_slug_pct=(with_slug / len(all_licenses) * 100) if all_licenses else 0.0,
            avg_fuzzy_score=(sum(scores) / len(scores)) if scores else 0.0,
        )

    def _evaluate_decision_gate(self) -> None:
        """Evaluate Exit Criteria: GO / GO MENYEMPIT / NO-GO."""
        qual_count = len(self.result.qualified_issuers)
        if qual_count >= 15:
            self.result.gate_decision = "GO"
        elif 8 <= qual_count <= 14:
            self.result.gate_decision = "GO_MENYEMPIT"
        else:
            self.result.gate_decision = "NO_GO"
