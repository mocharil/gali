import type { IssuerSummary } from "./types";
import { isScoreRankable } from "./scores";

export const ANALYSIS_PROMPTS = [
  "Compare BUMI and BYAN",
  "Issuers with the lowest cash cost",
  "Longest reserve life",
  "License exposure within 3 years",
  "Market valuation vs RBV",
  "Export market concentration",
];

type Metric = "cash_cost_per_ton_usd" | "rli_years" | "license_cliff_3y" | "rbv_gap_pct" | "top_destination_pct" | "ground_truth_score";

export interface AnalysisResult {
  headline: string;
  summary: string;
  rows: { issuer: IssuerSummary; facts: { label: string; value: string }[] }[];
  notes: string[];
  action: { label: string; href: string };
}

function format(value: number | null | undefined, suffix = "", digits = 1): string {
  return value == null ? "Unavailable" : `${value.toFixed(digits)}${suffix}`;
}

/** Deterministic query routing over API data. This is deliberately not an LLM. */
export function analyzeIssuers(query: string, issuers: IssuerSummary[]): AnalysisResult {
  const q = query.trim().toLowerCase();
  const symbols = issuers.filter((i) => new RegExp(`\\b${i.symbol}\\b`, "i").test(q));
  let metric: Metric = "ground_truth_score";
  let ascending = false;
  let title = "Fundamental score overview";
  let href = "/dashboard";
  let interpretation = "The composite score is a model result based on available data, rather than a measure of investment outcome certainty.";

  if (/izin|licen[cs]e|cliff|iup|perpanjang|renewal|expir/.test(q)) {
    metric = "license_cliff_3y";
    title = "License expiry exposure within 3 years";
    interpretation = "This percentage uses linked licensed area with expiry dates. Unlinked licenses or missing dates do not establish an absence of risk.";
  } else if (/biaya|cost|krisis|tahan|anjlok|break[ -]?even/.test(q)) {
    metric = "cash_cost_per_ton_usd";
    ascending = true;
    title = "Cash cost per ton comparison";
    href = "/cost-curve";
    interpretation = "Lower cash cost can create margin headroom, but selling prices, coal quality, and volumes vary across issuers. Use Scenario Studio to test sensitivity.";
  } else if (/umur|cadangan|rli|panjang|awet|reserve|life/.test(q)) {
    metric = "rli_years";
    title = "Reserve life at the production rate";
    interpretation = "RLI divides reserves by annual production. It is an estimate at the reported production rate, not a guarantee of operating life or license renewal.";
  } else if (/valuasi|valuation|rbv|diskon|discount|murah|gap/.test(q)) {
    metric = "rbv_gap_pct";
    ascending = true;
    title = "Market capitalization gap versus modeled RBV";
    href = "/divergence";
    interpretation = "A negative gap means market cap is below modeled RBV. RBV uses gross profit and annuity assumptions, so it is not fair equity value or a transaction recommendation.";
  } else if (/ekspor|export|destination|china|tarif|konsentrasi|concentration/.test(q)) {
    metric = "top_destination_pct";
    title = "Largest sales destination concentration";
    interpretation = "The largest destination's share measures reported sales volume concentration, rather than revenue share or China exposure by default. Test demand reductions by country in Scenario Studio.";
    href = "/scenario";
  } else if (!symbols.length && !/skor|score|emiten|issuer|saham|stock|fundamental|ringkas|summary|overview|semua|all|rekomendasi|recommend|banding|compar/.test(q)) {
    return {
      headline: "Question not supported",
      summary: "This assistant supports issuer comparisons, cash cost, reserve life, licenses, RBV, and export concentration. Choose one of the example questions.",
      rows: [], notes: ["The assistant uses rules, without an LLM or invented answers to questions outside its scope."],
      action: { label: "View methodology", href: "/methodology" },
    };
  }

  const comparison = /banding|compare/.test(q) || symbols.length >= 2 || (symbols.length > 0 && / vs |versus/.test(q));
  if (comparison && symbols.length < 2) {
    return { headline: "Choose two issuers to compare", summary: "Enter two available tickers, such as BUMI and BYAN.", rows: [], notes: [], action: { label: "Open the comparison page", href: "/compare" } };
  }
  let selected = symbols.length ? symbols : issuers.filter((i) => i[metric] != null && (metric !== "ground_truth_score" || isScoreRankable(i)));
  if (!symbols.length) {
    selected = [...selected].sort((a, b) => ascending ? (a[metric] ?? Infinity) - (b[metric] ?? Infinity) : (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity)).slice(0, 3);
  }
  if (comparison) {
    title = `Comparison ${selected.map((i) => i.symbol).join(" and ")}`;
    href = `/compare?a=${selected[0].symbol}&b=${selected[1].symbol}`;
  }
  const facts = (i: IssuerSummary) => [
    { label: "Fundamental score (M8)", value: `${format(i.ground_truth_score, " / 100")} · ${isScoreRankable(i) ? "complete" : "provisional"}` },
    { label: "Score weight coverage", value: `${format(i.confidence_pct, "%")} · not statistical confidence` },
    { label: "Reserve life (M1)", value: format(i.rli_years, " years") },
    { label: "Cash cost (M4)", value: i.cash_cost_per_ton_usd == null ? "Unavailable" : `$${format(i.cash_cost_per_ton_usd, "/ton", 2)}` },
    { label: "3-year license cliff (M3)", value: format(i.license_cliff_3y, "%") },
    { label: "Gap market cap / RBV (M2)", value: format(i.rbv_gap_pct, "%") },
    { label: "Largest sales destination (M6)", value: i.top_destination ? `${i.top_destination} (${format(i.top_destination_pct, "%")})` : "Unavailable" },
  ];
  return {
    headline: title,
    summary: selected.length ? `${selected.length} issuers shown from ${issuers.length} issuers in the active dataset. ${symbols.length ? "Results follow your selected tickers." : "Ordering follows the requested metric."}` : "The requested metric is unavailable in this dataset.",
    rows: selected.map((issuer) => ({ issuer, facts: facts(issuer) })),
    notes: [interpretation, "Partial data remains identified. Missing figures are not replaced with estimates or zeros.", "GALI provides information and analysis, not investment advice or buy or sell recommendations."],
    action: { label: comparison ? "View the full comparison" : "Review analysis and sources", href },
  };
}
