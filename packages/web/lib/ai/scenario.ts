import type { ScenarioShockRequest } from "../types";

/** Mirrors the parameters represented by Scenario Studio's shareable URL. */
export function scenarioFromUrl(url: URL): ScenarioShockRequest | undefined {
  if (url.pathname !== "/scenario") return;
  const bounded = (key: string, min: number, max: number, fallback: number) => {
    const value = url.searchParams.get(key);
    const number = value === null ? fallback : Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const countries = ["China", "India", "Indonesia", "Japan", "Korea", "Philippines", "Malaysia"];
  return {
    price_shock_pct: bounded("price", -.5, .5, 0), discount_rate: bounded("rate", .01, .5, .12), variable_cost_share: bounded("variable", 0, 1, .65),
    license_cliff_expiry_shock: ["1", "true"].includes(url.searchParams.get("cliff") ?? ""),
    destination_shocks: Object.fromEntries(countries.map((country) => [country, bounded(country.toLowerCase(), 0, .5, 0)]).filter(([, shock]) => Number(shock) > 0)),
  };
}
