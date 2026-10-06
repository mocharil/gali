"use client";

import { AiError, type AiAnswer, type AiRequest, type AiStatus } from "./types";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/ai/${endpoint}`, {
    ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(65_000)]) : AbortSignal.timeout(65_000),
  });
  const data = await response.json();
  if (!response.ok) throw new AiError(typeof data.detail === "string" ? data.detail : "AI analysis could not be completed. Try again.", typeof data.code === "string" ? data.code : "AI_UNAVAILABLE", response.status);
  return data as T;
}

export const ai = {
  status: (signal?: AbortSignal) => request<AiStatus>("status", { signal }),
  check: (signal?: AbortSignal) => request<AiStatus>("check", { method: "POST", body: "{}", signal }),
  analyze: (input: AiRequest, signal: AbortSignal) => request<AiAnswer>("analyze", { method: "POST", body: JSON.stringify(input), signal }),
};
