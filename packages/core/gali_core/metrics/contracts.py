"""M7 — Contractor / Supply-Chain Risk Engine.

Evaluates mining contractor concentration (HHI) and the cliff of contracts expiring
within the next 12 months.

Formulas:
    contractor_hhi(owner) = Σ_contractor (share of owner's contracts)^2  [0 to 10000]
    contract_cliff_12m(x) = count with end_date ≤ today + 1y / contract count
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ContractorResult:
    """Computed M7 Contractor Risk result."""

    symbol: str
    contractor_hhi: float | None
    contract_cliff_12m: float | None
    contracts_count: int = 0
    contracts: list[dict[str, Any]] = field(default_factory=list)
    is_partial: bool = False
    null_reason: str | None = None


def compute_contractor_risk(
    symbol: str,
    contracts: list[dict[str, Any]],
    as_of: dt.date | None = None,
) -> ContractorResult:
    """Compute M7 contractor concentration and cliff for an issuer.

    Args:
        symbol: Stock symbol.
        contracts: List of contractor relationship rows from core.mining_contract.
        as_of: Evaluation date (defaults to today).
    """
    today = as_of or dt.date.today()
    one_year_ahead = today + dt.timedelta(days=365)

    if not contracts:
        return ContractorResult(
            symbol=symbol,
            contractor_hhi=None,
            contract_cliff_12m=None,
            contracts_count=0,
            contracts=[],
            is_partial=True,
            null_reason="no mining contractor contracts recorded for this issuer",
        )

    # Count contracts per contractor
    contractor_counts: dict[str, int] = {}
    expiring_count = 0
    missing_contractor = False
    missing_end_date = False

    for c in contracts:
        contractor = str(c.get("contractor_name") or c.get("contractor_slug") or "").strip()
        if contractor:
            contractor_counts[contractor] = contractor_counts.get(contractor, 0) + 1
        else:
            missing_contractor = True

        end_date: dt.date | None = None
        raw_end = c.get("contract_period_end")
        if isinstance(raw_end, dt.datetime):
            end_date = raw_end.date()
        elif isinstance(raw_end, dt.date):
            end_date = raw_end
        elif isinstance(raw_end, str):
            try:
                end_date = dt.date.fromisoformat(raw_end[:10])
            except ValueError:
                end_date = None

        if end_date is not None and end_date <= one_year_ahead:
            expiring_count += 1
        if end_date is None:
            missing_end_date = True

    total_c = len(contracts)
    # HHI on percentage shares
    hhi = None if missing_contractor else sum(((count / total_c * 100.0) ** 2) for count in contractor_counts.values())
    cliff_12m = None if missing_end_date else expiring_count / total_c * 100.0
    reasons = []
    if missing_contractor:
        reasons.append("one or more contractor identities are missing")
    if missing_end_date:
        reasons.append("one or more contract end dates are missing or invalid")

    return ContractorResult(
        symbol=symbol,
        contractor_hhi=round(hhi, 2) if hhi is not None else None,
        contract_cliff_12m=round(cliff_12m, 2) if cliff_12m is not None else None,
        contracts_count=total_c,
        contracts=contracts,
        is_partial=bool(reasons),
        null_reason="; ".join(reasons) if reasons else None,
    )
