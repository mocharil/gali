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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default function CostCurvePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cost-curve", "Coal"],
    queryFn: () => api.getCostCurve("Coal"),
  });

  const points = data?.points ?? [];
  const benchmark = data?.benchmark_price_usd ?? 85;
  const lowestCost = points.length > 0 ? points[0] : null;
  const totalCapacity = points.length > 0 ? points[points.length - 1].cumulative_volume_mt : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-up">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>M5 National Cash Cost Curve</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white">Kurva Biaya Nasional — Batubara</h1>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-300">
            Setiap tangga merepresentasikan emiten batubara IDX, diurutkan dari cash cost per ton termurah.
            Lebar tangga mencerminkan volume produksi tahunan (Mt). Emiten di bawah garis harga benchmark
            memiliki margin tunai positif.
          </p>
        </div>
      </div>

      {/* ── 2. 3 Executive Metric Tiles (shadcn Cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 hover:border-emerald-500/30 transition-all">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Produsen Biaya Terendah (Q1)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-emerald-400">
                {lowestCost ? lowestCost.symbol : "—"}
              </span>
              <span className="font-mono text-sm text-slate-400">
                {lowestCost ? `$${lowestCost.cash_cost_per_ton_usd.toFixed(2)}/t` : ""}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Margin tunai tertinggi di harga pasar berjalan</p>
          </CardContent>
        </Card>

        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 hover:border-amber-500/30 transition-all">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Harga Acuan Benchmark (ICI-4 / FOB)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mt-1 font-mono text-2xl font-black text-amber-400">
              ${benchmark.toFixed(2)}/t
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Garis batas impas operasional (cash breakeven)</p>
          </CardContent>
        </Card>

        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 hover:border-cyan-500/30 transition-all">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Kapasitas Teranalisis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mt-1 font-mono text-2xl font-black text-cyan-400">
              {totalCapacity.toFixed(1)} Mt/thn
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Volume produksi tahunan kumulatif 7 emiten lengkap</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Main Interactive Step Chart (shadcn Card) ── */}
      <Card className="p-6 border-slate-800/80 bg-[#080d19]/90 space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            Visualisasi Tangga Biaya Kumulatif (Cumulative Step Curve)
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            X: Kapasitas Kumulatif (Mt) | Y: Cash Cost ($/t)
          </Badge>
        </div>

        {isLoading ? (
          <div className="h-80 w-full flex items-center justify-center">
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : points.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-500">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <span>Data kurva biaya belum tersedia</span>
          </div>
        ) : (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="cumulative_volume_mt"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{
                    value: "Kapasitas Kumulatif Produksi Batubara (Juta Ton / Tahun)",
                    position: "insideBottom",
                    offset: -10,
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{
                    value: "Cash Cost (USD / Ton)",
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
                      const margin = benchmark - d.cash_cost_per_ton_usd;
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs font-mono space-y-1">
                          <div className="font-bold text-amber-400 text-sm">{d.symbol}</div>
                          <div className="text-slate-300">{d.name}</div>
                          <div className="text-slate-400 pt-1 border-t border-slate-800">
                            Cash Cost: <span className="font-bold text-white">${d.cash_cost_per_ton_usd.toFixed(2)}/t</span>
                          </div>
                          <div className="text-slate-400">
                            Volume: <span className="text-white">{d.production_mt.toFixed(1)} Mt</span> (Kumulatif: {d.cumulative_volume_mt.toFixed(1)} Mt)
                          </div>
                          <div className={margin >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            Margin Bersih: ${margin.toFixed(2)}/t ({margin >= 0 ? "PROFIT" : "LOSS"})
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={benchmark}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Benchmark: $${benchmark.toFixed(2)}/t`,
                    fill: "#f59e0b",
                    fontSize: 12,
                    position: "insideTopRight",
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey="cash_cost_per_ton_usd"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="#10b981"
                  fillOpacity={0.15}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── 4. Detailed Cost Table (shadcn Table) ── */}
      <Card className="border-slate-800/80 bg-[#080d19]/90 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Tabel Rincian Cash Cost &amp; Margin Per Emiten
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {points.length} Emiten
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Emiten</TableHead>
              <TableHead className="text-right">Volume (Mt)</TableHead>
              <TableHead className="text-right">Kumulatif (Mt)</TableHead>
              <TableHead className="text-right">Cash Cost ($/t)</TableHead>
              <TableHead className="text-right">Margin vs Benchmark</TableHead>
              <TableHead className="text-center">Status Kuartil</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p, idx) => {
              const margin = benchmark - p.cash_cost_per_ton_usd;
              const isQ1 = idx < 2;
              return (
                <TableRow key={p.symbol} className="font-mono">
                  <TableCell className="text-slate-500 font-bold">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{p.symbol}</span>
                      {isQ1 && <Badge variant="success" className="text-[9px] px-1 py-0">Q1 Cost</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans truncate max-w-[150px]">
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {p.annual_volume_mt.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-slate-400">
                    {p.cumulative_volume_mt.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    ${p.cash_cost_per_ton_usd.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${margin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {margin >= 0 ? `+$${margin.toFixed(2)}` : `-$${Math.abs(margin).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={margin >= 0 ? "success" : "destructive"}>
                      {margin >= 0 ? "Margin Positif" : "Di Bawah Air"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="xs">
                      <Link href={`/issuer/${p.symbol}`} className="gap-1 font-sans">
                        <span>Detail</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
