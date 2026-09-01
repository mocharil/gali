"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
  const belowBreakeven = points.filter((p) => p.cash_cost_per_ton_usd > (data?.benchmark_price_usd ?? Infinity));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white">Kurva Biaya Nasional — Batubara</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Setiap tangga adalah satu emiten, diurutkan dari cash cost termurah. Lebar tangga ≈ volume
        produksi tahunan (Mt). Garis putus-putus adalah harga benchmark berjalan — emiten di atas garis
        itu sedang merugi secara tunai pada harga saat ini.
      </p>

      <div className="glass-card mt-6 rounded-xl border border-slate-800 p-5">
        {isLoading ? (
          <Skeleton className="h-[420px]" />
        ) : points.length === 0 ? (
          <div className="flex h-96 items-center justify-center text-sm text-slate-500">Tidak ada data.</div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="cumulative_volume_mt"
                type="number"
                domain={["dataMin", "dataMax"]}
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v: number) => `${v.toFixed(0)} Mt`}
                label={{ value: "Produksi kumulatif (Mt/thn)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v: number) => `$${v}`}
                label={{ value: "Cash cost ($/t)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#0e1420", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: number, name: string) => [name === "cash_cost_per_ton_usd" ? `$${value.toFixed(2)}/t` : value, "Cash cost"]}
                labelFormatter={(_l, payload) => (payload?.[0]?.payload ? `${payload[0].payload.symbol}` : "")}
              />
              {data?.benchmark_price_usd != null && (
                <ReferenceLine
                  y={data.benchmark_price_usd}
                  stroke="#f43f5e"
                  strokeDasharray="6 4"
                  label={{ value: `Benchmark $${data.benchmark_price_usd.toFixed(0)}/t`, fill: "#f43f5e", fontSize: 11, position: "insideTopRight" }}
                />
              )}
              <Area type="stepAfter" dataKey="cash_cost_per_ton_usd" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {belowBreakeven.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
          <strong>{belowBreakeven.length} emiten</strong> berada di atas harga benchmark berjalan (rugi tunai):{" "}
          {belowBreakeven.map((p) => p.symbol).join(", ")}.
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Emiten</th>
              <th className="px-4 py-2">Cash Cost</th>
              <th className="px-4 py-2">Realized Price</th>
              <th className="px-4 py-2">Unit Margin</th>
              <th className="px-4 py-2">Breakeven</th>
              <th className="px-4 py-2">Volume (Mt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-2" colSpan={6}>
                    <Skeleton className="h-4" />
                  </td>
                </tr>
              ))}
            {points.map((p) => (
              <tr key={p.symbol} className="hover:bg-slate-900/40">
                <td className="px-4 py-2">
                  <Link href={`/issuer/${p.symbol}`} className="font-mono font-bold text-amber-400 hover:underline">
                    {p.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono">${p.cash_cost_per_ton_usd.toFixed(2)}</td>
                <td className="px-4 py-2 font-mono">${(p.realized_price_per_ton_usd ?? 0).toFixed(2)}</td>
                <td
                  className={`px-4 py-2 font-mono ${(p.unit_margin_usd ?? 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}
                >
                  ${(p.unit_margin_usd ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 font-mono">${(p.breakeven_benchmark_price_usd ?? 0).toFixed(2)}</td>
                <td className="px-4 py-2 font-mono">{p.annual_volume_mt.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
