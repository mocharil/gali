"""GALI CLI entrypoint."""

from __future__ import annotations

import subprocess
import sys

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from gali_core.config import REPO_ROOT, get_settings
from gali_core.db.base import async_session
from gali_core.sectors.budget import CreditBudget

app = typer.Typer(
    name="gali",
    help="GALI — Ground-truth Analytics for Listed Issuers CLI.",
    no_args_is_help=True,
)
credits_app = typer.Typer(help="Manage and inspect Sectors API credit usage.")
db_app = typer.Typer(help="Database operations and migrations.")

app.add_typer(credits_app, name="credits")
app.add_typer(db_app, name="db")

console = Console()


@credits_app.command("report")
def credits_report() -> None:
    """Print current Sectors API credit expenditure from ops.credit_ledger."""
    import asyncio

    async def _run() -> None:
        budget = CreditBudget()
        async with async_session() as session:
            report = await budget.get_report_async(session)

        # Header summary
        cap_color = "green" if report.total_spent <= report.hard_cap * 0.8 else "yellow"
        if report.total_spent > report.hard_cap:
            cap_color = "bold red"

        summary_text = (
            f"[bold]Total Spend:[/bold] [{cap_color}]{report.total_spent}[/{cap_color}] / {report.grant_total} credits\n"
            f"[bold]Hard Cap Ceiling:[/bold] {report.hard_cap} credits\n"
            f"[bold]Remaining under Cap:[/bold] [{cap_color}]{report.remaining_under_cap}[/{cap_color}] credits"
        )
        console.print(Panel(summary_text, title="[bold]GALI Credit Ledger Report[/bold]", expand=False))

        # Table by Tier
        tier_table = Table(title="Spend by Tier")
        tier_table.add_column("Tier", style="cyan")
        tier_table.add_column("Credits Spent", style="magenta", justify="right")
        tier_table.add_column("Share", justify="right")

        for tier in ("cold", "warm", "hot"):
            spent = report.by_tier.get(tier, 0)
            pct = (spent / report.total_spent * 100) if report.total_spent > 0 else 0.0
            tier_table.add_row(tier, str(spent), f"{pct:.1f}%")
        console.print(tier_table)

        # Table by Endpoint
        if report.by_endpoint:
            ep_table = Table(title="Spend by Endpoint")
            ep_table.add_column("Endpoint", style="green")
            ep_table.add_column("Tier", style="cyan")
            ep_table.add_column("Calls", justify="right")
            ep_table.add_column("Credits Spent", style="magenta", justify="right")

            for ep in report.by_endpoint:
                ep_table.add_row(
                    ep["endpoint"],
                    ep["tier"],
                    str(ep["call_count"]),
                    str(ep["total_credits"]),
                )
            console.print(ep_table)
        else:
            console.print("[dim]No API calls recorded in ledger yet.[/dim]\n")

    asyncio.run(_run())


@db_app.command("migrate")
def db_migrate(revision: str = "head") -> None:
    """Run Alembic database migrations."""
    alembic_ini = REPO_ROOT / "packages" / "core" / "alembic.ini"
    console.print(f"[bold blue]Running Alembic migration to revision: {revision}...[/bold blue]")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(alembic_ini), "upgrade", revision],
        cwd=str(REPO_ROOT),
    )
    if result.returncode == 0:
        console.print("[bold green][OK] Migrations successfully applied![/bold green]")
    else:
        console.print("[bold red][FAIL] Migration failed![/bold red]")
        raise typer.Exit(code=result.returncode)


@app.command("smoke")
def smoke_test() -> None:
    """Run Task 0.11 smoke test: call /v2/subsectors/ and verify DB persistence."""
    import asyncio

    from sqlalchemy import desc, select

    from gali_core.db.models import CreditLedger, RawResponse
    from gali_core.sectors.client import SectorsClient

    async def _run() -> None:
        console.print("[bold blue]Running Task 0.11 smoke test against Sectors API (/v2/subsectors/)...[/bold blue]")
        settings = get_settings()
        if not settings.sectors_api_key:
            console.print("[bold red]Error: SECTORS_API_KEY is not set in .env or environment![/bold red]")
            console.print("Please copy .env.example to .env and set your SECTORS_API_KEY.")
            raise typer.Exit(code=1)

        live_settings = settings.model_copy(update={"gali_dry_run": False})
        client = SectorsClient(settings=live_settings)

        try:
            payload = await client.get(
                endpoint="/v2/subsectors/",
                tier="cold",
                credit_cost=1,
                run_id="smoke_test_011",
                force_refresh=True,
            )
            count = len(payload) if isinstance(payload, list) else "OK"
            console.print(f"[bold green][OK] Successfully fetched /v2/subsectors/! Result count: {count}[/bold green]")

            # Verify rows in DB
            async with async_session() as session:
                raw_res = await session.execute(
                    select(RawResponse)
                    .where(RawResponse.endpoint == "/v2/subsectors/")
                    .order_by(desc(RawResponse.fetched_at))
                    .limit(1)
                )
                raw_entry = raw_res.scalar_one_or_none()

                ledger_res = await session.execute(
                    select(CreditLedger)
                    .where(CreditLedger.endpoint == "/v2/subsectors/")
                    .order_by(desc(CreditLedger.occurred_at))
                    .limit(1)
                )
                ledger_entry = ledger_res.scalar_one_or_none()

            if raw_entry and ledger_entry:
                console.print(
                    f"[bold green][OK] Verified raw.responses row: id={raw_entry.id}, status_code={raw_entry.status_code}[/bold green]"
                )
                console.print(
                    f"[bold green][OK] Verified ops.credit_ledger row: id={ledger_entry.id}, credits={ledger_entry.credits}[/bold green]"
                )
                console.print("[bold green][OK] Task 0.11 Smoke Test PASSED![/bold green]")
            else:
                console.print("[bold red][FAIL] Failed to find records in database tables![/bold red]")
                raise typer.Exit(code=1)
        finally:
            await client.close()

    asyncio.run(_run())


if __name__ == "__main__":
    app()
