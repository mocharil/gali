"""ORM models.

Phase 0 covers the `raw` and `ops` schemas only; `core`, `market`, `graph` and
`metrics` land in Phase 2.1 (see plan §3).

Design rule: `raw.responses` is append-only and immutable. Every derived layer
must be rebuildable from it without spending a single API credit -- that
property is verified in Phase 7.4.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from gali_core.db.base import Base

TIER_VALUES = ("cold", "warm", "hot")


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
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    credits_charged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tier: Mapped[str] = mapped_column(String(8), nullable=False)
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    run_id: Mapped[str | None] = mapped_column(Text, nullable=True)


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
    """Optional API keys for the public read API. Only the hash is stored."""

    __tablename__ = "api_key"
    __table_args__ = ({"schema": "ops"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    rate_limit_per_min: Mapped[int] = mapped_column(Integer, nullable=False, default=600)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DataCoverage(Base):
    """Snapshot of a data-completeness measurement.

    Feeds docs/DATA_COVERAGE.md and the public /coverage page. Coverage is
    reported as a number, never claimed in prose.
    """

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
    ratio: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
