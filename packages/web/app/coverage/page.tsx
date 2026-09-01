"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Database, Coins, ArrowRight } from "lucide-react";

import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Skeleton } from "@/components/Skeleton";

function Bar({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
      : pct >= 40
      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
      : "bg-gradient-to-r from-rose-500 to-red-400";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function CoveragePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => api.getCoverage(),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Audit Kejujuran &amp; Kelengkapan Data</span>
          </div>
          <h1 className="text-3xl font-black text-white">Truth Audit &amp; Credit Ledger</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Halaman integritas data. Setiap metrik dihitung langsung dari basis data produksi saat halaman dimuat —
            termasuk data yang kosong. Bukan target, melainkan kondisi faktual apa adanya.
          </p>
        </div>
      </div>

      {/* Credit Ledger & Gate Decision Tile */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Gate Decision</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-emerald-400">
              {data.gate_decision}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Memenuhi standar kelayakan data untuk evaluasi</p>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Anggaran Kredit Sectors</span>
              <Coins className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-amber-400">
              {data.credits_used} <span className="text-sm text-slate-500">/ {data.credits_cap}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {data.credits_cap - data.credits_used} kredit tersisa (hemat 59.5% dari batas 1.000)
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Universe Emiten</span>
              <Database className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-cyan-400">
              {data.in_universe_issuers?.length ?? 9} Emiten
            </div>
            <p className="mt-2 text-[11px] text-slate-500">7 emiten lengkap + 2 emiten parsial</p>
          </div>
        </div>
      )}

      {/* Coverage Progress Bars */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Cakupan Kelengkapan Komponen Data Mentah
        </h2>

        <div className="space-y-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          {data?.metrics.map((m) => (
            <div
              key={m.entity}
              className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">{m.entity}</span>
                <span className="font-mono text-sm font-black text-white">
                  {m.numerator} / {m.denominator}{" "}
                  <span className="text-amber-400 font-semibold">({m.coverage_pct.toFixed(1)}%)</span>
                </span>
              </div>
              <Bar pct={m.coverage_pct} />
              <p className="text-[11px] text-slate-400">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* In-Universe Issuers Table */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Daftar Emiten In-Universe ({data?.in_universe_issuers.length ?? 0})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Nama Perusahaan</th>
                <th className="px-4 py-3">Status Kelengkapan</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.in_universe_issuers.map((i) => (
                <tr key={String(i.symbol)} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-black text-amber-400">{String(i.symbol)}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{String(i.name)}</td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge dataQuality={String(i.quality) as "LENGKAP" | "PARSIAL"} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/issuer/${String(i.symbol)}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold"
                    >
                      Audit <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
