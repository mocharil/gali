"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  TrendingDown,
  Gauge,
  ShieldAlert,
  Sparkles,
  MapPin,
  SlidersHorizontal,
  FileSpreadsheet,
  Activity,
  Layers,
  Search,
  ChevronRight,
  Pickaxe,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { MiningSitesMap } from "@/components/MiningSitesMap";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  return `$${n.toFixed(0)}`;
}

const WORKFLOW_STEPS = [
  { step: "01", label: "Peta GPS Konsesi", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", href: "/map" },
  { step: "02", label: "Sisa Umur Tambang (RLI)", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10", href: "/issuer/ADRO" },
  { step: "03", label: "Cash Cost Breakeven", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", href: "/cost-curve" },
  { step: "04", label: "Scenario Stress-Test", color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/10", href: "/scenario" },
];

export default function HomePage() {
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#0d1829] via-[#090e1a] to-[#060911] p-7 sm:p-10 shadow-2xl animate-fade-up">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-500/12 blur-[80px]" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-indigo-500/8 blur-[60px]" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-400 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sectors Hackathon 2026 · Track 3 — Market Intelligence</span>
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
            Gali lebih dalam dari{" "}
            <span className="text-gradient-amber">kode sahamnya.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-[15px]">
            GALI menilai emiten batubara IDX dari tambang fisiknya — berapa ton cadangan tersisa, berapa tahun
            lagi habis (RLI), estimasi cash cost per ton, risiko kedaluwarsa izin ESDM, serta konsentrasi
            pasar ekspor — menghubungkan aset geologis langsung ke valuasi pasar modal.
          </p>

          {/* Workflow pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Alur Analisis:</span>
            {WORKFLOW_STEPS.map((s, i) => (
              <Link
                key={s.step}
                href={s.href}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all hover:scale-105 hover:shadow-lg ${s.color} ${s.border} ${s.bg}`}
              >
                <span className="opacity-60">{s.step}</span>
                {s.label}
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="ml-1 h-3 w-3 opacity-40" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all hover:bg-amber-400 hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] active:scale-95"
            >
              <MapPin className="h-4 w-4" />
              Lihat Peta Konsesi
            </Link>
            <Link
              href="/scenario"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-sm font-bold text-white transition-all hover:border-slate-600 hover:bg-slate-700 active:scale-95"
            >
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              Scenario Studio
            </Link>
          </div>
        </div>
      </section>

      {/* ── Executive KPI Cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-up animate-fade-up-1">
        <StatCard
          icon={Gauge}
          label="Reserve-Backed Value"
          sublabel="7 emiten LENGKAP · DCF cadangan fisik"
          value={fmtUSD(totalRbv, 2)}
          sub="Valuasi DCF terbukti · discount rate 10%"
          accentColor="emerald"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingDown}
          label="Rata-rata Sisa Umur (RLI)"
          sublabel="Produksi aktual vs cadangan terbukti"
          value={avgRli != null ? `${avgRli.toFixed(1)} thn` : "—"}
          sub="Reserves ÷ production rate aktual"
          accentColor="cyan"
          loading={isLoading}
        />
        <StatCard
          icon={ShieldAlert}
          label="License Cliff 3-Tahun"
          sublabel="Emiten dengan risiko izin tertinggi"
          value={worstCliff ? `${worstCliff.symbol} · ${worstCliff.license_cliff_3y?.toFixed(0)}%` : "—"}
          sub="Porsi produksi berizin akan habis ≤ 3 thn"
          accentColor="amber"
          loading={isLoading}
        />
      </section>

      {/* ── Map + Leaderboard ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-up animate-fade-up-2">
        {/* Map */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Peta Konsesi Nasional
              </h2>
              <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                52 situs ber-GPS
              </span>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Peta penuh <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl" style={{ minHeight: 340 }}>
            <MiningSitesMap compact />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-5">
          <div className="glass-card flex h-full flex-col rounded-2xl border border-slate-800 p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Ground Truth Leaderboard
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Skor komposit fundamental 0–100</p>
              </div>
              <Link
                href="/divergence"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
              >
                Divergence <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Filter tabs */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-[11px]">
                {(["all", "complete", "partial"] as const).map((f) => {
                  const labels = { all: `Semua (${issuers?.length ?? 9})`, complete: "Lengkap (7)", partial: "Parsial (2)" };
                  const activeColors = { all: "text-amber-400", complete: "text-emerald-400", partial: "text-amber-400" };
                  return (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                        filterType === f
                          ? `bg-slate-800 ${activeColors[f]} shadow-sm`
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-6 pr-2 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Rows */}
            <ol className="flex-1 space-y-1.5 overflow-y-auto pr-0.5" style={{ maxHeight: 340 }}>
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <li key={i} className="skeleton h-11 rounded-xl" />
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
                          : "border-slate-800/60 bg-slate-900/40"
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
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-[180px]">
                            {issuer.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Score bar */}
                        <div className="hidden sm:block w-16">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="score-bar h-full"
                              style={{ width: `${scorePct}%` }}
                            />
                          </div>
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

              {!isLoading && filteredLeaderboard.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-500">
                  Tidak ada emiten yang cocok.
                </li>
              )}
            </ol>

            <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-500">
              <span>Klik baris untuk rincian RLI &amp; Evidence</span>
              <span className="font-mono text-slate-400">9 Emiten · IDX Mining</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Navigation Cards ── */}
      <section className="animate-fade-up animate-fade-up-3">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Alat Analisis</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NavCard
            href="/cost-curve"
            icon={TrendingDown}
            title="Kurva Biaya Nasional"
            desc="Cash cost per ton vs harga pasar ICI-4"
            accent="emerald"
          />
          <NavCard
            href="/scenario"
            icon={SlidersHorizontal}
            title="Scenario Studio"
            desc="Simulasi shock harga & tarif real-time"
            accent="cyan"
          />
          <NavCard
            href="/divergence"
            icon={Activity}
            title="Matriks Divergensi"
            desc="RBV vs Market Cap — temukan undervalued"
            accent="indigo"
          />
          <NavCard
            href="/coverage"
            icon={FileSpreadsheet}
            title="Audit Kebenaran"
            desc="Data provenance & ledger kredit API"
            accent="amber"
          />
        </div>
      </section>

      {/* ── Transparency Banner ── */}
      <section className="animate-fade-up animate-fade-up-4 overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-r from-slate-900/90 via-[#0e1830]/60 to-slate-900/90 p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <Layers className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">100% Data Provenance · Zero Black-Box</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Setiap angka dihitung deterministik dan dapat diaudit hingga ke respon mentah Sectors API melalui{" "}
              <span className="text-amber-400 font-semibold">Evidence Drawer</span>.
            </p>
          </div>
        </div>
        <Link
          href="/methodology"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-300"
        >
          <Pickaxe className="h-3.5 w-3.5 text-amber-400" />
          Lihat Rumus &amp; Metodologi
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  icon: Icon,
  label,
  sublabel,
  value,
  sub,
  accentColor,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  value: string;
  sub: string;
  accentColor: "emerald" | "cyan" | "amber";
  loading: boolean;
}) {
  const cfg = {
    emerald: { icon: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", val: "text-emerald-400", glow: "hover:shadow-[0_0_28px_rgba(16,185,129,0.15)]" },
    cyan:    { icon: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",       val: "text-cyan-400",    glow: "hover:shadow-[0_0_28px_rgba(6,182,212,0.15)]"   },
    amber:   { icon: "text-amber-400 border-amber-500/20 bg-amber-500/10",    val: "text-amber-400",   glow: "hover:shadow-[0_0_28px_rgba(245,158,11,0.18)]"  },
  }[accentColor];

  return (
    <div className={`glass-card relative overflow-hidden rounded-2xl border border-slate-800 p-5 flex flex-col gap-3 ${cfg.glow} transition-all`}>
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cfg.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
          Live
        </span>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        {sublabel && <div className="text-[10px] text-slate-600 mt-0.5">{sublabel}</div>}
        <div className={`mt-2 font-mono text-3xl font-black leading-none tracking-tight ${loading ? "skeleton text-transparent" : cfg.val}`}>
          {loading ? "——" : value}
        </div>
      </div>

      <p className="border-t border-slate-800/60 pt-2.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

/* ── NavCard ── */
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
    emerald: { icon: "text-emerald-400", border: "hover:border-emerald-500/30 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]" },
    cyan:    { icon: "text-cyan-400",    border: "hover:border-cyan-500/30    hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]"   },
    amber:   { icon: "text-amber-400",   border: "hover:border-amber-500/30   hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]"  },
    indigo:  { icon: "text-indigo-400",  border: "hover:border-indigo-500/30  hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]"  },
  }[accent];

  return (
    <Link
      href={href}
      className={`glass-card group flex flex-col justify-between rounded-2xl border border-slate-800 p-4 sm:p-5 transition-all ${cfg.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-5 w-5 ${cfg.icon}`} />
        <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{desc}</p>
      </div>
    </Link>
  );
}
