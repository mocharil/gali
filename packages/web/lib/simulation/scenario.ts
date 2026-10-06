import type { IssuerScenarioImpact, ScenarioResponse, ScenarioShockRequest } from "../types";

export interface ScenarioBaseInput {
  symbol: string;
  rli_years: number | null;
  attributable_gross_profit_usd: number | null;
  attributable_revenue_usd: number | null;
  attributable_cost_usd: number | null;
  destinations: { country: string; pct_of_sales_volume: number }[];
  baseline_discount_rate: number;
  baseline_rbv_usd: number | null;
  license_cliff_3y: number | null;
}

export class InvalidScenario extends Error {}
const DEFAULTS = { price_shock_pct: 0, destination_shocks: {}, discount_rate: 0.12, variable_cost_share: 0.65, license_cliff_expiry_shock: false };
const money = (value: number) => Math.round(value * 100) / 100;

export function parseScenarioRequest(input: unknown): Required<ScenarioShockRequest> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new InvalidScenario("The request body must be a scenario parameter object.");
  const object = input as Record<string, unknown>;
  const number = (key: keyof typeof DEFAULTS, min: number, max: number): number => {
    const value = object[key] === undefined ? DEFAULTS[key] : object[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new InvalidScenario(`${key} must be a finite number within [${min}, ${max}].`);
    return value;
  };
  const source = object.destination_shocks === undefined ? {} : object.destination_shocks;
  if (!source || typeof source !== "object" || Array.isArray(source) || Object.keys(source).length > 50) throw new InvalidScenario("destination_shocks must be an object with at most 50 countries.");
  const destination_shocks: Record<string, number> = Object.create(null);
  for (const [country, reduction] of Object.entries(source)) {
    if (!country.trim() || country.length > 100 || typeof reduction !== "number" || !Number.isFinite(reduction) || reduction < 0 || reduction > 1) throw new InvalidScenario("A country name and a volume reduction within [0, 1] are required.");
    destination_shocks[country.trim()] = reduction;
  }
  const expiry = object.license_cliff_expiry_shock === undefined ? false : object.license_cliff_expiry_shock;
  if (typeof expiry !== "boolean") throw new InvalidScenario("license_cliff_expiry_shock must be a boolean.");
  return { price_shock_pct: number("price_shock_pct", -1, 2), discount_rate: number("discount_rate", .01, .5), variable_cost_share: number("variable_cost_share", 0, 1), destination_shocks, license_cliff_expiry_shock: expiry };
}

