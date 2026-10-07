"use client";

import { useState } from "react";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { VisualAsset } from "@/components/VisualAsset";
import { IssuerPicker } from "@/components/IssuerPicker";

const dollars = (value: number | null | undefined) => value == null ? "Unavailable" : "$" + (value / 1e9).toFixed(2) + "B";

export function ValuationLens() {
  const [symbol, setSymbol] = useState("BYAN");
  const query = useIssuerUniverse();
  const issuer = query.data?.find((item) => item.symbol === symbol) ?? query.data?.[0];
  if (!issuer) return null;
  const gap = issuer.rbv_gap_pct;
  const interpretation = gap == null ? "The market-to-model gap cannot be calculated from the available inputs."
    : gap > 0 ? "Market capitalization is above the modeled reserve-value proxy."
    : gap < 0 ? "Market capitalization is below the modeled reserve-value proxy."
    : "Market capitalization matches the modeled reserve-value proxy.";
  return <section className="gali-visual-intro" aria-label="Market and reserve-value perspectives">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="gali-eyebrow">Two perspectives on value</p><h2 className="mt-2 text-2xl font-bold">The asset model and the market lens.</h2></div><IssuerPicker label="Example issuer" value={issuer.symbol} onChange={setSymbol} options={(query.data ?? []).map((item) => ({ symbol: item.symbol, name: item.name, score: item.ground_truth_score }))} className="w-full sm:w-80" /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-2xl border border-info-line bg-surface p-4"><p className="text-[12px] text-info">Modeled reserve value · USD</p><p className="mt-2 font-numeric text-2xl font-bold">{dollars(issuer.reserve_backed_value_usd)}</p><p className="mt-2 text-[11px] text-muted">Gross-profit annuity proxy</p></div>
        <div className="rounded-2xl border border-brand-line bg-surface p-4"><p className="text-[12px] text-brand">Market capitalization · USD</p><p className="mt-2 font-numeric text-2xl font-bold">{dollars(issuer.market_cap_usd)}</p><p className="mt-2 text-[11px] text-muted">At the dataset’s FX assumptions</p></div>
      </div>
      <p className="mt-4 font-numeric text-xl font-bold text-info">{gap == null ? "Gap unavailable" : (gap > 0 ? "+" : "") + gap.toFixed(1) + "% gap"}</p><p className="mt-1 text-[12px] text-ink-soft">{interpretation}</p>
      <p className="mt-3 text-[12px] text-muted">A screening comparison, not a fair-equity-value target. Review cash, debt, corporate costs, and model assumptions.</p>
    </div>
    <VisualAsset name="valuation-lenses" className="gali-intro-art" />
  </section>;
}
