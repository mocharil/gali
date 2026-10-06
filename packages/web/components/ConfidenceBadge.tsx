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
        className={`inline-flex items-center gap-1 rounded-md border border-positive-line bg-positive-soft px-2 py-0.5 text-[12px] font-semibold text-positive ${className}`}
        title={`RLI, RBV, and cash cost are available; other pillars may be incomplete. Weight coverage${pctLabel}`}
      >
        <CheckCircle className="h-3 w-3" />
        <span>Complete core metrics{pctLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border border-brand-line bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand ${className}`}
      title={`One or more core metrics are missing. Check the data sources. Weight coverage${pctLabel}`}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>{dataQuality === "PARSIAL" ? "Partial core metrics" : dataQuality || "Partial core metrics"}{pctLabel}</span>
    </div>
  );
}
