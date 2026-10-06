"""Period selection shared by metric publication and read APIs."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any


def latest_year_rows(rows: Sequence[Any], key: str = "company_slug") -> list[Any]:
    """Keep all rows from each entity's latest year, independent of query order."""
    latest: dict[Any, int] = {}
    for row in rows:
        entity, year = getattr(row, key), row.year
        latest[entity] = max(latest.get(entity, year), year)
    return [row for row in rows if row.year == latest[getattr(row, key)]]
