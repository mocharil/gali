"""M3 — License Cliff Engine.

Calculates concession expiration risk across 1, 3, and 5 year horizons,
CNC (Clean and Clear) certification coverage, and area-weighted days to expiry.

Formulas:
    cliff_Ny(s) = Σ{l ∈ L(s) : l.expiry ≤ today + N years AND l.activity = 'Operasi Produksi'} area_ha
                  / Σ{l ∈ L(s)} area_ha
    cnc_coverage(s) = Σ area WHERE cnc = 'CNC' / Σ area
    weighted_days_to_expiry(s) = Σ(area_l × days_to_expiry_l) / Σ area_l
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LicenseCliffResult:
    """Computed M3 License Cliff result."""

    symbol: str
    total_licensed_area_ha: float | None
    total_licenses_count: int
    license_cliff_1y: float | None
    license_cliff_3y: float | None
    license_cliff_5y: float | None
    cnc_coverage_pct: float | None
    weighted_days_to_expiry: float | None
    expiring_licenses_1y: list[dict[str, Any]] = field(default_factory=list)
    expiring_licenses_3y: list[dict[str, Any]] = field(default_factory=list)
    expiring_licenses_5y: list[dict[str, Any]] = field(default_factory=list)
    null_reason: str | None = None


def compute_license_cliff(
    symbol: str,
    licenses: list[dict[str, Any]],
    as_of: dt.date | None = None,
    min_confidence: float = 0.72,
) -> LicenseCliffResult:
    """Compute M3 License Cliff for an issuer.

    Args:
        symbol: Stock symbol.
        licenses: List of matching license dictionaries from core.mining_license.
        as_of: Evaluation date (defaults to today).
        min_confidence: Threshold for headline qualification (default 0.72).

    Returns:
        LicenseCliffResult.
    """
    today = as_of or dt.date.today()
    one_year = today + dt.timedelta(days=365)
    three_years = today + dt.timedelta(days=365 * 3)
    five_years = today + dt.timedelta(days=365 * 5)

    valid_licenses = [
        lic
        for lic in licenses
        if (lic.get("match_confidence") is None or float(lic.get("match_confidence") or 1.0) >= min_confidence)
    ]

    if not valid_licenses:
        return LicenseCliffResult(
            symbol=symbol,
            total_licensed_area_ha=None,
            total_licenses_count=0,
            license_cliff_1y=None,
            license_cliff_3y=None,
            license_cliff_5y=None,
            cnc_coverage_pct=None,
            weighted_days_to_expiry=None,
            null_reason="no mining licenses linked with confidence >= min_match_confidence",
        )

    total_area = 0.0
    cnc_area = 0.0
    exp_area_1y = 0.0
    exp_area_3y = 0.0
    exp_area_5y = 0.0

    weighted_days_sum = 0.0
    weighted_days_area = 0.0

    exp_lic_1y: list[dict[str, Any]] = []
    exp_lic_3y: list[dict[str, Any]] = []
    exp_lic_5y: list[dict[str, Any]] = []

    for lic in valid_licenses:
        area = float(lic.get("licensed_area_ha") or 0.0)
        if area <= 0:
            area = 1.0  # Fallback 1 ha weight if area is missing to count the license

        total_area += area

        cnc_val = str(lic.get("cnc") or "").strip().upper()
        if cnc_val in ("CNC", "CLEAN AND CLEAR", "TRUE", "1"):
            cnc_area += area

        exp_date: dt.date | None = None
        raw_exp = lic.get("license_expiry_date")
        if isinstance(raw_exp, dt.date):
            exp_date = raw_exp
        elif isinstance(raw_exp, str):
            try:
                exp_date = dt.date.fromisoformat(raw_exp[:10])
            except ValueError:
                exp_date = None

        if exp_date is not None:
            days_left = max((exp_date - today).days, 0)
            weighted_days_sum += area * days_left
            weighted_days_area += area

            is_op = "operasi" in str(lic.get("activity") or "").lower() or not lic.get("activity")

            if exp_date <= one_year and is_op:
                exp_area_1y += area
                exp_lic_1y.append(lic)
            if exp_date <= three_years and is_op:
                exp_area_3y += area
                exp_lic_3y.append(lic)
            if exp_date <= five_years and is_op:
                exp_area_5y += area
                exp_lic_5y.append(lic)

    cliff_1y = (exp_area_1y / total_area * 100.0) if total_area > 0 else 0.0
    cliff_3y = (exp_area_3y / total_area * 100.0) if total_area > 0 else 0.0
    cliff_5y = (exp_area_5y / total_area * 100.0) if total_area > 0 else 0.0
    cnc_pct = (cnc_area / total_area * 100.0) if total_area > 0 else 0.0
    weighted_days = (weighted_days_sum / weighted_days_area) if weighted_days_area > 0 else None

    return LicenseCliffResult(
        symbol=symbol,
        total_licensed_area_ha=round(total_area, 2),
        total_licenses_count=len(valid_licenses),
        license_cliff_1y=round(cliff_1y, 2),
        license_cliff_3y=round(cliff_3y, 2),
        license_cliff_5y=round(cliff_5y, 2),
        cnc_coverage_pct=round(cnc_pct, 2),
        weighted_days_to_expiry=round(weighted_days, 1) if weighted_days is not None else None,
        expiring_licenses_1y=exp_lic_1y,
        expiring_licenses_3y=exp_lic_3y,
        expiring_licenses_5y=exp_lic_5y,
        null_reason=None,
    )
