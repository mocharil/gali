"use client";

import { useId } from "react";

import { useReducedMotion } from "@/lib/useReducedMotion";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useActivity } from "@/components/ActivityProvider";
import { PageLoading } from "@/components/LoadingState";
import { ActionButton } from "@/components/ActionButton";
import { AppLink as Link } from "@/components/AppLink";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Ship,
  Network,
  Pickaxe,
  SlidersHorizontal,
  Scale,
  Printer,
  Sparkles,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from "recharts";

import { MineExplainer } from "@/components/MineExplainer";
import { VisualIntro } from "@/components/VisualIntro";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";
import { DataState } from "@/components/DataState";
import { SCORE_PILLARS, pillarValue, isScoreRankable } from "@/lib/scores";
import { api } from "@/lib/api";
import type { IssuerDetail } from "@/lib/types";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { IssuerLogo } from "@/components/IssuerLogo";
import { IssuerEconomics } from "@/components/IssuerEconomics";
import { ScoreDiagnostics } from "@/components/ScoreDiagnostics";
import { ValuationContext } from "@/components/ValuationContext";
import { ScoreCoverage } from "@/components/ScoreCoverage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ALL_ISSUERS = [
  { symbol: "AADI", label: "AADI" },
  { symbol: "ADMR", label: "ADMR" },
  { symbol: "ADRO", label: "ADRO" },
  { symbol: "BUMI", label: "BUMI" },
  { symbol: "BYAN", label: "BYAN" },
  { symbol: "DSSA", label: "DSSA" },
  { symbol: "GEMS", label: "GEMS" },
  { symbol: "ITMG", label: "ITMG" },
  { symbol: "PTBA", label: "PTBA" },
];

function fmt(n: number | null | undefined, opts: { digits?: number; suffix?: string; usd?: boolean } = {}): string {
  if (n == null) return "—";
  const { digits = 1, suffix = "", usd = false } = opts;
  const abs = Math.abs(n);
  if (usd) {
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
    return `$${n.toFixed(digits)}`;
  }
  return `${n.toFixed(digits)}${suffix}`;
}

function MetricTooltip({ text }: { text: string }) {
  const id = useId();
  return <span className="ml-1 inline-flex">
    <button type="button" title={text} aria-label="Metric explanations" popoverTarget={id} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted"><HelpCircle className="h-3.5 w-3.5" /></button>
    <span id={id} popover="auto" className="m-auto w-[min(90vw,340px)] rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-soft shadow-panel"><strong className="mb-2 block font-semibold text-ink">Metric explanations</strong>{text}</span>
  </span>;
}

function generateExecutiveBrief(data: IssuerDetail) {
  const points: { title: string; desc: string; type: "warning" | "success" | "neutral" }[] = [];
  if (data.rli_years != null) points.push({ title: "Reserve life", desc: `RLI ${data.rli_years.toFixed(1)} years at the current modeled production rate. Changes in production or reserves will change this estimate.`, type: "neutral" });

  if (data.cash_cost_per_ton_usd != null) points.push({ title: "Cash cost position", desc: `Cash cost ${data.cash_cost_per_ton_usd.toFixed(2)} USD/ton${data.cost_curve_percentile != null ? `; volume midpoint at percentile ${data.cost_curve_percentile.toFixed(1)} within the dataset universe` : ""}. Consider product quality and the definition of costs.`, type: "neutral" });
  if (data.license_cliff_3y != null) points.push({ title: "Licenses expiring within 3 years", desc: `${data.license_cliff_3y.toFixed(1)}% of licensed area in the model expires within three years. This is not a probability of failed renewal or a guarantee of continued operations.`, type: data.license_cliff_3y > 20 ? "warning" : "neutral" });
  if (data.top_destination && data.top_destination_pct != null) points.push({ title: "Sales destination concentration", desc: `${data.top_destination} accounts for ${data.top_destination_pct.toFixed(1)}% of the available sales destination volume. Test demand reductions in Scenario Studio.`, type: "neutral" });
  if (data.rli_years != null && data.implied_life_years != null) points.push({ title: "Reserve-life difference", desc: `Market-implied reserve life ${data.implied_life_years.toFixed(1)} years, compared with an RLI of ${data.rli_years.toFixed(1)} years. This difference depends on gross profit, FX, and discount-rate assumptions; it does not establish whether a stock is cheap or expensive.`, type: "neutral" });
  return points;
}

