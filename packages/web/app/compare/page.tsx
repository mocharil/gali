"use client";

import { useReducedMotion } from "@/lib/useReducedMotion";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLink as Link } from "@/components/AppLink";
import { VisualAsset } from "@/components/VisualAsset";
import { Scale } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import type { IssuerDetail } from "@/lib/types";
import { SCORE_PILLARS, pillarValue, isScoreRankable } from "@/lib/scores";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ScoreCoverage } from "@/components/ScoreCoverage";
import { DataState } from "@/components/DataState";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IssuerLogo } from "@/components/IssuerLogo";
import { IssuerPicker } from "@/components/IssuerPicker";

const PRESETS = [["ADRO", "BYAN"], ["PTBA", "ITMG"], ["ADRO", "ADMR"], ["ITMG", "GEMS"]];
function number(value: number | null | undefined, suffix = "", digits = 1) {
  return value == null ? "—" : `${value.toFixed(digits)}${suffix}`;
}
function usd(value: number | null | undefined) { return value == null ? "—" : `$${(value / 1e9).toFixed(2)}B`; }
const METRICS: { label: string; key: keyof IssuerDetail; format: (value: number | null | undefined) => string }[] = [
  { label: "Fundamental score / 100", key: "ground_truth_score", format: (v) => number(v) },
  { label: "Reserve life · RLI", key: "rli_years", format: (v) => number(v, " years") },
  { label: "Market-implied reserve life", key: "implied_life_years", format: (v) => number(v, " years") },
  { label: "Reserve-backed value · RBV", key: "reserve_backed_value_usd", format: usd },
  { label: "Cash cost / ton", key: "cash_cost_per_ton_usd", format: (v) => v == null ? "—" : `$${v.toFixed(2)}` },
  { label: "Breakeven benchmark / ton", key: "breakeven_benchmark_price_usd", format: (v) => v == null ? "—" : `$${v.toFixed(2)}` },
  { label: "License area expiring within 3 years", key: "license_cliff_3y", format: (v) => number(v, "%") },
  { label: "Coal quality", key: "weighted_cv_kcal", format: (v) => number(v, " kcal/kg", 0) },
];

