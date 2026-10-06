import "server-only";
import { AiError, type AiAnswer, type AiEvidence, type AiRequest } from "../types";
import { AI_METHOD_LABELS } from "../presentation";
import type { IssuerDetail, IssuerSummary, ScenarioResponse, ScenarioShockRequest } from "../../types";
import { isScoreRankable } from "../../scores";
import { datasetStatus } from "../../simulation/dataset";
import { DRIVER_LABELS } from "../../research";
import { loadServerData, type DataLoader } from "./data";

export interface GroundingContext {
  snapshot: AiAnswer["snapshot"];
  evidence: AiEvidence[];
  orderings: Record<string, string[]>;
  warnings: string[];
}

type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData => value && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const boundedText = (value: unknown, fallback = "Unavailable") => typeof value === "string" && value.trim() ? value.replace(/[\u0000-\u001f]/g, " ").slice(0, 600) : fallback;
const formatNumber = (value: number, digits: number) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
type Unit = "usd" | "usd_per_ton" | "pct" | "years" | "score" | "count" | "number";
function formatted(value: number | null, unit: Unit): string {
  if (value == null) return "Unavailable";
  const suffix: Record<Unit, string> = { usd: "", usd_per_ton: " USD/ton", pct: "%", years: " years", score: " / 100", count: "", number: "" };
  return unit === "usd" ? `USD ${formatNumber(value, 2)}` : `${formatNumber(value, unit === "count" ? 0 : 2)}${suffix[unit]}`;
}

const SUMMARY_FIELDS: { field: keyof IssuerSummary; label: string; unit: Unit }[] = [
  { field: "ground_truth_score", label: "Fundamental score", unit: "score" },
  { field: "confidence_pct", label: "Score weight coverage", unit: "pct" },
  { field: "rli_years", label: "Reserve life", unit: "years" },
  { field: "cash_cost_per_ton_usd", label: "Cash cost", unit: "usd_per_ton" },
  { field: "license_cliff_3y", label: "Licensed area expiring within three years", unit: "pct" },
  { field: "reserve_backed_value_usd", label: "Modeled reserve-backed value", unit: "usd" },
  { field: "market_cap_usd", label: "Market capitalization", unit: "usd" },
  { field: "rbv_gap_pct", label: "Market cap gap versus modeled RBV", unit: "pct" },
  { field: "top_destination_pct", label: "Largest destination's sales volume share", unit: "pct" },
];
const DETAIL_FIELDS: { field: keyof IssuerDetail; label: string; unit: Unit }[] = [
  { field: "realized_price_per_ton_usd", label: "Realized selling price", unit: "usd_per_ton" },
  { field: "unit_margin_usd", label: "Unit margin", unit: "usd_per_ton" },
  { field: "breakeven_benchmark_price_usd", label: "Break-even benchmark price", unit: "usd_per_ton" },
  { field: "destination_hhi", label: "Destination concentration index", unit: "number" },
  { field: "contractor_hhi", label: "Contractor concentration index", unit: "number" },
  { field: "contract_cliff_12m", label: "Contracts expiring within the next year", unit: "pct" },
  { field: "attributable_gross_profit_usd", label: "Attributable gross profit", unit: "usd" },
  { field: "license_cliff_1y", label: "Licensed area expiring within one year", unit: "pct" },
  { field: "license_cliff_5y", label: "Licensed area expiring within five years", unit: "pct" },
  { field: "cnc_coverage_pct", label: "Clean-and-clear license coverage", unit: "pct" },
];
const BASELINE: ScenarioShockRequest = { price_shock_pct: 0, discount_rate: .12, variable_cost_share: .65, destination_shocks: {}, license_cliff_expiry_shock: false };
const STANDARD_TESTS: { key: string; label: string; params: ScenarioShockRequest }[] = [
  { key: "price", label: "Separate price-pressure test", params: { ...BASELINE, price_shock_pct: -.2 } },
  { key: "china", label: "Separate China-demand test", params: { ...BASELINE, destination_shocks: { China: .3 } } },
  { key: "license", label: "Separate license-expiry test", params: { ...BASELINE, license_cliff_expiry_shock: true } },
];

