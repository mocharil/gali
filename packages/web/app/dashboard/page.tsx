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
  ArrowUpDown,
  Download,
  Scale,
  Sparkles,
  Trophy,
  ExternalLink,
  Bot,
} from "lucide-react";
import { api } from "@/lib/api";
import { MiningSitesMap } from "@/components/MiningSitesMap";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { AiCopilotModal } from "@/components/AiCopilotModal";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { NumberTicker, BorderBeam } from "@/components/magicui";

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
  const [aiFilter, setAiFilter] = useState<"none" | "low_cost" | "deep_value" | "long_life" | "cliff_risk">("none");
  const [dashboardAiModalOpen, setDashboardAiModalOpen] = useState(false);
  const [dashboardAiQuery, setDashboardAiQuery] = useState("");

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

  const [tableSortField, setTableSortField] = useState<
    "ground_truth_score" | "rli_years" | "reserve_backed_value_usd" | "market_cap_usd" | "rbv_gap_pct" | "cash_cost_per_ton_usd" | "license_cliff_3y"
  >("ground_truth_score");
  const [tableSortOrder, setTableSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableSortField(field);
      setTableSortOrder("desc");
    }
  };

  const exportUniverseCSV = () => {
    if (!issuers || issuers.length === 0) return;
    const headers = [
      "Ticker",
      "Company Name",
      "Data Quality",
      "Ground Truth Score",
      "RLI (Years)",
      "Reserve-Backed Value (USD)",
      "Market Cap (USD)",
      "RBV Gap (%)",
      "Cash Cost / Ton (USD)",
      "3Y License Cliff (%)",
      "Top Export Destination",
      "Top Export Share (%)",
    ];
    const rows = issuers.map((i) => [
      i.symbol,
      `"${i.name.replace(/"/g, '""')}"`,
      i.data_quality,
      i.ground_truth_score ?? "",
      i.rli_years ? i.rli_years.toFixed(2) : "",
      i.reserve_backed_value_usd ? i.reserve_backed_value_usd.toFixed(0) : "",
      i.market_cap_usd ? i.market_cap_usd.toFixed(0) : "",
      i.rbv_gap_pct ? i.rbv_gap_pct.toFixed(2) : "",
      i.cash_cost_per_ton_usd ? i.cash_cost_per_ton_usd.toFixed(2) : "",
      i.license_cliff_3y ? i.license_cliff_3y.toFixed(2) : "",
      i.top_destination ?? "",
      i.top_destination_pct ? i.top_destination_pct.toFixed(2) : "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gali_idx_mining_universe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let filteredLeaderboard = issuers ? [...issuers] : [];
  if (filterType === "complete") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "LENGKAP");
  } else if (filterType === "partial") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.data_quality === "PARSIAL");
  }

  // AI-guided screening filter
  if (aiFilter === "low_cost") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.cash_cost_per_ton_usd != null && i.cash_cost_per_ton_usd <= 35);
  } else if (aiFilter === "deep_value") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.rbv_gap_pct != null && i.rbv_gap_pct < -25);
  } else if (aiFilter === "long_life") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => i.rli_years != null && i.rli_years >= 30);
  } else if (aiFilter === "cliff_risk") {
    filteredLeaderboard = filteredLeaderboard.filter((i) => (i.license_cliff_3y ?? 0) > 0);
  }

  if (searchQuery.trim()) {
    filteredLeaderboard = filteredLeaderboard.filter(
      (i) =>
        i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  filteredLeaderboard.sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  const sortedTableData = [...filteredLeaderboard].sort((a, b) => {
    const valA = a[tableSortField] ?? (tableSortOrder === "asc" ? Infinity : -Infinity);
    const valB = b[tableSortField] ?? (tableSortOrder === "asc" ? Infinity : -Infinity);
    if (typeof valA === "number" && typeof valB === "number") {
      return tableSortOrder === "asc" ? valA - valB : valB - valA;
    }
    return 0;
  });

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
              7 COMPLETE issuers · Physical fair value
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-emerald-400">
              {isLoading ? (
                "——"
              ) : (
                <NumberTicker
                  value={totalRbv / 1e9}
                  decimalPlaces={2}
                  prefix="$"
                  suffix="B"
                />
              )}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Finite-annuity DCF valuation of proven reserves (12% hurdle rate).
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
              Average Remaining Life (RLI)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Annual production vs proven reserves
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-cyan-400">
              {isLoading ? (
                "——"
              ) : avgRli != null ? (
                <NumberTicker value={avgRli} decimalPlaces={1} suffix=" yrs" />
              ) : (
                "—"
              )}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Proven reserves divided by the actual annual coal extraction rate.
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
              <Badge variant="warning">MEMR License M3</Badge>
            </div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-3">
              Largest 3-Year License Cliff
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Concession license expiry risk
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="font-mono text-3xl font-black tracking-tight text-amber-400 truncate">
              {isLoading ? (
                "——"
              ) : worstCliff ? (
                <>
                  {worstCliff.symbol} ·{" "}
                  <NumberTicker
                    value={worstCliff.license_cliff_3y ?? 0}
                    decimalPlaces={0}
                    suffix="%"
                  />
                </>
              ) : (
                "—"
              )}
            </div>
            <p className="border-t border-slate-800/70 pt-2.5 mt-3 text-[11px] text-slate-400 leading-relaxed">
              Share of production volume whose IUP license expires within ≤ 3 years.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ── 1.5. GALI AI Mining Screener & Recommendation Console ── */}
      <section className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#0f172a] via-[#090f1d] to-[#050811] p-5 sm:p-6 shadow-[0_0_40px_rgba(245,158,11,0.15)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                GALI AI Screener &amp; Real-Time Recommendation Engine
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                9 Issuers · 52 Mines
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Gunakan filter AI berbasis model fundamental untuk menyaring emiten tahan krisis, diskon valuasi cadangan, atau risiko izin konsesi.
            </p>
          </div>

          {/* Quick Natural Language Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center min-w-[260px] sm:min-w-[320px]">
              <Search className="absolute left-3 h-3.5 w-3.5 text-amber-400" />
              <input
                type="text"
                value={dashboardAiQuery}
                onChange={(e) => setDashboardAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dashboardAiQuery.trim()) {
                    setDashboardAiModalOpen(true);
                  }
                }}
                placeholder="Tanya AI (misal: 'BUMI vs BYAN' atau 'tahan krisis')..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-20 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => {
                  if (dashboardAiQuery.trim()) {
                    setDashboardAiModalOpen(true);
                  } else {
                    setDashboardAiQuery("Rekomendasi emiten batubara terbaik");
                    setDashboardAiModalOpen(true);
                  }
                }}
                className="absolute right-1.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3 w-3" />
                <span>Tanya AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Bot className="h-3.5 w-3.5 text-amber-400" />
            Skrining AI:
          </span>
          <button
            onClick={() => setAiFilter("none")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              aiFilter === "none"
                ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span>Semua 9 Emiten</span>
          </button>

          <button
            onClick={() => setAiFilter("low_cost")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              aiFilter === "low_cost"
                ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>⚡ AI Pick: Biaya Kas Terendah (&le; $35/t)</span>
          </button>

          <button
            onClick={() => setAiFilter("deep_value")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              aiFilter === "deep_value"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>💎 AI Pick: Diskon Valuasi RBV (&lt; -25%)</span>
          </button>

          <button
            onClick={() => setAiFilter("long_life")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              aiFilter === "long_life"
                ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>🛡️ AI Pick: Benteng Cadangan (&ge; 30 Thn)</span>
          </button>

          <button
            onClick={() => setAiFilter("cliff_risk")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              aiFilter === "cliff_risk"
                ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-rose-500/50 hover:text-rose-300"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>⚠️ AI Alert: Risiko Izin Kadaluarsa (Cliff &gt; 0%)</span>
          </button>
        </div>

        {/* AI Insight Callout banner depending on active filter */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">💡 AI Active Insight:</span>
            <span>
              {aiFilter === "low_cost" && "BUMI ($15.70/t) dan BYAN ($29.80/t) adalah emiten dengan ketahanan margin tertinggi terhadap penurunan harga batubara Newcastle/ICI-4."}
              {aiFilter === "deep_value" && "BUMI (-73.7%), GEMS (-68.4%), dan PTBA (-35.4%) diperdagangkan pada diskon terdalam terhadap valuasi wajar DCF cadangan fisiknya."}
              {aiFilter === "long_life" && "PTBA (67.8 thn), BYAN (40.2 thn), dan BUMI (31.5 thn) memiliki ketahanan cadangan batubara terlama yang menjamin kelangsungan operasional multi-dekade."}
              {aiFilter === "cliff_risk" && "GEMS menghadapi 100% kadaluarsa izin konsesi dalam 3 tahun ke depan yang membutuhkan persetujuan perpanjangan regulasi ESDM."}
              {aiFilter === "none" && "BYAN memimpin peringkat 1 komposit M8 (78.2), disusul PTBA (74.0) dan GEMS (71.5). Klik filter di atas atau tombol 'Tanya AI' untuk rekomendasi mendalam."}
            </span>
          </div>
          <button
            onClick={() => {
              const queryMap: Record<string, string> = {
                low_cost: "Emiten mana yang paling tahan krisis harga batubara?",
                deep_value: "Emiten mana yang valuasinya paling terdiskon terhadap cadangan tambang fisik?",
                long_life: "Emiten apa yang punya cadangan batubara paling awet untuk jangka panjang?",
                cliff_risk: "Siapa emiten batubara dengan risiko perpanjangan izin paling kritis?",
                none: "Rekomendasi emiten batubara terbaik",
              };
              setDashboardAiQuery(queryMap[aiFilter]);
              setDashboardAiModalOpen(true);
            }}
            className="text-amber-400 hover:text-amber-300 font-bold shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Analisis Lengkap</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* ── 2. Main Workspace: Map & Leaderboard ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Mining Concession Distribution Map
              </h2>
              <Badge variant="secondary" className="font-mono text-[10px]">
                52 GPS sites
              </Badge>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Full map <ArrowRight className="h-3.5 w-3.5" />
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
                  Composite mining fundamentals score 0–100 (M8)
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
                  const labels = { all: `All (${issuers?.length ?? 9})`, complete: "Complete (7)", partial: "Partial (2)" };
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
                  placeholder="Filter issuers..."
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
                      className={`group relative overflow-hidden flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all hover:border-amber-500/40 hover:bg-slate-800/80 ${
                        topThree
                          ? "border-amber-500/20 bg-amber-500/5"
                          : "border-slate-800/70 bg-slate-900/40"
                      }`}
                    >
                      {idx === 0 && (
                        <BorderBeam
                          size={120}
                          duration={8}
                          colorFrom="#f59e0b"
                          colorTo="#fbbf24"
                        />
                      )}
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
              <span>Click a row for RLI &amp; Evidence details</span>
              <span className="font-mono text-slate-400">9 Issuers · IDX Mining</span>
            </div>
          </Card>
        </div>
      </section>

      {/* ── 2.5. Master Ground-Truth Universe Matrix (Financial & Geological Terminal) ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-100">
                Ground-Truth Valuation &amp; Risk Matrix
              </h2>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                Deterministic M1–M8
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side reconciliation of IDX market valuations against physical mine concessions, RLI, and extraction costs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={exportUniverseCSV}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-500/40 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>Export CSV</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-white"
            >
              <Link href="/compare">
                <Scale className="h-3.5 w-3.5 text-cyan-400" />
                <span>Peer Studio</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#080d19]/90 shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-800/80 bg-slate-950/60">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[170px]">
                  <button
                    onClick={() => handleSort("ground_truth_score")}
                    className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
                  >
                    <span>Issuer</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("ground_truth_score")}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                  >
                    <span>GT Score (M8)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("rli_years")}
                    className="inline-flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    <span>Mine Life (RLI)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("reserve_backed_value_usd")}
                    className="inline-flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <span>Reserve Value (M6)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("market_cap_usd")}
                    className="inline-flex items-center gap-1 hover:text-slate-200 transition-colors"
                  >
                    <span>Market Cap</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("rbv_gap_pct")}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                  >
                    <span>RBV Gap %</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("cash_cost_per_ton_usd")}
                    className="inline-flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <span>Cash Cost / t</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort("license_cliff_3y")}
                    className="inline-flex items-center gap-1 hover:text-rose-400 transition-colors"
                  >
                    <span>3Y Cliff Risk</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Top Destination</TableHead>
                <TableHead className="w-20 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11} className="h-12 text-center text-slate-500">
                      Loading real-time ground truth metrics...
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading &&
                sortedTableData.map((item, idx) => {
                  const score = item.ground_truth_score;
                  const scorePct = score != null ? Math.min(100, Math.max(0, score)) : 0;
                  const rli = item.rli_years;
                  const rbvGap = item.rbv_gap_pct;
                  const cost = item.cash_cost_per_ton_usd;
                  const cliff = item.license_cliff_3y;
                  const isUndervalued = rbvGap != null && rbvGap < 0;

                  return (
                    <TableRow
                      key={item.symbol}
                      className="group border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                    >
                      <TableCell className="text-center font-mono text-xs font-bold text-slate-500 group-hover:text-amber-400">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/issuer/${item.symbol}`}
                          className="flex items-center gap-2 group/link"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs font-black text-white group-hover/link:border-amber-500/50 group-hover/link:text-amber-400 transition-colors">
                            {item.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white group-hover/link:text-amber-300">
                                {item.symbol}
                              </span>
                              <ConfidenceBadge dataQuality={item.data_quality} />
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                              {item.name}
                            </div>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden md:block w-12">
                            <Progress value={scorePct} className="h-1.5" />
                          </div>
                          <span className="font-mono font-bold text-amber-400">
                            {score != null ? score.toFixed(1) : "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {rli != null ? (
                          <span className="font-mono font-bold text-cyan-400">
                            {rli.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">yrs</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400">
                        {fmtUSD(item.reserve_backed_value_usd, 2)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-slate-300">
                        {fmtUSD(item.market_cap_usd, 2)}
                      </TableCell>

                      <TableCell className="text-right">
                        {rbvGap != null ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isUndervalued
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {rbvGap > 0 ? `+${rbvGap.toFixed(1)}%` : `${rbvGap.toFixed(1)}%`}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        {cost != null ? (
                          <span className={cost <= 35 ? "text-emerald-400 font-bold" : "text-slate-300"}>
                            ${cost.toFixed(1)}/t
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {cliff != null ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              cliff >= 50
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : cliff > 0
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {cliff.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-[11px] text-slate-300">
                        {item.top_destination ? (
                          <span>
                            {item.top_destination}{" "}
                            {item.top_destination_pct != null && (
                              <span className="font-mono text-slate-500">
                                ({item.top_destination_pct.toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                            title={`Compare ${item.symbol}`}
                          >
                            <Link href={`/compare?a=${item.symbol}&b=BYAN`}>
                              <Scale className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                            title={`Inspect ${item.symbol}`}
                          >
                            <Link href={`/issuer/${item.symbol}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── 3. Feature Deep Dive Grid (shadcn Cards) ── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Advanced Analysis Tools
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NavCard
            href="/cost-curve"
            icon={TrendingDown}
            title="National Cost Curve"
            desc="Cash cost per ton vs ICI-4 benchmark market price ($85/t)"
            accent="emerald"
          />
          <NavCard
            href="/scenario"
            icon={SlidersHorizontal}
            title="Scenario Studio"
            desc="Real-time coal price shock & import tariff simulation"
            accent="cyan"
          />
          <NavCard
            href="/divergence"
            icon={Activity}
            title="Divergence Matrix"
            desc="RBV vs Market Cap — find undervalued issuers"
            accent="indigo"
          />
          <NavCard
            href="/coverage"
            icon={FileSpreadsheet}
            title="Honesty Audit"
            desc="Data provenance & API credit balance audit (405/1000)"
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
              Every metric is computed deterministically from raw Sectors API responses and can be verified via the{" "}
              <span className="text-amber-400 font-semibold">Evidence Drawer</span> on each issuer page.
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0 gap-2 font-bold">
          <Link href="/methodology">
            <Pickaxe className="h-3.5 w-3.5 text-amber-400" />
            <span>View M1–M9 Formulas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </Card>

      {/* ── Dedicated AI Copilot Modal for Dashboard ── */}
      <AiCopilotModal
        isOpen={dashboardAiModalOpen}
        onClose={() => setDashboardAiModalOpen(false)}
        initialQuery={dashboardAiQuery}
      />
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
