"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  TrendingDown,
  Gauge,
  ShieldAlert,
  MapPin,
  SlidersHorizontal,
  FileSpreadsheet,
  Activity,
  Layers,
  Search,
  Pickaxe,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { MiningSitesMap } from "@/components/MiningSitesMap";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  return `$${n.toFixed(0)}`;
}

export default function DashboardPage() {
  const [filterType, setFilterType] = useState<"all" | "complete" | "partial">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => api.getIssuers(),
  });

  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);
  const completeWithRli = complete.filter((i) => i.rli_years != null);
  const avgRli =
    completeWithRli.length > 0
      ? completeWithRli.reduce((s, i) => s + (i.rli_years ?? 0), 0) / completeWithRli.length
      : null;
  const worstCliff = issuers
    ? [...issuers]
        .filter((i) => i.license_cliff_3y != null)
        .sort((a, b) => (b.license_cliff_3y ?? 0) - (a.license_cliff_3y ?? 0))[0]
    : null;

  let filteredLeaderboard = issuers ? [...issuers] : [];
  if (filterType === "complete") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "LENGKAP");
  } else if (filterType === "partial") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "PARSIAL");
  }
  if (searchQuery.trim()) {
    filteredLeaderboard = filteredLeaderboard.filter(
      (i) =>
        i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  filteredLeaderboard.sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-up">
      {/* ── 1. Top Executive KPI Cards (shadcn/ui Card) ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 shadow-xl hover:border-emerald-500/30 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/80 via-emerald-400 to-transparent" />
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Gauge className="h-4 w-4" />
              </div>
              <Badge variant="success">Live DCF M6</Badge>
            </div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-3">
              Reserve-Backed Value
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              7 emiten LENGKAP · Nilai wajar fisik
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-emerald-400">
              {isLoading ? "——" : fmtUSD(totalRbv, 2)}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Valuasi finite annuity DCF cadangan terbukti (hurdle rate 12%).
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 shadow-xl hover:border-cyan-500/30 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/80 via-cyan-400 to-transparent" />
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <TrendingDown className="h-4 w-4" />
              </div>
              <Badge variant="cyan">Geologi M2</Badge>
            </div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-3">
              Rata-rata Sisa Umur (RLI)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Produksi tahunan vs cadangan terbukti
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-cyan-400">
              {isLoading ? "——" : avgRli != null ? `${avgRli.toFixed(1)} thn` : "—"}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Cadangan terbukti dibagi laju ekstraksi batubara tahunan aktual.
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-800/80 bg-gradient-to-b from-[#0e172a]/90 to-[#080d19]/90 shadow-xl hover:border-amber-500/30 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/80 via-amber-400 to-transparent" />
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <Badge variant="warning">Izin ESDM M3</Badge>
            </div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-3">
              License Cliff 3-Thn Terbesar
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Risiko kedaluwarsa izin konsesi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-amber-400 truncate">
              {isLoading ? "——" : worstCliff ? `${worstCliff.symbol} · ${worstCliff.license_cliff_3y?.toFixed(0)}%` : "—"}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Porsi volume produksi yang izin IUP-nya jatuh tempo dalam ≤ 3 tahun.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ── 2. Main Workspace: Map & Leaderboard ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Peta Sebaran Konsesi Tambang
              </h2>
              <Badge variant="secondary" className="font-mono text-[10px]">
                52 situs GPS
              </Badge>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Peta penuh <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-xl" style={{ minHeight: 400 }}>
            <MiningSitesMap compact />
          </div>
        </div>

        {/* Leaderboard Column (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="flex h-full flex-col border-slate-800/80 bg-[#080d19]/90 shadow-2xl p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Ground Truth Leaderboard
                </CardTitle>
                <CardDescription className="mt-0.5 text-[11px] text-slate-400">
                  Skor komposit fundamental tambang 0–100 (M8)
                </CardDescription>
              </div>
              <Link
                href="/divergence"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
              >
                Divergence <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Filter tabs & Search Input (shadcn Input & Button) */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-0.5 text-[11px]">
                {(["all", "complete", "partial"] as const).map((f) => {
                  const labels = { all: `Semua (${issuers?.length ?? 9})`, complete: "Lengkap (7)", partial: "Parsial (2)" };
                  return (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                        filterType === f
                          ? "bg-slate-800 text-amber-400 font-bold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Filter emiten..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-[11px]"
                />
              </div>
            </div>

            {/* Rows List with Progress Indicator */}
            <ol className="flex-1 space-y-1.5 overflow-y-auto pr-0.5" style={{ maxHeight: 380 }}>
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <li key={i} className="skeleton h-12 rounded-xl" />
                ))}

              {!isLoading && filteredLeaderboard.map((issuer, idx) => {
                const score = issuer.ground_truth_score;
                const scorePct = score != null ? Math.min(100, Math.max(0, score)) : 0;
                const topThree = idx < 3;
                return (
                  <li key={issuer.symbol}>
                    <Link
                      href={`/issuer/${issuer.symbol}`}
                      className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all hover:border-amber-500/40 hover:bg-slate-800/80 ${
                        topThree
                          ? "border-amber-500/20 bg-amber-500/5"
                          : "border-slate-800/70 bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 text-right text-[11px] font-mono font-bold ${
                            topThree ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-white group-hover:text-amber-300">
                              {issuer.symbol}
                            </span>
                            <ConfidenceBadge dataQuality={issuer.data_quality} />
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
                            {issuer.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Progress Bar (shadcn Progress) */}
                        <div className="hidden sm:block w-16">
                          <Progress value={scorePct} />
                        </div>
                        <span className="min-w-[36px] text-right font-mono text-sm font-black text-amber-400">
                          {score != null ? score.toFixed(1) : "—"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-amber-400" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>

            <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
              <span>Klik baris untuk rincian RLI &amp; Evidence</span>
              <span className="font-mono text-slate-400">9 Emiten · IDX Mining</span>
            </div>
          </Card>
        </div>
      </section>

      {/* ── 3. Feature Deep Dive Grid (shadcn Cards) ── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Alat Analisis Lanjutan
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NavCard
            href="/cost-curve"
            icon={TrendingDown}
            title="Kurva Biaya Nasional"
            desc="Cash cost per ton vs harga pasar acuan ICI-4 ($85/t)"
            accent="emerald"
          />
          <NavCard
            href="/scenario"
            icon={SlidersHorizontal}
            title="Scenario Studio"
            desc="Simulasi shock harga & tarif impor batubara real-time"
            accent="cyan"
          />
          <NavCard
            href="/divergence"
            icon={Activity}
            title="Matriks Divergensi"
            desc="RBV vs Market Cap — temukan emiten undervalued"
            accent="indigo"
          />
          <NavCard
            href="/coverage"
            icon={FileSpreadsheet}
            title="Audit Kejujuran"
            desc="Data provenance & audit saldo kredit API (405/1000)"
            accent="amber"
          />
        </div>
      </section>

      {/* ── 4. Provenance & Transparency Banner ── */}
      <Card className="border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0e1830]/70 to-slate-900/90 p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <Layers className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">100% Data Provenance · Zero Black-Box</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Setiap metrik dihitung deterministik dari respon mentah Sectors API dan dapat diverifikasi via{" "}
              <span className="text-amber-400 font-semibold">Evidence Drawer</span> di halaman emiten.
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0 gap-2 font-bold">
          <Link href="/methodology">
            <Pickaxe className="h-3.5 w-3.5 text-amber-400" />
            <span>Lihat Rumus Matematis M1–M9</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: "emerald" | "cyan" | "amber" | "indigo";
}) {
  const cfg = {
    emerald: {
      icon: "text-emerald-400",
      border: "hover:border-emerald-500/30 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    },
    cyan: {
      icon: "text-cyan-400",
      border: "hover:border-cyan-500/30 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]",
    },
    amber: {
      icon: "text-amber-400",
      border: "hover:border-amber-500/30 hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]",
    },
    indigo: {
      icon: "text-indigo-400",
      border: "hover:border-indigo-500/30 hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]",
    },
  }[accent];

  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#080d19]/80 p-4 sm:p-5 transition-all ${cfg.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-5 w-5 ${cfg.icon}`} />
        <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{desc}</p>
      </div>
    </Link>
  );
}
