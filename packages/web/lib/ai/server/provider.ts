import "server-only";
import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse, type Schema } from "@google/genai";
import { AiError } from "../types";
import { recordVerification, type GeminiConfig } from "./config";

export interface Generation { text: string; inputTokens: number | null; outputTokens: number | null }
export type Generator = (config: GeminiConfig, system: string, prompt: string, schema: Schema | undefined, signal: AbortSignal) => Promise<Generation>;
let instance: { fingerprint: string; client: GoogleGenAI } | undefined;

function clientFor(config: GeminiConfig): GoogleGenAI {
  if (instance?.fingerprint === config.fingerprint) return instance.client;
  const client = new GoogleGenAI({
    vertexai: true, project: config.project, location: config.location,
    googleAuthOptions: { credentials: config.credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] },
    httpOptions: { apiVersion: "v1", timeout: 45_000, retryOptions: { attempts: 1 } },
  });
  instance = { fingerprint: config.fingerprint, client };
  return client;
}

export function providerError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : null;
  if (status === 401 || status === 403) return new AiError("Gemini access was denied. Check the service account's Vertex AI permissions, API activation, and project billing.", "AI_ACCESS_DENIED", 503);
  if (status === 404) return new AiError("The Gemini model is unavailable in this project or location. Check the server model setting.", "AI_MODEL_UNAVAILABLE", 503);
  if (status === 429) return new AiError("Gemini is at its request limit. Wait a moment and try again.", "AI_QUOTA", 429, 60);
  if (status === 400) return new AiError("Gemini rejected the request configuration. Check model support for structured output and the selected location.", "AI_PROVIDER_REQUEST", 502);
  if (error instanceof Error && /timeout|abort/i.test(error.name)) return new AiError("The Gemini request timed out or was stopped. Try again when the connection is stable.", "AI_TIMEOUT", 504);
  return new AiError("Gemini could not be reached. Check the server connection and service account credentials, then try again.", "AI_PROVIDER_UNAVAILABLE", 503);
}

export function readGeminiResponse(response: GenerateContentResponse): Generation {
  const candidate = response.candidates?.[0];
  if (response.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY" || candidate?.finishReason === "BLOCKLIST") {
    throw new AiError("Gemini could not answer this request. Rephrase it as a question about GALI data and analysis.", "AI_BLOCKED", 422);
  }
  if (candidate?.finishReason !== "STOP" || !response.text) {
    throw new AiError("Gemini did not return a complete answer. Shorten the question or narrow it to a few issuers and try again.", "AI_INCOMPLETE", 502);
  }
  return { text: response.text, inputTokens: response.usageMetadata?.promptTokenCount ?? null, outputTokens: response.usageMetadata?.candidatesTokenCount ?? null };
}

export const generateWithGemini: Generator = async (config, system, prompt, schema, signal) => {
  try {
    const response = await clientFor(config).models.generateContent({
      model: config.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: system, abortSignal: signal,
        maxOutputTokens: schema ? 4096 : 1024,
        ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
        ...(config.model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    });
    const result = readGeminiResponse(response);
    if (signal.aborted) throw new AiError("The analysis was stopped.", "AI_ABORTED", 499);
    recordVerification(config);
    return result;
  } catch (error) { throw providerError(error); }
};
