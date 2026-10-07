"use client";

import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function DataState({ error, onRetry, empty = false, title, description }: {
  error?: unknown;
  onRetry?: () => unknown | Promise<unknown>;
  empty?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <div role={empty ? "status" : "alert"} className="rounded-2xl border border-line-strong bg-surface p-6">
      <div className="flex items-start gap-3">
        {empty ? <Database className="h-5 w-5 shrink-0 text-info" /> : <AlertCircle className="h-5 w-5 shrink-0 text-brand" />}
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold text-ink">{title ?? (empty ? "No data for this view" : "Data could not be loaded")}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {description ?? (empty ? "Adjust the filters, or load a Sectors dataset and publish the calculated metrics first." : error instanceof Error ? error.message : "Check the API connection and try again.")}
          </p>
          {onRetry && <ActionButton action={onRetry} loadingText="Retrying data…" variant="outline" className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover">
            <RefreshCw className="h-4 w-4" /> Try again
          </ActionButton>}
        </div>
      </div>
    </div>
  );
}
