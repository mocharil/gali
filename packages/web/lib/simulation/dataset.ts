import source from "./dataset.json";
import { compareScores, isScoreRankable, scoreRanks } from "../scores";
import type { CostCurveResponse, CoverageResponse, FlowOverlayResponse, GeoJSONFeatureCollection, IssuerDetail, IssuerGraph, IssuerSummary, RankingsResponse } from "../types";
import { simulateScenario, type ScenarioBaseInput } from "./scenario";

interface SimulationDataset {
  meta: { mode: "simulation"; source_type: "synthetic"; as_of: string; version: string; label: string; description: string; issuer_count: number; operator_count: number; site_count: number; license_count: number };
  issuers: IssuerSummary[];
  details: Record<string, IssuerDetail>;
  graphs: Record<string, IssuerGraph>;
  sites: GeoJSONFeatureCollection;
  coverage: CoverageResponse;
  cost_curve: CostCurveResponse;
  flow_overlay: FlowOverlayResponse;
  scenario_inputs: ScenarioBaseInput[];
}
export const simulationDataset = source as unknown as SimulationDataset;

export function datasetMode(): "simulation" | "sectors" {
  const mode = process.env.GALI_DATA_MODE ?? "sectors";
  if (mode !== "sectors" && mode !== "simulation") throw new Error("GALI_DATA_MODE must be sectors or simulation");
  return mode;
}

export function datasetStatus() {
  return datasetMode() === "simulation"
    ? { mode: "simulation" as const, as_of: source.meta.as_of, version: source.meta.version, source_type: "synthetic" as const }
    : { mode: "sectors" as const, as_of: null, version: null, source_type: "sectors" as const };
}

export function simulationResponse(path: string, url: URL, method: string, body?: unknown): { status: number; body: unknown } {
  const ok = (body: unknown) => ({ status: 200, body });
  const invalid = (detail: string) => ({ status: 422, body: { detail } });
  if (method === "GET") {
    if (path === "/dataset") return ok({ ...simulationDataset.meta });
    if (path === "/health") return ok({ status: "ok", data_mode: "simulation" });
    if (path === "/ready") return ok({ status: "ready", published_run_id: source.meta.version, data_mode: "simulation", source_type: "synthetic" });
    if (path === "/v1/issuers") return ok(simulationDataset.issuers);
    const issuer = /^\/v1\/issuers\/([A-Za-z0-9]+)(\/graph)?$/.exec(path);
    if (issuer) {
      const symbol = issuer[1].toUpperCase();
      const data = issuer[2] ? simulationDataset.graphs[symbol] : simulationDataset.details[symbol];
      return data ? ok(data) : { status: 404, body: { detail: "The issuer is unavailable in the dataset." } };
    }
    if (path === "/v1/sites") return ok(simulationDataset.sites);
    if (path === "/v1/flow-overlay") return ok(simulationDataset.flow_overlay);
    if (path === "/v1/coverage") return ok(simulationDataset.coverage);
    if (path === "/v1/cost-curve") return url.searchParams.get("commodity") && url.searchParams.get("commodity") !== "Coal" ? invalid("commodity must be Coal.") : ok(simulationDataset.cost_curve);
    if (path === "/v1/rankings") {
      const keys = ["ground_truth_score", "rli_years", "reserve_backed_value_usd", "cash_cost_per_ton_usd", "license_cliff_3y", "rbv_gap_pct"] as const;
      const metric = url.searchParams.get("metric") ?? "ground_truth_score";
      if (!keys.includes(metric as typeof keys[number])) return invalid("The ranking metric is not supported.");
      const field = metric as typeof keys[number];
      const ascending = ["cash_cost_per_ton_usd", "license_cliff_3y"].includes(metric);
      const available = simulationDataset.issuers.filter((row) => row[field] != null);
      const ranks = scoreRanks(simulationDataset.issuers);
      const items = available.sort((a, b) => field === "ground_truth_score" ? compareScores(a, b) : (ascending ? a[field]! - b[field]! : b[field]! - a[field]!) || a.symbol.localeCompare(b.symbol)).map((row) => {
        const value = row[field]!;
        const formatted_value = field === "ground_truth_score" ? `${value.toFixed(1)} / 100` : field === "rli_years" ? `${value.toFixed(1)} yrs` : field === "reserve_backed_value_usd" ? `$${(value / 1e9).toFixed(2)}B` : field === "cash_cost_per_ton_usd" ? `$${value.toFixed(2)} / ton` : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
        const eligible = field !== "ground_truth_score" || isScoreRankable(row);
        const rank = field === "ground_truth_score" ? ranks.get(row.symbol) ?? null : 1 + available.filter((other) => ascending ? other[field]! < value : other[field]! > value).length;
        return { rank, ranking_status: eligible ? "complete" : "provisional", symbol: row.symbol, name: row.name, data_quality: row.data_quality, metric_value: value, formatted_value, confidence_pct: row.confidence_pct };
      });
      return ok({ metric, run_id: source.meta.version, items } satisfies RankingsResponse);
    }
  }
  if (path === "/v1/scenario" && method === "POST") return ok(simulateScenario(simulationDataset.scenario_inputs, body));
  return { status: method === "GET" || method === "POST" ? 404 : 405, body: { detail: "The endpoint is unavailable." } };
}
