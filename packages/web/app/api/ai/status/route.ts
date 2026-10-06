import { NextResponse } from "next/server";
import { geminiStatus } from "@/lib/ai/server/config";
import { AI_HEADERS } from "@/lib/ai/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json(await geminiStatus(), { headers: AI_HEADERS });
}
