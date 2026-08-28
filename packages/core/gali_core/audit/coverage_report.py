"""Data coverage reporting and documentation generator for Phase 1."""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from gali_core.audit.runner import AuditResult
from gali_core.sectors.budget import CreditReport


def generate_coverage_markdown(result: AuditResult, credit_report: CreditReport | None = None) -> str:
    """Generate docs/DATA_COVERAGE.md content from audit results."""
    qualified_count = len(result.qualified_issuers)

    lines = [
        "# DATA COVERAGE AUDIT — GALI",
        "",
        "> Laporan audit empiris kelayakan data Sectors Financial API per **29 Agustus 2026**.",
        "> Dihasilkan secara otomatis melalui pengujian live API bertahap (**Fase 1 · Hard Gate**).",
        "",
        "---",
        "",
        "## 1. Ringkasan Eksekutif & Keputusan Gate",
        "",
        f"- **Keputusan Gate**: **`{result.gate_decision}`**",
        f"- **Jumlah Emiten Terkualifikasi Penuh**: **{qualified_count} emiten** (memiliki cadangan + produksi + finansial lengkap)",
        f"- **Total Perusahaan Tambang Terdeteksi**: {result.total_mining_companies} entitas",
        f"- **Perusahaan Tambang Berticker IDX**: {result.companies_with_symbol_count} emiten",
        f"- **Total Titik Tambang (Sites) Terdata**: {result.total_sites} situs ({result.sites_with_coords} dengan koordinat GPS)",
        f"- **Total Kontrak Jasa Tambang**: {result.total_contracts} kontrak ({result.contracts_touching_issuers} terkait emiten)",
        "",
    ]

    if result.gate_decision == "GO":
        lines.extend(
            [
                "> [!NOTE]",
                "> **STATUS: GO PENUH (Scope Lengkap)**",
                f"> Ditemukan $\\ge 15$ emiten ({qualified_count} emiten) dengan data cadangan, produksi, dan finansial memadai.",
                "> Proyek GALI dapat melanjutkan seluruh cakupan analisis (M1–M9) lintas komoditas.",
                "",
            ]
        )
    elif result.gate_decision == "GO_MENYEMPIT":
        lines.extend(
            [
                "> [!WARNING]",
                "> **STATUS: GO MENYEMPIT (Focused Scope)**",
                f"> Ditemukan {qualified_count} emiten terkualifikasi ($8 - 14$ emiten).",
                "> Cakupan dipersempit ke komoditas dengan data terkuat (batubara).",
                "",
            ]
        )
    else:
        lines.extend(
            [
                "> [!CAUTION]",
                "> **STATUS: NO-GO (< 8 Emiten Terkualifikasi)**",
                f"> Hanya ditemukan {qualified_count} emiten dengan data lengkap.",
                "> STOP dan laporkan ke Aril untuk aktivasi rencana cadangan.",
                "",
            ]
        )

    lines.extend(
        [
            "---",
            "",
            "## 2. Matriks Kelengkapan Data per Kandidat Emiten",
            "",
            "| Symbol | Nama Perusahaan | Komoditas | Cadangan (Mt) | Produksi (Mt) | Revenue (USD) | Cash Cost (USD) | Ownership Tree | Destinasi Penjualan | Status |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]
    )

    for _slug, cand in sorted(
        result.candidates.items(), key=lambda x: (not x[1].is_fully_qualified, x[1].symbol or "")
    ):
        sym = cand.symbol or "-"
        name = cand.name[:25]
        comm = cand.commodity or "-"
        res = f"{cand.reserves_mt:.1f}" if cand.reserves_mt is not None else ("OK" if cand.has_reserves else "NULL")
        prod = (
            f"{cand.production_mt:.1f}" if cand.production_mt is not None else ("OK" if cand.has_production else "NULL")
        )
        rev = f"${cand.revenue_usd:,.0f}" if cand.revenue_usd is not None else ("OK" if cand.has_revenue else "NULL")
        cost = f"${cand.cost_usd:,.0f}" if cand.cost_usd is not None else ("OK" if cand.has_cost else "NULL")
        own = f"{cand.ownership_tree_len} relasi" if cand.ownership_ok else "NULL"
        dest = (
            f"{len(cand.destination_countries)} negara"
            if cand.destination_ok and cand.destination_countries
            else ("OK" if cand.destination_ok else "NULL")
        )
        status = "✅ LENGKAP" if cand.is_fully_qualified else "⚠️ PARSIAL"

        lines.append(f"| **{sym}** | {name} | {comm} | {res} | {prod} | {rev} | {cost} | {own} | {dest} | {status} |")

    lines.extend(
        [
            "",
            "---",
            "",
            "## 3. Cakupan Data Referensi Nasional & Pasar",
            "",
            "### A. Komoditas & Benchmark Harga (Task 1.8)",
            f"- **Jumlah Komoditas**: {len(result.commodities)} komoditas",
            f"- **Seri Harga Tersedia**: {', '.join(result.commodity_prices.keys()) if result.commodity_prices else 'None'}",
            "",
            "### B. Jejaring Kontrak Tambang (Task 1.9)",
            f"- **Total Kontrak Terdata**: {result.total_contracts} relasi",
            f"- **Kontrak Terhubung ke Emiten**: {result.contracts_touching_issuers} relasi",
            "",
            "### C. Situs & Titik Operasi Tambang (Task 1.6)",
            f"- **Total Situs**: {result.total_sites}",
            f"- **Situs dengan Koordinat GPS**: {result.sites_with_coords} ({((result.sites_with_coords / result.total_sites) * 100) if result.total_sites else 0:.1f}%)",
            f"- **Situs dengan Angka Produksi**: {result.sites_with_production}",
            f"- **Situs dengan Strip Ratio**: {result.sites_with_strip_ratio}",
            "",
            "### D. Izin Usaha Pertambangan (IUP/IUPK ESDM) (Task 1.5)",
            f"- **Izin Tambang Diperiksa**: {result.total_licenses_probed} izin",
            f"- **Izin dengan Company Slug Eksplisit**: {result.licenses_with_slug} ({((result.licenses_with_slug / result.total_licenses_probed) * 100) if result.total_licenses_probed else 0:.1f}%)",
            f"- **Rata-rata Fuzzy Match Score pada Nama**: {((sum(result.fuzzy_match_scores) / len(result.fuzzy_match_scores)) * 100) if result.fuzzy_match_scores else 0:.1f}%",
            "",
        ]
    )

    if credit_report:
        lines.extend(
            [
                "---",
                "",
                "## 4. Realisasi Anggaran Kredit API (Task 1.12)",
                "",
                f"- **Total Kredit Terpakai**: **{credit_report.total_spent} / 1000 kredit**",
                "- **Plafon Batas Keras (Hard Cap)**: 950 kredit",
                f"- **Sisa Kredit di Bawah Cap**: {credit_report.remaining_under_cap} kredit",
                "",
                "| Tier | Kredit Terpakai | Porsi (%) |",
                "|---|---|---|",
            ]
        )
        for t, spent in credit_report.by_tier.items():
            pct = (spent / credit_report.total_spent * 100) if credit_report.total_spent > 0 else 0.0
            lines.append(f"| {t} | {spent} | {pct:.1f}% |")

    return "\n".join(lines) + "\n"


def generate_credit_budget_markdown(credit_report: CreditReport) -> str:
    """Generate docs/CREDIT_BUDGET.md tracking document."""
    lines = [
        "# CREDIT BUDGET TRACKER — GALI",
        "",
        "> Pelacakan realisasi pemakaian Sectors API credits per panggilan dan per tier.",
        "> Sumber kebenaran: tabel `ops.credit_ledger` di PostgreSQL.",
        "",
        "---",
        "",
        "## 1. Ringkasan Realisasi Anggaran",
        "",
        f"- **Total Kredit Hibah**: {credit_report.grant_total} kredit",
        f"- **Total Terpakai**: **{credit_report.total_spent} kredit**",
        f"- **Plafon Batas Keras**: {credit_report.hard_cap} kredit",
        f"- **Sisa Saldo Aman**: **{credit_report.remaining_under_cap} kredit**",
        "",
        "| Tier | Realisasi (Kredit) | Porsi Realisasi |",
        "|---|---|---|",
    ]
    for tier in ("cold", "warm", "hot"):
        spent = credit_report.by_tier.get(tier, 0)
        pct = (spent / credit_report.total_spent * 100) if credit_report.total_spent > 0 else 0.0
        lines.append(f"| **{tier}** | {spent} | {pct:.1f}% |")

    lines.extend(
        [
            "",
            "---",
            "",
            "## 2. Rincian per Endpoint",
            "",
            "| Endpoint | Tier | Frekuensi Panggilan | Total Kredit |",
            "|---|---|---|---|",
        ]
    )

    for ep in credit_report.by_endpoint:
        lines.append(f"| `{ep['endpoint']}` | {ep['tier']} | {ep['call_count']} | {ep['total_credits']} |")

    return "\n".join(lines) + "\n"


def print_audit_terminal_summary(result: AuditResult, credit_report: CreditReport | None = None) -> None:
    """Print clean Rich terminal summary of audit results."""
    console = Console()

    color = (
        "bold green"
        if result.gate_decision == "GO"
        else ("bold yellow" if result.gate_decision == "GO_MENYEMPIT" else "bold red")
    )

    panel_msg = (
        f"[bold]Decision Gate:[/bold] [{color}]{result.gate_decision}[/{color}]\n"
        f"[bold]Qualified Issuers (Reserves + Prod + Fin):[/bold] {len(result.qualified_issuers)} issuers\n"
        f"[bold]Total Mining Companies:[/bold] {result.total_mining_companies}\n"
        f"[bold]Companies with Ticker:[/bold] {result.companies_with_symbol_count}\n"
        f"[bold]Total Sites:[/bold] {result.total_sites} ({result.sites_with_coords} with GPS)\n"
        f"[bold]Total Contracts:[/bold] {result.total_contracts}"
    )
    console.print(Panel(panel_msg, title="[bold]GALI Phase 1 Data Truth Audit Summary[/bold]", expand=False))

    # Candidate table
    table = Table(title="Issuer Candidates Coverage Matrix")
    table.add_column("Symbol", style="green")
    table.add_column("Company", style="cyan")
    table.add_column("Commodity")
    table.add_column("Reserves", justify="center")
    table.add_column("Production", justify="center")
    table.add_column("Financials", justify="center")
    table.add_column("Status", justify="center")

    for _slug, cand in sorted(
        result.candidates.items(), key=lambda x: (not x[1].is_fully_qualified, x[1].symbol or "")
    ):
        status_str = "[green]LENGKAP[/green]" if cand.is_fully_qualified else "[yellow]PARSIAL[/yellow]"
        table.add_row(
            cand.symbol or "-",
            cand.name[:20],
            cand.commodity or "-",
            "[green]YES[/green]" if cand.has_reserves else "[red]NO[/red]",
            "[green]YES[/green]" if cand.has_production else "[red]NO[/red]",
            "[green]YES[/green]" if (cand.has_revenue and cand.has_cost) else "[red]NO[/red]",
            status_str,
        )
    console.print(table)
