"use client";

import { useDialog } from "@/lib/useDialog";
import React, { useState, useRef } from "react";
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
  source_type?: string;
  source_description?: string;
  source_references?: { endpoint?: string; type?: string; id?: string }[];
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

  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(isOpen, () => setIsOpen(false), panelRef);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="gali-button gali-button-secondary"
        title="View calculation context and provenance"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Evidence &amp; Provenance</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence and provenance for ${symbol}`}
            className="flex h-full w-full max-w-xl flex-col justify-between overflow-y-auto border-l border-line bg-surface p-6 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-wide text-ink">{symbol}</span>
                    <span className="rounded border border-positive-line bg-positive-soft px-2 py-0.5 text-sm font-semibold text-positive">
                      {evidence.audit_version ?? "provenance"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    Calculation context, assumptions, missing fields, and source references. Raw payloads are not displayed here.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="gali-icon-button"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <div>
                    <div className="text-[12px] text-muted">Computed at</div>
                    <div className="text-sm font-numeric text-ink-soft">
                      {evidence.derived_at ? new Date(evidence.derived_at).toLocaleString("en-US") : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <div>
                    <div className="text-[12px] text-muted">Metrics run</div>
                    <div className="max-w-[180px] truncate text-sm font-numeric font-bold text-ink-soft">
                      {runId ?? "—"}
                    </div>
                  </div>
                </div>
              </div>

              {evidence.source_type === "synthetic" && <div className="rounded-xl border border-info-line bg-info-soft p-4"><h4 className="text-sm font-semibold text-info">Dataset origin · Simulation</h4><p className="mt-2 text-sm leading-relaxed text-ink-soft">{evidence.source_description}</p>{evidence.source_references?.map((source,index) => <p key={index} className="mt-2 break-all font-numeric text-[12px] text-muted">{source.endpoint} · {source.id}</p>)}</div>}
              {nullFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Empty fields &amp; reasons ({nullFields.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {nullFields.map((nf) => (
                      <div
                        key={nf.field}
                        className="rounded-lg border border-brand-line bg-brand-soft p-3"
                      >
                        <div className="font-numeric text-sm font-bold text-brand">{nf.field}</div>
                        <div className="mt-1 text-sm text-ink-soft">{nf.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-ink">
                  <FileText className="h-4 w-4 text-brand" />
                  <span>Calculation context</span>
                </h4>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-muted p-4 font-mono text-[12px] text-ink-soft">
                  {JSON.stringify(provenance, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-semibold tracking-tight text-ink">Financial assumptions</h4>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-muted p-4 font-mono text-[12px] text-ink-soft">
                  {JSON.stringify(assumptions, null, 2)}
                </pre>
              </div>

              {sourceIds.length > 0 && (
                <div className="text-[12px] text-muted">
                  Linked source references: {sourceIds.length} cached API responses (raw.responses id:{" "}
                  {sourceIds.slice(0, 8).join(", ")}
                  {sourceIds.length > 8 ? ", …" : ""}).
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-line pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-surface-hover px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
