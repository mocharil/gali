"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ArrowUpRight, Download, ShieldAlert, Grid3X3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { IssuerScenarioImpact, ScenarioShockRequest } from "@/lib/types";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { DRIVER_LABELS, scenarioBrief } from "@/lib/research";
import { useDataset } from "./DatasetContext";
import { Button } from "./ui/button";
import { GeminiResearchPanel } from "./GeminiResearchPanel";

const usd = (value: number | null | undefined) => value == null ? "—" : `${value < 0 ? "−" : ""}$${(Math.abs(value) / (Math.abs(value) >= 1e9 ? 1e9 : 1e6)).toFixed(2)}${Math.abs(value) >= 1e9 ? "B" : "M"}`;
const pct = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const CHART_LABELS: Record<string, string> = { baseline_basis: "Basis", price: "Price", volume: "Volume", license: "Licenses", discount: "Discount rate" };

export function ScenarioExplanation({ impacts, params }: { impacts: IssuerScenarioImpact[]; params: ScenarioShockRequest }) {
  const [symbol, setSymbol] = useState("BUMI");
  const dataset = useDataset();
  const reducedMotion = useReducedMotion();
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("issuer"); if (requested) setSymbol(requested.toUpperCase()); }, []);
  const selected = impacts.find((row) => row.symbol === symbol) ?? impacts.find((row) => !row.is_partial) ?? impacts[0];
  if (!selected) return null;
  const drivers = selected.drivers ?? [];
  let previous = selected.baseline_rbv_usd ?? 0;
  const chart = [{ name: "Baseline", axisLabel: "Baseline", range: [0, previous / 1e9], delta: null as number | null, after: previous, fill: "var(--chart-baseline)" }];
  for (const driver of drivers) {
    chart.push({ name: DRIVER_LABELS[driver.key] ?? driver.key, axisLabel: CHART_LABELS[driver.key] ?? driver.key, range: [Math.min(previous, driver.rbv_after_usd) / 1e9, Math.max(previous, driver.rbv_after_usd) / 1e9], delta: driver.delta_rbv_usd, after: driver.rbv_after_usd, fill: driver.delta_rbv_usd < 0 ? "var(--negative)" : "var(--chart-cyan)" });
    previous = driver.rbv_after_usd;
  }
  chart.push({ name: "Scenario", axisLabel: "Scenario", range: [0, (selected.post_shock_rbv_usd ?? 0) / 1e9], delta: null, after: selected.post_shock_rbv_usd ?? 0, fill: "var(--chart-gold)" });
  const cells = selected.sensitivity ?? [];
  const prices = [...new Set(cells.map((cell) => cell.price_shock_pct))].sort((a, b) => a - b);
  const rates = [...new Set(cells.map((cell) => cell.discount_rate))].sort((a, b) => a - b);
  const strongest = [...drivers].filter((driver) => driver.key !== "baseline_basis").sort((a, b) => Math.abs(b.delta_rbv_usd) - Math.abs(a.delta_rbv_usd))[0];

  function choose(value: string) {
    setSymbol(value);
    const url = new URL(window.location.href); url.searchParams.set("issuer", value);
    window.history.replaceState(window.history.state, "", url);
  }
  function exportBrief() {
    const text = scenarioBrief(selected, params, dataset);
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `gali-research-${selected.symbol}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className="gali-card overflow-hidden" data-testid="scenario-explanation">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-info">From changes to drivers</p><h2 className="mt-2 text-xl font-semibold text-ink">Explore each issuer&apos;s resilience.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Trace the drivers, check margin limits, and save the research findings with their assumptions.</p></div>
      <div className="flex flex-wrap items-end gap-2"><div><label htmlFor="explain-issuer" className="mb-1.5 block text-[12px] text-muted">Selected issuer</label><select id="explain-issuer" value={selected.symbol} onChange={(event) => choose(event.target.value)} className="gali-input min-h-10 min-w-32 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink">{impacts.map((row) => <option value={row.symbol} key={row.symbol}>{row.symbol}{row.is_partial ? " · Partial" : ""}</option>)}</select></div><Button variant="outline" onClick={exportBrief}><Download className="h-4 w-4" />Save research brief</Button></div>
    </div>
    {selected.is_partial ? <div className="p-6"><p className="font-medium text-brand">Analysis {selected.symbol} cannot be calculated yet.</p><p className="mt-2 text-sm text-muted">Reserve or gross profit inputs are incomplete. No waterfall or sensitivity values are inferred.</p><Link href={`/issuer/${selected.symbol}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-info">Explore the available data<ArrowUpRight className="h-4 w-4" /></Link></div> : <>
      <div className="grid gap-4 border-b border-line p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        {[
          { label: "Scenario revenue", value: usd(selected.post_shock_revenue_usd), hint: `Volume at risk ${pct(selected.volume_at_risk_pct)}`, negative: false },
          { label: "Scenario costs", value: usd(selected.post_shock_cost_usd), hint: "Fixed costs + variable costs", negative: false },
          { label: "Scenario gross profit", value: usd(selected.post_shock_gp_usd), hint: (selected.gross_loss_usd ?? 0) > 0 ? "Negative · gross loss remains visible" : "Revenue − modeled COGS", negative: (selected.post_shock_gp_usd ?? 0) < 0 },
          { label: "Price change at zero gross profit", value: pct(selected.break_even_price_change_pct), hint: "From baseline price, at scenario volume", negative: false },
        ].map((stat) => <div className="min-w-0" key={stat.label}><p className="text-[12px] text-muted">{stat.label}</p><p className={`mt-2 font-numeric text-2xl font-semibold ${stat.negative ? "text-negative" : "text-ink"}`}>{stat.value}</p><p className="mt-1 text-[12px] leading-relaxed text-muted">{stat.hint}</p></div>)}
      </div>
      {(selected.gross_loss_usd ?? 0) > 0 && <div role="status" data-testid="gross-loss-warning" className="mx-5 mt-5 flex gap-3 rounded-xl border border-negative-line bg-negative-soft p-4 sm:mx-6"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-negative" /><div><p className="text-sm font-semibold text-negative">Modeled gross loss {usd(selected.gross_loss_usd)} per year</p><p className="mt-1 text-sm text-ink-soft">RBV has a zero floor. Negative gross profit is still recorded; a zero value does not remove costs or losses.</p></div></div>}
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0"><h3 className="flex items-center gap-2 text-base font-semibold text-ink"><BarChart3 className="h-4 w-4 text-brand" />Why did RBV change?</h3><p className="mt-2 text-[12px] leading-relaxed text-muted">Order: price → volume → licenses → discount rate. Interactions are attributed to the driver applied later.</p>
          {drivers.length ? <><div className="mt-4 overflow-x-auto"><div className="h-64 min-w-[280px]" role="img" aria-label={`RBV change waterfall ${selected.symbol}; detailed figures are available in the following table`}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 12, right: 8, left: 0, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="axisLabel" interval={0} angle={-32} textAnchor="end" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} /><YAxis width={44} tickFormatter={(value: number) => `$${value}B`} tick={{ fill: "var(--chart-axis)", fontSize: 10 }} /><Tooltip content={({ active, payload }) => { const row = payload?.[0]?.payload as typeof chart[number] | undefined; return active && row ? <div className="rounded-xl border border-line bg-surface p-3 text-[12px] shadow-panel"><p className="font-semibold text-ink">{row.name}</p><p className="mt-1 text-muted">{row.delta == null ? "RBV" : "Contribution"}: {usd(row.delta ?? row.after)}</p><p className="text-muted">RBV after driver: {usd(row.after)}</p></div> : null; }} /><Bar dataKey="range" isAnimationActive={!reducedMotion} animationDuration={220} radius={[4, 4, 0, 0]}>{chart.map((row) => <Cell key={row.name} fill={row.fill} />)}</Bar></BarChart></ResponsiveContainer></div></div><table className="mt-2 w-full text-sm" aria-label="Contributions to RBV change"><thead className="text-[12px] text-muted"><tr><th className="py-2 text-left font-medium">Driver</th><th className="py-2 text-right font-medium">Contribution</th><th className="py-2 text-right font-medium">RBV after driver</th></tr></thead><tbody className="divide-y divide-line">{drivers.map((driver) => <tr key={driver.key}><td className="py-2.5 text-ink-soft">{DRIVER_LABELS[driver.key] ?? driver.key}</td><td className={`py-2.5 text-right font-numeric ${driver.delta_rbv_usd < 0 ? "text-negative" : "text-info"}`}>{usd(driver.delta_rbv_usd)}</td><td className="py-2.5 text-right font-numeric text-ink-soft">{usd(driver.rbv_after_usd)}</td></tr>)}</tbody></table></> : <p className="mt-4 text-sm text-muted">Driver attribution is unavailable for this run.</p>}
        </div>
        <div className="min-w-0"><h3 className="flex items-center gap-2 text-base font-semibold text-ink"><Grid3X3 className="h-4 w-4 text-info" />What if assumptions change?</h3><p className="mt-2 text-[12px] leading-relaxed text-muted">RBV change from baseline. Price and discount rate vary; volume, variable costs, and licenses follow the active scenario.</p>
          {cells.length ? <><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[280px] border-separate border-spacing-1 text-sm" aria-label="Price and discount-rate sensitivity"><thead><tr><th className="px-2 py-2 text-left text-[11px] font-medium text-muted">Price / discount rate</th>{rates.map((rate) => <th className="px-2 py-2 font-numeric text-[12px] font-medium text-muted" key={rate}>{(rate * 100).toFixed(0)}%</th>)}</tr></thead><tbody>{prices.map((price) => <tr key={price}><th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-numeric text-[12px] font-medium text-muted">{pct(price * 100)}</th>{rates.map((rate) => {
            const cell = cells.find((point) => point.price_shock_pct === price && point.discount_rate === rate)!;
            const current = Math.abs(price - (params.price_shock_pct ?? 0)) < 1e-6 && Math.abs(rate - (params.discount_rate ?? .12)) < 1e-6;
            return <td key={rate} data-testid={current ? "active-sensitivity" : undefined} title={`Price ${pct(price * 100)}, discount rate ${(rate * 100).toFixed(0)}%, RBV ${usd(cell.rbv_usd)}`} className={`rounded-lg px-2 py-3 text-center font-numeric font-medium ${cell.delta_rbv_pct < -40 ? "bg-negative-soft text-negative" : cell.delta_rbv_pct < 0 ? "bg-brand-soft text-brand" : "bg-info-soft text-info"} ${current ? "ring-2 ring-info ring-inset" : ""}`}>{pct(cell.delta_rbv_pct)}{current && <span className="block font-sans text-[9px]">Active</span>}</td>;
          })}</tr>)}</tbody></table></div><div className="mt-4 rounded-xl bg-surface-muted p-4"><p className="text-[12px] text-muted">Range around active assumptions</p><p className="mt-2 font-numeric text-xl font-semibold text-ink">{pct(Math.min(...cells.map((cell) => cell.delta_rbv_pct)))} to {pct(Math.max(...cells.map((cell) => cell.delta_rbv_pct)))}</p><p className="mt-2 text-[12px] leading-relaxed text-muted">{cells.length} assumption combinations. This sensitivity range is not a probability or confidence interval.</p></div></> : <p className="mt-4 text-sm text-muted">Sensitivity is unavailable for this run.</p>}
          <div className="mt-5 border-t border-line pt-4"><p className="text-sm font-medium text-ink">Findings to investigate</p><p className="mt-2 text-sm leading-relaxed text-muted">{strongest && Math.abs(strongest.delta_rbv_usd) > .02 ? <>The largest absolute contribution to change comes from <strong className="font-medium text-ink-soft">{(DRIVER_LABELS[strongest.key] ?? strongest.key).toLowerCase()}</strong> of {usd(strongest.delta_rbv_usd)}. </> : "The active parameters have not changed RBV. "}Review source periods, costs beyond COGS, and license status before drawing conclusions about equity value.</p><Link href={`/issuer/${selected.symbol}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-info">Open profile &amp; Evidence {selected.symbol}<ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </div>
      <div className="border-t border-line bg-surface-muted px-5 py-4 text-[12px] leading-relaxed text-muted sm:px-6">Basis {selected.model_basis === "revenue_cost" ? "revenue and costs reconciled to gross profit" : "gross profit proxy; revenue, costs, and margin limits are unmeasured"}. RBV uses a gross profit annuity with a zero floor. Overhead, tax, capex, working capital, and the equity-value bridge are not modeled.{(selected.warnings ?? []).length > 0 && <details className="mt-2"><summary className="cursor-pointer font-medium text-brand">Input limitations {selected.symbol} ({selected.warnings!.length})</summary><ul className="mt-2 list-disc space-y-1 pl-4">{selected.warnings!.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}</div>
    </>}
    <div className="border-t border-line p-5 sm:p-6"><GeminiResearchPanel key={`${selected.symbol}-${JSON.stringify(params)}`} symbols={[selected.symbol]} scenario={params} /></div>
  </section>;
}
