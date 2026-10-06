import { NextRequest, NextResponse } from "next/server";
import { datasetMode, simulationResponse } from "@/lib/simulation/dataset";
import { InvalidScenario } from "@/lib/simulation/scenario";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path: parts } = await context.params;
  const path = `/${parts.join("/")}`;
  if (datasetMode() === "simulation") {
    try {
      const body = request.method === "POST" ? await request.json() : undefined;
      const result = simulationResponse(path, request.nextUrl, request.method, body);
      return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store", "X-GALI-Data-Source": "synthetic", "X-GALI-Data-Mode": "simulation" } });
    } catch (error) {
      if (error instanceof InvalidScenario || error instanceof SyntaxError) return NextResponse.json({ detail: error.message }, { status: 422 });
      console.error("Simulation endpoint failed", error);
      return NextResponse.json({ detail: "The local dataset could not be processed." }, { status: 500 });
    }
  }
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const destination = new URL(`${base.replace(/\/$/, "")}${path}`);
  destination.search = request.nextUrl.search;
  try {
    const response = await fetch(destination, { method: request.method, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: request.method === "POST" ? await request.text() : undefined, signal: AbortSignal.timeout(20_000), cache: "no-store" });
    const headers = new Headers({ "Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store", "X-GALI-Data-Mode": "sectors" });
    for (const name of ["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
    return new Response(await response.arrayBuffer(), { status: response.status, headers });
  } catch {
    return NextResponse.json({ detail: "The Sectors backend could not be reached. Live data mode does not substitute synthetic data." }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;