export default function ComparePage() {
  const reducedMotion = useReducedMotion();
  const [tickerA, setTickerA] = useState("ADRO");
  const [tickerB, setTickerB] = useState("BYAN");
  const issuers = useIssuerUniverse();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const valid = /^[A-Z0-9]{2,10}$/;
    const a = params.get("a")?.toUpperCase() ?? "ADRO";
    const b = params.get("b")?.toUpperCase() ?? "BYAN";
    if (valid.test(a)) setTickerA(a);
    if (valid.test(b)) setTickerB(a === b ? (a === "BYAN" ? "ADRO" : "BYAN") : b);
  }, []);
  function selectPair(a: string, b: string) {
    if (a === b) return;
    setTickerA(a); setTickerB(b);
    const url = new URL(window.location.href);
    url.searchParams.set("a", a); url.searchParams.set("b", b);
    window.history.replaceState(window.history.state, "", url);
  }
  const queryA = useQuery({ queryKey: ["issuer", tickerA], queryFn: () => api.getIssuerDetail(tickerA) });
  const queryB = useQuery({ queryKey: ["issuer", tickerB], queryFn: () => api.getIssuerDetail(tickerB) });
  const a = queryA.data; const b = queryB.data;
  const loading = queryA.isLoading || queryB.isLoading || issuers.isLoading;
  const error = issuers.error ?? queryA.error ?? queryB.error;
  const radar = SCORE_PILLARS.map((pillar) => ({ label: pillar.label, a: pillarValue(a?.component_scores, pillar.key), b: pillarValue(b?.component_scores, pillar.key) }));
  const allPillarsPresent = radar.every((pillar) => pillar.a !== null && pillar.b !== null);
  const takeaways: string[] = [];
  if (a && b) {
    if (a.rli_years != null && b.rli_years != null) takeaways.push(`Reserve life: ${a.symbol} ${a.rli_years.toFixed(1)} years; ${b.symbol} ${b.rli_years.toFixed(1)} years at the current modeled production rate.`);
    if (a.cash_cost_per_ton_usd != null && b.cash_cost_per_ton_usd != null) takeaways.push(`Cash cost difference ${Math.abs(a.cash_cost_per_ton_usd - b.cash_cost_per_ton_usd).toFixed(2)} USD/ton. Consider product quality and the scope of costs together.`);
    if (a.license_cliff_3y != null && b.license_cliff_3y != null) takeaways.push(`License area expiring within 3 years: ${a.symbol} ${a.license_cliff_3y.toFixed(1)}%; ${b.symbol} ${b.license_cliff_3y.toFixed(1)}%. This is not the probability of a license renewal failing.`);
    if (a.data_quality !== "LENGKAP" || b.data_quality !== "LENGKAP") takeaways.push("At least one issuer has partial data. Missing values cannot be compared; scores may use different weights.");
  }

  return <div className="gali-page space-y-6">
    <div className="border-b border-line pb-6">
      <Badge variant="amber" className="mb-3 gap-2"><Scale className="h-3.5 w-3.5" />Peer Comparison</Badge>
      <h1 className="text-3xl font-bold text-ink">Two issuers. Clear trade-offs.</h1>
      <p className="mt-2 text-sm text-muted max-w-3xl">Two issuers from the same active dataset. Read physical metrics alongside data quality before drawing conclusions.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {PRESETS.map(([pa, pb]) => (
        <Button variant="outline" size="sm" key={`${pa}-${pb}`} onClick={() => selectPair(pa, pb)} className="gap-1.5 h-8">
          <IssuerLogo symbol={pa} size="xs" />
          <span>{pa}</span>
          <span className="text-muted text-xs">vs</span>
          <IssuerLogo symbol={pb} size="xs" />
          <span>{pb}</span>
        </Button>
      ))}
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {[{ symbol: tickerA, detail: a, side: "A" }, { symbol: tickerB, detail: b, side: "B" }].map(({ symbol, detail, side }) => <Card key={side} className="p-5 space-y-3">
        <div className="space-y-3">
          <IssuerPicker label={`Issuer ${side}`} tone={side === "A" ? "brand" : "info"} value={symbol} onChange={(next) => selectPair(side === "A" ? next : tickerA, side === "B" ? next : tickerB)}
            options={(issuers.data ?? []).map((issuer) => ({ symbol: issuer.symbol, name: issuer.name, score: issuer.ground_truth_score }))}
            disabled={{ [side === "A" ? tickerB : tickerA]: `Selected as Issuer ${side === "A" ? "B" : "A"}` }} className="w-full" />
          {detail && <div className="flex flex-wrap items-center gap-2"><ConfidenceBadge dataQuality={detail.data_quality} /><ScoreCoverage coverage={typeof detail.confidence?.effective_weight === "number" ? detail.confidence.effective_weight * 100 : null} eligible={isScoreRankable({ data_quality: detail.data_quality, ground_truth_score: detail.ground_truth_score, confidence_pct: typeof detail.confidence?.effective_weight === "number" ? detail.confidence.effective_weight * 100 : 0 })} /></div>}
        </div>
        <VisualAsset name="mine-cutaway" className="gali-comparison-art" />
        {detail && <dl className="space-y-2">{[
          { label: "Reserve life", value: number(detail.rli_years, " years") },
          { label: "Cash cost", value: detail.cash_cost_per_ton_usd == null ? "Unavailable" : "$" + detail.cash_cost_per_ton_usd.toFixed(2) + " / tonne" },
          { label: "License exposure ≤3 years", value: number(detail.license_cliff_3y, "%") },
        ].map((metric) => <div key={metric.label} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-3 py-2"><dt className="text-[12px] text-muted">{metric.label}</dt><dd className="font-numeric text-sm font-bold text-ink">{metric.value}</dd></div>)}</dl>}
        {detail && <div className="flex justify-between text-sm gap-3"><span className="text-muted">Score <span className="font-numeric text-ink">{number(detail.ground_truth_score)}</span> · RBV <span className="font-numeric text-ink">{usd(detail.reserve_backed_value_usd)}</span></span><Link href={`/issuer/${symbol}`} className="text-brand hover:underline">Profile →</Link></div>}
      </Card>)}
    </div>
    {error ? <DataState error={error} onRetry={() => Promise.all([issuers.refetch(), queryA.refetch(), queryB.refetch()])} /> : loading ? <LoadingState label={`Loading ${tickerA} and ${tickerB} comparison…`} skeleton /> : a && b ? <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4 min-w-0"><CardTitle>Five pillars of the fundamental score</CardTitle>
          {allPillarsPresent ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="65%"><PolarGrid stroke="var(--line)" /><PolarAngleAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} /><Radar isAnimationActive={!reducedMotion} animationDuration={220} name={tickerA} dataKey="a" stroke="var(--chart-gold)" fill="var(--chart-gold)" fillOpacity={0.2} /><Radar isAnimationActive={!reducedMotion} animationDuration={220} name={tickerB} dataKey="b" stroke="var(--chart-cyan)" fill="var(--chart-cyan)" fillOpacity={0.2} /><Legend formatter={(value) => <span className="text-muted">{value}</span>} /><Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)" }} /></RadarChart></ResponsiveContainer></div>
            : <div className="space-y-3 py-3"><p className="text-sm text-brand">The radar requires all five pillars. Available pillars are shown below.</p>{radar.map((pillar) => <div key={pillar.label} className="grid grid-cols-3 text-sm gap-3"><span className="text-muted">{pillar.label}</span><span className="font-numeric text-brand">{number(pillar.a)}</span><span className="font-numeric text-info">{number(pillar.b)}</span></div>)}</div>}
          <p className="text-sm text-muted">Relative percentiles within the dataset universe, from 0 to 100. <Link href="/methodology" className="text-brand">Review weights and model limits →</Link></p>
        </Card>
        <Card className="p-5 space-y-4"><CardTitle>Findings from the data</CardTitle><p className="text-sm text-muted">Rule-based summary; no LLM is used.</p>{takeaways.length ? takeaways.map((point) => <p key={point} className="rounded-lg border border-line p-4 text-sm leading-relaxed text-ink-soft">{point}</p>) : <DataState empty />}
          <Button asChild variant="outline"><Link href={`/scenario?a=${tickerA}&b=${tickerB}`}>Test a scenario across all issuers →</Link></Button>
        </Card>
      </div>
      <Card className="p-5 space-y-4"><CardTitle>Comparison metrics</CardTitle><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead><div className="inline-flex items-center gap-1.5"><IssuerLogo symbol={tickerA} size="xs" /><span>{tickerA}</span></div></TableHead><TableHead><div className="inline-flex items-center gap-1.5"><IssuerLogo symbol={tickerB} size="xs" /><span>{tickerB}</span></div></TableHead></TableRow></TableHeader><TableBody>
        {METRICS.map((metric) => <TableRow key={metric.key}><TableCell>{metric.label}</TableCell><TableCell className="font-numeric text-brand">{metric.format(a[metric.key] as number | null)}</TableCell><TableCell className="font-numeric text-info">{metric.format(b[metric.key] as number | null)}</TableCell></TableRow>)}
        <TableRow><TableCell>Largest sales destination</TableCell>{[a, b].map((issuer) => <TableCell key={issuer.symbol}>{issuer.top_destination ?? "—"}{issuer.top_destination_pct != null ? ` (${issuer.top_destination_pct.toFixed(1)}%)` : ""}</TableCell>)}</TableRow>
        <TableRow><TableCell>Data as of</TableCell><TableCell>{a.as_of}</TableCell><TableCell>{b.as_of}</TableCell></TableRow>
      </TableBody></Table></Card>
    </> : <DataState empty />}
  </div>;
}
