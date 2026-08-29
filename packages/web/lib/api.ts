import {
  CostCurveResponse,
  CoverageResponse,
  FlowOverlayResponse,
  GeoJSONFeatureCollection,
  IssuerDetail,
  IssuerGraph,
  IssuerSummary,
  RankingsResponse,
  ScenarioResponse,
  ScenarioShockRequest,
} from "./types";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Client side: use rewrite or current origin
    return "";
  }
  // Server side: direct connection to API
  return process.env.API_URL || "http://127.0.0.1:8000";
};

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = typeof window !== "undefined" ? `/api${endpoint}` : `${base}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
      next: { revalidate: 30 }, // ISR / cache for 30s
    });

    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${res.statusText} on ${endpoint}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch from ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Issuers
  getIssuers: () => fetchAPI<IssuerSummary[]>("/v1/issuers"),
  getIssuerDetail: (symbol: string) => fetchAPI<IssuerDetail>(`/v1/issuers/${symbol.toUpperCase()}`),
  getIssuerGraph: (symbol: string) => fetchAPI<IssuerGraph>(`/v1/issuers/${symbol.toUpperCase()}/graph`),

  // Sites (GeoJSON)
  getSitesGeoJSON: () => fetchAPI<GeoJSONFeatureCollection>("/v1/sites"),

  // Rankings
  getRankings: (metric = "ground_truth_score", order = "desc", limit = 10) =>
    fetchAPI<RankingsResponse>(`/v1/rankings?metric=${metric}&order=${order}&limit=${limit}`),

  // Cost Curve
  getCostCurve: (commodity = "Coal") => fetchAPI<CostCurveResponse>(`/v1/cost-curve?commodity=${commodity}`),

  // Scenario Shock
  simulateScenario: (shock: ScenarioShockRequest) =>
    fetchAPI<ScenarioResponse>("/v1/scenario", {
      method: "POST",
      body: JSON.stringify(shock),
      cache: "no-store",
    }),

  // Flow & Divergence
  getFlowOverlay: () => fetchAPI<FlowOverlayResponse>("/v1/flow-overlay"),

  // Data Coverage & Audit
  getCoverage: () => fetchAPI<CoverageResponse>("/v1/coverage"),

  // Health
  checkHealth: () => fetchAPI<{ status: string }>("/health"),
};
