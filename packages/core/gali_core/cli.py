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
audit_app = typer.Typer(help="Phase 1 Data Truth Audit operations.")
graph_app = typer.Typer(help="Entity resolution and ownership graph operations.")
sites_app = typer.Typer(help="Mining site operations and GPS backfill.")
metrics_app = typer.Typer(help="Metric calculation and leaderboard operations.")

app.add_typer(credits_app, name="credits")
app.add_typer(db_app, name="db")
app.add_typer(audit_app, name="audit")
app.add_typer(graph_app, name="graph")
app.add_typer(sites_app, name="sites")
app.add_typer(metrics_app, name="metrics")

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


@audit_app.command("run")
def audit_run(max_credits: int = 200) -> None:
    """Execute Phase 1 Data Truth Audit and generate documentation."""
    import asyncio

    from gali_core.audit.coverage_report import (
        generate_coverage_markdown,
        generate_credit_budget_markdown,
        print_audit_terminal_summary,
    )
    from gali_core.audit.runner import AuditRunner

    async def _run() -> None:
        console.print(f"[bold blue]Starting Phase 1 Data Truth Audit (Max Credits: {max_credits})...[/bold blue]")
        runner = AuditRunner()
        result = await runner.run(max_credits=max_credits)

        budget = CreditBudget()
        async with async_session() as session:
            credit_report = await budget.get_report_async(session)

        # Print terminal summary
        print_audit_terminal_summary(result, credit_report)

        # Write docs/DATA_COVERAGE.md
        docs_dir = REPO_ROOT / "docs"
        docs_dir.mkdir(exist_ok=True)

        coverage_md = generate_coverage_markdown(result, credit_report)
        (docs_dir / "DATA_COVERAGE.md").write_text(coverage_md, encoding="utf-8")
        console.print("[bold green][OK] Written docs/DATA_COVERAGE.md[/bold green]")

        # Write docs/CREDIT_BUDGET.md
        budget_md = generate_credit_budget_markdown(credit_report)
        (docs_dir / "CREDIT_BUDGET.md").write_text(budget_md, encoding="utf-8")
        console.print("[bold green][OK] Written docs/CREDIT_BUDGET.md[/bold green]")

    asyncio.run(_run())


