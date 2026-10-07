"use client";

import { VisualAsset } from "@/components/VisualAsset";
import { useReducedMotion } from "@/lib/useReducedMotion";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLink as Link } from "@/components/AppLink";
import { SlidersHorizontal, Download, Share2, RotateCcw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import type { ScenarioShockRequest } from "@/lib/types";
import { downloadCSV } from "@/lib/export";
import { DataState } from "@/components/DataState";
import { ScenarioExplanation } from "@/components/ScenarioExplanation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ActionButton";
import { LoadingState } from "@/components/LoadingState";
import { useActivityFlag } from "@/components/ActivityProvider";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IssuerLogo } from "@/components/IssuerLogo";

const COUNTRIES = ["China", "India", "Indonesia", "Japan", "Korea", "Philippines", "Malaysia"];
const BASELINE: ScenarioShockRequest = {
  price_shock_pct: 0, destination_shocks: {}, license_cliff_expiry_shock: false,
  discount_rate: 0.12, variable_cost_share: 0.65,
};
function bounded(value: string | null, min: number, max: number, fallback = 0) {
  const num = value == null ? fallback : Number(value);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback;
}
function usd(value: number | null) {
  if (value == null) return "—";
  return `${value < 0 ? "−" : ""}$${(Math.abs(value) / (Math.abs(value) >= 1e9 ? 1e9 : 1e6)).toFixed(2)}${Math.abs(value) >= 1e9 ? "B" : "M"}`;
}
function signedPct(value: number | null) {
  return value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function ScenarioStudioPage() {
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState<ScenarioShockRequest>(BASELINE);
  const [applied, setApplied] = useState<ScenarioShockRequest | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const signature = JSON.stringify(draft);
  const upToDate = applied !== null && signature === JSON.stringify(applied);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDraft({
      ...BASELINE,
      price_shock_pct: bounded(params.get("price"), -0.5, 0.5),
      discount_rate: bounded(params.get("rate"), .01, .5, .12),
      variable_cost_share: bounded(params.get("variable"), 0, 1, .65),
      license_cliff_expiry_shock: ["1", "true"].includes(params.get("cliff") ?? ""),
      destination_shocks: Object.fromEntries(COUNTRIES.map((country) => [country, bounded(params.get(country.toLowerCase()), 0, 0.5)]).filter(([, value]) => Number(value) > 0)),
    });
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => setApplied(draft), 350);
    const url = new URL(window.location.href);
    const price = draft.price_shock_pct ?? 0;
    if (price !== 0) url.searchParams.set("price", String(price)); else url.searchParams.delete("price");
    if (draft.license_cliff_expiry_shock) url.searchParams.set("cliff", "1"); else url.searchParams.delete("cliff");
    if (draft.discount_rate !== .12) url.searchParams.set("rate", String(draft.discount_rate)); else url.searchParams.delete("rate");
    if (draft.variable_cost_share !== .65) url.searchParams.set("variable", String(draft.variable_cost_share)); else url.searchParams.delete("variable");
    for (const country of COUNTRIES) {
      const value = draft.destination_shocks?.[country] ?? 0;
      if (value > 0) url.searchParams.set(country.toLowerCase(), String(value)); else url.searchParams.delete(country.toLowerCase());
    }
    window.history.replaceState(window.history.state, "", url);
    setShareMessage("");
    return () => clearTimeout(timer);
  }, [draft, initialized]);

  const result = useQuery({
    queryKey: ["scenario", applied],
    queryFn: ({ signal }) => api.simulateScenario(applied!, signal),
    enabled: initialized && upToDate,
    staleTime: 0,
    retry: 1,
  });
  const busy = !upToDate || result.isFetching;
  useActivityFlag(busy, "Calculating the latest scenario…");
  const impacts = !busy && !result.isError ? result.data?.impacts ?? [] : [];
  const sorted = [...impacts].sort((a, b) => (a.post_shock_rank ?? 99) - (b.post_shock_rank ?? 99));
  const chartData = sorted.filter((item) => !item.is_partial && item.baseline_rbv_usd != null && item.post_shock_rbv_usd != null).map((item) => ({
    symbol: item.symbol, baseline: item.baseline_rbv_usd! / 1e9, scenario: item.post_shock_rbv_usd! / 1e9,
  }));
  const warnings = [...new Set(impacts.flatMap((item) => item.warnings ?? []))];
  const totalBaseline = impacts.reduce((sum, item) => sum + (item.baseline_rbv_usd ?? 0), 0);
  const totalScenario = impacts.reduce((sum, item) => sum + (item.post_shock_rbv_usd ?? 0), 0);
  const totalDelta = totalScenario - totalBaseline;
  const quantifiable = impacts.filter((item) => !item.is_partial).length;

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setShareMessage("Scenario link copied."); }
    catch { setShareMessage("Clipboard access is unavailable. Copy the link from your address bar."); }
  }
  function exportCSV() {
    if (busy || !result.data || result.isError) return;
    downloadCSV(`gali-scenario-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Symbol", "Baseline RBV USD", "Post-shock RBV USD", "Delta USD", "Delta %", "Baseline rank", "Post-shock rank", "Post-shock gross profit USD", "Gross loss USD", "Driver contributions", "Model basis", "Warnings", "Parameters"],
      ...sorted.map((item) => [item.symbol, item.baseline_rbv_usd, item.post_shock_rbv_usd, item.delta_rbv_usd, item.delta_rbv_pct, item.baseline_rank, item.post_shock_rank, item.post_shock_gp_usd, item.gross_loss_usd, JSON.stringify(item.drivers ?? []), item.model_basis, (item.warnings ?? []).join("; "), JSON.stringify(result.data!.params)]),
    ]);
  }

  return <div className="gali-page space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
      <div className="max-w-3xl">
        <Badge variant="amber" className="mb-3 gap-2"><SlidersHorizontal className="h-3.5 w-3.5" />Scenario Studio</Badge>
        <h1 className="text-3xl font-bold text-ink">See what changes. Understand why.</h1>
        <p className="mt-2 text-sm text-muted">Change commodity prices, sales destination demand, and license renewal assumptions. Compare published RBV with the scenario model&apos;s results.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton variant="outline" size="sm" action={copyLink} loadingText="Copying link…"><Share2 className="h-4 w-4" />Copy scenario</ActionButton>
        <ActionButton variant="outline" size="sm" action={exportCSV} loadingText="Preparing CSV…" paintFirst disabled={busy || !impacts.length}><Download className="h-4 w-4" />Export CSV</ActionButton>
      </div>
    </div>
    {shareMessage && <p role="status" className="text-sm text-brand">{shareMessage}</p>}
    <div className="flex flex-wrap gap-2" aria-label="Scenario presets">
      <Button variant="cyan" size="sm" onClick={() => setDraft({ ...BASELINE, price_shock_pct: -.2, destination_shocks: { China: .3 } })}>Price −20% + China −30%</Button>
      <Button variant="outline" size="sm" onClick={() => setDraft({ ...BASELINE, price_shock_pct: -0.25 })}>Price −25%</Button>
      <Button variant="outline" size="sm" onClick={() => setDraft({ ...BASELINE, destination_shocks: { China: 0.3 } })}>China demand −30%</Button>
      <Button variant="outline" size="sm" onClick={() => setDraft({ ...BASELINE, license_cliff_expiry_shock: true })}>No license renewal</Button>
      <Button variant="outline" size="sm" onClick={() => setDraft({ ...BASELINE, price_shock_pct: 0.2 })}>Price +20%</Button>
      <Button variant="ghost" size="sm" onClick={() => setDraft({ ...BASELINE })}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
    </div>
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-4 p-5 space-y-6">
        <CardTitle>Scenario parameters</CardTitle>
        <div className="space-y-3">
          <label htmlFor="price-shock" className="flex justify-between text-sm text-ink-soft">Commodity price change <span className="font-numeric text-brand">{((draft.price_shock_pct ?? 0) * 100).toFixed(0)}%</span></label>
          <input id="price-shock" type="range" min={-0.5} max={0.5} step={0.05} value={draft.price_shock_pct ?? 0} onChange={(e) => setDraft((prev) => ({ ...prev, price_shock_pct: Number(e.target.value) }))} className="w-full accent-brand" />
          <div className="flex justify-between text-sm text-muted"><span>−50%</span><span>Baseline</span><span>+50%</span></div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
          <input type="checkbox" checked={draft.license_cliff_expiry_shock ?? false} onChange={(e) => setDraft((prev) => ({ ...prev, license_cliff_expiry_shock: e.target.checked }))} className="mt-1 accent-brand" />
          <span className="text-sm text-ink-soft">No renewal for licenses expiring within 3 years<span className="block mt-1 text-sm text-muted">Uses licensed-area share as a proxy for reserves at risk; it does not predict regulatory decisions.</span></span>
        </label>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-soft">Demand reduction by country</h2>
          <p className="text-sm text-muted">Percentage reduction in sales destination volume. This does not simulate import tariffs.</p>
          {COUNTRIES.map((country) => <div key={country}>
            <label htmlFor={`shock-${country}`} className="flex justify-between text-sm text-ink-soft">{country}<span className="font-numeric">−{((draft.destination_shocks?.[country] ?? 0) * 100).toFixed(0)}%</span></label>
            <input id={`shock-${country}`} type="range" min={0} max={0.5} step={0.1} value={draft.destination_shocks?.[country] ?? 0} onChange={(e) => setDraft((prev) => {
              const shocks = { ...prev.destination_shocks }; const value = Number(e.target.value);
              if (value > 0) shocks[country] = value; else delete shocks[country];
              return { ...prev, destination_shocks: shocks };
            })} className="w-full mt-2 accent-info" />
          </div>)}
        </div>
        <div className="space-y-4 border-t border-line pt-5">
          <h2 className="text-sm font-semibold text-ink-soft">Valuation &amp; cost assumptions</h2>
          <div><label htmlFor="discount-rate" className="flex justify-between text-sm text-ink-soft">Discount rate<span className="font-numeric text-info">{((draft.discount_rate ?? .12)*100).toFixed(0)}%</span></label><input id="discount-rate" type="range" min={.01} max={.5} step={.01} value={draft.discount_rate ?? .12} onChange={(e) => setDraft((prev) => ({ ...prev, discount_rate: Number(e.target.value) }))} className="mt-2 w-full accent-info" /></div>
          <div><label htmlFor="variable-cost" className="flex justify-between text-sm text-ink-soft">Variable-cost share<span className="font-numeric text-info">{((draft.variable_cost_share ?? .65)*100).toFixed(0)}%</span></label><input id="variable-cost" type="range" min={0} max={1} step={.05} value={draft.variable_cost_share ?? .65} onChange={(e) => setDraft((prev) => ({ ...prev, variable_cost_share: Number(e.target.value) }))} className="mt-2 w-full accent-info" /></div>
          <p className="text-[12px] text-muted">The baseline uses the published dataset&apos;s 12% discount rate. Variable-cost share applies when revenue and cost data are available; fixed costs remain when volume falls.</p>
        </div>
      </Card>
      <Card className="lg:col-span-8 p-5 space-y-4 min-w-0" aria-busy={busy}>
        <CardTitle>Baseline vs scenario <span className="text-sm text-muted">USD billions</span></CardTitle>
        <div className="rounded-2xl border border-line bg-surface-muted p-3">
          <VisualAsset name="scenario-drivers" className="gali-intro-art mx-auto max-w-xl" />
          <div className="mt-2 grid gap-2 sm:grid-cols-3" aria-label="Scenario driver assumptions">
            <div className="rounded-xl border border-line bg-surface p-3"><p className="text-[11px] text-muted">Coal price</p><p className="mt-1 font-numeric font-bold text-brand">{((draft.price_shock_pct ?? 0) * 100).toFixed(0)}%</p><p className="mt-1 text-[11px] text-muted">Changes revenue per tonne.</p></div>
            <div className="rounded-xl border border-line bg-surface p-3"><p className="text-[11px] text-muted">Destination demand</p><p className="mt-1 text-sm font-bold text-info">{Object.entries(draft.destination_shocks ?? {}).filter(([, value]) => value > 0).length} markets stressed</p><p className="mt-1 text-[11px] text-muted">Lower sales volumes; fixed costs remain.</p></div>
            <div className="rounded-xl border border-line bg-surface p-3"><p className="text-[11px] text-muted">License window</p><p className="mt-1 text-sm font-bold text-brand">{draft.license_cliff_expiry_shock ? "No renewal ≤3 years" : "Published baseline"}</p><p className="mt-1 text-[11px] text-muted">Changes modeled operating life.</p></div>
          </div>
        </div>
        {!busy && impacts.length > 0 && <div data-testid="scenario-summary" className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3"><div><p className="text-[12px] uppercase text-muted">Scenario RBV</p><p className="mt-1 font-numeric text-lg font-bold text-brand">{usd(totalScenario)}</p></div><div><p className="text-[12px] uppercase text-muted">Aggregate model change</p><p className={`mt-1 font-numeric text-lg font-bold ${totalDelta < 0 ? "text-negative" : "text-positive"}`}>{signedPct(totalBaseline > 0 ? totalDelta / totalBaseline * 100 : null)}</p></div><div><p className="text-[12px] uppercase text-muted">Calculable</p><p className="mt-1 font-numeric text-lg font-bold text-ink-soft">{quantifiable}/{impacts.length} issuers</p></div><p className="col-span-2 text-[12px] text-muted sm:col-span-3">Sum of issuer models, rather than an industry total. Shared entities may be counted for multiple issuers.</p></div>}
        {busy ? <LoadingState label="Calculating the latest scenario…" description="Applying the latest price, demand, cost, and license assumptions." skeleton />
          : result.isError ? <DataState error={result.error} onRetry={() => result.refetch()} />
          : chartData.length === 0 ? <DataState title="RBV cannot be calculated yet" description="Reserve or gross profit inputs are insufficient. Review Data coverage and issuer profiles." />
          : <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 15, right: 5, left: 0, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="symbol" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} /><YAxis tick={{ fill: "var(--chart-axis)", fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: 8 }} formatter={(value: number) => `$${value.toFixed(2)}B`} /><Legend formatter={(value) => <span className="text-muted">{value}</span>} />
            <Bar isAnimationActive={!reducedMotion} animationDuration={220} name="Baseline RBV" dataKey="baseline" fill="var(--chart-baseline)" radius={[4, 4, 0, 0]} /><Bar isAnimationActive={!reducedMotion} animationDuration={220} name="Scenario RBV" dataKey="scenario" fill="var(--chart-gold)" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>}
        <p className="border-t border-line pt-4 text-sm leading-relaxed text-muted">RBV is a finite-annuity model using gross profit and reserve life, not a stock price target. It uses revenue and costs when available; otherwise, gross profit changes use a proxy identified in the table.</p>
        {warnings.length > 0 && <details className="rounded-lg border border-brand-line p-3 text-sm text-brand"><summary className="cursor-pointer">Model limits ({warnings.length})</summary><ul className="mt-2 space-y-2 list-disc pl-4">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
      </Card>
    </div>
    {impacts.length > 0 && result.data && <ScenarioExplanation impacts={impacts} params={result.data.params} />}
    {sorted.length > 0 && <Card className="p-5 space-y-4">
      <CardTitle>RBV change by issuer</CardTitle>
      <Table><TableHeader><TableRow><TableHead>Issuer</TableHead><TableHead>Baseline RBV</TableHead><TableHead>Scenario RBV</TableHead><TableHead>Delta %</TableHead><TableHead>Scenario gross profit</TableHead><TableHead>RBV size rank</TableHead><TableHead>Model basis</TableHead></TableRow></TableHeader>
        <TableBody>{sorted.map((item) => <TableRow key={item.symbol} data-testid={`impact-${item.symbol}`} className="font-numeric">
          <TableCell><Link href={`/issuer/${item.symbol}`} className="inline-flex items-center gap-2 font-bold text-ink hover:text-brand"><IssuerLogo symbol={item.symbol} size="xs" /><span>{item.symbol}</span></Link></TableCell>
          <TableCell>{usd(item.baseline_rbv_usd)}</TableCell><TableCell>{usd(item.post_shock_rbv_usd)}</TableCell>
          <TableCell className={item.delta_rbv_pct != null && item.delta_rbv_pct < 0 ? "text-negative" : "text-ink-soft"}>{signedPct(item.delta_rbv_pct)}</TableCell>
          <TableCell className={(item.post_shock_gp_usd ?? 0) < 0 ? "text-negative" : "text-ink-soft"}>{usd(item.post_shock_gp_usd)}{(item.gross_loss_usd ?? 0) > 0 && <span className="mt-1 block font-sans text-[11px]">Gross loss</span>}</TableCell>
          <TableCell>{item.baseline_rank != null && item.post_shock_rank != null ? `#${item.baseline_rank} → #${item.post_shock_rank}` : "—"}</TableCell>
          <TableCell className="font-sans text-sm text-muted">{item.is_partial ? "Partial data · not calculated" : item.model_basis === "revenue_cost" ? "Revenue & costs" : "Gross profit proxy"}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <p className="text-sm text-muted">Ranks order RBV size, rather than relative resilience. Missing values cannot be calculated yet. <Link href="/coverage" className="text-brand hover:underline">Check data coverage →</Link></p>
    </Card>}
  </div>;
}
