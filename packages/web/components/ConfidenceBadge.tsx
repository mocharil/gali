import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface ConfidenceBadgeProps {
  /** Authoritative label from the backend (M8, §4.1) -- never re-derive this in the UI. */
  dataQuality: string;
  /** 0-100. Optional -- shown as a secondary detail, not the badge's own verdict. */
  confidencePct?: number | null;
  className?: string;
}

export function ConfidenceBadge({ dataQuality, confidencePct, className = "" }: ConfidenceBadgeProps) {
  const isComplete = dataQuality === "LENGKAP";
  const pctLabel = confidencePct != null ? ` (${Math.round(confidencePct)}%)` : "";

  if (isComplete) {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ${className}`}
        title={`Data lengkap di seluruh endpoint yang relevan${pctLabel}`}
      >
        <CheckCircle className="h-3 w-3" />
        <span>LENGKAP{pctLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 ${className}`}
      title={`Sebagian field bernilai null -- lihat Evidence untuk daftarnya${pctLabel}`}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>{dataQuality || "PARSIAL"}{pctLabel}</span>
    </div>
  );
}
