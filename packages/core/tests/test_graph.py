"""Unit and property tests for entity resolution and ownership graph (Tasks 3.6 & 3.7)."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from gali_core.db.base import async_session
from gali_core.db.models import IssuerMiningLink
from gali_core.graph.entity_match import (
    calculate_trigram_similarity,
    classify_match,
    normalize_company_name,
)
from gali_core.graph.ownership import OwnershipGraph


def test_normalize_company_name() -> None:
    """Test legal suffix and noise stripping."""
    assert normalize_company_name("PT Adaro Andalan Indonesia Tbk") == "ADARO ANDALAN"
    assert normalize_company_name("PT. BUMI RESOURCES TBK.") == "BUMI"
    assert normalize_company_name("PT BUKIT ASAM (PERSERO) TBK") == "BUKIT ASAM"
    assert normalize_company_name("CV. MAJU JAYA ENERGI") == "MAJU JAYA"
    assert normalize_company_name("PT VALE INDONESIA TBK") == "VALE"


def test_trigram_similarity() -> None:
    """Test trigram similarity scores."""
    s1 = "PT Adaro Andalan Indonesia Tbk"
    s2 = "PT ADARO ANDALAN INDONESIA"
    assert calculate_trigram_similarity(s1, s2) == 1.0

    score = calculate_trigram_similarity("PT Alamtri Resources Indonesia", "PT Alamtri Resources")
    assert score >= 0.72

    method, conf = classify_match(score)
    assert method == "fuzzy"
    assert conf >= 0.72


def test_ownership_graph_cycle_breaking_and_depth() -> None:
    """Test that graph gracefully breaks cycles without infinite loops."""
    g = OwnershipGraph()
    # Create cycle: A -> B (50%) -> C (60%) -> A (20%)
    g.add_edge("comp-a", "comp-b", 50.0)
    g.add_edge("comp-b", "comp-c", 60.0)
    g.add_edge("comp-c", "comp-a", 20.0)
    # Add valid child D from C
    g.add_edge("comp-c", "comp-d", 100.0)

    links = g.compute_effective_ownership("comp-a")
    link_map = {link_item["company_slug"]: link_item["effective_ownership_pct"] for link_item in links}

    assert "comp-a" in link_map
    assert link_map["comp-a"] == 100.0  # Self is 100%
    assert link_map["comp-b"] == 50.0  # Direct 50%
    assert link_map["comp-c"] == 30.0  # 50% * 60% = 30%
    assert link_map["comp-d"] == 30.0  # 30% * 100% = 30%


def test_ownership_invariant_property() -> None:
    """Property test: 0 < eff_own <= 100.0 for all paths in complex multi-parent DAG."""
    g = OwnershipGraph()
    # Multi-path diamond DAG:
    # A -> B (40%), A -> C (50%)
    # B -> D (50%), C -> D (60%)
    # Total to D = (0.4 * 0.5) + (0.5 * 0.6) = 0.20 + 0.30 = 0.50 (50%)
    g.add_edge("root-a", "node-b", 40.0)
    g.add_edge("root-a", "node-c", 50.0)
    g.add_edge("node-b", "node-d", 50.0)
    g.add_edge("node-c", "node-d", 60.0)

    links = g.compute_effective_ownership("root-a")
    for link_item in links:
        eff = link_item["effective_ownership_pct"]
        assert 0.0 < eff <= 100.0 + 1e-4

    d_link = next(link_item for link_item in links if link_item["company_slug"] == "node-d")
    assert pytest.approx(d_link["effective_ownership_pct"], rel=1e-3) == 50.0


@pytest.mark.asyncio
async def test_adaro_adro_aadi_linking_golden() -> None:
    """Task 3.7 Golden test: pt-adaro-andalan-indonesia-tbk is linked to ADRO with 15.37%."""
    async with async_session() as session:
        res = await session.execute(
            select(IssuerMiningLink).where(
                IssuerMiningLink.symbol == "ADRO",
                IssuerMiningLink.company_slug == "pt-adaro-andalan-indonesia-tbk",
            )
        )
        link = res.scalar_one_or_none()
        assert link is not None
        assert pytest.approx(link.effective_ownership_pct, rel=1e-2) == 15.37
