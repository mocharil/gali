"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingDown,
  Layers,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";

export default function CostCurvePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cost-curve", "Coal"],
    queryFn: () => api.getCostCurve("Coal"),
  });

  const points = data?.points ?? [];
  const benchmark = data?.benchmark_price_usd ?? 85;
  const belowBreakeven = points.filter((p) => p.cash_cost_per_ton_usd > benchmark);
  const lowestCost = points.length > 0 ? points[0] : null;
  const totalCapacity = points.length > 0 ? points[points.length - 1].cumulative_volume_mt : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>M5 National Cash Cost Curve</span>
          </div>
          <h1 className="text-3xl font-black text-white">Kurva Biaya Nasional — Batubara</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Setiap tangga merepresentasikan emiten batubara IDX, diurutkan dari cash cost per ton termurah.
            Lebar tangga mencerminkan volume produksi tahunan (Mt). Emiten di bawah garis harga benchmark
            memiliki margin tunai positif.
          </p>
        </div>
      </div>

      {/* 3 Executive Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl border border-slate-800 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Produsen Biaya Terendah (Q1)
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-emerald-400">
              {lowestCost ? lowestCost.symbol : "—"}
            </span>
            <span className="font-mono text-sm text-slate-400">
              {lowestCost ? `$${lowestCost.cash_cost_per_ton_usd.toFixed(2)}/t` : ""}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Margin tunai tertinggi di harga pasar berjalan</p>
        </div>

        <div className="glass-card rounded-2xl border border-slate-800 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Harga Acuan Benchmark (ICI-4 / FOB)
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-amber-400">
            ${benchmark.toFixed(2)}/t
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Garis batas impas operasional (cash breakeven)</p>
        </div>

        <div className="glass-card rounded-2xl border border-slate-800 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Kapasitas Teranalisis
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-cyan-400">
            {totalCapacity.toFixed(1)} Mt/thn
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Volume produksi tahunan kumulatif 7 emiten lengkap</p>
        </div>
      </div>

      {/* Main Interactive Step Chart */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            Visualisasi Tangga Biaya Kumulatif (Cumulative Step Curve)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">X: Kapasitas Kumulatif (Mt) | Y: Cash Cost ($/t)</span>
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px] rounded-xl" />
        ) : points.length === 0 ? (
          <div className="flex h-96 items-center justify-center text-sm text-slate-500">
            Memuat data kurva biaya...
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="cumulative_volume_mt"
                  type="number"
                  domain={[0, "dataMax + 10"]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v: number) => `${v.toFixed(0)} Mt`}
                  label={{
                    value: "Volume Produksi Kumulatif (Juta Ton / Tahun)",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, "auto"]}
                  tickFormatter={(v: number) => `$${v}`}
                  label={{
                    value: "Cash Cost Per Ton ($ USD / t)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const margin = (d.realized_price_per_ton_usd ?? 0) - d.cash_cost_per_ton_usd;
                      return (
                        <div className="glass-panel rounded-xl border border-slate-700 p-3 shadow-2xl space-y-1">
                          <div className="font-mono font-black text-amber-400 text-sm">{d.symbol}</div>
                          <div className="text-xs text-slate-300">
                            Cash Cost: <span className="font-mono font-bold text-white">${d.cash_cost_per_ton_usd.toFixed(2)}/t</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Volume: <span className="font-mono font-bold text-white">{d.annual_volume_mt.toFixed(1)} Mt/thn</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Unit Margin:{" "}
                            <span className={`font-mono font-bold ${margin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              ${margin.toFixed(2)}/t
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">
                            Kumulatif: {d.cumulative_volume_mt.toFixed(1)} Mt
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={benchmark}
                  stroke="#f43f5e"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `ICI Benchmark $${benchmark.toFixed(0)}/t`,
                    fill: "#f43f5e",
                    fontSize: 12,
                    position: "insideTopRight",
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey="cash_cost_per_ton_usd"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#costGradient)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Alert if any emiten is below breakeven */}
      {belowBreakeven.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-rose-300 font-bold">{belowBreakeven.length} emiten</strong> berada di atas
            harga benchmark acuan (beroperasi dengan margin tunai tipis / negatif di harga saat ini):{" "}
            <span className="font-mono font-bold text-white">
              {belowBreakeven.map((p) => p.symbol).join(", ")}
            </span>
            .
          </div>
        </div>
      )}

      {/* Comprehensive Breakdown Table */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Tabel Rincian Biaya &amp; Margin Per Emiten
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Emiten</th>
                <th className="px-4 py-3">Cash Cost ($/t)</th>
                <th className="px-4 py-3">Realized Price ($/t)</th>
                <th className="px-4 py-3">Unit Margin ($/t)</th>
                <th className="px-4 py-3">Breakeven ($/t)</th>
                <th className="px-4 py-3">Volume (Mt)</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={7}>
                      <Skeleton className="h-6 rounded" />
                    </td>
                  </tr>
                ))}
              {points.map((p) => {
                const margin = (p.realized_price_per_ton_usd ?? 0) - p.cash_cost_per_ton_usd;
                return (
                  <tr key={p.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-amber-400">
                      <Link href={`/issuer/${p.symbol}`} className="hover:text-amber-300 transition-colors">
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ${p.cash_cost_per_ton_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      ${(p.realized_price_per_ton_usd ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          margin >= 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {margin >= 0 ? "+" : ""}${margin.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      ${(p.breakeven_benchmark_price_usd ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      {p.annual_volume_mt.toFixed(1)} Mt
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/issuer/${p.symbol}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold"
                      >
                        Detail <ArrowRight className="h-3 w-3" />
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
