/**
 * Thin aliases over the generated OpenAPI schema (lib/schema.ts).
 *
 * lib/schema.ts is generated from packages/api/openapi.json via `pnpm gen:api` --
 * never hand-edit it, never hand-duplicate its shapes here. A hand-typed copy of
 * an API response drifted from reality once already in this project (the scenario
 * engine bug); this file exists so it can't happen again in the frontend.
 */
import type { components } from "./schema";

export type IssuerSummary = components["schemas"]["IssuerSummary"];
export type IssuerDetail = components["schemas"]["IssuerDetail"];
export type IssuerGraph = components["schemas"]["IssuerGraphResponse"];
export type GraphNode = components["schemas"]["GraphNode"];
export type GraphEdge = components["schemas"]["GraphEdge"];
export type LinkedOperatingEntity = components["schemas"]["LinkedOperatingEntity"];

export type GeoJSONFeatureCollection = components["schemas"]["GeoJSONFeatureCollection"];
export type GeoJSONFeature = components["schemas"]["GeoJSONFeature"];
export type MiningSiteProperties = components["schemas"]["MiningSiteProperties"];

export type RankingsResponse = components["schemas"]["RankingsResponse"];
export type RankingItem = components["schemas"]["RankingItem"];

export type CostCurveResponse = components["schemas"]["CostCurveResponse"];
export type CostCurvePoint = components["schemas"]["CostCurvePoint"];

export type ScenarioShockRequest = components["schemas"]["ScenarioShockRequest"];
export type ScenarioResponse = components["schemas"]["ScenarioResponse"];
export type IssuerScenarioImpact = components["schemas"]["IssuerScenarioImpactSchema"];

export type FlowOverlayResponse = components["schemas"]["FlowOverlayResponse"];
export type IssuerFlowItem = components["schemas"]["IssuerFlowItem"];

export type CoverageResponse = components["schemas"]["DataCoverageResponse"];
export type CoverageItem = components["schemas"]["CoverageItem"];

export type HealthResponse = components["schemas"]["HealthResponse"];
export type ReadyResponse = components["schemas"]["ReadyResponse"];

/** UI-only helper: is this issuer's data complete enough to trust headline metrics? */
export function isFullyQualified(issuer: Pick<IssuerSummary, "data_quality">): boolean {
  return issuer.data_quality === "LENGKAP";
}
