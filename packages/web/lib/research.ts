import type { IssuerScenarioImpact, ScenarioShockRequest } from "./types";

export const DRIVER_LABELS: Record<string, string> = {
  baseline_basis: "Baseline reconciliation", price: "Price", volume: "Sales destination volume", license: "License life", discount: "Discount rate",
};
const pct = (value: number | null | undefined) => value == null ? "Unmeasured" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
const money = (value: number | null | undefined) => value == null ? "Unmeasured" : `USD ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Narrative facts come only from the calculated response, with explicit limits. */
export function scenarioBrief(impact: IssuerScenarioImpact, params: ScenarioShockRequest, dataset: { source_type: string; as_of: string | null; version: string | null }): string {
  const drivers = impact.drivers ?? [];
  const strongest = [...drivers].filter((driver) => driver.key !== "baseline_basis").sort((a, b) => Math.abs(b.delta_rbv_usd) - Math.abs(a.delta_rbv_usd))[0];
  const sensitivity = impact.sensitivity ?? [];
  const low = sensitivity.length ? Math.min(...sensitivity.map((point) => point.delta_rbv_pct)) : null;
  const high = sensitivity.length ? Math.max(...sensitivity.map((point) => point.delta_rbv_pct)) : null;
  return [
    `# GALI Research Brief / ${impact.symbol}`,
    `Dataset source: ${dataset.source_type}. Snapshot: ${dataset.as_of ?? "see issuer Evidence"}. Run: ${dataset.version ?? "see issuer Evidence"}.`,
    "", "## Model findings",
    impact.is_partial ? "RBV cannot be calculated because reserve or gross profit inputs are incomplete." : `RBV changes ${pct(impact.delta_rbv_pct)}, from ${money(impact.baseline_rbv_usd)} to ${money(impact.post_shock_rbv_usd)}.`,
    strongest ? `Largest absolute contribution to change: ${DRIVER_LABELS[strongest.key] ?? strongest.key}, ${money(strongest.delta_rbv_usd)}.` : "Driver contributions are unavailable.",
    `Scenario gross profit: ${money(impact.post_shock_gp_usd)}. Revenue: ${money(impact.post_shock_revenue_usd)}. Costs: ${money(impact.post_shock_cost_usd)}.`,
    (impact.gross_loss_usd ?? 0) > 0 ? `Gross loss: ${money(impact.gross_loss_usd)}. The zero floor for RBV does not remove this loss.` : "",
    "", "## Tested assumptions",
    `Price: ${pct((params.price_shock_pct ?? 0) * 100)}. Discount rate: ${pct((params.discount_rate ?? .12) * 100)}. Variable-cost share: ${pct((params.variable_cost_share ?? .65) * 100)}.`,
    `Demand reduction: ${Object.entries(params.destination_shocks ?? {}).map(([country, shock]) => `${country} ${pct(-shock * 100)}`).join("; ") || "Not applied"}.`,
    `No renewal for licenses expiring within 3 years: ${params.license_cliff_expiry_shock ? "Yes; area share is used as a reserve-life proxy" : "No"}. Calculation basis: ${impact.model_basis}.`,
    "", "## Driver attribution",
    "Order: price → volume → licenses → discount rate. Interactions are attributed to the driver applied later; separate results are not added directly.",
    ...drivers.map((driver) => `- ${DRIVER_LABELS[driver.key] ?? driver.key}: ${money(driver.delta_rbv_usd)}; RBV after driver: ${money(driver.rbv_after_usd)}.`),
    "", "## Resilience and analytical limits",
    `Range of RBV changes across ${sensitivity.length} price/discount-rate combinations: ${pct(low)} to ${pct(high)}. Demand, variable costs, and license assumptions remain fixed; this is not a probability or confidence interval.`,
    "RBV uses a gross profit annuity, not free cash flow or fair equity value. Overhead, tax, capex, working capital, and the debt/cash bridge are not modeled.",
    ...((impact.warnings ?? []).map((warning) => `- ${warning}`)),
    "", "## Next research steps",
    "- Reconcile financial, reserve, production, and ownership periods through issuer Evidence.",
    "- Review overhead, tax, sustaining capex, working capital, debt, and cash before drawing conclusions about equity value.",
    params.license_cliff_expiry_shock ? "- Verify which licenses are linked to production and reserves; licensed area is not a production weight." : "- Verify license renewals and the sales volumes most relevant to the scenario.",
    `\nReferences: /issuer/${impact.symbol} · /methodology · /coverage.`,
  ].filter((line) => line !== undefined).join("\n");
}
