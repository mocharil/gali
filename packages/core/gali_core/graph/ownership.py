"""Ownership graph builder and transitive effective ownership resolution engine."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from gali_core.db.models import (
    Issuer,
    IssuerMiningLink,
    MiningCompany,
    MiningLicense,
    OwnershipEdge,
    RawResponse,
)
from gali_core.graph.entity_match import find_best_company_match

logger = logging.getLogger(__name__)

# Maximum depth for recursive ownership traversal to prevent runaway recursions
MAX_SEARCH_DEPTH = 6
INVARIANT_EPSILON = 1e-6


class OwnershipGraph:
    """In-memory representation of the directed corporate ownership graph."""

    def __init__(self) -> None:
        # adj[parent_slug] = list of (child_slug, weight) where weight in (0, 1.0]
        self.adj: dict[str, list[tuple[str, float]]] = {}
        # reverse_adj[child_slug] = list of (parent_slug, weight)
        self.reverse_adj: dict[str, list[tuple[str, float]]] = {}
        # Metadata
        self.symbol_to_slug: dict[str, str] = {}
        self.slug_to_symbol: dict[str, str] = {}
        self.company_names: dict[str, str] = {}

    def add_edge(self, parent_slug: str, child_slug: str, percentage: float) -> None:
        """Add directed ownership edge from parent to child."""
        if not parent_slug or not child_slug or parent_slug == child_slug:
            return
        if percentage <= 0.0:
            return

        weight = min(1.0, percentage / 100.0 if percentage > 1.0 else percentage)

        if parent_slug not in self.adj:
            self.adj[parent_slug] = []
        # Replace existing edge if already present, avoiding duplicate parallel edges
        self.adj[parent_slug] = [(c, w) for c, w in self.adj[parent_slug] if c != child_slug]
        self.adj[parent_slug].append((child_slug, weight))

        if child_slug not in self.reverse_adj:
            self.reverse_adj[child_slug] = []
        self.reverse_adj[child_slug] = [(p, w) for p, w in self.reverse_adj[child_slug] if p != parent_slug]
        self.reverse_adj[child_slug].append((parent_slug, weight))

    def compute_effective_ownership(self, start_slug: str) -> list[dict[str, Any]]:
        """Compute effective ownership from start_slug to all reachable operating subsidiaries.

        Uses DFS with cycle detection, path product accumulation, and max depth limit.
        Returns list of dicts: {company_slug, effective_ownership_pct, path, confidence, method}.
        """
        # paths_to_node[target_slug] = list of (weight_product, path_list)
        node_paths: dict[str, list[tuple[float, list[str]]]] = {}

        def _dfs(
            curr_slug: str,
            current_weight: float,
            current_path: list[str],
            visited: set[str],
            depth: int,
        ) -> None:
            if depth > MAX_SEARCH_DEPTH:
                return

            if curr_slug not in node_paths:
                node_paths[curr_slug] = []
            node_paths[curr_slug].append((current_weight, list(current_path)))

            for child_slug, edge_weight in self.adj.get(curr_slug, []):
                if child_slug in visited:
                    logger.warning(
                        "Cycle detected in ownership graph: %s -> %s (breaking cycle)",
                        " -> ".join(current_path),
                        child_slug,
                    )
                    continue

                new_weight = current_weight * edge_weight
                visited.add(child_slug)
                _dfs(
                    curr_slug=child_slug,
                    current_weight=new_weight,
                    current_path=current_path + [child_slug],
                    visited=visited,
                    depth=depth + 1,
                )
                visited.remove(child_slug)

        visited_set = {start_slug}
        _dfs(
            curr_slug=start_slug,
            current_weight=1.0,
            current_path=[start_slug],
            visited=visited_set,
            depth=0,
        )

        results: list[dict[str, Any]] = []
        for target_slug, paths in node_paths.items():
            total_eff_own = sum(w for w, _ in paths)
            # Enforce invariant 0 < eff_own <= 1.0 (+epsilon)
            clamped_own = min(1.0, total_eff_own)

            best_path = max(paths, key=lambda x: x[0])[1] if paths else [start_slug]

            results.append(
                {
                    "company_slug": target_slug,
                    "effective_ownership_pct": round(clamped_own * 100.0, 4),
                    "path": best_path,
                    "confidence": 1.0 if target_slug == start_slug else 0.95,
                    "method": "direct" if target_slug == start_slug else "ownership_graph",
                }
            )

        return results


def extract_ownership_edges_from_raw(payload: dict | list, source_slug: str) -> list[dict[str, Any]]:
    """Parse parents and subsidiaries from /v2/mining/companies/ownership/{slug}/."""
    edges: list[dict[str, Any]] = []
    if not isinstance(payload, dict):
        return edges

    data = payload.get("data", payload)
    if not isinstance(data, dict):
        return edges

    # 1. Parents (Parent owns source_slug)
    parents = data.get("parents", [])
    if isinstance(parents, list):
        for p in parents:
            if not isinstance(p, dict):
                continue
            p_slug = p.get("slug") or p.get("parent_slug")
            pct = p.get("percentage_ownership") or p.get("ownership_pct") or p.get("share_pct")
            sym = p.get("symbol")
            if p_slug and pct:
                try:
                    pct_val = float(str(pct).replace("%", "").strip())
                    if pct_val > 0.0:
                        edges.append(
                            {
                                "parent_slug": str(p_slug).strip(),
                                "child_slug": source_slug,
                                "percentage_ownership": pct_val,
                                "parent_symbol": str(sym).replace(".JK", "").strip().upper() if sym else None,
                            }
                        )
                except ValueError:
                    pass

    # 2. Subsidiaries (source_slug owns subsidiary)
    subs = data.get("subsidiaries", [])
    if isinstance(subs, list):
        for s in subs:
            if not isinstance(s, dict):
                continue
            s_slug = s.get("slug") or s.get("subsidiary_slug")
            pct = s.get("percentage_ownership") or s.get("ownership_pct") or s.get("share_pct")
            if s_slug and pct:
                try:
                    pct_val = float(str(pct).replace("%", "").strip())
                    if pct_val > 0.0:
                        edges.append(
                            {
                                "parent_slug": source_slug,
                                "child_slug": str(s_slug).strip(),
                                "percentage_ownership": pct_val,
                                "parent_symbol": None,
                            }
                        )
                except ValueError:
                    pass

    return edges


# =============================================================================
# Database Pipeline Operations
# =============================================================================


async def build_and_persist_ownership_graph(session: AsyncSession) -> tuple[int, int, int]:
    """Extract raw ownership responses, build DAG, and populate graph.* tables.

    Returns (edges_count, links_count, issuers_count).
    """
    # 1. Fetch all raw ownership responses
    res = await session.execute(
        select(RawResponse)
        .where(RawResponse.endpoint.like("/v2/mining/companies/ownership/%"), RawResponse.status_code == 200)
        .order_by(desc(RawResponse.fetched_at))
    )
    raw_rows = res.scalars().all()

    all_edges: list[dict[str, Any]] = []
    seen_endpoints: set[str] = set()

    for raw in raw_rows:
        if raw.endpoint in seen_endpoints:
            continue
        seen_endpoints.add(raw.endpoint)

        slug = raw.endpoint.strip("/").split("/")[-1]
        if raw.payload:
            edges = extract_ownership_edges_from_raw(raw.payload, slug)
            all_edges.extend(edges)

    # 2. Deduplicate and insert edges into graph.ownership_edge
    dedup_edges: dict[tuple[str, str], dict[str, Any]] = {(e["parent_slug"], e["child_slug"]): e for e in all_edges}
    unique_edges = list(dedup_edges.values())

    if unique_edges:
        stmt = insert(OwnershipEdge).values(unique_edges)
        stmt = stmt.on_conflict_do_update(
            index_elements=["parent_slug", "child_slug"],
            set_={
                "percentage_ownership": stmt.excluded.percentage_ownership,
                "parent_symbol": stmt.excluded.parent_symbol,
            },
        )
        await session.execute(stmt)

    # 3. Construct graph in memory
    graph = OwnershipGraph()
    for e in unique_edges:
        graph.add_edge(e["parent_slug"], e["child_slug"], e["percentage_ownership"])

    # 4. Identify candidate seed issuers from core.mining_company
    comp_res = await session.execute(select(MiningCompany).where(MiningCompany.symbol.isnot(None)))
    seed_companies = comp_res.scalars().all()

    # Manual / Known Titan Linking Seeds
    titan_seeds = {
        "AADI": "pt-adaro-andalan-indonesia-tbk",
        "ADMR": "pt-adaro-minerals-indonesia-tbk",
        "ADRO": "pt-alamtri-resources-indonesia-tbk",
        "BUMI": "pt-bumi-resources-tbk",
        "BYAN": "pt-bayan-resources-tbk",
        "GEMS": "pt-golden-energy-mines-tbk",
        "ITMG": "pt-indo-tambangraya-megah-tbk",
        "PTBA": "pt-bukit-asam-tbk",
        "DSSA": "pt-dian-swastatika-sentosa-tbk",
        "BSSR": "pt-baramulti-sukses-sarana-tbk",
        "AMMN": "pt-amman-mineral-internasional-tbk",
        "ANTM": "pt-aneka-tambang-tbk",
        "MDKA": "pt-merdeka-copper-gold-tbk",
        "INCO": "pt-vale-indonesia-tbk",
        "HRUM": "pt-harum-energy-tbk",
    }

    symbol_to_slug: dict[str, str] = {}
    for comp in seed_companies:
        if comp.symbol:
            symbol_to_slug[comp.symbol] = comp.slug
    symbol_to_slug.update(titan_seeds)

    # Special Corporate Linking: ADRO owns AADI (15.37% post-spin-off)
    # Ensure ADRO -> AADI is in the graph
    graph.add_edge("pt-alamtri-resources-indonesia-tbk", "pt-adaro-andalan-indonesia-tbk", 15.37)

    # 5. Resolve effective ownership and create IssuerMiningLink
    all_links: list[dict[str, Any]] = []
    issuer_records: list[dict[str, Any]] = []

    for sym, root_slug in symbol_to_slug.items():
        links = graph.compute_effective_ownership(root_slug)
        for link in links:
            all_links.append(
                {
                    "symbol": sym,
                    "company_slug": link["company_slug"],
                    "effective_ownership_pct": link["effective_ownership_pct"],
                    "path": link["path"],
                    "confidence": link["confidence"],
                    "method": link["method"],
                }
            )

        # Issuer metadata
        is_in_universe = sym in ("AADI", "ADMR", "ADRO", "BUMI", "BYAN", "GEMS", "ITMG", "PTBA", "DSSA")
        coverage_data = {
            "root_slug": root_slug,
            "operating_subsidiaries_count": len(links),
            "is_coal_titan": is_in_universe,
        }
        issuer_records.append(
            {
                "symbol": sym,
                "name": root_slug.replace("-", " ").title(),
                "primary_commodity": "Coal",
                "is_in_universe": is_in_universe,
                "coverage": coverage_data,
            }
        )

    # Persist IssuerMiningLink
    dedup_links: dict[tuple[str, str], dict[str, Any]] = {
        (link_item["symbol"], link_item["company_slug"]): link_item for link_item in all_links
    }
    unique_links = list(dedup_links.values())

    if unique_links:
        stmt_link = insert(IssuerMiningLink).values(unique_links)
        stmt_link = stmt_link.on_conflict_do_update(
            index_elements=["symbol", "company_slug"],
            set_={
                "effective_ownership_pct": stmt_link.excluded.effective_ownership_pct,
                "path": stmt_link.excluded.path,
                "confidence": stmt_link.excluded.confidence,
                "method": stmt_link.excluded.method,
            },
        )
        await session.execute(stmt_link)

    # Persist Issuer
    dedup_issuers: dict[str, dict[str, Any]] = {i["symbol"]: i for i in issuer_records}
    unique_issuers = list(dedup_issuers.values())

    if unique_issuers:
        stmt_iss = insert(Issuer).values(unique_issuers)
        stmt_iss = stmt_iss.on_conflict_do_update(
            index_elements=["symbol"],
            set_={
                "name": stmt_iss.excluded.name,
                "primary_commodity": stmt_iss.excluded.primary_commodity,
                "is_in_universe": stmt_iss.excluded.is_in_universe,
                "coverage": stmt_iss.excluded.coverage,
            },
        )
        await session.execute(stmt_iss)

    return len(unique_edges), len(unique_links), len(unique_issuers)


async def backfill_license_company_slugs(session: AsyncSession) -> int:
    """Backfill core.mining_license.company_slug via entity matching (Task 3.5)."""
    # 1. Fetch company names lookup
    comp_res = await session.execute(select(MiningCompany.slug, MiningCompany.name))
    company_lookup = {row.slug: row.name for row in comp_res.all()}

    # 2. Fetch unlinked licenses
    lic_res = await session.execute(
        select(MiningLicense).where((MiningLicense.company_slug.is_(None)) | (MiningLicense.company_slug == ""))
    )
    unlinked_licenses = lic_res.scalars().all()

    backfilled_count = 0
    for lic in unlinked_licenses:
        if not lic.company_name:
            continue

        best_slug, confidence, method = find_best_company_match(lic.company_name, company_lookup)
        if best_slug is not None and method is not None:
            lic.company_slug = best_slug
            lic.match_confidence = confidence
            lic.match_method = method
            backfilled_count += 1

    return backfilled_count
