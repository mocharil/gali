import { Layers3, Scale, ArrowUpRight } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import type { IssuerDetail } from "@/lib/types";
import { SCORE_PILLARS, pillarValue, isScoreRankable } from "@/lib/scores";
import { ScoreCoverage } from "./ScoreCoverage";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

export function ScoreDiagnostics({ data }: { data: IssuerDetail }) {
  const confidence = object(data.confidence);
  const sensitivity = object(confidence.weight_sensitivity);
  const weights = object(confidence.normalized_weights);
  const coverage = number(confidence.effective_weight);
  const eligible = confidence.ranking_eligible !== false && isScoreRankable({ data_quality: data.data_quality, ground_truth_score: data.ground_truth_score, confidence_pct: coverage == null ? 0 : coverage * 100 });
  const low = number(sensitivity.score_min), high = number(sensitivity.score_max);
  const rankLow = number(sensitivity.rank_min), rankHigh = number(sensitivity.rank_max);
  return <section className="gali-card p-5 sm:p-6" data-testid="score-diagnostics">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Layers3 className="h-4 w-4 text-info" />Score &amp; evidence coverage</h2><p className="mt-1 max-w-2xl text-sm text-muted">See how much data supports the score and how weight choices change the results.</p></div>
      <ScoreCoverage coverage={coverage == null ? null : coverage * 100} eligible={eligible} />
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl bg-surface-muted p-4"><p className="text-[12px] text-muted">Available data weight</p><p className="mt-2 font-numeric text-2xl font-semibold text-ink">{coverage == null ? "—" : `${(coverage * 100).toFixed(0)}%`}</p><p className="mt-1 text-[12px] text-muted">{SCORE_PILLARS.filter((pillar) => pillarValue(data.component_scores, pillar.key) != null).length}/5 measured pillars</p></div>
      <div className="rounded-xl bg-surface-muted p-4"><p className="text-[12px] text-muted">Score range as weights change</p><p className="mt-2 font-numeric text-2xl font-semibold text-ink">{low == null || high == null ? "—" : `${low.toFixed(1)}–${high.toFixed(1)}`}</p><p className="mt-1 text-[12px] text-muted">One pillar&apos;s weight shifts by a relative ±20%</p></div>
      <div className={`rounded-xl p-4 ${eligible ? "bg-info-soft" : "bg-brand-soft"}`}><p className="text-[12px] text-muted">Ranking sensitivity</p><p className={`mt-2 font-numeric text-2xl font-semibold ${eligible ? "text-info" : "text-brand"}`}>{rankLow == null || rankHigh == null ? "Not ranked" : rankLow === rankHigh ? `#${rankLow} unchanged` : `#${rankLow}–#${rankHigh}`}</p><p className="mt-1 text-[12px] text-muted">{eligible ? `Among ${number(confidence.peer_count) ?? "—"} issuers with complete scores` : "Provisional scores form a separate group"}</p></div>
    </div>
    <details className="mt-5 border-t border-line pt-4" open={!eligible}>
      <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Explore the five pillars&apos; weights and contributions</summary>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm" aria-label="Score component contributions"><thead className="border-b border-line text-[12px] text-muted"><tr><th className="py-3 pr-4">Pillar</th><th className="px-3 py-3 text-right">Base weight</th><th className="px-3 py-3 text-right">Applied weight</th><th className="px-3 py-3 text-right">Percentile</th><th className="py-3 pl-3 text-right">Contribution</th></tr></thead><tbody className="divide-y divide-line">{SCORE_PILLARS.map((pillar) => {
        const score = pillarValue(data.component_scores, pillar.key), weight = number(weights[pillar.key]);
        return <tr key={pillar.key}><td className="py-3 pr-4 text-ink-soft">{pillar.label}{score == null && <span className="ml-2 text-[11px] text-brand">Unavailable</span>}</td><td className="px-3 py-3 text-right font-numeric text-muted">{(pillar.weight * 100).toFixed(0)}%</td><td className="px-3 py-3 text-right font-numeric text-ink-soft">{weight == null ? "—" : `${(weight * 100).toFixed(1)}%`}</td><td className="px-3 py-3 text-right font-numeric text-ink-soft">{score?.toFixed(1) ?? "—"}</td><td className="py-3 pl-3 text-right font-numeric text-info">{score == null || weight == null ? "—" : (score * weight).toFixed(1)}</td></tr>;
      })}</tbody></table></div>
    </details>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-[12px] leading-relaxed text-muted"><p className="max-w-3xl"><Scale className="mr-1 inline h-3.5 w-3.5 text-info" />Coverage measures data weight, rather than statistical confidence. Partial scores are normalized over available pillars. Percentiles use peers with data for each pillar; ranking uses only complete scores. {number(sensitivity.tested_configurations) != null ? `${sensitivity.tested_configurations} configurations, including the baseline, were tested; the range is not a confidence interval.` : "Sensitivity is unavailable for this run."} Displayed contributions are rounded.</p><Link href="/methodology#score" className="inline-flex shrink-0 items-center gap-1 font-medium text-info">Methodology<ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
  </section>;
}
