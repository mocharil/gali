import { NextResponse } from "next/server";
import { checkGeminiConnection } from "@/lib/ai/server/service";
import { geminiStatus } from "@/lib/ai/server/config";
import { AI_HEADERS, aiErrorResponse, checkOrigin } from "@/lib/ai/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await checkGeminiConnection(AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]));
    return NextResponse.json(await geminiStatus(), { headers: AI_HEADERS });
  } catch (error) { return aiErrorResponse(error); }
}
