"""CreditBudget guard and spend tracking for Sectors API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from gali_core.config import get_settings
from gali_core.db.models import CreditLedger


class BudgetExceededError(Exception):
    """Raised when an API call would exceed the hard credit budget ceiling."""


@dataclass(frozen=True)
class CreditReport:
    total_spent: int
    hard_cap: int
    grant_total: int
    remaining_under_cap: int
    by_tier: dict[str, int]
    by_endpoint: list[dict[str, Any]]


class CreditBudget:
    """Guards against exceeding API credit allowance (grant: 1000, hard cap: 950)."""

    def __init__(self, hard_cap: int | None = None) -> None:
        settings = get_settings()
        self.hard_cap = hard_cap if hard_cap is not None else settings.sectors_credit_hard_cap
        self.grant_total = 1000

    async def get_total_spent_async(self, session: AsyncSession) -> int:
        stmt = select(func.coalesce(func.sum(CreditLedger.credits), 0))
        result = await session.execute(stmt)
        return int(result.scalar_one())

    def get_total_spent_sync(self, session: Session) -> int:
        stmt = select(func.coalesce(func.sum(CreditLedger.credits), 0))
        result = session.execute(stmt)
        return int(result.scalar_one())

    async def check_budget_async(self, estimated_cost: int, session: AsyncSession) -> None:
        spent = await self.get_total_spent_async(session)
        if spent + estimated_cost > self.hard_cap:
            raise BudgetExceededError(
                f"Credit budget hard cap exceeded! Current spend: {spent}, "
                f"requested call cost: {estimated_cost}, hard cap: {self.hard_cap}"
            )

    def check_budget_sync(self, estimated_cost: int, session: Session) -> None:
        spent = self.get_total_spent_sync(session)
        if spent + estimated_cost > self.hard_cap:
            raise BudgetExceededError(
                f"Credit budget hard cap exceeded! Current spend: {spent}, "
                f"requested call cost: {estimated_cost}, hard cap: {self.hard_cap}"
            )

    async def record_spend_async(
        self,
        endpoint: str,
        credits: int,
        tier: str,
        status_code: int,
        session: AsyncSession,
        run_id: str | None = None,
        raw_response_id: int | None = None,
    ) -> CreditLedger:
        entry = CreditLedger(
            endpoint=endpoint,
            credits=credits,
            tier=tier,
            status_code=status_code,
            run_id=run_id,
            raw_response_id=raw_response_id,
        )
        session.add(entry)
        await session.flush()
        return entry

    def record_spend_sync(
        self,
        endpoint: str,
        credits: int,
        tier: str,
        status_code: int,
        session: Session,
        run_id: str | None = None,
        raw_response_id: int | None = None,
    ) -> CreditLedger:
        entry = CreditLedger(
            endpoint=endpoint,
            credits=credits,
            tier=tier,
            status_code=status_code,
            run_id=run_id,
            raw_response_id=raw_response_id,
        )
        session.add(entry)
        session.flush()
        return entry

    async def get_report_async(self, session: AsyncSession) -> CreditReport:
        total = await self.get_total_spent_async(session)

        # By tier
        tier_stmt = select(CreditLedger.tier, func.sum(CreditLedger.credits)).group_by(CreditLedger.tier)
        tier_res = await session.execute(tier_stmt)
        by_tier = {tier: int(credits) for tier, credits in tier_res.all()}

        # By endpoint
        ep_stmt = (
            select(
                CreditLedger.endpoint,
                CreditLedger.tier,
                func.count(CreditLedger.id).label("call_count"),
                func.sum(CreditLedger.credits).label("total_credits"),
            )
            .group_by(CreditLedger.endpoint, CreditLedger.tier)
            .order_by(func.sum(CreditLedger.credits).desc())
        )
        ep_res = await session.execute(ep_stmt)
        by_endpoint = [
            {
                "endpoint": row.endpoint,
                "tier": row.tier,
                "call_count": row.call_count,
                "total_credits": int(row.total_credits),
            }
            for row in ep_res.all()
        ]

        return CreditReport(
            total_spent=total,
            hard_cap=self.hard_cap,
            grant_total=self.grant_total,
            remaining_under_cap=self.hard_cap - total,
            by_tier=by_tier,
            by_endpoint=by_endpoint,
        )
