"use client";

import { useEffect } from "react";
import Link from "next/link";
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        <AlertOctagon className="h-7 w-7 text-rose-400" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-white">Ada yang tidak beres di halaman ini</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Terjadi error saat merender halaman. Ini bukan investasi yang buruk — ini bug. Coba muat ulang;
        kalau berulang, laporkan lewat GitHub Issues.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-slate-600">Error digest: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
        >
          <RotateCcw className="h-4 w-4" />
          Coba lagi
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          <Home className="h-4 w-4" />
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
