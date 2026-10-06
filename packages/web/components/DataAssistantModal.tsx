"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Database, Loader2, RotateCcw, Search, Send, Sparkles, Square, X } from "lucide-react";
import { VisualAsset } from "@/components/VisualAsset";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { ANALYSIS_PROMPTS, analyzeIssuers } from "@/lib/analysis";
import { useDialog } from "@/lib/useDialog";
import { useAiRequest, useAiStatus } from "@/lib/ai/useAi";
import { scenarioFromUrl } from "@/lib/ai/scenario";
import type { AiAnswer as Answer, AiRequest } from "@/lib/ai/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataState } from "./DataState";
import { AiConnection } from "./AiConnection";
import { AiAnswer } from "./AiAnswer";

const AI_PROMPTS = ["Compare BUMI and BYAN's strengths and risks", "Which issuers have the most resilient cost structure?", "What could undermine a large reserve-value gap?", "Which data gaps should I investigate first?"];

export function DataAssistantModal({ isOpen, onClose, initialQuery = "" }: {
  isOpen: boolean; onClose: () => void; initialQuery?: string;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("Fundamental score overview");
  const [mode, setMode] = useState<"data" | "gemini">("data");
  const [turns, setTurns] = useState<{ question: string; answer: Answer }[]>([]);
  const [scenario, setScenario] = useState<AiRequest["scenario"]>();
  const [contextSymbols, setContextSymbols] = useState<string[]>([]);
  const chosen = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const latestAnswerRef = useRef<HTMLDivElement>(null);
  const cache = useQueryClient();
  const status = useAiStatus(isOpen);
  const { data, isLoading, error, refetch } = useIssuerUniverse(isOpen);
  const { error: aiError, busy, ask, cancel, clear } = useAiRequest();
  const close = useCallback(() => { cancel(); onClose(); }, [cancel, onClose]);
  useDialog(isOpen, close, dialogRef);
  const configured = status.data?.state === "configured" || status.data?.state === "verified";
  useEffect(() => {
    clear();
    if (isOpen) {
      chosen.current = false; setMode("data"); setTurns([]);
      setInput(initialQuery); setQuery(initialQuery.trim() || "Fundamental score overview");
      const url = new URL(window.location.href);
      setScenario(scenarioFromUrl(url));
      const symbol = /^\/issuer\/([A-Za-z0-9]{1,12})$/.exec(url.pathname)?.[1] ?? (url.pathname === "/scenario" ? url.searchParams.get("issuer") || "BUMI" : null);
      setContextSymbols(symbol && /^[A-Za-z0-9]{1,12}$/.test(symbol) ? [symbol.toUpperCase()] : []);
    }
  }, [isOpen, initialQuery, clear]);
  useEffect(() => { if (isOpen && configured && !chosen.current) setMode("gemini"); }, [isOpen, configured]);
  useEffect(() => {
    if (!isOpen || !turns.length) return;
    const content = contentRef.current;
    const answer = latestAnswerRef.current?.querySelector('[data-testid="ai-answer"]');
    if (content && answer) content.scrollTo({ top: content.scrollTop + answer.getBoundingClientRect().top - content.getBoundingClientRect().top - 16, behavior: "auto" });
  }, [isOpen, turns]);
  const result = useMemo(() => data?.length ? analyzeIssuers(query, data) : null, [query, data]);
  function changeMode(value: "data" | "gemini") { chosen.current = true; cancel(); setMode(value); }
  async function execute(value: string) {
    if (!value.trim() || busy) return;
    setInput(value);
    if (mode === "data") { setQuery(value.trim()); return; }
    if (!configured) return;
    const history = turns.slice(-2).flatMap((turn) => [
      { role: "user" as const, content: turn.question },
      { role: "assistant" as const, content: [turn.answer.summary.text, ...turn.answer.findings.map((item) => item.text)].join(" ").slice(0, 1600) },
    ]);
    const explicitlyMentioned = data?.some((issuer) => new RegExp(`\\b${issuer.symbol}\\b`, "i").test(value));
    const symbols = !explicitlyMentioned && contextSymbols.length ? contextSymbols : undefined;
    const answer = await ask({ mode: "chat", question: value.trim(), history, ...(symbols ? { symbols } : {}), ...(scenario ? { scenario } : {}) });
    if (answer) { setTurns((previous) => [...previous, { question: value.trim(), answer }].slice(-5)); void cache.invalidateQueries({ queryKey: ["gemini-status"] }); }
  }
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm" onClick={close}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="assistant-title" className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-panel" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
          <div><h2 id="assistant-title" className="flex items-center gap-2 text-lg font-bold text-ink"><Database className="h-5 w-5 text-brand" />GALI Data Assistant</h2><p className="mt-1 text-[12px] leading-relaxed text-muted">Rule-based data analysis and grounded Gemini research for the active dataset.</p></div>
          <button type="button" aria-label="Close assistant" onClick={close} className="gali-icon-button"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="inline-flex rounded-xl border border-line bg-surface-muted p-1" aria-label="Analysis mode">
            <button type="button" aria-pressed={mode === "gemini"} onClick={() => changeMode("gemini")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold ${mode === "gemini" ? "bg-surface text-info shadow-sm" : "text-muted"}`}><Sparkles className="h-3.5 w-3.5" />Gemini analysis</button>
            <button type="button" aria-pressed={mode === "data"} onClick={() => changeMode("data")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold ${mode === "data" ? "bg-surface text-brand shadow-sm" : "text-muted"}`}><Database className="h-3.5 w-3.5" />Data analysis</button>
          </div>{mode === "gemini" && turns.length > 0 && <button type="button" aria-label="New conversation" onClick={() => { clear(); setTurns([]); setInput(""); }} className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1 text-[12px] text-muted"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">New conversation</span></button>}</div>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void execute(input); }}>
            <label className="relative min-w-0 flex-1"><span className="sr-only">Analysis question</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted" /><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder={mode === "gemini" ? "Ask about an issuer, risk, or model assumption…" : "Example: compare BUMI and BYAN"} className="gali-input pl-9" /></label>
            {busy ? <button key="stop" type="button" onClick={(event) => { event.preventDefault(); cancel(); }} aria-label="Stop analysis" className="gali-button gali-button-secondary"><Square className="h-4 w-4" /><span className="hidden sm:inline">Stop</span></button> : <button key="submit" type="submit" disabled={!input.trim() || (mode === "gemini" ? !configured : isLoading || !data?.length)} className="gali-button gali-button-primary disabled:opacity-40">{mode === "gemini" ? <><Send className="h-4 w-4" /><span className="hidden sm:inline">Ask Gemini</span><span className="sm:hidden">Ask</span></> : "Analyze"}</button>}
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">{(mode === "gemini" ? AI_PROMPTS : ANALYSIS_PROMPTS).map((prompt) => <button key={prompt} type="button" disabled={busy || (mode === "gemini" && !configured)} onClick={() => void execute(prompt)} className="min-h-9 shrink-0 rounded-xl border border-line px-3 py-2 text-[11px] text-ink-soft hover:border-brand-line hover:text-brand disabled:opacity-50">{prompt}</button>)}</div>
          {mode === "gemini" && scenario && <p className="text-[11px] font-medium text-info">Scenario Studio parameters attached{contextSymbols.length ? ` · ${contextSymbols.join(", ")}` : ""}. Gemini reads a fresh server calculation.</p>}
          {mode === "gemini" && !scenario && contextSymbols.length > 0 && <p className="text-[11px] font-medium text-info">Issuer context · {contextSymbols.join(", ")}. Mention another ticker to change the research scope.</p>}
        </div>
        <div ref={contentRef} className="space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {mode === "gemini" ? <>
            <AiConnection compact={turns.length > 0} />
            {!configured && !status.isPending && <div className="rounded-xl border border-line p-4"><p className="text-sm text-muted">Connect Gemini on the server to enable AI research. Data analysis is available now.</p><button type="button" onClick={() => changeMode("data")} className="mt-2 min-h-9 text-sm font-semibold text-brand">Use data analysis<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div>}
            {!turns.length && !busy && !aiError && <div className="grid items-center gap-4 rounded-2xl border border-line bg-surface-muted p-5 sm:grid-cols-[minmax(0,1fr)_180px]"><div><p className="gali-eyebrow">From evidence to insight</p><h3 className="mt-2 text-xl font-semibold text-ink">Ask a better research question.</h3><p className="mt-2 text-sm leading-relaxed text-muted">Compare strengths, challenge model assumptions, and identify what to investigate next. Gemini explains the evidence; GALI supplies the calculated figures.</p></div><VisualAsset name="evidence-desk" className="gali-intro-art" /></div>}
            {turns.slice(0, -1).map((turn) => <details key={turn.answer.request_id} className="rounded-xl border border-line p-3 [overflow-wrap:anywhere]"><summary className="cursor-pointer text-[12px] font-medium text-muted">Earlier question: {turn.question}</summary><div className="mt-4"><AiAnswer answer={turn.answer} onNavigate={close} /></div></details>)}
            {turns.length > 0 && <div ref={latestAnswerRef} className="min-w-0 space-y-3"><p data-testid="latest-ai-question" className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-medium text-ink-soft [overflow-wrap:anywhere]">{turns.at(-1)!.question}</p><AiAnswer answer={turns.at(-1)!.answer} onFollowUp={(question) => void execute(question)} onNavigate={close} /></div>}
            {busy && <div role="status" className="flex items-center gap-2 rounded-xl border border-info-line bg-info-soft p-5 text-sm text-info"><Loader2 className="h-4 w-4 animate-spin" />Reading GALI evidence and preparing the analysis…</div>}
            {aiError && <div role="alert" className="rounded-xl border border-negative-line bg-negative-soft p-4 text-sm leading-relaxed text-negative">{aiError}<button type="button" onClick={() => void execute(input)} className="mt-2 block min-h-9 font-semibold underline">Try again</button></div>}
          </> : <>
            {isLoading && <p className="animate-pulse text-sm text-ink-soft">Loading the active dataset…</p>}
            {error && <DataState error={error} onRetry={() => void refetch()} />}
            {!isLoading && !error && !data?.length && <DataState empty />}
            {result && !error && <>
              <div className="grid items-center gap-4 rounded-2xl border border-line bg-surface-muted p-4 sm:grid-cols-[minmax(0,1fr)_200px]"><div><p className="gali-eyebrow">Inspect the evidence</p><h3 className="mt-2 text-xl font-semibold text-ink">{result.headline}</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{result.summary}</p></div><VisualAsset name="evidence-desk" className="gali-intro-art" /></div>
              <div className="grid gap-3 sm:grid-cols-2">{result.rows.map(({ issuer, facts }) => <div key={issuer.symbol} className="rounded-2xl border border-line bg-surface-muted p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Link onClick={onClose} href={`/issuer/${issuer.symbol}`} className="font-numeric text-lg font-bold text-brand">{issuer.symbol}</Link><ConfidenceBadge dataQuality={issuer.data_quality} /></div><dl className="space-y-2">{facts.map((fact) => <div key={fact.label} className="flex justify-between gap-3 text-sm"><dt className="text-muted">{fact.label}</dt><dd className="text-right font-numeric text-ink">{fact.value}</dd></div>)}</dl><Link onClick={onClose} href={`/issuer/${issuer.symbol}`} className="mt-3 inline-flex items-center gap-1 text-sm text-info">Review evidence<ArrowRight className="h-3 w-3" /></Link></div>)}</div>
              <div className="space-y-2 rounded-xl border border-line p-4">{result.notes.map((note) => <p key={note} className="text-sm leading-relaxed text-muted">{note}</p>)}</div><Link href={result.action.href} onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">{result.action.label}<ArrowRight className="h-4 w-4" /></Link>
            </>}
          </>}
        </div>
      </div>
    </div>
  );
}
