"use client";

import { useState } from "react";
import type { CostCurvePoint } from "@/lib/types";
import { VisualAsset } from "@/components/VisualAsset";
import { IssuerLogo } from "@/components/IssuerLogo";

const perTonne = (value: number | null | undefined) => value == null ? "Unavailable" : "$" + value.toFixed(2) + " / tonne";

export function CostUnitEconomics({ points }: { points: CostCurvePoint[] }) {
  const [symbol, setSymbol] = useState("");
  const point = points.find((item) => item.symbol === symbol) ?? points[0];
  if (!point) return null;
  return <section className="gali-visual-intro" aria-label="One-tonne unit economics">
    <VisualAsset name="coal-tonne" className="gali-intro-art" />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="gali-eyebrow">One tonne, three numbers</p><h2 className="mt-2 text-xl font-bold">Understand the operating economics.</h2></div>
        <div className="flex items-center gap-2">
          <IssuerLogo symbol={point.symbol} size="sm" className="mt-4" />
          <label className="text-[12px] text-muted">Issuer<select aria-label="Unit economics issuer" value={point.symbol} onChange={(event) => setSymbol(event.target.value)} className="gali-input mt-1 min-w-28">{points.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3" aria-live="polite">{[
        { label: "Realized price", value: point.realized_price_per_ton_usd },
        { label: "Cash cost", value: point.cash_cost_per_ton_usd },
        { label: "Gross margin before other costs", value: point.unit_margin_usd },
      ].map((item) => <div key={item.label} className="rounded-xl border border-line bg-surface p-3"><p className="text-[12px] text-muted">{item.label}</p><p className="mt-2 font-numeric text-lg font-bold text-ink">{perTonne(item.value)}</p></div>)}</div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">Realized price − cash cost = per-tonne gross margin. This does not include every corporate cost and is not net profit. Consider product quality when comparing issuers.</p>
    </div>
  </section>;
}
