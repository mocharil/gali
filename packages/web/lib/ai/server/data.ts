import "server-only";
import { AiError } from "../types";
import { datasetMode, simulationResponse } from "../../simulation/dataset";
import { englishDataset } from "../../presentation";

export type DataLoader = (endpoint: string, body?: unknown, signal?: AbortSignal) => Promise<unknown>;

export const loadServerData: DataLoader = async (endpoint, body, signal) => {
  if (signal?.aborted) throw new AiError("The analysis was stopped.", "AI_ABORTED", 499);
  if (datasetMode() === "simulation") {
    const result = simulationResponse(endpoint, new URL(endpoint, "http://gali.internal"), body === undefined ? "GET" : "POST", body);
    if (result.status !== 200) throw new AiError("The requested GALI evidence is unavailable.", "AI_DATA_UNAVAILABLE", 503);
    return englishDataset(result.body);
  }
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}${endpoint}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error("data unavailable");
    return englishDataset(await response.json());
  } catch {
    if (signal?.aborted) throw new AiError("The analysis was stopped.", "AI_ABORTED", 499);
    throw new AiError("GALI evidence could not be loaded. Check the data connection before requesting AI analysis.", "AI_DATA_UNAVAILABLE", 503);
  }
};
