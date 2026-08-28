"""ORM models for all database layers.

Covers schemas: `raw`, `core`, `market`, `graph`, `metrics`, and `ops`.
Design rule: `raw.responses` is append-only and immutable. Every derived layer
is rebuildable from it without spending a single API credit.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from gali_core.db.base import Base

TIER_VALUES = ("cold", "warm", "hot")
METRIC_RUN_STATUS_VALUES = ("building", "validated", "published", "failed")


# =============================================================================
# 1. RAW SCHEMA (Immutable Audit Log)
# =============================================================================


class RawResponse(Base):
    """Immutable record of one Sectors API response.

    `params_hash` is a stable SHA-256 over the canonicalised query parameters,
    so a cache lookup never depends on dict ordering.
    """

    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("endpoint", "params_hash", "fetched_at", name="uq_responses_endpoint_params_fetched"),
        CheckConstraint(f"tier IN {TIER_VALUES}", name="tier_valid"),
        Index("ix_responses_lookup", "endpoint", "params_hash", "fetched_at"),
        Index("ix_responses_run", "run_id"),
        {"schema": "raw"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    params: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    params_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    credits_charged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tier: Mapped[str] = mapped_column(String(8), nullable=False)
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    run_id: Mapped[str | None] = mapped_column(Text, nullable=True)


# =============================================================================
# 2. OPS SCHEMA (Operations & Credit Budget)
# =============================================================================


class CreditLedger(Base):
    """Append-only ledger of credit spend. The budget guard reads SUM(credits)."""

    __tablename__ = "credit_ledger"
    __table_args__ = (
        CheckConstraint(f"tier IN {TIER_VALUES}", name="tier_valid"),
        Index("ix_credit_ledger_occurred", "occurred_at"),
        {"schema": "ops"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    tier: Mapped[str] = mapped_column(String(8), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    run_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    raw_response_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class ApiKey(Base):
    """API keys for public read access."""

    __tablename__ = "api_key"
    __table_args__ = ({"schema": "ops"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    rate_limit_per_min: Mapped[int] = mapped_column(Integer, nullable=False, default=600)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DataCoverage(Base):
    """Snapshot of a data-completeness measurement."""

    __tablename__ = "data_coverage"
    __table_args__ = (
        Index("ix_data_coverage_metric", "metric", "captured_at"),
        {"schema": "ops"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    captured_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    metric: Mapped[str] = mapped_column(Text, nullable=False)
    numerator: Mapped[int] = mapped_column(Integer, nullable=False)
    denominator: Mapped[int] = mapped_column(Integer, nullable=False)
    detail: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


# =============================================================================
# 3. CORE SCHEMA (Normalized Mining Data)
# =============================================================================


class MiningCompany(Base):
    """Mining companies entity."""

    __tablename__ = "mining_company"
    __table_args__ = (
        Index("ix_mining_company_symbol", "symbol"),
        {"schema": "core"},
    )

    slug: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(16), nullable=True)
    company_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_operation: Mapped[str | None] = mapped_column(Text, nullable=True)
    commodity_types: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)


class MiningSite(Base):
    """Mining physical sites/pits."""

    __tablename__ = "mining_site"
    __table_args__ = (
        Index("ix_mining_site_company", "company_slug"),
        Index("ix_mining_site_commodity", "commodity_type"),
        {"schema": "core"},
    )

    slug: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    project_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_slug: Mapped[str | None] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="SET NULL"), nullable=True
    )
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    commodity_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)


class MiningSiteProduction(Base):
    """Annual production and strip ratio for a mining site."""

    __tablename__ = "mining_site_production"
    __table_args__ = ({"schema": "core"},)

    site_slug: Mapped[str] = mapped_column(
        Text, ForeignKey("core.mining_site.slug", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    production_volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    strip_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)


class MiningLicense(Base):
    """ESDM Mining Concession Licenses (IUP / IUPK)."""

    __tablename__ = "mining_license"
    __table_args__ = (
        Index("ix_mining_license_company_slug", "company_slug"),
        Index("ix_mining_license_expiry", "license_expiry_date"),
        Index("ix_mining_license_company_name", "company_name"),
        {"schema": "core"},
    )

    wiup_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    license_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    province: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_effective_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    license_expiry_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    activity: Mapped[str | None] = mapped_column(Text, nullable=True)
    licensed_area_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    commodity_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    cnc: Mapped[str | None] = mapped_column(String(16), nullable=True)
    generation: Mapped[str | None] = mapped_column(String(16), nullable=True)
    company_slug: Mapped[str | None] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="SET NULL"), nullable=True
    )
    match_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_method: Mapped[str | None] = mapped_column(String(32), nullable=True)


class MiningContract(Base):
    """Mining contractor service relationships."""

    __tablename__ = "mining_contract"
    __table_args__ = ({"schema": "core"},)

    mine_owner_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    contractor_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    mine_owner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    contractor_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    contract_period_end: Mapped[dt.date | None] = mapped_column(Date, nullable=True)


class CompanyPerformance(Base):
    """Mining operational metrics, production, and reserves."""

    __tablename__ = "company_performance"
    __table_args__ = ({"schema": "core"},)

    company_slug: Mapped[str] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    commodity_type: Mapped[str] = mapped_column(Text, primary_key=True)
    commodity_sub_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    mining_operation_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    production_volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    sales_volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    overburden_removal_volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    strip_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    measurement_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    proven_reserves_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    probable_reserves_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_reserves_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    measured_resources_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    indicated_resources_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    inferred_resources_mt: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_resources_mt: Mapped[float | None] = mapped_column(Float, nullable=True)


class CompanyProduct(Base):
    """Detailed calorific and chemical specs for mining products."""

    __tablename__ = "company_product"
    __table_args__ = (
        Index("ix_company_product_lookup", "company_slug", "year"),
        {"schema": "core"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    cv_kcal_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    cv_kcal_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    moisture_pct_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    moisture_pct_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    ash_adb_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    ash_adb_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    sulphur_adb_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    sulphur_adb_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatile_matter_adb_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatile_matter_adb_max: Mapped[float | None] = mapped_column(Float, nullable=True)


class CompanyFinancials(Base):
    """USD-denominated financials and unit cost metrics for mining operations."""

    __tablename__ = "company_financials"
    __table_args__ = ({"schema": "core"},)

    company_slug: Mapped[str] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str | None] = mapped_column(String(16), nullable=True)
    assets_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cost_of_revenue_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_of_revenue_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    profit_usd: Mapped[float | None] = mapped_column(Float, nullable=True)


class SalesDestination(Base):
    """Country breakdown of sales volume and revenues."""

    __tablename__ = "sales_destination"
    __table_args__ = (
        Index("ix_sales_destination_lookup", "company_slug", "year"),
        {"schema": "core"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(
        Text, ForeignKey("core.mining_company.slug", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    country: Mapped[str] = mapped_column(Text, nullable=False)
    commodity_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    revenue_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_of_total_revenue: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_of_sales_volume: Mapped[float | None] = mapped_column(Float, nullable=True)


class CommodityPrice(Base):
    """Daily/weekly historical commodity benchmark prices."""

    __tablename__ = "commodity_price"
    __table_args__ = ({"schema": "core"},)

    commodity: Mapped[str] = mapped_column(Text, primary_key=True)
    observed_on: Mapped[dt.date] = mapped_column(Date, primary_key=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)


class CommodityExportDestination(Base):
    """National export volume and value by commodity and destination."""

    __tablename__ = "commodity_export_destination"
    __table_args__ = ({"schema": "core"},)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    commodity: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    country: Mapped[str] = mapped_column(Text, nullable=False)
    export_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)


class NationalProduction(Base):
    """Total national production of mining commodities."""

    __tablename__ = "national_production"
    __table_args__ = ({"schema": "core"},)

    commodity: Mapped[str] = mapped_column(Text, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_production: Mapped[float] = mapped_column(Float, nullable=False)
    yoy_pct: Mapped[float | None] = mapped_column(Float, nullable=True)


class ProvinceReserves(Base):
    """Regional reserves and resource estimates per province."""

    __tablename__ = "province_reserves"
    __table_args__ = ({"schema": "core"},)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    province: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    commodity: Mapped[str] = mapped_column(Text, nullable=False)
    exploration_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_inventory: Mapped[float | None] = mapped_column(Float, nullable=True)
    resources: Mapped[float | None] = mapped_column(Float, nullable=True)
    reserves: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)


class LicenseAuction(Base):
    """ESDM block auctions and participants."""

    __tablename__ = "license_auction"
    __table_args__ = ({"schema": "core"},)

    wiup_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    block_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    phases: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    participants: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# =============================================================================
# 4. MARKET SCHEMA (IDX Market & Stock Data)
# =============================================================================


class IdxCompany(Base):
    """Listed companies on IDX."""

    __tablename__ = "idx_company"
    __table_args__ = (
        Index("ix_idx_company_sector", "sector"),
        Index("ix_idx_company_sub_sector", "sub_sector"),
        {"schema": "market"},
    )

    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sector: Mapped[str | None] = mapped_column(Text, nullable=True)
    sub_sector: Mapped[str | None] = mapped_column(Text, nullable=True)
    market_cap_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    listing_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class IdxDailyClose(Base):
    """Daily closing price, volume, and market cap for IDX tickers."""

    __tablename__ = "idx_daily_close"
    __table_args__ = (
        Index("ix_idx_daily_date", "date"),
        {"schema": "market"},
    )

    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), primary_key=True
    )
    date: Mapped[dt.date] = mapped_column(Date, primary_key=True)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_cap: Mapped[float | None] = mapped_column(Float, nullable=True)


class ForeignFlow(Base):
    """Daily net foreign institutional flow."""

    __tablename__ = "foreign_flow"
    __table_args__ = ({"schema": "market"},)

    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), primary_key=True
    )
    date: Mapped[dt.date] = mapped_column(Date, primary_key=True)
    net_foreign_inflow: Mapped[float] = mapped_column(Float, nullable=False)


class BrokerRegistry(Base):
    """IDX broker registry and classification cohorts."""

    __tablename__ = "broker_registry"
    __table_args__ = ({"schema": "market"},)

    broker_code: Mapped[str] = mapped_column(String(8), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[str | None] = mapped_column(Text, nullable=True)
    cohort: Mapped[str | None] = mapped_column(String(32), nullable=True)  # institutional, retail, foreign
    license_type: Mapped[str | None] = mapped_column(String(32), nullable=True)


class BrokerSummaryTop(Base):
    """Top buying and selling broker summary."""

    __tablename__ = "broker_summary_top"
    __table_args__ = (
        Index("ix_broker_summary_symbol_window", "symbol", "window_start", "window_end"),
        {"schema": "market"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), nullable=False
    )
    window_start: Mapped[dt.date] = mapped_column(Date, nullable=False)
    window_end: Mapped[dt.date] = mapped_column(Date, nullable=False)
    broker_code: Mapped[str] = mapped_column(String(8), nullable=False)
    side: Mapped[str] = mapped_column(String(8), nullable=False)  # BUY / SELL
    net_value: Mapped[float] = mapped_column(Float, nullable=False)


class FreeFloat(Base):
    """Public free float percentage."""

    __tablename__ = "free_float"
    __table_args__ = ({"schema": "market"},)

    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), primary_key=True
    )
    free_float_pct: Mapped[float] = mapped_column(Float, nullable=False)
    as_of: Mapped[dt.date] = mapped_column(Date, nullable=False)


class Filing(Base):
    """Insider and substantial shareholder regulatory filings."""

    __tablename__ = "filing"
    __table_args__ = (
        Index("ix_filing_symbol_date", "symbol", "date"),
        {"schema": "market"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    holder_name: Mapped[str] = mapped_column(Text, nullable=False)
    holder_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    transaction_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    shares: Mapped[float | None] = mapped_column(Float, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)


class CorporateAction(Base):
    """Dividends, stock splits, rights issues, and warrants."""

    __tablename__ = "corporate_action"
    __table_args__ = (
        Index("ix_corporate_action_symbol", "symbol", "date"),
        {"schema": "market"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(16), ForeignKey("market.idx_company.symbol", ondelete="CASCADE"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String(32), nullable=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# =============================================================================
# 5. GRAPH SCHEMA (Entity Resolution & Ownership Closure)
# =============================================================================


class OwnershipEdge(Base):
    """Directed parent -> child corporate ownership edge."""

    __tablename__ = "ownership_edge"
    __table_args__ = ({"schema": "graph"},)

    parent_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    child_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    percentage_ownership: Mapped[float] = mapped_column(Float, nullable=False)
    parent_symbol: Mapped[str | None] = mapped_column(String(16), nullable=True)


class Issuer(Base):
    """Analyzed issuer in the GALI universe."""

    __tablename__ = "issuer"
    __table_args__ = ({"schema": "graph"},)

    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    primary_commodity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_in_universe: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    coverage: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class IssuerMiningLink(Base):
    """Transitive effective ownership link from IDX ticker to physical operating entity."""

    __tablename__ = "issuer_mining_link"
    __table_args__ = ({"schema": "graph"},)

    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    company_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    effective_ownership_pct: Mapped[float] = mapped_column(Float, nullable=False)
    path: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    method: Mapped[str | None] = mapped_column(String(32), nullable=True)


# =============================================================================
# 6. METRICS SCHEMA (Versioned Metric Runs & Ground Truth Scores)
# =============================================================================


class MetricRun(Base):
    """Versioned metric run tracking (Blue/Green publishing model)."""

    __tablename__ = "run"
    __table_args__ = (
        CheckConstraint(f"status IN {METRIC_RUN_STATUS_VALUES}", name="status_valid"),
        Index("ix_metric_run_status", "status"),
        {"schema": "metrics"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    code_version: Mapped[str] = mapped_column(String(32), nullable=False)
    data_version: Mapped[str] = mapped_column(String(32), nullable=False)
    assumptions: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="building")


class IssuerMetrics(Base):
    """Comprehensive computed M1-M9 ground truth metrics for an issuer."""

    __tablename__ = "issuer_metrics"
    __table_args__ = ({"schema": "metrics"},)

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("metrics.run.id", ondelete="CASCADE"), primary_key=True
    )
    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    as_of: Mapped[dt.date] = mapped_column(Date, nullable=False)

    # M1 — Reserve Life Index
    rli_years: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M2 — Reserve-Backed Value & Implied Life
    implied_life_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    reserve_life_gap_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    attributable_gross_profit_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    reserve_backed_value_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_cap_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    rbv_gap_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M3 — License Cliff
    license_cliff_1y: Mapped[float | None] = mapped_column(Float, nullable=True)
    license_cliff_3y: Mapped[float | None] = mapped_column(Float, nullable=True)
    license_cliff_5y: Mapped[float | None] = mapped_column(Float, nullable=True)
    cnc_coverage_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    weighted_days_to_expiry: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M4 — Cash Cost Curve
    cash_cost_per_ton_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    realized_price_per_ton_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit_margin_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    breakeven_benchmark_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_curve_percentile: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M5 — Quality-Adjusted Realization
    weighted_cv_kcal: Mapped[float | None] = mapped_column(Float, nullable=True)
    benchmark_grade: Mapped[str | None] = mapped_column(String(32), nullable=True)
    benchmark_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_discount_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M6 — Destination Stress Test
    destination_hhi: Mapped[float | None] = mapped_column(Float, nullable=True)
    top_destination: Mapped[str | None] = mapped_column(String(64), nullable=True)
    top_destination_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M7 — Contractor / Supply-Chain Graph
    contractor_hhi: Mapped[float | None] = mapped_column(Float, nullable=True)
    contract_cliff_12m: Mapped[float | None] = mapped_column(Float, nullable=True)

    # M8 — Ground Truth Score
    ground_truth_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    component_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Provenance & Confidence
    confidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class PublishedPointer(Base):
    """Singleton pointer to the currently published MetricRun."""

    __tablename__ = "published_pointer"
    __table_args__ = ({"schema": "metrics"},)

    singleton: Mapped[bool] = mapped_column(Boolean, primary_key=True, default=True)
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("metrics.run.id", ondelete="CASCADE"), nullable=False
    )