/** Browser-independent port of the Python engine; verified against its fixtures. */
export function simulateScenario(base: ScenarioBaseInput[], input: unknown): ScenarioResponse {
  const start = performance.now();
  const params = parseScenarioRequest(input);
  const valid = (value: number | null) => value != null && Number.isFinite(value);
  const annuity = (life: number, rate: number) => -Math.expm1(-Math.min(life, 30) * Math.log1p(rate)) / rate;
  const impacts: IssuerScenarioImpact[] = base.map((issuer) => {
    const { symbol, rli_years: rli, attributable_gross_profit_usd: gp, attributable_revenue_usd: revenue, attributable_cost_usd: costs } = issuer;
    const finance = valid(revenue) && valid(costs) && revenue! >= 0 && costs! >= 0 && valid(gp)
      && Math.abs(revenue! - costs! - gp!) <= Math.max(1, Math.abs(gp!) * 1e-6);
    const warnings: string[] = [];
    const model_basis = finance ? "revenue_cost" : "gross_profit_proxy";
    if (!finance) warnings.push("Revenue/cost breakdown unavailable or unreconciled; price and volume scale gross profit directly. Variable-cost share is not applied to this proxy.");
    if (Object.keys(params.destination_shocks).length && !issuer.destinations.length) warnings.push("Destination breakdown unavailable; destination shocks cannot be quantified.");
    if (params.license_cliff_expiry_shock && issuer.license_cliff_3y == null) warnings.push("License cliff unavailable; expiry impact cannot be quantified.");
    if (!valid(gp) || gp! <= 0 || !valid(rli) || rli! <= 0) return {
      symbol, baseline_rbv_usd: null, post_shock_rbv_usd: null, delta_rbv_usd: null, delta_rbv_pct: null,
      baseline_rank: null, post_shock_rank: null, rank_change: null, volume_at_risk_pct: 0, revenue_at_risk_usd: null,
      post_shock_gp_usd: null, is_partial: true, model_basis, warnings, post_shock_revenue_usd: null,
      post_shock_cost_usd: null, gross_loss_usd: null, break_even_price_change_pct: null, drivers: [], sensitivity: [],
    };
    const rate = issuer.baseline_discount_rate || .12;
    if (!Number.isFinite(rate) || rate <= 0) throw new InvalidScenario("Published baseline discount rate must be finite and positive");
    const calculatedBaseline = gp! * annuity(rli!, rate);
    const baseline = money(valid(issuer.baseline_rbv_usd) && issuer.baseline_rbv_usd! > 0 ? issuer.baseline_rbv_usd! : calculatedBaseline);
    let volumeRisk = 0;
    for (const destination of issuer.destinations) {
      const shock = Object.entries(params.destination_shocks).find(([country]) => country.trim().toLowerCase() === destination.country.trim().toLowerCase())?.[1] ?? 0;
      volumeRisk += Math.max(destination.pct_of_sales_volume || 0, 0) / 100 * shock;
    }
    volumeRisk = Math.min(volumeRisk, 1);
    const volumeFactor = 1 - volumeRisk;
    let life = rli!;
    const cliff = issuer.license_cliff_3y ?? 0;
    if (params.license_cliff_expiry_shock && cliff > 0) {
      life *= 1 - Math.min(cliff, 100) / 100;
      warnings.push("Expiry sensitivity uses licensed-area share as a reserve-life proxy; it is not a site-level production forecast.");
    }
    const grossProfit = (price: number, volume: number) => finance
      ? revenue! * (1 + price) * volume - costs! * ((1 - params.variable_cost_share) + params.variable_cost_share * volume)
      : gp! * (1 + price) * volume;
    const valuation = (price: number, volume: number, years: number, discount: number) => Math.max(grossProfit(price, volume), 0) * annuity(years, discount);
    let previous = baseline;
    let drivers: NonNullable<IssuerScenarioImpact["drivers"]> = [];
    const reconciled = money(calculatedBaseline);
    const zeroShock = params.price_shock_pct === 0 && volumeRisk === 0 && life === rli && params.discount_rate === rate;
    if (!zeroShock && Math.abs(reconciled - baseline) > .02) {
      drivers.push({ key: "baseline_basis", delta_rbv_usd: money(reconciled - previous), rbv_after_usd: reconciled });
      previous = reconciled;
      warnings.push("Published baseline differs from the gross-profit annuity; baseline basis reconciliation is shown separately.");
    }
    const states: [string, boolean, number][] = [
      ["price", params.price_shock_pct !== 0, valuation(params.price_shock_pct, 1, rli!, rate)],
      ["volume", volumeRisk !== 0, valuation(params.price_shock_pct, volumeFactor, rli!, rate)],
      ["license", life !== rli, valuation(params.price_shock_pct, volumeFactor, life, rate)],
      ["discount", params.discount_rate !== rate, valuation(params.price_shock_pct, volumeFactor, life, params.discount_rate)],
    ];
    for (const [key, changed, value] of states) {
      const after = changed ? money(value) : previous;
      drivers.push({ key, delta_rbv_usd: money(after - previous), rbv_after_usd: after });
      previous = after;
    }
    if (zeroShock) {
      previous = baseline;
      drivers = ["price", "volume", "license", "discount"].map((key) => ({ key, delta_rbv_usd: 0, rbv_after_usd: baseline }));
    }
    const postGP = grossProfit(params.price_shock_pct, volumeFactor);
    if (postGP < 0) warnings.push("Gross profit is negative. RBV has a zero floor; the gross loss remains visible and is not a free-cash-flow estimate.");
    const prices = [...new Set([-.2, -.1, 0, .1, .2].map((offset) => Number(Math.max(-1, Math.min(2, params.price_shock_pct + offset)).toFixed(6))))].sort((a, b) => a - b);
    const rates = [...new Set([-.04, 0, .04].map((offset) => Number(Math.max(.01, Math.min(.5, params.discount_rate + offset)).toFixed(6))))].sort((a, b) => a - b);
    const sensitivity = prices.flatMap((price) => rates.map((discount) => {
      const value = price === Number(params.price_shock_pct.toFixed(6)) && discount === Number(params.discount_rate.toFixed(6))
        ? previous : money(valuation(price, volumeFactor, life, discount));
      return { price_shock_pct: price, discount_rate: discount, rbv_usd: value, delta_rbv_pct: money((value - baseline) / baseline * 100) };
    }));
    const postRevenue = finance ? revenue! * (1 + params.price_shock_pct) * volumeFactor : null;
    const postCosts = finance ? costs! * ((1 - params.variable_cost_share) + params.variable_cost_share * volumeFactor) : null;
    const breakEven = finance && revenue! * volumeFactor > 0 ? (postCosts! / (revenue! * volumeFactor) - 1) * 100 : null;
    const delta = money(previous - baseline);
    return {
      symbol, baseline_rbv_usd: baseline, post_shock_rbv_usd: previous, delta_rbv_usd: delta,
      delta_rbv_pct: money(delta / baseline * 100), baseline_rank: null, post_shock_rank: null, rank_change: null,
      volume_at_risk_pct: money(volumeRisk * 100), revenue_at_risk_usd: finance ? money(revenue! * volumeRisk) : volumeRisk === 0 ? 0 : null,
      post_shock_gp_usd: money(postGP), is_partial: false, model_basis, warnings,
      post_shock_revenue_usd: postRevenue != null ? money(postRevenue) : null,
      post_shock_cost_usd: postCosts != null ? money(postCosts) : null,
      gross_loss_usd: finance ? money(Math.max(-postGP, 0)) : null,
      break_even_price_change_pct: breakEven != null ? money(breakEven) : null, drivers, sensitivity,
    };
  });
  const ranks = (field: "baseline_rbv_usd" | "post_shock_rbv_usd") => {
    const eligible = impacts.filter((row) => row[field] != null);
    return new Map(eligible.map((row) => [row.symbol, 1 + eligible.filter((other) => other[field]! > row[field]!).length]));
  };
  const baselineRanks = ranks("baseline_rbv_usd"), postRanks = ranks("post_shock_rbv_usd");
  for (const impact of impacts) {
    impact.baseline_rank = baselineRanks.get(impact.symbol) ?? null;
    impact.post_shock_rank = postRanks.get(impact.symbol) ?? null;
    impact.rank_change = impact.baseline_rank != null && impact.post_shock_rank != null ? impact.baseline_rank - impact.post_shock_rank : null;
  }
  return { params, impacts, execution_time_ms: money(performance.now() - start) };
}
