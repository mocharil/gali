import "server-only";
import { NextResponse } from "next/server";
import { AiError } from "../types";

export const AI_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new AiError("AI requests must originate from this GALI application.", "AI_ORIGIN_DENIED", 403);
  }
}

export async function readAnalysisBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AiError("Send a JSON analysis request.", "AI_INVALID_REQUEST", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AiError("An analysis question is required.", "AI_INVALID_REQUEST", 422);
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new AiError("The analysis request is too large. Shorten the question or start a new conversation.", "AI_REQUEST_TOO_LARGE", 413);
    }
    parts.push(part.value);
  }
  try { return JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new AiError("The analysis request is not valid JSON.", "AI_INVALID_REQUEST", 422); }
}

export function aiErrorResponse(error: unknown) {
  const safe = error instanceof AiError ? error : new AiError("AI analysis could not be completed. Try again after checking the server connection.", "AI_UNAVAILABLE", 503);
  // Credentials, prompts, raw provider errors, and generated content are never logged.
  return NextResponse.json({ detail: safe.message, code: safe.code }, { status: safe.status, headers: { ...AI_HEADERS, ...(safe.retryAfter ? { "Retry-After": String(safe.retryAfter) } : {}) } });
}
