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

export default function HomePage() {
  const [filterType, setFilterType] = useState<"all" | "complete" | "partial">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => api.getIssuers(),
  });

  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);
  const avgRli =
    complete.length > 0
      ? complete.reduce((s, i) => s + (i.rli_years ?? 0), 0) / complete.filter((i) => i.rli_years != null).length
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-[#0a101d]/80 to-[#060911] p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Sectors Hackathon 2026 · Track 3 — Market Intelligence</span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl sm:leading-[1.15]">
            Gali lebih dalam dari{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              kode sahamnya.
            </span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            GALI menilai emiten komoditas IDX dari tambang fisiknya — berapa ton cadangan tersisa, berapa
            tahun lagi habis (RLI), estimasi cash cost per ton, risiko kedaluwarsa izin ESDM, serta konsentrasi
            pasar ekspor — menghubungkan aset geologis langsung ke valuasi pasar modal.
          </p>

          {/* Workflow badges */}
          <div className="mt-6 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Alur Fundamental:</span>
            <span className="rounded-md bg-slate-800/80 px-2 py-1 font-mono text-[11px] text-amber-400 border border-slate-700/60">
              1. Peta Cadangan GPS
            </span>
            <span>➔</span>
            <span className="rounded-md bg-slate-800/80 px-2 py-1 font-mono text-[11px] text-cyan-400 border border-slate-700/60">
              2. Sisa Umur Tambang (RLI)
            </span>
            <span>➔</span>
            <span className="rounded-md bg-slate-800/80 px-2 py-1 font-mono text-[11px] text-emerald-400 border border-slate-700/60">
              3. Cash Cost Breakeven
            </span>
            <span>➔</span>
            <span className="rounded-md bg-slate-800/80 px-2 py-1 font-mono text-[11px] text-indigo-400 border border-slate-700/60">
              4. Scenario Studio
            </span>
          </div>
        </div>
      </section>

      {/* Top 3 Executive KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Gauge}
          label="Reserve-Backed Value (7 emiten lengkap)"
          value={fmtUSD(totalRbv, 2)}
          sub="Valuasi DCF cadangan fisik terbukti (10% discount rate)"
          accentColor="emerald"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingDown}
          label="Rata-rata Umur Cadangan (RLI)"
          value={avgRli != null ? `${avgRli.toFixed(1)} tahun` : "—"}
          sub="Cadangan terbukti vs laju produksi tahunan aktual"
          accentColor="cyan"
          loading={isLoading}
        />
        <StatCard
          icon={ShieldAlert}
          label="License Cliff 3-Tahun Tertinggi"
          value={worstCliff ? `${worstCliff.symbol} · ${worstCliff.license_cliff_3y?.toFixed(0)}%` : "—"}
          sub="Porsi produksi yang izin ESDM-nya akan habis dalam 3 thn"
          accentColor="amber"
          loading={isLoading}
        />
      </section>

      {/* Main Content: Interactive Map & Leaderboard */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Peta Sebaran Konsesi Tambang (52 Situs Ber-GPS)
              </h2>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Buka Peta Penuh <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
            <MiningSitesMap compact />
          </div>
        </div>

        {/* Leaderboard Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="glass-card flex-1 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Ground Truth Leaderboard
                  </h2>
                  <p className="text-[11px] text-slate-400">Skor komposit fundamental tambang (0–100)</p>
                </div>
                <Link
                  href="/divergence"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Divergensi <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex rounded-lg bg-slate-900/80 p-0.5 border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterType === "all" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua ({issuers?.length ?? 9})
                  </button>
                  <button
                    onClick={() => setFilterType("complete")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterType === "complete" ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Lengkap (7)
                  </button>
                  <button
                    onClick={() => setFilterType("partial")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterType === "partial" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Parsial (2)
                  </button>
                </div>

                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-6 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* List */}
              <ol className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {isLoading &&
                  Array.from({ length: 9 }).map((_, i) => (
                    <li key={i} className="h-10 animate-pulse rounded-xl bg-slate-900/60" />
                  ))}

                {filteredLeaderboard.map((issuer, idx) => {
                  const score = issuer.ground_truth_score;
                  const scorePct = score != null ? Math.min(100, Math.max(0, score)) : 0;
                  return (
                    <li key={issuer.symbol}>
                      <Link
                        href={`/issuer/${issuer.symbol}`}
                        className="group flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm transition-all hover:border-amber-500/40 hover:bg-slate-800/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-4 text-right text-[11px] font-mono text-slate-500 group-hover:text-amber-400">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
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

                        <div className="flex items-center gap-3">
                          {/* Mini Progress Bar */}
                          <div className="hidden sm:flex flex-col items-end w-16">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="font-mono text-sm font-black text-amber-400 min-w-[36px] text-right">
                            {score != null ? score.toFixed(1) : "—"}
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Klik emiten untuk rincian RLI & Evidence</span>
              <span className="font-mono text-slate-400">9 Emiten Batubara IDX</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/cost-curve"
          icon={TrendingDown}
          title="Kurva Biaya Nasional"
          desc="Analisis cumulative cash cost per ton terhadap harga pasar acuan ICI-2 / ICI-4."
          accent="text-emerald-400"
        />
        <NavCard
          href="/scenario"
          icon={SlidersHorizontal}
          title="Scenario Studio"
          desc="Simulasi real-time dampak shock harga batubara dan tarif impor ke valuasi RBV."
          accent="text-cyan-400"
        />
        <NavCard
          href="/divergence"
          icon={Activity}
          title="Matriks Divergensi"
          desc="Identifikasi emiten undervalued atau overvalued dengan membandingkan RBV vs Market Cap."
          accent="text-indigo-400"
        />
        <NavCard
          href="/coverage"
          icon={FileSpreadsheet}
          title="Audit Kebenaran Data"
          desc="Transparansi data mentah Sectors API dan audit ledger pengeluaran kredit (405/1000)."
          accent="text-amber-400"
        />
      </section>

      {/* Transparency & Provenance Banner */}
      <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">100% Data Provenance & Zero Black-Box</h3>
            <p className="text-xs text-slate-400">
              Setiap angka dihitung secara deterministik dan dapat diaudit hingga ke baris respon mentah Sectors API melalui Evidence Drawer.
            </p>
          </div>
        </div>
        <Link
          href="/methodology"
          className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Lihat Rumus &amp; Metodologi →
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentColor,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accentColor: "emerald" | "cyan" | "amber";
  loading: boolean;
}) {
  const accentClasses = {
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    cyan: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  };

  const textColors = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-5 flex flex-col justify-between relative overflow-hidden group">
      <div>
        <div className="flex items-center justify-between">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accentClasses[accentColor]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Live Compute</span>
        </div>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className={`mt-1 font-mono text-3xl font-black ${loading ? "animate-pulse text-slate-700" : textColors[accentColor]}`}>
          {loading ? "—" : value}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">{sub}</p>
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
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card group flex flex-col justify-between rounded-2xl border border-slate-800 p-5 transition-all hover:border-amber-500/40 hover:bg-slate-800/60"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${accent}`} />
          <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
        </div>
        <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">{title}</h3>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
