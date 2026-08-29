"""M5 — Quality-Adjusted Realization Engine.

Maps product calorific values (CV kcal/kg) and specifications to standard benchmark grades
(ICI-1, ICI-2, ICI-3, ICI-4) and measures realized price premium/discount against benchmark.

Formulas:
    weighted_cv(s)        = mean over products of (cv_kcal_min + cv_kcal_max) / 2
    benchmark_grade       = select_benchmark(commodity, weighted_cv)
    quality_discount_pct  = (benchmark_price − realized_price_per_ton) / benchmark_price × 100
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class QualityResult:
    """Computed M5 Quality Adjustment result."""

    symbol: str
    weighted_cv_kcal: float | None
    benchmark_grade: str | None
    benchmark_price_usd: float | None
    realized_price_per_ton_usd: float | None
    quality_discount_pct: float | None
    products_count: int = 0
    is_partial: bool = False
    null_reason: str | None = None


def select_coal_benchmark(cv_kcal: float | None) -> str:
    """Classify coal CV into standardized benchmark grade."""
    if cv_kcal is None:
        return "Coal (Benchmark)"
    if cv_kcal < 4200:
        return "ICI-4 (4200 GAR)"
    if cv_kcal < 5000:
        return "ICI-3 (5000 GAR)"
    if cv_kcal < 5800:
        return "ICI-2 (5800 GAR)"
    return "ICI-1 / Newcastle (6000 GAR)"


def compute_quality_adjustment(
    symbol: str,
    products: list[dict[str, Any]],
    realized_price_per_ton_usd: float | None,
    benchmark_prices_map: dict[str, float],
    default_benchmark_price: float = 102.87,
) -> QualityResult:
    """Compute M5 quality metrics for an issuer.

    Args:
        symbol: Stock symbol.
        products: List of product specification rows from core.company_product.
        realized_price_per_ton_usd: Realized selling price from M4.
        benchmark_prices_map: Mapping of commodity/grade name -> latest price USD/ton.
        default_benchmark_price: Fallback price if specific grade is missing.
    """
    valid_cvs: list[float] = []

    for p in products:
        cv_min = p.get("cv_kcal_min")
        cv_max = p.get("cv_kcal_max")
        if cv_min is not None and cv_max is not None:
            valid_cvs.append((float(cv_min) + float(cv_max)) / 2.0)
        elif cv_max is not None:
            valid_cvs.append(float(cv_max))
        elif cv_min is not None:
            valid_cvs.append(float(cv_min))

    weighted_cv = (sum(valid_cvs) / len(valid_cvs)) if valid_cvs else None
    grade = select_coal_benchmark(weighted_cv)

    # Determine benchmark price
    bench_price = benchmark_prices_map.get(grade) or benchmark_prices_map.get("Coal") or default_benchmark_price

    quality_discount = None
    if realized_price_per_ton_usd is not None and bench_price > 0:
        quality_discount = ((bench_price - realized_price_per_ton_usd) / bench_price) * 100.0

    if weighted_cv is None and realized_price_per_ton_usd is None:
        return QualityResult(
            symbol=symbol,
            weighted_cv_kcal=None,
            benchmark_grade=grade,
            benchmark_price_usd=round(bench_price, 2),
            realized_price_per_ton_usd=None,
            quality_discount_pct=None,
            products_count=len(products),
            is_partial=True,
            null_reason="no product CV specifications or realized prices found",
        )

    return QualityResult(
        symbol=symbol,
        weighted_cv_kcal=round(weighted_cv, 1) if weighted_cv is not None else None,
        benchmark_grade=grade,
        benchmark_price_usd=round(bench_price, 2),
        realized_price_per_ton_usd=round(realized_price_per_ton_usd, 2)
        if realized_price_per_ton_usd is not None
        else None,
        quality_discount_pct=round(quality_discount, 2) if quality_discount is not None else None,
        products_count=len(products),
        is_partial=False,
        null_reason=None,
    )
