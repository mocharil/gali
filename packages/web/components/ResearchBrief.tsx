"use client";

import { VisualAsset } from "@/components/VisualAsset";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Download, Radar, TrendingDown, Globe2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { IssuerSummary, ScenarioShockRequest, IssuerScenarioImpact } from "@/lib/types";
import { downloadCSV } from "@/lib/export";
import { qualityLabel } from "@/lib/presentation";
import { DataState } from "@/components/DataState";
import { DetailSection } from "@/components/DetailSection";
import { GeminiResearchPanel } from "@/components/GeminiResearchPanel";

const BASELINE: ScenarioShockRequest = { price_shock_pct: 0, destination_shocks: {}, discount_rate: .12, variable_cost_share: .65, license_cliff_expiry_shock: false };
const TESTS: { label: string; request: ScenarioShockRequest; href: string }[] = [
  { label: "Price −20%", request: { ...BASELINE, price_shock_pct: -.2 }, href: "/scenario?price=-0.2" },
  { label: "China −30%", request: { ...BASELINE, destination_shocks: { China: .3 } }, href: "/scenario?china=0.3" },
  { label: "Licenses ≤3 years", request: { ...BASELINE, license_cliff_expiry_shock: true }, href: "/scenario?cliff=1" },
];
const pct = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const usd = (value: number) => `${value < 0 ? "−" : value > 0 ? "+" : ""}$${(Math.abs(value) / 1e9).toFixed(2)}B`;