@app.command("ingest")
def ingest_command(
    tier: str = typer.Option("all", "--tier", "-t", help="Tier to ingest: cold, warm, hot, or all"),
) -> None:
    """Normalize raw responses from raw.responses to core.* and market.* tables."""
    import asyncio

    from sqlalchemy import desc, select

    from gali_core.db.models import RawResponse
    from gali_core.normalize.core_normalizer import (
        normalize_commodity_prices,
        normalize_company_financials,
        normalize_company_performance,
        normalize_mining_companies,
        normalize_mining_contracts,
        normalize_mining_licenses,
        normalize_mining_sites,
        normalize_sales_destinations,
        upsert_commodity_prices,
        upsert_company_financials,
        upsert_company_performance,
        upsert_mining_companies,
        upsert_mining_contracts,
        upsert_mining_licenses,
        upsert_mining_sites,
        upsert_sales_destinations,
    )
    from gali_core.normalize.market_normalizer import normalize_idx_companies, upsert_idx_companies

    async def _run() -> None:
        console.print(f"[bold blue]Starting GALI Normalization Ingestion (Tier: {tier})...[/bold blue]")
        stats: dict[str, int] = {}

        async with async_session() as session:
            async with session.begin():
                # 1. Mining Companies
                if tier in ("cold", "all"):
                    res = await session.execute(
                        select(RawResponse)
                        .where(RawResponse.endpoint == "/v2/mining/companies/", RawResponse.status_code == 200)
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    count = 0
                    for raw in res.scalars().all():
                        if raw.payload:
                            rows = normalize_mining_companies(raw.payload)
                            count += await upsert_mining_companies(session, rows)
                    stats["core.mining_company"] = count

                    # 2. Mining Sites
                    res = await session.execute(
                        select(RawResponse)
                        .where(RawResponse.endpoint == "/v2/mining/sites/", RawResponse.status_code == 200)
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    site_count = 0
                    for raw in res.scalars().all():
                        if raw.payload:
                            s_rows, p_rows = normalize_mining_sites(raw.payload)
                            site_count += await upsert_mining_sites(session, s_rows, p_rows)
                    stats["core.mining_site & prod"] = site_count

                    # 3. Mining Contracts
                    res = await session.execute(
                        select(RawResponse)
                        .where(RawResponse.endpoint == "/v2/mining/contracts/", RawResponse.status_code == 200)
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    c_count = 0
                    for raw in res.scalars().all():
                        if raw.payload:
                            rows = normalize_mining_contracts(raw.payload)
                            c_count += await upsert_mining_contracts(session, rows)
                    stats["core.mining_contract"] = c_count

                    # 4. Mining Licenses
                    res = await session.execute(
                        select(RawResponse)
                        .where(RawResponse.endpoint == "/v2/mining/licenses/", RawResponse.status_code == 200)
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    lic_count = 0
                    for raw in res.scalars().all():
                        if raw.payload:
                            rows = normalize_mining_licenses(raw.payload)
                            lic_count += await upsert_mining_licenses(session, rows)
                    stats["core.mining_license"] = lic_count

                # 5. Performance (Warm)
                if tier in ("warm", "all"):
                    res = await session.execute(
                        select(RawResponse)
                        .where(
                            RawResponse.endpoint.like("/v2/mining/companies/performance/%"),
                            RawResponse.status_code == 200,
                        )
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    perf_count = 0
                    for raw in res.scalars().all():
                        if raw.payload and raw.endpoint:
                            slug = raw.endpoint.strip("/").split("/")[-1]
                            p_rows, pr_rows = normalize_company_performance(slug, raw.payload)
                            perf_count += await upsert_company_performance(session, p_rows, pr_rows)
                    stats["core.company_performance"] = perf_count

                    # 6. Financials (Warm)
                    res = await session.execute(
                        select(RawResponse)
                        .where(
                            RawResponse.endpoint.like("/v2/mining/companies/financials/%"),
                            RawResponse.status_code == 200,
                        )
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    fin_count = 0
                    for raw in res.scalars().all():
                        if raw.payload and raw.endpoint:
                            slug = raw.endpoint.strip("/").split("/")[-1]
                            f_rows = normalize_company_financials(slug, raw.payload)
                            fin_count += await upsert_company_financials(session, f_rows)
                    stats["core.company_financials"] = fin_count

                    # 7. Destinations (Warm)
                    res = await session.execute(
                        select(RawResponse)
                        .where(
                            RawResponse.endpoint.like("/v2/mining/sales-destination/%"), RawResponse.status_code == 200
                        )
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    dest_count = 0
                    for raw in res.scalars().all():
                        if raw.payload and raw.endpoint:
                            slug = raw.endpoint.strip("/").split("/")[-1]
                            d_rows = normalize_sales_destinations(slug, raw.payload)
                            dest_count += await upsert_sales_destinations(session, d_rows)
                    stats["core.sales_destination"] = dest_count

                # 8. Commodities & Market (Hot / All)
                if tier in ("hot", "all"):
                    res = await session.execute(
                        select(RawResponse)
                        .where(
                            RawResponse.endpoint.like("/v2/mining/commodities/%/price/"), RawResponse.status_code == 200
                        )
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    comm_count = 0
                    for raw in res.scalars().all():
                        if raw.payload and raw.endpoint:
                            parts = raw.endpoint.strip("/").split("/")
                            comm_name = parts[-2] if len(parts) >= 2 else "Coal"
                            cp_rows = normalize_commodity_prices(comm_name, raw.payload)
                            comm_count += await upsert_commodity_prices(session, cp_rows)
                    stats["core.commodity_price"] = comm_count

                    res = await session.execute(
                        select(RawResponse)
                        .where(RawResponse.endpoint == "/v2/companies/", RawResponse.status_code == 200)
                        .order_by(desc(RawResponse.fetched_at))
                    )
                    idx_count = 0
                    for raw in res.scalars().all():
                        if raw.payload:
                            i_rows = normalize_idx_companies(raw.payload)
                            idx_count += await upsert_idx_companies(session, i_rows)
                    stats["market.idx_company"] = idx_count

        table = Table(title="GALI Normalization Summary (0 Credits Spent)")
        table.add_column("Target Table", style="cyan")
        table.add_column("Upserted Rows", style="green", justify="right")
        for tbl, count in stats.items():
            table.add_row(tbl, str(count))
        console.print(table)
        console.print("[bold green][OK] Ingestion completed successfully from local raw cache![/bold green]")

    asyncio.run(_run())


@app.command("coverage")
def coverage_command() -> None:
    """Print current table row counts and database data coverage."""
    import asyncio

    from sqlalchemy import text

    async def _run() -> None:
        table = Table(title="GALI Database Layer Coverage")
        table.add_column("Schema", style="cyan")
        table.add_column("Table Name", style="white")
        table.add_column("Row Count", style="green", justify="right")

        async with async_session() as session:
            for schema in ("raw", "core", "market", "graph", "metrics", "ops"):
                tables_res = await session.execute(
                    text(
                        f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}' ORDER BY table_name;"
                    )
                )
                for (tbl_name,) in tables_res.all():
                    cnt_res = await session.execute(text(f"SELECT count(*) FROM {schema}.{tbl_name};"))
                    cnt = cnt_res.scalar_one_or_none() or 0
                    table.add_row(schema, tbl_name, str(cnt))

        console.print(table)

    asyncio.run(_run())


@graph_app.command("resolve")
def graph_resolve_command() -> None:
    """Build ownership graph, resolve effective ownership, and populate graph.* tables."""
    import asyncio

    from gali_core.graph.ownership import build_and_persist_ownership_graph

    async def _run() -> None:
        console.print("[bold blue]Resolving Ownership Graph and Transitive Links...[/bold blue]")
        async with async_session() as session, session.begin():
            edges, links, issuers = await build_and_persist_ownership_graph(session)

        console.print(f"[green][OK] Ownership edges mapped: [bold]{edges}[/bold][/green]")
        console.print(f"[green][OK] Issuer mining links resolved: [bold]{links}[/bold][/green]")
        console.print(f"[green][OK] Issuers initialized: [bold]{issuers}[/bold][/green]")

    asyncio.run(_run())


@graph_app.command("backfill-licenses")
def graph_backfill_licenses_command() -> None:
    """Backfill unlinked core.mining_license rows using entity matching."""
    import asyncio

    from gali_core.graph.ownership import backfill_license_company_slugs

    async def _run() -> None:
        console.print("[bold blue]Backfilling Mining Licenses via Fuzzy Entity Matching...[/bold blue]")
        async with async_session() as session, session.begin():
            count = await backfill_license_company_slugs(session)

        console.print(f"[green][OK] Backfilled licenses: [bold]{count}[/bold][/green]")

    asyncio.run(_run())


@sites_app.command("backfill-gps")
def sites_backfill_gps_command(
    force_live: bool = typer.Option(False, "--live", help="Force live API calls to backfill GPS coordinates"),
) -> None:
    """Backfill GPS coordinates for 57 in-universe mining sites via /v2/mining/sites/{slug}/."""
    import asyncio
    import os

    from gali_core.normalize.core_normalizer import backfill_in_universe_site_gps
    from gali_core.sectors.client import SectorsClient

    async def _run() -> None:
        if force_live:
            os.environ["GALI_DRY_RUN"] = "0"

        console.print("[bold blue]Backfilling GPS coordinates for in-universe mining sites...[/bold blue]")
        client = SectorsClient()
        try:
            async with async_session() as session, session.begin():
                fetched, updated = await backfill_in_universe_site_gps(session, client)

            console.print(f"[green][OK] Site details fetched: [bold]{fetched}[/bold][/green]")
            console.print(f"[green][OK] Sites with GPS updated: [bold]{updated}[/bold][/green]")
        finally:
            await client.close()

    asyncio.run(_run())


@metrics_app.command("run")
def metrics_run_command() -> None:
    """Execute complete M1-M9 metric calculation, validate sanity gates, and publish Blue/Green pointer."""
    import asyncio

    from gali_core.metrics.engine import run_metric_pipeline

    async def _run() -> None:
        console.print("[bold blue]Executing M1-M9 Metric Pipeline across Coal Titans Universe...[/bold blue]")
        async with async_session() as session:
            run_id = await run_metric_pipeline(session)

        console.print("[bold green][OK] Metric Run successfully validated and published![/bold green]")
        console.print(f"[cyan]Published Run ID: [bold]{run_id}[/bold][/cyan]")

    asyncio.run(_run())


@metrics_app.command("report")
def metrics_report_command() -> None:
    """Print the published Ground Truth Score leaderboard and headline metrics."""
    import asyncio

    from sqlalchemy import select

    from gali_core.db.models import IssuerMetrics, PublishedPointer

    async def _run() -> None:
        async with async_session() as session:
            pointer_res = await session.execute(
                select(PublishedPointer).where(PublishedPointer.singleton.is_(True))
            )
            pointer = pointer_res.scalar_one_or_none()
            if not pointer:
                console.print("[bold red]No published metric run found. Run `gali metrics run` first.[/bold red]")
                return

            run_id = pointer.run_id
            res = await session.execute(
                select(IssuerMetrics)
                .where(IssuerMetrics.run_id == run_id)
                .order_by(IssuerMetrics.ground_truth_score.desc().nullslast())
            )
            rows = res.scalars().all()

        console.print(Panel(f"[bold]Published Run ID:[/bold] {run_id}", title="[bold]GALI Ground Truth Leaderboard[/bold]", expand=False))

        table = Table(title="Coal Titans Universe (M1–M9)")
        table.add_column("Symbol", style="bold cyan")
        table.add_column("Data Quality", style="yellow")
        table.add_column("Score (M8)", style="bold green", justify="right")
        table.add_column("Confidence", justify="right")
        table.add_column("RLI (M1)", justify="right")
        table.add_column("RBV USD (M2)", justify="right")
        table.add_column("Cliff 3y (M3)", justify="right")
        table.add_column("Cash Cost (M4)", justify="right")
        table.add_column("Top Market (M6)")

        for r in rows:
            is_partial = r.symbol in ("PTBA", "DSSA")
            quality_badge = "[yellow]PARSIAL[/yellow]" if is_partial else "[green]LENGKAP[/green]"
            score_str = f"{r.ground_truth_score:.1f}" if r.ground_truth_score is not None else "-"
            
            conf_pct = (r.confidence.get("effective_weight", 1.0) * 100) if r.confidence else 100.0
            conf_str = f"{conf_pct:.0f}%"

            rli_str = f"{r.rli_years:.1f} yr" if r.rli_years is not None else "[dim]NULL[/dim]"
            
            if r.reserve_backed_value_usd is not None:
                rbv_str = f"${r.reserve_backed_value_usd / 1e9:.2f}B"
            else:
                rbv_str = "[dim]NULL[/dim]"

            cliff_str = f"{r.license_cliff_3y:.1f}%" if r.license_cliff_3y is not None else "-"
            cost_str = f"${r.cash_cost_per_ton_usd:.1f}/t" if r.cash_cost_per_ton_usd is not None else "[dim]NULL[/dim]"
            
            top_dest = f"{r.top_destination} ({r.top_destination_pct:.0f}%)" if r.top_destination else "-"

            table.add_row(
                r.symbol,
                quality_badge,
                score_str,
                conf_str,
                rli_str,
                rbv_str,
                cliff_str,
                cost_str,
                top_dest,
            )

        console.print(table)

    asyncio.run(_run())


if __name__ == "__main__":
    app()
