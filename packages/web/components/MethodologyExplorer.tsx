"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";

const METRICS: { key: string; label: string; asset: VisualAssetName; logic: string; meaning: string; assumption: string }[] = [
  { key: "reserve-life", label: "Reserve life", asset: "mine-cutaway", logic: "Reserves ÷ annual production", meaning: "How long the remaining reserves would last at the current production rate.", assumption: "Reserve estimates and production rates can change. Inputs must refer to the same attributable entities." },
  { key: "reserve-value", label: "Reserve value", asset: "reserve-value", logic: "Finite annuity of modeled gross profit", meaning: "A reserve-value proxy that depends on operating profit, reserve life, license assumptions, and the discount rate.", assumption: "This is a gross-profit model. It does not model all corporate costs, cash, debt, taxes, or sustaining capital." },
  { key: "licenses", label: "License exposure", asset: "license-window", logic: "Licensed area expiring within 3 years", meaning: "The share of licensed area reaching its expiry window within three years of the dataset snapshot.", assumption: "Area exposure is not a probability of failed renewal. Unknown dates remain unknown." },
  { key: "score", label: "GALI Score", asset: "data-modules", logic: "Weighted, relative pillar percentiles", meaning: "A screening score across reserve life, license exposure, costs, destinations, and contractors.", assumption: "Scores are relative to the dataset universe. Missing pillars affect available weight and ranking eligibility." },
];

export function MethodologyExplorer() {
  const [selected, setSelected] = useState("reserve-life");
  const query = useIssuerUniverse();
  const issuer = query.data?.find((item) => item.symbol === "BYAN") ?? query.data?.[0];
  const metric = METRICS.find((item) => item.key === selected)!;
  const value = !issuer ? null : selected === "reserve-life" ? issuer.rli_years == null ? null : issuer.rli_years.toFixed(1) + " years"
    : selected === "reserve-value" ? issuer.reserve_backed_value_usd == null ? null : "$" + (issuer.reserve_backed_value_usd / 1e9).toFixed(2) + "B"
    : selected === "licenses" ? issuer.license_cliff_3y == null ? null : issuer.license_cliff_3y.toFixed(1) + "%"
    : issuer.ground_truth_score == null ? null : issuer.ground_truth_score.toFixed(1) + " / 100";
  return <section id="reserve-life" className="mb-8 space-y-4" aria-label="Visual metric explanations">
    <div><p className="gali-eyebrow">Understand the number</p><h1 className="mt-2 text-3xl font-bold">Trace the logic behind GALI.</h1><p className="mt-2 text-sm text-muted">Explore the meaning first, then inspect the full equations and limitations below.</p></div>
    <div className="flex flex-wrap gap-2" aria-label="Choose a metric explanation">{METRICS.map((item) => <button key={item.key} className={"gali-button " + (selected === item.key ? "border border-brand-line bg-brand-soft text-brand" : "gali-button-secondary")} aria-pressed={selected === item.key} onClick={() => setSelected(item.key)}>{item.label}</button>)}</div>
    <div className="gali-visual-intro" aria-live="polite">
      <VisualAsset name={metric.asset} className="gali-intro-art" />
      <div className="min-w-0"><h2 className="text-2xl font-bold">{metric.label}</h2><p className="mt-2 text-base font-semibold text-ink-soft">{metric.logic}</p><p className="mt-3 text-sm leading-relaxed text-muted">{metric.meaning}</p>
        {issuer && <div className="mt-4 border-t border-line pt-4"><p className="text-[12px] text-muted">{issuer.symbol} · active dataset example</p><p className="mt-1 font-numeric text-3xl font-bold text-info">{value ?? "Unavailable"}</p></div>}
        <p className="mt-4 rounded-xl border border-info-line bg-info-soft p-3 text-[12px] leading-relaxed text-info">{metric.assumption}</p>
        {issuer && <Link href={"/issuer/" + issuer.symbol} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-info">Review issuer evidence<ArrowRight className="h-3.5 w-3.5" /></Link>}
      </div>
    </div>
  </section>;
}