export function ResearchBrief({ issuers }: { issuers: IssuerSummary[] }) {
  const results = useQueries({ queries: TESTS.map((test) => ({ queryKey: ["research-stress", test.request], queryFn: ({ signal }: { signal: AbortSignal }) => api.simulateScenario(test.request, signal), staleTime: 300_000, retry: 1 })) });
  const ready = results.every((result) => result.isSuccess);
  const error = results.find((result) => result.isError);
  const impact = (index: number, symbol: string) => results[index].data?.impacts.find((row) => row.symbol === symbol);
  const complete = issuers.filter((row) => row.data_quality === "LENGKAP");
  const aggregate = (index: number) => {
    const eligible = results[index].data?.impacts.filter((row) => !row.is_partial && complete.some((issuer) => issuer.symbol === row.symbol)) ?? [];
    const base = eligible.reduce((sum, row) => sum + (row.baseline_rbv_usd ?? 0), 0);
    const delta = eligible.reduce((sum, row) => sum + (row.delta_rbv_usd ?? 0), 0);
    return { delta, pct: base > 0 ? delta / base * 100 : null, count: eligible.length };
  };
  const worst = (index: number): IssuerScenarioImpact | undefined => results[index].data?.impacts.filter((row) => !row.is_partial && row.delta_rbv_pct != null && complete.some((issuer) => issuer.symbol === row.symbol)).sort((a, b) => a.delta_rbv_pct! - b.delta_rbv_pct!)[0];
  const sorted = [...issuers].sort((a, b) => (impact(0, a.symbol)?.delta_rbv_pct ?? 999) - (impact(0, b.symbol)?.delta_rbv_pct ?? 999));
  const price = aggregate(0), china = aggregate(1), license = aggregate(2);
  const priceWorst = worst(0), chinaWorst = worst(1), licenseWorst = worst(2);

  function exportMatrix() {
    if (!ready) return;
    downloadCSV("gali-resilience-matrix.csv", [
      ["Symbol", "Data Quality", "Score Weight Coverage %", "Ground Truth Score", ...TESTS.map((test) => `${test.label} Delta RBV %`)],
      ...sorted.map((row) => [row.symbol, qualityLabel(row.data_quality), row.confidence_pct, row.ground_truth_score, ...TESTS.map((_, index) => impact(index, row.symbol)?.delta_rbv_pct ?? null)]),
    ]);
  }

  return <section data-testid="research-brief" className="gali-intelligence overflow-hidden rounded-[20px] border p-4 sm:p-6">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-info"><Radar className="h-4 w-4" />Reserve value resilience</div><h2 className="mt-2 text-xl font-bold text-ink">Three pressures to watch</h2></div>
      <button onClick={exportMatrix} disabled={!ready} className="gali-button gali-button-secondary disabled:opacity-40"><Download className="h-3.5 w-3.5" />Export analysis</button>
    </div>
    {error ? <DataState error={error.error} onRetry={() => results.forEach((result) => void result.refetch())} /> : !ready ? <div role="status" className="rounded-xl border border-line p-6 text-sm text-muted">Calculating the resilience matrix…</div> : <>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: TrendingDown, label: "Price pressure", value: price, worst: priceWorst, assumption: "Price −20%", text: "Volume and costs stay constant. Thin margins amplify the impact.", index: 0, color: "text-negative" },
          { icon: Globe2, label: "China demand", value: china, worst: chinaWorst, assumption: "Volume China −30%", text: "Variable costs follow volume; fixed costs remain.", index: 1, color: "text-info" },
          { icon: ShieldAlert, label: "License continuity", value: license, worst: licenseWorst, assumption: "Licenses ≤3 years", text: "Expiring licensed area reduces reserve life in the model.", index: 2, color: "text-brand" },
        ].map((item) => <Link key={item.label} href={TESTS[item.index].href} className="gali-intelligence-card group rounded-2xl border p-4 transition-colors sm:p-5">
          <VisualAsset name={item.index === 0 ? "coal-tonne" : item.index === 1 ? "export-containers" : "license-window"} className="gali-art-tile" />
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-ink"><span className="flex items-center gap-2"><item.icon className={`h-4 w-4 ${item.color}`} />{item.label}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted" /></div>
          <div className={`mt-3 font-numeric text-[30px] font-semibold ${item.color}`}>{pct(item.value.pct)}</div>
          <p className="text-[12px] text-muted">{usd(item.value.delta)} RBV change</p>
          <p className="mt-3 text-[12px] font-semibold text-ink-soft">{item.assumption}</p><p className="mt-1 text-[12px] leading-relaxed text-muted">{item.text}</p>
          <p className="mt-3 border-t border-line pt-3 text-[12px] text-muted">Largest relative impact: <span className="font-numeric font-semibold text-ink">{item.worst?.symbol ?? "–"} {pct(item.worst?.delta_rbv_pct)}</span></p>
        </Link>)}
      </div>
      <p className="mb-4 mt-4 text-[12px] leading-relaxed text-muted">Aggregate {price.count} issuers with complete core metrics. Three separate tests; ownership may overlap. Select a card to test combined scenarios.</p>
      <DetailSection title="See the impact on each issuer" description="Three-scenario matrix with score coverage and assumptions.">
        <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-sm" aria-label="Issuer resilience matrix"><thead className="bg-surface-muted text-[12px] text-muted"><tr><th className="p-3">Issuer</th><th className="p-3">Score / coverage</th>{TESTS.map((test) => <th className="whitespace-nowrap p-3" key={test.label}>{test.label}<span className="block text-[12px] font-normal">Δ RBV</span></th>)}</tr></thead><tbody className="divide-y divide-line">{sorted.map((row) => <tr key={row.symbol} data-testid={`resilience-${row.symbol}`} className="hover:bg-surface-hover"><td className="p-3"><Link className="font-numeric font-bold text-brand" href={`/issuer/${row.symbol}`}>{row.symbol}</Link></td><td className="p-3 text-ink-soft"><span className="font-numeric">{row.ground_truth_score?.toFixed(1) ?? "–"}</span><span className="ml-2 text-[12px] text-muted">{`${row.confidence_pct.toFixed(0)}% weight`}</span></td>{TESTS.map((test, index) => { const value = impact(index, row.symbol)?.delta_rbv_pct; return <td key={test.label} className="p-3"><span className={`inline-block min-w-16 rounded-md px-2 py-1 text-right font-numeric ${value == null ? "text-subtle" : value <= -40 ? "bg-negative-soft text-negative" : value < -10 ? "bg-brand-soft text-brand" : "bg-positive-soft text-positive"}`}>{pct(value)}</span></td>; })}</tr>)}</tbody></table></div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">The aggregate uses complete issuers with calculated RBV; it is not an industry total or a portfolio without overlap. The price test holds volume and costs constant. The China test uses a 35% fixed-cost share. The license test uses area as a proxy for reduced reserve life, not a probability of failed renewal. Scores are relative to the universe; coverage shows available data weight. Missing values remain empty.</p>
      </DetailSection>
      <div className="mt-5"><GeminiResearchPanel /></div>
    </>}
  </section>;
}
