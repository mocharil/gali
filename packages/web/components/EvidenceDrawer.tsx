"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, FileText, Clock, AlertTriangle, Link as LinkIcon } from "lucide-react";

/**
 * The API only guarantees `evidence` is a JSON object (Pydantic dict/JSONB field --
 * see packages/api/openapi.json, IssuerDetail.evidence: {"type": "object",
 * "additionalProperties": true}). This shape documents what gali_core/metrics/evidence.py
 * actually emits today; treat every field as possibly absent.
 */
export interface EvidenceShape {
  symbol?: string;
  derived_at?: string;
  provenance?: Record<string, unknown>;
  assumptions?: Record<string, number | string | boolean>;
  null_fields?: { field: string; reason: string }[];
  audit_version?: string;
  source_raw_response_ids?: number[];
}

interface EvidenceDrawerProps {
  symbol: string;
  runId?: string | null;
  evidence: EvidenceShape;
}

export function EvidenceDrawer({ symbol, runId, evidence }: EvidenceDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nullFields = evidence.null_fields ?? [];
  const provenance = evidence.provenance ?? {};
  const assumptions = evidence.assumptions ?? {};
  const sourceIds = evidence.source_raw_response_ids ?? [];

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/20"
        title="Lihat provenance dan bukti perhitungan mentah"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Evidence &amp; Provenance</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence dan provenance untuk ${symbol}`}
            className="flex h-full w-full max-w-xl flex-col justify-between overflow-y-auto border-l border-slate-800 bg-[#0e1420] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-wide text-white">{symbol}</span>
                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {evidence.audit_version ?? "provenance"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Setiap angka bisa ditelusuri ke respons API mentah yang mendasarinya.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <div className="text-[11px] text-slate-400">Dihitung pada</div>
                    <div className="text-xs font-mono text-slate-200">
                      {evidence.derived_at ? new Date(evidence.derived_at).toLocaleString("id-ID") : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <div>
                    <div className="text-[11px] text-slate-400">Metrics run</div>
                    <div className="max-w-[180px] truncate text-xs font-mono font-bold text-slate-200">
                      {runId ?? "—"}
                    </div>
                  </div>
                </div>
              </div>

              {nullFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Field kosong &amp; alasannya ({nullFields.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {nullFields.map((nf) => (
                      <div
                        key={nf.field}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                      >
                        <div className="font-mono text-xs font-bold text-amber-300">{nf.field}</div>
                        <div className="mt-1 text-xs text-slate-300">{nf.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span>Konteks perhitungan</span>
                </h4>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-800/60 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300">
                  {JSON.stringify(provenance, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Asumsi finansial</h4>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-800/60 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300">
                  {JSON.stringify(assumptions, null, 2)}
                </pre>
              </div>

              {sourceIds.length > 0 && (
                <div className="text-[11px] text-slate-500">
                  Ditelusuri dari {sourceIds.length} respons API mentah (raw.responses id:{" "}
                  {sourceIds.slice(0, 8).join(", ")}
                  {sourceIds.length > 8 ? ", …" : ""}).
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
