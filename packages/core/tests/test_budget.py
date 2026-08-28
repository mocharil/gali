"""Unit tests for CreditBudget and spend tracking."""

import pytest
from sqlalchemy import text

from gali_core.db.base import async_session
from gali_core.sectors.budget import BudgetExceededError, CreditBudget


@pytest.mark.asyncio
async def test_budget_hard_cap_enforcement() -> None:
    async with async_session() as session:
        async with session.begin():
            budget = CreditBudget(hard_cap=950)
            current_spent = await budget.get_total_spent_async(session)
            dynamic_budget = CreditBudget(hard_cap=current_spent + 10)

            # Check within budget
            await dynamic_budget.check_budget_async(5, session)

            # Check exceeding budget
            with pytest.raises(BudgetExceededError):
                await dynamic_budget.check_budget_async(15, session)


@pytest.mark.asyncio
async def test_record_spend_and_report() -> None:
    budget = CreditBudget(hard_cap=950)

    async with async_session() as session:
        async with session.begin():
            # Record a spend
            entry = await budget.record_spend_async(
                endpoint="/v2/test-endpoint/",
                credits=2,
                tier="warm",
                status_code=200,
                session=session,
                run_id="test_run_01",
            )
            assert entry.id is not None
            assert entry.credits == 2

            report = await budget.get_report_async(session)
            assert report.total_spent >= 2
            assert report.by_tier.get("warm", 0) >= 2
            assert any(ep["endpoint"] == "/v2/test-endpoint/" for ep in report.by_endpoint)

            # Clean up test entry
            await session.execute(
                text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"),
                {"run_id": "test_run_01"},
            )
