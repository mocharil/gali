"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, PlugZap, Sparkles } from "lucide-react";
import { ai } from "@/lib/ai/client";
import { useAiStatus } from "@/lib/ai/useAi";

export function AiConnection({ enabled = true, compact = false }: { enabled?: boolean; compact?: boolean }) {
  const status = useAiStatus(enabled);
  const cache = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const configured = status.data?.state === "configured" || status.data?.state === "verified";
  const verified = status.data?.state === "verified";
  async function check() {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setChecking(true); setMessage(null);
    try { const result = await ai.check(controller.signal); if (!controller.signal.aborted) cache.setQueryData(["gemini-status"], result); }
    catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "The connection could not be checked."); }
    finally { if (!controller.signal.aborted) { setChecking(false); pending.current = null; } }
  }
  return <div className={compact ? "space-y-2" : "rounded-2xl border border-line bg-surface-muted p-4"} data-testid="gemini-connection">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${verified ? "bg-positive-soft text-positive" : "bg-info-soft text-info"}`}>
        {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}Gemini · {status.isPending ? "Checking configuration" : verified ? "Access verified" : configured ? "Ready to connect" : "Setup required"}
      </span>
      {configured && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-info disabled:opacity-50" disabled={checking} onClick={() => void check()}>
        {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}{checking ? "Testing access…" : "Test connection"}
      </button>}
      {status.isError && <button type="button" onClick={() => void status.refetch()} className="min-h-9 text-[12px] text-info">Retry status</button>}
    </div>
    {!compact && <p className="mt-2 text-[12px] leading-relaxed text-muted">{status.data?.message ?? (status.isError ? "Gemini status could not be loaded. Try again." : "Checking server configuration…")}</p>}
    {message && <p role="alert" className="text-[12px] leading-relaxed text-negative">{message}</p>}
    {!configured && !status.isPending && <details className="mt-2 text-[12px] text-muted"><summary className="min-h-8 cursor-pointer font-medium text-info">Gemini setup</summary><p className="mt-1 leading-relaxed">Configure the service account JSON on the GALI server, then restart the app. Setup instructions are included in docs/GEMINI_SETUP.md. Credentials stay on the server.</p></details>}
    {!compact && configured && <p className="mt-1 text-[11px] text-subtle">The connection test makes one short Gemini request.</p>}
  </div>;
}
