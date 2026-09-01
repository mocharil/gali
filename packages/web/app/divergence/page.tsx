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
import {
  Card,
  CardTitle,
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

export default function DivergencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["flow-overlay"],
    queryFn: () => api.getFlowOverlay(),
  });

  const issuers = data?.issuers ?? [];
  const sorted = [...issuers].sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-up">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1.5 py-1 px-3 border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span>M9 Market Divergence &amp; Flow Overlay</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white">Market Divergence Engine</h1>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-300">
            Membandingkan Ground Truth Score (kondisi cadangan fisik dan fundamental tambang) dengan valuasi pasar modal
            dan arus dana asing (foreign flow), untuk mengidentifikasi emiten yang mengalami mispricing atau diskon fundamental.
          </p>
        </div>
      </div>

      {/* ── 2. 4 Quadrants Explanation Cards (shadcn Cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Kuadran I</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-bold text-white text-sm">Fundamental Kuat / Terdiskon</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Skor cadangan &gt; 50, umur tambang panjang, valuasi pasar masih di bawah intrinsic Reserve-Backed Value.
          </p>
        </Card>

        <Card className="border-cyan-500/30 bg-cyan-500/5 p-5 space-y-2 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Kuadran II</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-bold text-white text-sm">Premium / Fair Valued</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Fundamental tinggi dan pasar mengapresiasi dengan valuasi wajar atau sedikit premium.
          </p>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 p-5 space-y-2 hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Kuadran III</span>
            <TrendingDown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="font-bold text-white text-sm">Spekulatif / Overvalued</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Harga saham tinggi namun cadangan menipis atau risiko perizinan (license cliff) tinggi.
          </p>
        </Card>

        <Card className="border-rose-500/30 bg-rose-500/5 p-5 space-y-2 hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Kuadran IV</span>
            <Info className="h-4 w-4 text-rose-400" />
          </div>
          <div className="font-bold text-white text-sm">Menipis / High Risk</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Cadangan fisik rendah, umur tambang &lt; 10 thn, biaya operasional di atas kuartil 3.
          </p>
        </Card>
      </div>

      {/* ── 3. Main Divergence Table (shadcn Table) ── */}
      <Card className="border-slate-800/80 bg-[#080d19]/90 p-5 space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Matriks Divergensi Emiten Batubara IDX
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Diurutkan berdasarkan Ground Truth Score
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Emiten</TableHead>
                <TableHead className="text-right">Skor Fisik (M8)</TableHead>
                <TableHead className="text-right">Market Cap (IDR)</TableHead>
                <TableHead className="text-right">Gap RBV vs Mkt (%)</TableHead>
                <TableHead className="text-right">Foreign Flow (30H)</TableHead>
                <TableHead className="text-center">Kuadran Divergensi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item, idx) => {
                const score = item.ground_truth_score ?? 0;
                const quadrant = item.quadrant ?? "Kuadran II (Fair)";
                const gap = item.rbv_gap_pct;
                const flow = item.net_foreign_flow_30d_idr;

                let badgeVariant: "success" | "cyan" | "warning" | "destructive" = "cyan";
                if (quadrant.includes("I") || quadrant.toLowerCase().includes("terdiskon")) {
                  badgeVariant = "success";
                } else if (quadrant.includes("IV") || quadrant.toLowerCase().includes("menipis") || quadrant.toLowerCase().includes("risk")) {
                  badgeVariant = "destructive";
                } else if (quadrant.includes("III") || quadrant.toLowerCase().includes("spekulatif")) {
                  badgeVariant = "warning";
                }

                return (
                  <TableRow key={item.symbol} className="font-mono">
                    <TableCell className="text-slate-500 font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-bold text-white">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-[160px]">
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-amber-400 text-sm">
                      {score > 0 ? score.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {item.market_cap_idr != null ? `Rp ${(item.market_cap_idr / 1e12).toFixed(1)}T` : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${gap != null && gap > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {gap != null ? `${gap > 0 ? "+" : ""}${gap.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className={`text-right ${flow != null && flow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {flow != null ? `Rp ${(flow / 1e9).toFixed(1)}B` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={badgeVariant}>{quadrant}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/issuer/${item.symbol}`} className="gap-1 font-sans">
                          <span>Analisis</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
