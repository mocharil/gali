"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
} from "lucide-react";

import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";

export default function DivergencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["flow-overlay"],
    queryFn: () => api.getFlowOverlay(),
  });

  const issuers = data?.issuers ?? [];
  const sorted = [...issuers].sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400 mb-2">
            <Activity className="h-3.5 w-3.5" />
            <span>M9 Market Divergence &amp; Flow Overlay</span>
          </div>
          <h1 className="text-3xl font-black text-white">Market Divergence Engine</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Membandingkan Ground Truth Score (kondisi cadangan fisik dan fundamental tambang) dengan valuasi pasar modal
            dan arus dana asing (foreign flow), untuk mengidentifikasi emiten yang mengalami mispricing atau diskon fundamental.
          </p>
        </div>
      </div>

      {/* 4 Quadrants Explanation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Kuadran I</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-bold text-white text-sm">Fundamental Kuat / Terdiskon</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Skor cadangan &gt; 50, umur tambang panjang, valuasi pasar masih di bawah intrinsic Reserve-Backed Value.
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Kuadran II</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-bold text-white text-sm">Premium / Fair Valued</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Fundamental tinggi dan pasar mengapresiasi dengan valuasi wajar atau sedikit premium.
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Kuadran III</span>
            <TrendingDown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="font-bold text-white text-sm">Spekulatif / Overvalued</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Harga saham tinggi namun cadangan menipis atau risiko perizinan (license cliff) tinggi.
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Kuadran IV</span>
            <Info className="h-4 w-4 text-rose-400" />
          </div>
          <div className="font-bold text-white text-sm">Menipis / High Risk</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Cadangan fisik rendah, umur tambang &lt; 10 thn, biaya operasional di atas kuartil 3.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Matriks Divergensi Emiten Batubara IDX
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Diurutkan berdasarkan Ground Truth Score</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Emiten</th>
                <th className="px-4 py-3">Ground Truth Score</th>
                <th className="px-4 py-3">RBV Gap vs Mkt Cap</th>
                <th className="px-4 py-3">Net Foreign Flow (30h)</th>
                <th className="px-4 py-3">Klasifikasi Kuadran</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-6 rounded" />
                    </td>
                  </tr>
                ))}
              {sorted.map((i) => {
                const score = i.ground_truth_score;
                return (
                  <tr key={i.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-amber-400">
                      <Link href={`/issuer/${i.symbol}`} className="hover:text-amber-300 transition-colors">
                        {i.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {score != null ? (
                        <div className="flex items-center gap-2">
                          <span>{score.toFixed(1)}</span>
                          <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {i.rbv_gap_pct != null ? (
                        <span className={i.rbv_gap_pct > 0 ? "text-emerald-400 font-bold" : "text-rose-400"}>
                          {i.rbv_gap_pct > 0 ? "+" : ""}
                          {i.rbv_gap_pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Market Cap Parsial</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {i.net_foreign_flow_30d_idr != null && i.net_foreign_flow_30d_idr !== 0
                        ? `Rp ${(i.net_foreign_flow_30d_idr / 1e9).toFixed(1)} M`
                        : "Arus Stabil"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-300">
                        {i.quadrant ?? "Ground-Truth Rank"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/issuer/${i.symbol}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold"
                      >
                        Lihat Bukti <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
