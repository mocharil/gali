"use client";

import { useEffect } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GALI] Unhandled route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-negative-line bg-negative-soft">
        <AlertOctagon className="h-7 w-7 text-negative" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-ink">Something went wrong on this page</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        An error occurred while rendering this page. Not a bad investment — just a bug. Try reloading;
        if it keeps happening, report it via GitHub Issues.
      </p>
      {error.digest && (
        <p className="mt-3 font-numeric text-[12px] text-subtle">Error digest: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-gold"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <Home className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
