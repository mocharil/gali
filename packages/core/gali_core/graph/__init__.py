"""Entity Resolution and Ownership Graph package for GALI."""

from gali_core.graph.entity_match import (
    calculate_trigram_similarity,
    classify_match,
    find_best_company_match,
    generate_trigrams,
    normalize_company_name,
)
from gali_core.graph.ownership import (
    OwnershipGraph,
    backfill_license_company_slugs,
    build_and_persist_ownership_graph,
    extract_ownership_edges_from_raw,
)

__all__ = [
    "OwnershipGraph",
    "backfill_license_company_slugs",
    "build_and_persist_ownership_graph",
    "calculate_trigram_similarity",
    "classify_match",
    "extract_ownership_edges_from_raw",
    "find_best_company_match",
    "generate_trigrams",
    "normalize_company_name",
]
