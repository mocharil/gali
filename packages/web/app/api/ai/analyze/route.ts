import { NextResponse } from "next/server";
import { parseAiRequest } from "@/lib/ai/server/request";
import { analyzeWithGemini } from "@/lib/ai/server/service";
import { AI_HEADERS, aiErrorResponse, checkOrigin, readAnalysisBody } from "@/lib/ai/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = parseAiRequest(await readAnalysisBody(request));
    return NextResponse.json(await analyzeWithGemini(input, AbortSignal.any([request.signal, AbortSignal.timeout(55_000)])), { headers: AI_HEADERS });
  } catch (error) { return aiErrorResponse(error); }
}
