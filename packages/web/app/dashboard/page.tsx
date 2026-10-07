"use client";

import { useState, type ElementType } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { ArrowRight, TrendingDown, Gauge, ShieldAlert, MapPin, SlidersHorizontal, FileSpreadsheet, Activity, Search, Download, Scale, Sparkles, ExternalLink, ArrowUpDown } from "lucide-react";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { MineExplainer } from "@/components/MineExplainer";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";
import { MiningSitesMap } from "@/components/MiningSitesMap";
import { ResearchBrief } from "@/components/ResearchBrief";
import { ScoreCoverage } from "@/components/ScoreCoverage";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DetailSection } from "@/components/DetailSection";
import { IssuerLogo } from "@/components/IssuerLogo";
import { compareScores, isScoreRankable, scoreRanks } from "@/lib/scores";
import { DataState } from "@/components/DataState";
import { PageLoading } from "@/components/LoadingState";
import { ActionButton } from "@/components/ActionButton";
import { downloadCSV } from "@/lib/export";
import { qualityLabel } from "@/lib/presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { NumberTicker } from "@/components/magicui";

function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n == null) return "–";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  return `$${n.toFixed(0)}`;
}

export default function DashboardPage() {
  const [filterType, setFilterType] = useState<"all" | "complete" | "partial">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiFilter, setAiFilter] = useState<"none" | "low_cost" | "deep_value" | "long_life" | "cliff_risk">("none");

  const { data: issuers, isLoading, error, refetch } = useIssuerUniverse();

  const universeRanks = scoreRanks(issuers ?? []);
  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);
  const completeWithRli = complete.filter((i) => i.rli_years != null);
  const avgRli =
    completeWithRli.length > 0
      ? completeWithRli.reduce((s, i) => s + (i.rli_years ?? 0), 0) / completeWithRli.length
      : null;
  const worstCliff = issuers
    ? [...issuers]
        .filter((i) => i.license_cliff_3y != null)
        .sort((a, b) => (b.license_cliff_3y ?? 0) - (a.license_cliff_3y ?? 0))[0]
    : null;

  const [tableSortField, setTableSortField] = useState<
    "ground_truth_score" | "rli_years" | "reserve_backed_value_usd" | "market_cap_usd" | "rbv_gap_pct" | "cash_cost_per_ton_usd" | "license_cliff_3y"
  >("ground_truth_score");
  const [tableSortOrder, setTableSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableSortField(field);
      setTableSortOrder("desc");
    }
  };

  const exportUniverseCSV = () => {
    if (!issuers || issuers.length === 0) return;
    const headers = [
      "Ticker",
      "Company Name",
      "Data Quality",
      "Ground Truth Score",
      "Score Weight Coverage (%)",
      "Score Ranking Status",
      "Complete Score Rank",
      "RLI (Years)",
      "Reserve-Backed Value (USD)",
      "Market Cap (USD)",
      "RBV Gap (%)",
      "Cash Cost / Ton (USD)",
      "3Y License Cliff (%)",
      "Top Export Destination",
      "Top Export Share (%)",
    ];
    const rows = issuers.map((i) => [
      i.symbol,
      i.name,
      qualityLabel(i.data_quality),
      i.ground_truth_score ?? "",
      i.confidence_pct,
      isScoreRankable(i) ? "complete" : "provisional",
      universeRanks.get(i.symbol) ?? "",
      i.rli_years != null ? i.rli_years.toFixed(2) : "",
      i.reserve_backed_value_usd != null ? i.reserve_backed_value_usd.toFixed(0) : "",
      i.market_cap_usd != null ? i.market_cap_usd.toFixed(0) : "",
      i.rbv_gap_pct != null ? i.rbv_gap_pct.toFixed(2) : "",
      i.cash_cost_per_ton_usd != null ? i.cash_cost_per_ton_usd.toFixed(2) : "",
      i.license_cliff_3y != null ? i.license_cliff_3y.toFixed(2) : "",
      i.top_destination ?? "",
      i.top_destination_pct != null ? i.top_destination_pct.toFixed(2) : "",
    ]);
    downloadCSV(`gali_idx_mining_universe_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  let filteredLeaderboard = issuers ? [...issuers] : [];
  if (filterType === "complete") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "LENGKAP");
  } else if (filterType === "partial") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "PARSIAL");
  }

  // Rule-based screening filter
  if (aiFilter === "low_cost") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.cash_cost_per_ton_usd != null && i.cash_cost_per_ton_usd <= 35);
  } else if (aiFilter === "deep_value") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.rbv_gap_pct != null && i.rbv_gap_pct < -25);
  } else if (aiFilter === "long_life") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.rli_years != null && i.rli_years >= 30);
  } else if (aiFilter === "cliff_risk") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => (i.license_cliff_3y ?? 0) > 0);
  }

  if (searchQuery.trim()) {
    filteredLeaderboard = filteredLeaderboard.filter(
      (i) =>
        i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  filteredLeaderboard.sort(compareScores);

  const sortedTableData = [...filteredLeaderboard].sort((a, b) => {
    if (tableSortField === "ground_truth_score") {
      const group = Number(isScoreRankable(b)) - Number(isScoreRankable(a));
      if (group) return group;
    }
    const valA = a[tableSortField] ?? (tableSortOrder === "asc" ? Infinity : -Infinity);
    const valB = b[tableSortField] ?? (tableSortOrder === "asc" ? Infinity : -Infinity);
    if (typeof valA === "number" && typeof valB === "number") {
      return tableSortOrder === "asc" ? valA - valB : valB - valA;
    }
    return 0;
  });

  if (error) return <div className="mx-auto max-w-7xl p-6"><DataState error={error} onRetry={() => refetch()} /></div>;
  if (isLoading) return <PageLoading label="Loading your dashboard…" />;
  if (!isLoading && !issuers?.length) return <div className="mx-auto max-w-7xl p-6"><DataState empty /></div>;

  return (
    <div className="gali-page space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="gali-eyebrow">Research overview</p><h1 className="mt-2 text-[28px] font-bold sm:text-[34px]">The mining business, at a glance.</h1><p className="mt-2 max-w-2xl text-sm text-muted">Find the key patterns, compare issuers, and explore the assumptions behind the numbers.</p></div>
        <Link href="/scenario" className="gali-button gali-button-primary"><SlidersHorizontal className="h-4 w-4" />Test a scenario<ArrowRight className="h-4 w-4" /></Link>
      </div>
      <section className="gali-dashboard-overview" aria-label="Summary metrics">
        <MineExplainer priority facts={{ reserves: avgRli == null ? "Unavailable" : avgRli.toFixed(1) + " years", licenses: worstCliff ? worstCliff.symbol + " · " + (worstCliff.license_cliff_3y ?? 0).toFixed(0) + "%" : "Unavailable" }} />
        <div className="gali-summary-metrics grid gap-3 sm:grid-cols-3">
        <OverviewMetric visual="reserve-value" icon={Gauge} label="Modeled reserve value · RBV" accent="text-positive" hint={`Gross-profit proxy across ${complete.length} issuers; not equity value`}>
          {isLoading ? "…" : <NumberTicker value={totalRbv / 1e9} decimalPlaces={2} prefix="$" suffix="B" />}
        </OverviewMetric>
        <OverviewMetric visual="reserve-clock" icon={TrendingDown} label="Average reserve life" accent="text-info" hint="Reserves divided by annual production · RLI">
          {isLoading ? "…" : avgRli == null ? "–" : <><NumberTicker value={avgRli} decimalPlaces={1} /><span className="ml-2 text-sm font-medium text-muted">years</span></>}
        </OverviewMetric>
        <OverviewMetric visual="license-window" icon={ShieldAlert} label="License area expiring within 3 years" accent="text-brand" hint="Highest expiring license-area share in the dataset">
          {isLoading ? "…" : worstCliff ? <><span className="inline-flex items-center gap-1.5 mr-2 text-lg"><IssuerLogo symbol={worstCliff.symbol} size="xs" />{worstCliff.symbol}</span><NumberTicker value={worstCliff.license_cliff_3y ?? 0} decimalPlaces={0} suffix="%" /></> : "–"}
        </OverviewMetric>
        </div>
      </section>
      {!!issuers?.length && <ResearchBrief issuers={issuers} />}
      <section className="space-y-4" aria-label="Explore issuers">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold text-ink">Explore issuers</h2><p className="mt-1 text-sm text-muted">{universeRanks.size} complete scores · {(issuers?.length ?? 0) - universeRanks.size} provisional scores. Ranking reflects weight coverage.</p></div>
          <Link href="/compare" className="gali-button gali-button-secondary"><Scale className="h-4 w-4" />Compare issuers</Link>
        </div>
        <div className="gali-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1" aria-label="Metric completeness">
              {(["all", "complete", "partial"] as const).map((f) => <button key={f} type="button" aria-pressed={filterType === f} onClick={() => setFilterType(f)} className={`min-h-11 rounded-xl border px-3 py-2 text-[13px] font-medium ${filterType === f ? "border-brand-line bg-brand-soft text-brand" : "border-transparent text-muted hover:bg-surface-muted"}`}>{({ all: "All", complete: "Complete core metrics", partial: "Partial core metrics" })[f]}</button>)}
            </div>
            <div className="relative sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search issuers" placeholder="Search by ticker or issuer name" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" /></div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4" aria-label="Research question filter">
            {([ ["none", "All research questions"], ["low_cost", "Cash cost ≤ $35/t"], ["deep_value", "Gap RBV < −25%"], ["long_life", "RLI ≥ 30 years"], ["cliff_risk", "Expiring license area > 0%"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={aiFilter === value} onClick={() => setAiFilter(value)} className={`min-h-10 rounded-xl border px-3 py-2 text-[12px] font-medium ${aiFilter === value ? "border-info-line bg-info-soft text-info" : "border-line text-muted hover:border-line-strong"}`}>{label}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted"><span role="status">{filteredLeaderboard.length} issuers match your filters</span><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("gali:open-assistant"))} className="inline-flex min-h-10 items-center gap-2 font-medium text-info"><Sparkles className="h-3.5 w-3.5" />Ask the data assistant</button></div>
        {isLoading ? <div className="grid gap-3 md:grid-cols-3">{[0,1,2].map((i) => <div key={i} className="skeleton h-44" />)}</div> : <>
          {[true, false].map((qualified) => {
            const group = filteredLeaderboard.filter((issuer) => isScoreRankable(issuer) === qualified);
            if (!group.length) return null;
            return <div key={String(qualified)} className="space-y-3">
              {!qualified && <p className="border-t border-line pt-4 text-[12px] font-medium text-muted">Provisional score · outside the complete ranking</p>}
              <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.map((issuer) => <li key={issuer.symbol} data-testid={`score-row-${issuer.symbol}`}>
                  <Link href={`/issuer/${issuer.symbol}`} className="gali-card group block h-full p-4 transition-colors hover:border-brand-line sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <IssuerLogo symbol={issuer.symbol} size="md" className="shrink-0 transition-transform group-hover:scale-105" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-numeric text-base font-bold text-ink">{issuer.symbol}</span>
                            {qualified && <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">#{universeRanks.get(issuer.symbol)}</span>}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted" title={issuer.name}>{issuer.name}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right"><p className="font-numeric text-2xl font-semibold text-ink">{issuer.ground_truth_score?.toFixed(1) ?? "–"}</p><p className="text-[11px] text-muted">score / 100</p></div>
                    </div>
                    <div className="mt-3"><ScoreCoverage coverage={issuer.confidence_pct} eligible={qualified} /></div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]"><div><dt className="text-muted">Reserve life</dt><dd className="mt-1 font-numeric font-semibold text-ink-soft">{issuer.rli_years == null ? "–" : `${issuer.rli_years.toFixed(1)} yr`}</dd></div><div><dt className="text-muted">Cash cost</dt><dd className="mt-1 font-numeric font-semibold text-ink-soft">{issuer.cash_cost_per_ton_usd == null ? "–" : `$${issuer.cash_cost_per_ton_usd.toFixed(1)}/t`}</dd></div><div><dt className="text-muted">Gap RBV</dt><dd className="mt-1 font-numeric font-semibold text-ink-soft">{issuer.rbv_gap_pct == null ? "–" : `${issuer.rbv_gap_pct > 0 ? "+" : ""}${issuer.rbv_gap_pct.toFixed(1)}%`}</dd></div></dl>
                  </Link>
                </li>)}
              </ol>
            </div>;
          })}
          {!filteredLeaderboard.length && <DataState empty title="No issuers match your filters" description="Try other criteria or clear the search." />}
        </>}
      </section>
      <div className="space-y-3">
        <DetailSection title="Valuation & risk matrix" description="Compare all metrics, sort columns, or download a CSV.">
      {/* ── 2.5. Master Ground-Truth Universe Matrix (Financial & Geological Terminal) ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="text-base font-bold uppercase tracking-wider text-ink">
                Issuer valuation &amp; risk
              </h2>
              <Badge variant="outline" className="border-brand-line text-brand text-[12px]">
                Metrics M1–M8
              </Badge>
            </div>
            <p className="text-sm text-muted mt-0.5">
              Reserve value, market capitalization, costs, and expiring license area.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              action={exportUniverseCSV} loadingText="Preparing CSV…" paintFirst
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-line-strong bg-surface text-sm font-semibold text-ink-soft hover:border-brand-line hover:text-ink"
            >
              <Download className="h-3.5 w-3.5 text-brand" />
              <span>Export CSV</span>
            </ActionButton>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-line-strong bg-surface text-sm font-semibold text-ink-soft hover:border-info-line hover:text-ink"
            >
              <Link href="/compare">
                <Scale className="h-3.5 w-3.5 text-info" />
                <span>Compare</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface shadow-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-line bg-surface">
                <TableHead className="w-20 text-center">Score #</TableHead>
                <TableHead className="min-w-[170px]">
                  <button
                    onClick={() => handleSort("ground_truth_score")}
                    className="flex items-center gap-1.5 hover:text-brand transition-colors"
                  >
                    <span>Issuer</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("ground_truth_score")}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors"
                  >
                    <span>Score</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("rli_years")}
                    className="inline-flex items-center gap-1 hover:text-info transition-colors"
                  >
                    <span>Reserve life</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("reserve_backed_value_usd")}
                    className="inline-flex items-center gap-1 hover:text-positive transition-colors"
                  >
                    <span>Reserve value</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("market_cap_usd")}
                    className="inline-flex items-center gap-1 hover:text-ink-soft transition-colors"
                  >
                    <span>Market cap</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("rbv_gap_pct")}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors"
                  >
                    <span>Gap RBV</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("cash_cost_per_ton_usd")}
                    className="inline-flex items-center gap-1 hover:text-positive transition-colors"
                  >
                    <span>Cost / ton</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("license_cliff_3y")}
                    className="inline-flex items-center gap-1 hover:text-negative transition-colors"
                  >
                    <span>Licenses ≤3 years</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Largest destination</TableHead>
                <TableHead className="w-20 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11} className="h-12 text-center text-muted">
                      Loading active dataset metrics...
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading &&
                sortedTableData.map((item) => {
                  const score = item.ground_truth_score;
                  const scorePct = score != null ? Math.min(100, Math.max(0, score)) : 0;
                  const rli = item.rli_years;
                  const rbvGap = item.rbv_gap_pct;
                  const cost = item.cash_cost_per_ton_usd;
                  const cliff = item.license_cliff_3y;
                  const modelDiscount = rbvGap != null && rbvGap < 0;

                  return (
                    <TableRow
                      key={item.symbol}
                      className="group border-b border-line hover:bg-surface-hover transition-colors"
                    >
                      <TableCell className="text-center font-numeric text-sm font-bold text-muted group-hover:text-brand">
                        {universeRanks.get(item.symbol) ?? "—"}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/issuer/${item.symbol}`}
                          className="flex items-center gap-2 group/link"
                        >
                          <IssuerLogo
                            symbol={item.symbol}
                            size="sm"
                            className="shrink-0 group-hover/link:border-brand-line transition-colors"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-numeric font-bold text-ink group-hover/link:text-brand">
                                {item.symbol}
                              </span>
                              <ConfidenceBadge dataQuality={item.data_quality} />
                            </div>
                            <div className="text-[12px] text-muted truncate max-w-[140px] sm:max-w-[200px]">
                              {item.name}
                            </div>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden md:block w-12">
                            <Progress value={scorePct} className="h-1.5" />
                          </div>
                          <span className="font-numeric font-bold text-brand">
                            {score != null ? score.toFixed(1) : "—"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">{item.confidence_pct.toFixed(0)}% weight · {isScoreRankable(item) ? "complete" : "provisional"}</p>
                      </TableCell>

                      <TableCell className="text-right">
                        {rli != null ? (
                          <span className="font-numeric font-bold text-info">
                            {rli.toFixed(1)} <span className="text-[12px] text-muted font-normal">yr</span>
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-numeric text-sm font-semibold text-positive">
                        {fmtUSD(item.reserve_backed_value_usd, 2)}
                      </TableCell>

                      <TableCell className="text-right font-numeric text-sm text-ink-soft">
                        {fmtUSD(item.market_cap_usd, 2)}
                      </TableCell>

                      <TableCell className="text-right">
                        {rbvGap != null ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-numeric font-bold ${
                              modelDiscount
                                ? "bg-info-soft text-info border border-info-line"
                                : "bg-brand-soft text-brand border border-brand-line"
                            }`}
                          >
                            {rbvGap > 0 ? `+${rbvGap.toFixed(1)}%` : `${rbvGap.toFixed(1)}%`}
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-numeric text-sm">
                        {cost != null ? (
                          <span className={cost <= 35 ? "text-positive font-bold" : "text-ink-soft"}>
                            ${cost.toFixed(1)}/t
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {cliff != null ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-numeric font-bold ${
                              cliff >= 50
                                ? "bg-negative-soft text-negative border border-negative-line"
                                : cliff > 0
                                ? "bg-brand-soft text-brand border border-brand-line"
                                : "bg-surface-hover text-muted"
                            }`}
                          >
                            {cliff.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-[12px] text-ink-soft">
                        {item.top_destination ? (
                          <span>
                            {item.top_destination}{" "}
                            {item.top_destination_pct != null && (
                              <span className="font-numeric text-muted">
                                ({item.top_destination_pct.toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted hover:text-brand hover:bg-surface-hover"
                            title={`Compare ${item.symbol}`}
                          >
                            <Link href={`/compare?a=${item.symbol}&b=${item.symbol === "BYAN" ? "ADRO" : "BYAN"}`}>
                              <Scale className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted hover:text-info hover:bg-surface-hover"
                            title={`Open profile ${item.symbol}`}
                          >
                            <Link href={`/issuer/${item.symbol}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </section>


        </DetailSection>
        <DetailSection title="Mining site distribution" description="Explore sites and related issuers on the map.">
          <div className="mb-4 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-brand" />Mining map</span><Link href="/map" className="text-sm font-medium text-info">Open the full map →</Link></div>
          <MiningSitesMap compact />
        </DetailSection>
        <DetailSection title="How to read the overview" description="Calculation scope, score weights, and data sources.">
          <div className="space-y-3 text-sm leading-relaxed text-muted"><p>RBV is summed across {complete.length} issuers with complete core metrics, using a 12% discount rate. Shared ownership may be counted for multiple issuers, so this is not an industry total without overlap.</p><p>RLI divides reserves by annual production for the same entity scope. Expiring license exposure is a share of licensed area, not a probability of failed renewal. The RBV gap and score support research; they are not investment recommendations.</p><p>Score coverage shows the weight of available data, rather than statistical confidence. Open <Link href="/coverage" className="font-medium text-info">data coverage</Link> or <Link href="/methodology" className="font-medium text-info">methodology</Link> to review sources and assumptions.</p></div>
        </DetailSection>
      </div>
      <section><h2 className="mb-4 text-lg font-semibold text-ink">Continue your analysis</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NavCard href="/cost-curve" icon={TrendingDown} title="Cost curve" desc="Cost positions and production volume" accent="emerald" />
        <NavCard href="/scenario" icon={SlidersHorizontal} title="Scenario Studio" desc="Test prices, volumes, and licenses" accent="cyan" />
        <NavCard href="/divergence" icon={Activity} title="Valuation map" desc="Reserve value and market capitalization" accent="indigo" />
        <NavCard href="/coverage" icon={FileSpreadsheet} title="Data coverage" desc="Metric sources and data completeness" accent="amber" />
      </div></section>
    </div>
  );
}

function OverviewMetric({ icon: Icon, visual, label, accent, hint, children }: { icon: ElementType; visual?: VisualAssetName; label: string; accent: string; hint: string; children: React.ReactNode }) {
  return <div className="gali-card gali-illustrated-metric p-4 sm:p-5">{visual ? <VisualAsset name={visual} /> : <div className={"gali-icon-tile mt-1 shrink-0 " + accent}><Icon className="h-4 w-4" /></div>}<div className="min-w-0"><p className="text-[12px] font-medium text-muted">{label}</p><div className="mt-2 font-numeric text-[28px] font-semibold leading-tight text-ink">{children}</div><p className="mt-2 text-[12px] text-muted">{hint}</p></div></div>;
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: ElementType;
  title: string;
  desc: string;
  accent: "emerald" | "cyan" | "amber" | "indigo";
}) {
  const cfg = {
    emerald: {
      icon: "text-positive",
      border: "hover:border-positive-line hover:shadow-sm",
    },
    cyan: {
      icon: "text-info",
      border: "hover:border-info-line hover:shadow-sm",
    },
    amber: {
      icon: "text-brand",
      border: "hover:border-brand-line hover:shadow-sm",
    },
    indigo: {
      icon: "text-info",
      border: "hover:border-info-line hover:shadow-sm",
    },
  }[accent];

  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-all ${cfg.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-5 w-5 ${cfg.icon}`} />
        <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-ink" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">{desc}</p>
      </div>
    </Link>
  );
}