export async function buildGroundingContext(request: AiRequest, signal: AbortSignal, load: DataLoader = loadServerData): Promise<GroundingContext> {
  const status = datasetStatus();
  const ready = record(await load("/ready", undefined, signal));
  const loaded = await load("/v1/issuers", undefined, signal);
  if (!Array.isArray(loaded) || !loaded.length || loaded.length > 250 || loaded.some((item) => !/^[A-Z0-9]{1,12}$/.test(record(item).symbol as string))) {
    throw new AiError("The active issuer dataset is empty or invalid. Check data coverage before requesting AI analysis.", "AI_DATA_UNAVAILABLE", 503);
  }
  const issuers = loaded as IssuerSummary[];
  const requested = request.symbols ?? [];
  if (requested.some((symbol) => !issuers.some((issuer) => issuer.symbol === symbol))) throw new AiError("An issuer in your selection is unavailable in the active dataset.", "AI_UNKNOWN_ISSUER", 422);
  const mentions = (text: string) => issuers.filter((issuer) => new RegExp(`\\b${issuer.symbol}\\b`, "i").test(text)).map((issuer) => issuer.symbol);
  const latest = mentions(request.question);
  const historical = mentions((request.history ?? []).filter((message) => message.role === "user").slice(-2).map((message) => message.content).join(" "));
  const focus = [...new Set([...requested, ...latest, ...historical])].slice(0, 4);
  const detailSymbols = focus.length ? focus : [issuers[0].symbol];
  const details = await Promise.all(detailSymbols.map(async (symbol) => {
    const detail = record(await load(`/v1/issuers/${symbol}`, undefined, signal));
    if (detail.symbol !== symbol || typeof detail.run_id !== "string" || typeof detail.as_of !== "string") throw new AiError("Issuer evidence is incomplete. Check the data publication before requesting AI analysis.", "AI_DATA_UNAVAILABLE", 503);
    return detail as unknown as IssuerDetail;
  }));
  const run = typeof ready.published_run_id === "string" ? ready.published_run_id : status.version;
  if (details.some((detail) => detail.run_id !== (run ?? details[0].run_id) || detail.as_of !== details[0].as_of)) {
    throw new AiError("The active data publication changed or contains mixed snapshots. Refresh the dataset and try again.", "AI_SNAPSHOT_CHANGED", 503);
  }
  const snapshot: GroundingContext["snapshot"] = { as_of: details[0].as_of, run_id: run ?? details[0].run_id, source_type: boundedText(record(details[0].evidence).source_type, status.source_type), scope: focus.length ? focus : issuers.map((issuer) => issuer.symbol) };
  const evidence: AiEvidence[] = [];
  const add = (id: string, label: string, raw: AiEvidence["raw_value"], value: string, href: string, source: string, quality: AiEvidence["quality"] = "complete") => {
    evidence.push({ id, label, raw_value: raw, value, href, source, quality, as_of: snapshot.as_of, run_id: snapshot.run_id });
  };
  const metric = (id: string, label: string, value: unknown, unit: Unit, href: string, source: string, quality: AiEvidence["quality"]) => {
    const raw = number(value); add(id, label, raw, formatted(raw, unit), href, source, raw == null ? "partial" : quality);
  };
  add("dataset.snapshot", "Active dataset snapshot", snapshot.as_of, snapshot.as_of ?? "See issuer Evidence", "/coverage", "GET /api/v1/issuers and issuer Evidence");
  add("dataset.scope", "Issuer universe size", issuers.length, String(issuers.length), "/coverage", "GET /api/v1/issuers");
  const completeScores = issuers.filter(isScoreRankable);
  add("dataset.rankable", "Issuers eligible for complete score ranking", completeScores.length, String(completeScores.length), "/methodology", "GALI score eligibility rules");
  for (const issuer of issuers) {
    const quality = issuer.data_quality !== "LENGKAP" ? "partial" : isScoreRankable(issuer) ? "complete" : "provisional";
    for (const item of SUMMARY_FIELDS) metric(`${issuer.symbol}.${item.field}`, `${issuer.symbol} · ${item.label}`, issuer[item.field], item.unit, `/issuer/${issuer.symbol}`, `GET /api/v1/issuers · ${item.field}`, quality);
    add(`${issuer.symbol}.ranking_status`, `${issuer.symbol} · Score ranking status`, quality, quality, `/issuer/${issuer.symbol}`, "GALI complete/provisional score eligibility", quality);
    add(`${issuer.symbol}.top_destination`, `${issuer.symbol} · Largest sales destination`, boundedText(issuer.top_destination), boundedText(issuer.top_destination), `/issuer/${issuer.symbol}`, "GET /api/v1/issuers · top_destination", quality);
  }
  for (const detail of details) {
    // An unrelated issuer is loaded only to identify the publication, not to bias a universe question.
    if (!focus.includes(detail.symbol)) continue;
    const quality = detail.data_quality === "LENGKAP" ? "complete" : "partial";
    for (const item of DETAIL_FIELDS) metric(`${detail.symbol}.${item.field}`, `${detail.symbol} · ${item.label}`, detail[item.field], item.unit, `/issuer/${detail.symbol}`, `GET /api/v1/issuers/${detail.symbol} · ${item.field}`, quality);
    for (const [pillar, value] of Object.entries(detail.component_scores ?? {})) metric(`${detail.symbol}.pillar.${pillar}`, `${detail.symbol} · ${pillar.replaceAll("_", " ")} score`, value, "score", `/issuer/${detail.symbol}`, "GALI component scores", quality);
    const provenance = record(record(detail.evidence).provenance);
    for (const [field, label] of [["financial_years", "Financial reporting periods"], ["performance_years", "Operating reporting periods"]]) {
      const years = [...new Set(Object.values(record(provenance[field])).filter((year) => typeof year === "number" && Number.isInteger(year)))];
      if (years.length) add(`${detail.symbol}.${field}`, `${detail.symbol} · ${label}`, years.join(", "), years.join(", "), `/issuer/${detail.symbol}`, "Issuer Evidence · reporting periods", quality);
    }
    const rbvWarnings = record(provenance.rbv_model).warnings;
    if (Array.isArray(rbvWarnings) && rbvWarnings.length) add(`${detail.symbol}.input_limits`, `${detail.symbol} · RBV input limitations`, boundedText(rbvWarnings.join(" ")), boundedText(rbvWarnings.join(" ")), `/issuer/${detail.symbol}`, "Issuer Evidence · RBV model limitations", "partial");
  }
  const methods: Record<string, string> = {
    reserve_life: "Reserve life divides attributable reserves by annual production. It does not guarantee operating life or license renewal.",
    rbv: "RBV is a capped finite annuity of gross profit. It excludes overhead, tax, capex, working capital, and the debt/cash bridge. It is not free cash flow, fair equity value, or a share-price target.",
    score: "Scores are relative to the active peer universe. Only issuers with every required score pillar and full score weight coverage receive a complete score rank. Data weight coverage is not statistical confidence or a probability.",
    license: "License expiry exposure is linked licensed-area share, not a probability of failed renewal and not a site-level production weight. Missing dates and unlinked licenses do not establish absence of risk.",
    destination: "Destination percentages describe reported sales volume, not revenue share. Demand reductions simulate destination volume, not tariffs. The largest destination is not necessarily China.",
    scenario: "Price changes act on revenue; fixed costs remain when volume falls. Without reconciled revenue and cost inputs, gross profit scales directly and the proxy is identified. RBV has a zero floor while gross losses remain visible.",
    attribution: "Scenario driver order is price, volume, license life, then discount rate. Interactions belong to the driver applied later. Separate stress tests cannot be added to estimate a combined shock.",
    sensitivity: "The sensitivity range varies price and discount-rate assumptions while holding other active parameters fixed. It is not a probability, forecast, or confidence interval.",
    ownership: "Aggregating issuer models may double-count shared operating entities. An issuer-model sum is not an industry total or an investable portfolio.",
    scope: "The assistant uses the active GALI dataset and its deterministic calculations. It does not browse news, retrieve current market prices, or produce buy/sell instructions. Unsupported information must be identified as unavailable.",
  };
  for (const [key, text] of Object.entries(methods)) add(`method.${key}`, AI_METHOD_LABELS[key], text, text, "/methodology", "GALI model methodology", "methodology");
  const tests = request.scenario ? [{ key: "active", label: "Active scenario", params: request.scenario }] : request.mode === "brief" ? STANDARD_TESTS : [];
  const scenarios = await Promise.all(tests.map(async (test) => ({ ...test, response: await load("/v1/scenario", test.params, signal) as ScenarioResponse })));
  for (const test of scenarios) {
    if (!Array.isArray(test.response.impacts)) throw new AiError("Scenario evidence is invalid. Recalculate the scenario before requesting AI analysis.", "AI_DATA_UNAVAILABLE", 503);
    const prefix = `scenario.${test.key}`;
    const href = `/scenario?price=${test.params.price_shock_pct ?? 0}&rate=${test.params.discount_rate ?? .12}&variable=${test.params.variable_cost_share ?? .65}&cliff=${test.params.license_cliff_expiry_shock ? 1 : 0}${Object.entries(test.params.destination_shocks ?? {}).map(([country, shock]) => `&${encodeURIComponent(country.toLowerCase())}=${shock}`).join("")}`;
    const source = `POST /api/v1/scenario · ${test.label}`;
    metric(`${prefix}.price`, `${test.label} · Price change assumption`, (test.params.price_shock_pct ?? 0) * 100, "pct", href, source, "complete");
    metric(`${prefix}.discount`, `${test.label} · Discount rate assumption`, (test.params.discount_rate ?? .12) * 100, "pct", href, source, "complete");
    metric(`${prefix}.variable_cost`, `${test.label} · Variable-cost share assumption`, (test.params.variable_cost_share ?? .65) * 100, "pct", href, source, "complete");
    add(`${prefix}.license`, `${test.label} · No renewal assumption`, test.params.license_cliff_expiry_shock ?? false, test.params.license_cliff_expiry_shock ? "Applied to linked licensed area expiring within three years" : "Not applied", href, source);
    for (const [country, shock] of Object.entries(test.params.destination_shocks ?? {})) metric(`${prefix}.demand.${country.replace(/[^a-z0-9]/gi, "_")}`, `${test.label} · ${country} volume reduction assumption`, shock * 100, "pct", href, source, "complete");
    const eligible = test.response.impacts.filter((row) => !row.is_partial && number(row.baseline_rbv_usd) !== null && issuers.some((issuer) => issuer.symbol === row.symbol && issuer.data_quality === "LENGKAP"));
    const baseline = eligible.reduce((sum, row) => sum + (number(row.baseline_rbv_usd) ?? 0), 0);
    const delta = eligible.reduce((sum, row) => sum + (number(row.delta_rbv_usd) ?? 0), 0);
    metric(`${prefix}.aggregate_change_pct`, `${test.label} · Complete-core issuer-model aggregate change`, eligible.length && baseline > 0 ? delta / baseline * 100 : null, "pct", href, source, "complete");
    metric(`${prefix}.aggregate_delta_usd`, `${test.label} · Complete-core issuer-model aggregate change`, eligible.length ? delta : null, "usd", href, source, "complete");
    metric(`${prefix}.aggregate_count`, `${test.label} · Eligible complete-core issuer models in aggregate`, eligible.length, "count", href, source, "complete");
    for (const impact of test.response.impacts) {
      if (focus.length && !focus.includes(impact.symbol)) continue;
      const quality = impact.is_partial ? "partial" : "complete";
      const rowPrefix = `${prefix}.${impact.symbol}`;
      const issuerHref = `${href}&issuer=${encodeURIComponent(impact.symbol)}`;
      metric(`${rowPrefix}.change_pct`, `${impact.symbol} · ${test.label} · RBV change`, impact.delta_rbv_pct, "pct", issuerHref, source, quality);
      if (!focus.includes(impact.symbol)) continue;
      for (const [field, label] of [["baseline_rbv_usd", "Baseline RBV"], ["post_shock_rbv_usd", "Scenario RBV"], ["delta_rbv_usd", "RBV change"], ["post_shock_gp_usd", "Scenario gross profit"], ["post_shock_revenue_usd", "Scenario revenue"], ["post_shock_cost_usd", "Scenario costs"], ["gross_loss_usd", "Scenario gross loss"]] as const) metric(`${rowPrefix}.${field}`, `${impact.symbol} · ${label}`, impact[field], "usd", issuerHref, source, quality);
      metric(`${rowPrefix}.break_even`, `${impact.symbol} · Price change at zero gross profit`, impact.break_even_price_change_pct, "pct", issuerHref, source, quality);
      metric(`${rowPrefix}.volume_risk`, `${impact.symbol} · Volume at risk`, impact.volume_at_risk_pct, "pct", issuerHref, source, quality);
      add(`${rowPrefix}.basis`, `${impact.symbol} · Scenario model basis`, impact.model_basis ?? "Unavailable", impact.model_basis === "revenue_cost" ? "Reconciled revenue and costs" : impact.model_basis === "gross_profit_proxy" ? "Gross profit proxy" : "Unavailable", issuerHref, source, quality);
      if (impact.warnings?.length) add(`${rowPrefix}.warnings`, `${impact.symbol} · Scenario input limitations`, boundedText(impact.warnings.join(" ")), boundedText(impact.warnings.join(" ")), issuerHref, source, "partial");
      for (const driver of impact.drivers ?? []) metric(`${rowPrefix}.driver.${driver.key}`, `${impact.symbol} · ${DRIVER_LABELS[driver.key] ?? driver.key} contribution to RBV change`, driver.delta_rbv_usd, "usd", issuerHref, source, quality);
      if (impact.sensitivity?.length) {
        metric(`${rowPrefix}.sensitivity_low`, `${impact.symbol} · Lowest tested RBV change`, Math.min(...impact.sensitivity.map((item) => item.delta_rbv_pct)), "pct", issuerHref, source, quality);
        metric(`${rowPrefix}.sensitivity_high`, `${impact.symbol} · Highest tested RBV change`, Math.max(...impact.sensitivity.map((item) => item.delta_rbv_pct)), "pct", issuerHref, source, quality);
      }
    }
  }
  const after = record(await load("/ready", undefined, signal));
  if (ready.published_run_id !== after.published_run_id) throw new AiError("The active data publication changed during analysis. Refresh and try again.", "AI_SNAPSHOT_CHANGED", 503);
  const orderings: GroundingContext["orderings"] = {};
  for (const [field, ascending] of [["ground_truth_score", false], ["rli_years", false], ["cash_cost_per_ton_usd", true], ["license_cliff_3y", false], ["top_destination_pct", false]] as const) {
    orderings[field] = issuers.filter((issuer) => number(issuer[field]) !== null && (field !== "ground_truth_score" || isScoreRankable(issuer))).sort((a, b) => (ascending ? a[field]! - b[field]! : b[field]! - a[field]!) || a.symbol.localeCompare(b.symbol)).map((issuer) => issuer.symbol);
  }
  if (evidence.length > 800 || JSON.stringify(evidence).length > 240_000) throw new AiError("The evidence scope is too large. Select a few issuers and try again.", "AI_CONTEXT_LIMIT", 422);
  return { snapshot, evidence, orderings, warnings: ["All numbers must come from evidence placeholders. Missing values remain unavailable.", "Claims must distinguish observations, scenario assumptions, and analytical interpretations."] };
}