export default function IssuerDetailPage() {
  const reducedMotion = useReducedMotion();
  const { symbol } = useParams<{ symbol: string }>();
  const { navigate, destination } = useActivity();
  const sym = (symbol || "").toUpperCase();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["issuer", sym],
    queryFn: () => api.getIssuerDetail(sym),
  });

  if (isLoading) return <PageLoading label={`Loading ${sym} profile…`} />;

  if (isError || !data) return <div className="mx-auto max-w-6xl px-4 py-8"><DataState error={error} onRetry={() => refetch()} /><Link href="/dashboard" className="mt-4 inline-block text-sm text-brand">← Back to dashboard</Link></div>;

  // Radar data for M8 Ground Truth Score
  const radarData = SCORE_PILLARS.map((pillar) => ({ subject: pillar.label, score: pillarValue(data.component_scores, pillar.key), fullMark: 100 }));
  const radarComplete = radarData.every((pillar) => pillar.score !== null);
  const executiveBrief = generateExecutiveBrief(data).sort((a, b) => Number(b.type === "warning") - Number(a.type === "warning")).slice(0, 3);
  

  return (
    <div className="gali-page space-y-8">
      {/* Top Breadcrumb & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {/* Quick Ticker Switcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[12px] font-medium text-muted mr-1 hidden sm:inline">Choose an issuer:</span>
          {ALL_ISSUERS.map((i) => (
            <button
              key={i.symbol}
              onClick={() => navigate(`/issuer/${i.symbol}`)}
              aria-busy={destination === `/issuer/${i.symbol}` || undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-numeric font-bold transition-all ${
                i.symbol === sym
                  ? "bg-gold text-ink shadow-sm"
                  : "bg-surface text-muted border border-line hover:border-line-strong hover:text-ink"
              }`}
            >
              <IssuerLogo symbol={i.symbol} size="xs" />
              <span>{i.symbol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
        {/* ambient glow orbs */}

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <IssuerLogo symbol={data.symbol} size="xl" className="shrink-0 shadow-sm" />
            <div className="space-y-3">
              {/* Symbol + badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-numeric text-4xl font-bold text-ink tracking-tight">
                  {data.symbol}
                </h1>
                <ScoreCoverage coverage={typeof data.confidence?.effective_weight === "number" ? data.confidence.effective_weight * 100 : null} eligible={data.confidence?.ranking_eligible !== false && isScoreRankable({ data_quality: data.data_quality, ground_truth_score: data.ground_truth_score, confidence_pct: typeof data.confidence?.effective_weight === "number" ? data.confidence.effective_weight * 100 : 0 })} />
              </div>
              <p className="text-base font-semibold text-ink-soft">{data.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-hover px-3 py-1 text-[12px] font-medium text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  Coal · Indonesia Stock Exchange
                </span>
                {data.ground_truth_score != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-[12px] font-bold text-brand">
                    Fundamental score: {data.ground_truth_score.toFixed(1)} / 100
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
            <Link
              href={`/compare?a=${data.symbol}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft border border-brand-line px-3.5 py-2 text-sm font-bold text-brand hover:bg-brand-soft transition-all shadow-panel"
            >
              <Scale className="h-3.5 w-3.5" /> Compare
            </Link>
            <ActionButton
              action={() => window.print()} loadingText="Preparing print…" paintFirst variant="outline"
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-hover border border-line-strong px-3.5 py-2 text-sm font-bold text-ink-soft hover:border-line-strong hover:bg-surface-hover hover:text-ink transition-all shadow-panel"
            >
              <Printer className="h-3.5 w-3.5" /> Print page
            </ActionButton>
            <Link
              href={`/scenario?issuer=${data.symbol}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-hover border border-line-strong px-3.5 py-2 text-sm font-bold text-info hover:border-info-line hover:bg-surface-hover hover:text-info transition-all shadow-panel"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Test a scenario
            </Link>
            <EvidenceDrawer symbol={data.symbol} runId={data.run_id} evidence={data.evidence as never} />
          </div>
        </div>
      </div>

      <Tabs key={sym} defaultValue="overview">
        <TabsList label="Issuer analysis">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="score">Score &amp; coverage</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <MineExplainer facts={{ reserves: data.rli_years == null ? "Unavailable" : fmt(data.rli_years, { suffix: " years" }), costs: data.cash_cost_per_ton_usd == null ? "Unavailable" : fmt(data.cash_cost_per_ton_usd, { usd: true }) + " / tonne", licenses: data.license_cliff_3y == null ? "Unavailable" : fmt(data.license_cliff_3y, { suffix: "%" }) }} />
      {/* 4 Core Fundamental Metric Tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* RLI */}
        <MetricTile
          visual="reserve-clock"
          icon={Clock}
          label="Reserve life · RLI"
          tooltip="Reserves divided by annual production for the same entities. Changes in production will change modeled reserve life."
          value={data.rli_years != null ? fmt(data.rli_years, { suffix: " yr" }) : "null"}
          sub={
            data.rli_years == null
              ? "Reserve data is unavailable in the dataset"
              : "Reserves / annual production within the model scope"
          }
          accent={data.rli_years == null ? "text-muted" : "text-info"}
          badge={data.rli_years != null ? `${data.rli_years.toFixed(1)} modeled years` : undefined}
        />

        {/* License Cliff */}
        <MetricTile
          visual="license-window"
          icon={AlertTriangle}
          label="Licenses expiring within 3 years"
          tooltip="Share of licensed area expiring within three years of the snapshot. This is not a probability of failed renewal."
          value={data.license_cliff_3y != null ? fmt(data.license_cliff_3y, { suffix: "%" }) : "—"}
          sub={`Clean & Clear coverage: ${fmt(data.cnc_coverage_pct, { suffix: "%" })}`}
          accent={data.license_cliff_3y && data.license_cliff_3y > 30 ? "text-negative" : "text-brand"}
          badge={data.license_cliff_3y != null ? (data.license_cliff_3y > 30 ? "Share >30%" : "Share ≤30%") : undefined}
        />

        {/* Cash Cost */}
        <MetricTile
          visual="coal-tonne"
          icon={Ship}
          label="Cash cost · USD/tonne"
          tooltip="COGS per metric tonne in USD, using available mining data. It does not include every corporate cost."
          value={data.cash_cost_per_ton_usd != null ? `$${data.cash_cost_per_ton_usd.toFixed(2)}/t` : "null"}
          sub={
            data.breakeven_benchmark_price_usd != null
              ? `Break-even reference price: $${data.breakeven_benchmark_price_usd.toFixed(2)}/t`
              : "Financial components are incomplete"
          }
          accent={data.cash_cost_per_ton_usd == null ? "text-muted" : "text-positive"}
        />

        {/* RBV */}
        <MetricTile
          icon={Network}
          visual="reserve-value"
          label="Reserve-backed value · RBV"
          tooltip="Finite-annuity model using gross profit and reserve life, with discounting and a 30-year cap. This is not a free cash flow valuation or a price target."
          value={data.reserve_backed_value_usd != null ? fmt(data.reserve_backed_value_usd, { usd: true, digits: 2 }) : "null"}
          sub={
            data.rbv_gap_pct != null
              ? `Gap versus market cap: ${data.rbv_gap_pct > 0 ? "+" : ""}${data.rbv_gap_pct.toFixed(1)}%`
              : data.market_cap_usd == null ? "Market capitalization is unavailable" : "The gap cannot be calculated from the available model inputs"
          }
          accent={data.reserve_backed_value_usd == null ? "text-muted" : "text-info"}
        />
      </div>
      {/* ── Executive Intelligence Brief (Ground-Truth Synthesis) ── */}
      {executiveBrief.length > 0 && (
        <div className="gali-card p-5 sm:p-6 shadow-panel relative overflow-hidden">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft border border-brand-line text-brand">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Key findings
              </h2>
            </div>
            <span className="text-[12px] font-numeric text-brand border border-brand-line bg-brand-soft px-2 py-0.5 rounded-full font-semibold">
              Rule-based summary
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {executiveBrief.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-4 space-y-1.5 transition-colors ${
                  item.type === "warning"
                    ? "border-negative-line bg-negative-soft"
                    : item.type === "success"
                    ? "border-positive-line bg-positive-soft"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.type === "warning"
                        ? "bg-negative"
                        : item.type === "success"
                        ? "bg-positive"
                        : "bg-gold"
                    }`}
                  />
                  <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

          <div className="gali-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="text-base font-semibold text-ink">Explore the assumptions behind the findings</h2><p className="mt-1 max-w-2xl text-sm text-muted">Valuation explains RBV. Operations covers margins, sales destinations, and licenses. Score &amp; coverage explains weights and sensitivity.</p></div><Link href={`/scenario?issuer=${data.symbol}`} className="gali-button gali-button-secondary">Test {data.symbol}<ArrowRight className="h-4 w-4" /></Link></div>
        </TabsContent>
        <TabsContent value="valuation">
          <VisualIntro asset="valuation-lenses" eyebrow="Asset model & market value" title="Read both perspectives." description="Reserve value is a finite gross-profit annuity. Review market capitalization alongside the model’s scope, financial inputs, and assumptions." /><ValuationContext data={data} /></TabsContent>
        <TabsContent value="operations">
          <VisualIntro asset="site-operation" eyebrow="Operating footprint" title="Follow the business on the ground." description="Connect operating entities, production, unit costs, destinations, and the license window. The illustration represents the operating concepts; site locations are available on the geographic map." /><IssuerEconomics data={data} />
        <div className="glass-card rounded-2xl border border-line p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
              <Pickaxe className="h-4 w-4 text-brand" />
              Coal quality &amp; sales destinations
            </h2>
            <span className="text-[12px] font-numeric text-muted">Metrics M4 &amp; M7</span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Benchmark quality" value={data.benchmark_grade ?? "—"} />
            <Field
              label="Quality discount"
              value={data.quality_discount_pct != null ? `${data.quality_discount_pct.toFixed(1)}%` : "—"}
            />
            <Field
              label="Average calorific value"
              value={data.weighted_cv_kcal != null ? `${data.weighted_cv_kcal.toFixed(0)} kcal/kg` : "—"}
            />
            <Field label="Largest destination" value={data.top_destination ?? "—"} />
            <Field
              label="Destination volume share"
              value={data.top_destination_pct != null ? `${data.top_destination_pct.toFixed(1)}%` : "—"}
            />
            <Field
              label="Destination concentration · HHI"
              tooltip="Sales destination concentration index. An HHI above 2,500 indicates a concentrated distribution."
              value={data.destination_hhi != null ? data.destination_hhi.toFixed(0) : "—"}
              sub={data.destination_hhi != null ? (data.destination_hhi > 2500 ? "Concentrated" : "More diversified") : undefined}
            />
          </dl>
        </div>

      {/* Connected Operating Entities Network */}
      <div className="glass-card rounded-2xl border border-line p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
              <Network className="h-4 w-4 text-info" />
              Operators &amp; related entities ({data.linked_entities?.length ?? 0})
            </h2>
            <p className="text-sm text-muted mt-0.5">
              Effective ownership relationships with operators and license holders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.linked_entities?.map((e) => (
            <div
              key={e.company_slug}
              className="rounded-xl border border-line bg-surface p-3.5 space-y-1.5 transition-colors hover:border-line-strong"
            >
              <div className="truncate text-sm font-bold text-ink-soft">{e.name}</div>
              <div className="flex items-center justify-between text-[12px] text-muted">
                <span className="font-numeric text-info font-semibold">
                  {e.effective_ownership_pct != null ? `${Number(e.effective_ownership_pct).toFixed(1)}%` : "—"}
                </span>
                <span>Effective ownership</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-muted pt-1 border-t border-line">
                <span>Link confidence:</span>
                <span className="font-numeric text-ink-soft">
                  {e.confidence != null ? `${(Number(e.confidence) * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
            </div>
          ))}
          {(!data.linked_entities || data.linked_entities.length === 0) && (
            <div className="col-span-full py-6 text-center text-sm text-muted">
              No separate operating entities are available in this run.
            </div>
          )}
        </div>
      </div>        </TabsContent>
        <TabsContent value="score">
          <VisualIntro asset="data-modules" eyebrow="Score & coverage" title="Trace what contributes to the score." description="Inspect pillar contributions, available input weight, and ranking sensitivity. Missing inputs remain visible in the coverage diagnostics." />
          <ScoreDiagnostics data={data} />
          <div className="max-w-2xl">
        {/* Ground Truth Score Breakdown Tile with Radar Chart */}
        <div className="glass-card rounded-2xl border border-line p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Five-pillar profile</h2>
              <span className="text-[12px] font-numeric text-brand font-bold">M8 score</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-numeric text-3xl font-bold text-brand">
                {data.ground_truth_score != null ? data.ground_truth_score.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-muted font-bold">/ 100</span>
            </div>

            {/* Radar / Spider Chart */}
            {radarComplete ? <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="var(--chart-grid)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="var(--line)" tick={false} axisLine={false} />
                  <Radar isAnimationActive={!reducedMotion} animationDuration={220}
                    name={data.symbol}
                    dataKey="score"
                    stroke="var(--chart-gold)"
                    fill="var(--chart-gold)"
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "13px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div> : <p className="mt-4 text-sm text-brand">Some pillars are missing, so the radar cannot be drawn. Review the available components below.</p>}

            <div className="mt-3 space-y-2">
              {SCORE_PILLARS.map((pillar) => {
                const value = pillarValue(data.component_scores, pillar.key);
                return <div key={pillar.key} className="space-y-1"><div className="flex items-center justify-between text-[12px]"><span className="text-muted">{pillar.label}</span><span className="font-numeric font-semibold text-ink-soft">{value?.toFixed(0) ?? "–"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-info" style={{ width: `${Math.max(0, Math.min(value ?? 0, 100))}%` }} /></div></div>;
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[12px] text-muted">
            Available weights are normalized for the provisional score. Coverage and ranking sensitivity are explained above.
          </div>
        </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  visual,
  label,
  tooltip,
  value,
  sub,
  accent,
  badge,
}: {
  icon: React.ElementType;
  visual?: VisualAssetName;
  label: string;
  tooltip?: string;
  value: string;
  sub: string;
  accent: string;
  badge?: string;
}) {
  const isNull = value === "null";
  return (
    <div className="glass-card group rounded-2xl border border-line p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:border-line-strong">
      {/* top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60 ${accent.replace('text-', 'bg-')}`} />
      <div>
        <div className="flex items-center justify-between">
          {visual ? <VisualAsset name={visual} className="gali-art-small" /> : <div className={`flex h-8 w-8 items-center justify-center rounded-lg gali-icon-tile`}>
            <Icon className={`h-4 w-4 ${accent}`} />
          </div>}
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-numeric font-bold border ${
              badge === "Share >30%"
                ? 'text-negative border-negative-line bg-negative-soft'
                : badge.includes('model')
                ? 'text-info border-info-line bg-info-soft'
                : 'text-positive border-positive-line bg-positive-soft'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center text-[12px] font-semibold text-muted">
          <span>{label}</span>
          {tooltip && <MetricTooltip text={tooltip} />}
        </div>
        <div className={`mt-2 font-numeric text-[26px] sm:text-[30px] font-semibold leading-tight ${isNull ? 'text-subtle' : 'text-ink'}`}>
          {isNull ? '–' : value}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-muted border-t border-line pt-2.5 leading-relaxed">{sub}</p>
    </div>
  );
}

function Field({ label, tooltip, value, sub }: { label: string; tooltip?: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <dt className="flex items-center text-[12px] font-medium text-muted">
        <span>{label}</span>
        {tooltip && <MetricTooltip text={tooltip} />}
      </dt>
      <dd className="mt-1 font-numeric text-sm font-bold text-ink">{value}</dd>
      {sub && <div className="text-[12px] text-brand mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}
