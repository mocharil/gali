"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

function Bar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function CoveragePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => api.getCoverage(),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Truth Audit — Kelengkapan Data</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Halaman kejujuran. Setiap angka di sini dihitung langsung dari database saat halaman dimuat —
        termasuk yang kosong. Bukan klaim, bukan target.
      </p>

      {data && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
          <strong className="text-amber-400">Keputusan gate:</strong> {data.gate_decision}
          <span className="ml-3 font-mono text-xs text-slate-500">
            {data.credits_used} / {data.credits_cap} kredit terpakai
          </span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-900/60" />)}
        {data?.metrics.map((m) => (
          <div key={m.entity} className="glass-card rounded-xl border border-slate-800 p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">{m.entity}</span>
              <span className="font-mono text-sm font-bold text-white">
                {m.numerator} / {m.denominator}{" "}
                <span className="text-slate-500">({m.coverage_pct.toFixed(1)}%)</span>
              </span>
            </div>
            <Bar pct={m.coverage_pct} />
            <p className="mt-1.5 text-[11px] text-slate-500">{m.description}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-300">
        Emiten In-Universe ({data?.in_universe_issuers.length ?? 0})
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Kualitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data?.in_universe_issuers.map((i) => (
              <tr key={String(i.symbol)} className="hover:bg-slate-900/40">
                <td className="px-4 py-2 font-mono font-bold text-amber-400">{String(i.symbol)}</td>
                <td className="px-4 py-2 text-slate-300">{String(i.name)}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{String(i.quality)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
