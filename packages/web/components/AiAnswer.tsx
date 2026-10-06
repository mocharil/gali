"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Download, Lightbulb, ShieldAlert, Sparkles, Workflow } from "lucide-react";
import type { AiAnswer as Answer, AiClaim } from "@/lib/ai/types";
import { downloadAiBrief } from "@/lib/ai/export";
import { AI_KIND_LABELS, AI_QUALITY_LABELS } from "@/lib/ai/presentation";

const KIND = {
  finding: { icon: Lightbulb, color: "text-info", background: "bg-info-soft" },
  risk: { icon: ShieldAlert, color: "text-negative", background: "bg-negative-soft" },
  limitation: { icon: BookOpen, color: "text-brand", background: "bg-brand-soft" },
  next_step: { icon: Workflow, color: "text-info", background: "bg-surface-muted" },
};

export function AiAnswer({ answer, onFollowUp, onNavigate }: { answer: Answer; onFollowUp?: (question: string) => void; onNavigate?: () => void }) {
  const ref = (id: string) => answer.evidence.find((item) => item.id === id);
  function references(claim: AiClaim) {
    return <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Claim references">{claim.evidence_ids.map((id) => {
      const source = ref(id);
      return source ? <Link key={id} onClick={onNavigate} href={source.href} title={`${source.label}: ${source.value}`} className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-info"><BookOpen className="h-3 w-3 shrink-0" /><span className="truncate">{source.quality === "methodology" ? `Method · ${source.label}` : source.label}</span></Link> : null;
    })}</div>;
  }
  return <article className="min-w-0 space-y-4 [overflow-wrap:anywhere]" data-testid="ai-answer">
    <div className="rounded-2xl border border-info-line bg-info-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 max-w-full flex-1"><p className="flex items-start gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-info"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Gemini interpretation · GALI calculations</span></p><h3 className="mt-2 text-xl font-semibold text-ink">{answer.title}</h3></div><button type="button" aria-label="Save AI brief" title="Save AI brief" className="gali-button gali-button-secondary min-h-9 shrink-0 text-[12px]" onClick={() => downloadAiBrief(answer)}><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Save AI brief</span></button></div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{answer.summary.text}</p>{references(answer.summary)}
      {answer.status !== "answered" && <p className="mt-3 text-[12px] font-medium text-brand">{answer.status === "insufficient_data" ? "Evidence is incomplete for this question." : "This question extends beyond the available GALI evidence."}</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{answer.findings.map((item, index) => {
      const kind = KIND[item.kind];
      return <section key={`${index}-${item.title}`} className="min-w-0 rounded-2xl border border-line bg-surface p-4"><p className={`flex items-center gap-1.5 text-[11px] font-semibold ${kind.color}`}><span className={`rounded-md p-1 ${kind.background}`}><kind.icon className="h-3.5 w-3.5" /></span>{AI_KIND_LABELS[item.kind]}</p><h4 className="mt-2 text-sm font-semibold text-ink">{item.title}</h4><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{item.text}</p>{references(item)}</section>;
    })}</div>
    <details className="rounded-2xl border border-line bg-surface-muted p-4"><summary className="cursor-pointer text-sm font-semibold text-ink">View evidence ({answer.evidence.length})</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{answer.evidence.map((item) => <div key={item.id} className="min-w-0 rounded-xl border border-line bg-surface p-3"><Link href={item.href} onClick={onNavigate} className="flex items-start justify-between gap-2 text-[12px] font-medium text-info"><span>{item.label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></Link><p className={`${item.quality === "methodology" ? "text-[12px] leading-relaxed" : "font-numeric text-sm font-semibold"} mt-2 whitespace-pre-line text-ink-soft`}>{item.value}</p><p className={`mt-2 inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${item.quality === "partial" || item.quality === "provisional" ? "bg-brand-soft text-brand" : "bg-info-soft text-info"}`}>{AI_QUALITY_LABELS[item.quality]}</p><p className="mt-2 break-words text-[10px] leading-relaxed text-muted">{item.source}</p></div>)}</div></details>
    {onFollowUp && answer.follow_up_questions.length > 0 && <div><p className="mb-2 text-[11px] font-medium text-muted">Continue the research</p><div className="flex flex-wrap gap-2">{answer.follow_up_questions.map((question) => <button type="button" onClick={() => onFollowUp(question)} key={question} className="min-h-10 rounded-xl border border-line px-3 py-2 text-left text-[12px] text-info hover:bg-info-soft">{question}<ArrowUpRight className="ml-1 inline h-3 w-3" /></button>)}</div></div>}
    <p className="text-[11px] leading-relaxed text-muted">Snapshot {answer.snapshot.as_of ?? "see issuer Evidence"} · {answer.model} · {answer.cached ? "Saved answer for the same evidence" : "Generated with Gemini"}. References and metric values are checked against GALI data; review the interpretation and model limits.</p>
  </article>;
}
