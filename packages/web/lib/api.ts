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
import { englishDataset } from "./presentation";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Client side: use rewrite or current origin
    return "";
  }
  // Server side: direct connection to API
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
};

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

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
      signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    if (!res.ok) {
      const message = res.status === 404
        ? "The requested data is unavailable. Choose another issuer or check data coverage."
        : res.status === 429
        ? "Too many requests. Wait a moment and try again."
        : res.status === 422
        ? "Invalid parameters. Check the simulation values and try again."
        : "Sectors data could not be loaded. Check the API connection and the published dataset.";
      throw new ApiError(message, res.status);
    }

    return englishDataset<T>(await res.json());
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ApiError("The request timed out. Try again once the connection is stable.");
    }
    throw new ApiError("The API could not be reached. Check the connection and try again.");
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
  simulateScenario: (shock: ScenarioShockRequest, signal?: AbortSignal) =>
    fetchAPI<ScenarioResponse>("/v1/scenario", {
      method: "POST",
      body: JSON.stringify(shock),
      cache: "no-store",
      signal,
    }),

  // Flow & Divergence
  getFlowOverlay: () => fetchAPI<FlowOverlayResponse>("/v1/flow-overlay"),

  // Data Coverage & Audit
  getCoverage: () => fetchAPI<CoverageResponse>("/v1/coverage"),

  // Health
  checkHealth: () => fetchAPI<{ status: string }>("/health"),
  checkReadiness: () => fetchAPI<{ status: string; published_run_id?: string | null }>("/ready"),
};
