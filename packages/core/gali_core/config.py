"""Runtime configuration and the single registry of financial assumptions.

Every assumption that changes a number shown to a user lives in `Assumptions`.
Rule (plan §0.7): an assumption must be (a) defined here, (b) surfaced in the UI,
(c) documented in docs/METRICS.md. Nothing may hardcode these values elsewhere.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Assumptions(BaseModel):
    """Financial assumptions. Serialised into metrics.run.assumptions and shown in the UI."""

    model_config = {"frozen": True}

    discount_rate: float = Field(
        default=0.12,
        description=(
            "Real discount rate for the Reserve-Backed Value annuity (M2). 12% is a "
            "conventional hurdle for Indonesian resource equities; user-overridable "
            "in the Scenario Studio."
        ),
    )
    variable_cost_share: float = Field(
        default=0.65,
        description=(
            "Share of cash cost assumed to scale with volume in the destination "
            "stress test (M6). The remainder is treated as fixed."
        ),
    )
    fx_idr_usd: float = Field(
        default=16_200.0,
        description=(
            "IDR per USD. Sectors mining financials are USD; IDX market caps are IDR. "
            "A single stated rate is used so the comparison is reproducible."
        ),
    )
    min_match_confidence: float = Field(
        default=0.72,
        description=(
            "Minimum trigram similarity for a fuzzy company-name link to enter "
            "headline metrics (§4.2). Matches in [low_match_floor, this) are shown "
            "but excluded from headline numbers."
        ),
    )
    low_match_floor: float = Field(
        default=0.55,
        description="Below this similarity, a candidate link is discarded entirely.",
    )
    max_ownership_depth: int = Field(
        default=6,
        description="Maximum path length when computing effective ownership closure.",
    )

    @field_validator("discount_rate")
    @classmethod
    def _rate_sane(cls, v: float) -> float:
        if not 0.0 < v < 1.0:
            raise ValueError("discount_rate must be in (0, 1)")
        return v

    @field_validator("variable_cost_share", "min_match_confidence", "low_match_floor")
    @classmethod
    def _share_sane(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("value must be in [0, 1]")
        return v


# Coal benchmark grade bands, keyed by calorific value (kcal/kg, GAR).
# Bands follow the Indonesian Coal Index family. Confirmed against the actual
# series returned by /v2/mining/commodities/{name}/price/ in Phase 1 task 1.8.
COAL_BENCHMARK_BANDS: tuple[tuple[float, float, str], ...] = (
    (0.0, 4200.0, "ICI-4 (4200 GAR)"),
    (4200.0, 5000.0, "ICI-3 (5000 GAR)"),
    (5000.0, 5800.0, "ICI-2 (5800 GAR)"),
    (5800.0, float("inf"), "ICI-1 / NEWC (6000 GAR)"),
)


class Settings(BaseSettings):
    """Environment-driven settings. See .env.example for the full template."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Sectors API -------------------------------------------------------
    sectors_api_key: str = ""
    sectors_base_url: str = "https://api.sectors.app"
    sectors_credit_hard_cap: int = 950
    sectors_timeout_seconds: float = 30.0
    sectors_max_retries: int = 4
    sectors_requests_per_second: float = 4.0

    # When true, the client never spends a credit: a cache miss raises instead.
    gali_dry_run: bool = True

    # --- Database ----------------------------------------------------------
    database_url: str = "postgresql+asyncpg://gali:gali@localhost:5433/gali"
    database_url_sync: str = "postgresql+psycopg://gali:gali@localhost:5433/gali"
    db_pool_size: int = 10
    db_max_overflow: int = 10

    # --- Redis -------------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # --- API ---------------------------------------------------------------
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_allow_origins: str = "http://localhost:3000"
    rate_limit_anon_per_min: int = 60
    rate_limit_keyed_per_min: int = 600
    cache_ttl_seconds: int = 300

    # --- Ops ---------------------------------------------------------------
    log_level: str = "INFO"
    sentry_dsn: str = ""
    environment: Literal["development", "staging", "production"] = "development"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


@lru_cache(maxsize=1)
def get_assumptions() -> Assumptions:
    return Assumptions()
