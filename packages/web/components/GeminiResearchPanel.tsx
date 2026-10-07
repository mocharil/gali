"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Square } from "lucide-react";
import type { ScenarioShockRequest } from "@/lib/types";
import { useAiRequest, useAiStatus } from "@/lib/ai/useAi";
import { AiConnection } from "./AiConnection";
import { AiAnswer } from "./AiAnswer";

export function GeminiResearchPanel({ symbols, scenario }: { symbols?: string[]; scenario?: ScenarioShockRequest }) {
  const status = useAiStatus();
  const cache = useQueryClient();
  const { answer, error, busy, ask, clear, cancel } = useAiRequest();
  const signature = JSON.stringify({ symbols, scenario });
  const request = useMemo(() => {
    const scope = JSON.parse(signature) as { symbols?: string[]; scenario?: ScenarioShockRequest };
    return { mode: "brief" as const, question: scope.scenario
      ? "Explain this issuer's active scenario: key economic drivers, counterarguments, gross-loss or margin limits, sensitivity, missing evidence, and next research steps."
      : "Write a balanced research brief on reserve-value resilience. Explain the separate price, China demand, and license tests, identify risks and counterarguments, distinguish complete and provisional scores, and suggest next research steps.", ...scope };
  }, [signature]);
  useEffect(() => { clear(); }, [signature, clear]);
  const configured = status.data?.state === "configured" || status.data?.state === "verified";
  async function generate() { const result = await ask(request); if (result) void cache.invalidateQueries({ queryKey: ["gemini-status"] }); }
  return <section className="rounded-2xl border border-info-line bg-surface p-4 sm:p-5" data-testid="gemini-research">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-xl"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-info"><Sparkles className="h-3.5 w-3.5" />AI research brief</p><h3 className="mt-2 text-lg font-semibold text-ink">Connect the numbers to the research.</h3><p className="mt-2 text-[12px] leading-relaxed text-muted">AI explains {symbols?.length ? `${symbols.join(" and ")}'s` : "the universe's"} calculated findings, risks, and next steps with references to GALI evidence.</p></div><div className="flex flex-wrap gap-2">{busy ? <button type="button" onClick={cancel} className="gali-button gali-button-secondary"><Square className="h-3.5 w-3.5" />Stop analysis</button> : <button type="button" onClick={() => void generate()} disabled={!configured || status.isPending} className="gali-button gali-button-primary disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />{answer ? "Refresh AI brief" : "Generate AI brief"}</button>}</div></div>
    <div className="mt-4"><AiConnection compact /></div>
    {busy && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-line p-5 text-sm text-info"><Loader2 className="h-4 w-4 animate-spin" />Reading GALI evidence and preparing the research brief…</div>}
    {error && <div role="alert" className="mt-4 rounded-xl border border-negative-line bg-negative-soft p-4 text-sm leading-relaxed text-negative">{error}<button type="button" onClick={() => void generate()} className="mt-2 block min-h-9 font-semibold underline">Try again</button></div>}
    {answer && <div className="mt-5"><AiAnswer answer={answer} /></div>}
  </section>;
}
