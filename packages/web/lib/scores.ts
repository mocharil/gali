import type { IssuerSummary } from "./types";

/** These keys match gali_core.metrics.score.BASE_WEIGHTS. Missing pillars stay null. */
export const SCORE_PILLARS = [
  { key: "rli", label: "Reserve life", weight: .25 },
  { key: "license_cliff_3y", label: "Licenses", weight: .20 },
  { key: "cost_curve_percentile", label: "Cost", weight: .25 },
  { key: "destination_hhi", label: "Sales destinations", weight: .15 },
  { key: "contractor_risk", label: "Contractors", weight: .15 },
] as const;

export function pillarValue(scores: Record<string, number | null> | undefined, key: string): number | null {
  const value = scores?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isScoreRankable(issuer: Pick<IssuerSummary, "data_quality" | "confidence_pct" | "ground_truth_score">): boolean {
  return issuer.data_quality === "LENGKAP" && Number.isFinite(issuer.confidence_pct) && issuer.confidence_pct >= 99.995
    && issuer.ground_truth_score != null && Number.isFinite(issuer.ground_truth_score);
}

export function compareScores(a: IssuerSummary, b: IssuerSummary): number {
  return Number(isScoreRankable(b)) - Number(isScoreRankable(a))
    || (b.ground_truth_score ?? -Infinity) - (a.ground_truth_score ?? -Infinity)
    || a.symbol.localeCompare(b.symbol);
}

/** Competition ranks: ties share a rank; provisional scores have no rank. */
export function scoreRanks(issuers: IssuerSummary[]): Map<string, number> {
  const peers = issuers.filter(isScoreRankable);
  return new Map(peers.map((issuer) => [issuer.symbol, 1 + peers.filter((other) => other.ground_truth_score! > issuer.ground_truth_score!).length]));
}
