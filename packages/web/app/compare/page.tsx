"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Scale,
  ArrowRight,
  Zap,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";

import { api } from "@/lib/api";
import type { IssuerDetail } from "@/lib/types";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/Skeleton";

const ALL_ISSUERS = [
  { symbol: "AADI", name: "Adaro Andalan Indonesia" },
  { symbol: "ADMR", name: "Adaro Minerals Indonesia" },
  { symbol: "ADRO", name: "Adaro Energy Indonesia" },
  { symbol: "BUMI", name: "Bumi Resources" },
  { symbol: "BYAN", name: "Bayan Resources" },
  { symbol: "DSSA", name: "Dian Swastatika Sentosa" },
  { symbol: "GEMS", name: "Golden Energy Mines" },
  { symbol: "ITMG", name: "Indo Tambangraya Megah" },
  { symbol: "PTBA", name: "Bukit Asam" },
];

const PRESETS = [
  { label: "ADRO vs BYAN", a: "ADRO", b: "BYAN", desc: "Raksasa Termal vs Produsen Biaya Super-Rendah" },
  { label: "PTBA vs ITMG", a: "PTBA", b: "ITMG", desc: "Dividen BUMN vs Premium Newcastle Exporter" },
  { label: "ADRO vs ADMR", a: "ADRO", b: "ADMR", desc: "Batubara Termal vs Batubara Metalurgi (Kokas)" },
  { label: "ITMG vs GEMS", a: "ITMG", b: "GEMS", desc: "Duel Produsen Dividen & Efisiensi Operasional" },
];

function fmt(n: number | null | undefined, opts: { digits?: number; suffix?: string; usd?: boolean } = {}): string {
  if (n == null) return "—";
  const { digits = 1, suffix = "", usd = false } = opts;
  const abs = Math.abs(n);
  if (usd) {
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
    return `$${n.toFixed(digits)}`;
  }
  return `${n.toFixed(digits)}${suffix}`;
}

export default function ComparePage() {
  const [tickerA, setTickerA] = useState("ADRO");
  const [tickerB, setTickerB] = useState("BYAN");

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const a = params.get("a");
    const b = params.get("b");
    if (a && ALL_ISSUERS.some((i) => i.symbol === a.toUpperCase())) {
      setTickerA(a.toUpperCase());
    }
    if (b && ALL_ISSUERS.some((i) => i.symbol === b.toUpperCase())) {
      setTickerB(b.toUpperCase());
    }
  }, []);

  // Update URL on ticker change
  function updateTickers(newA: string, newB: string) {
    setTickerA(newA);
    setTickerB(newB);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("a", newA);
    url.searchParams.set("b", newB);
    window.history.replaceState({}, "", url.toString());
  }

  const queryA = useQuery({
    queryKey: ["issuer", tickerA],
    queryFn: () => api.getIssuerDetail(tickerA),
  });

  const queryB = useQuery({
    queryKey: ["issuer", tickerB],
    queryFn: () => api.getIssuerDetail(tickerB),
  });

  const isLoading = queryA.isLoading || queryB.isLoading;
  const dataA = queryA.data;
  const dataB = queryB.data;

  // Radar data mapping
  const radarData = [
    {
      metric: "Cadangan (RLI)",
      [tickerA]: Number(dataA?.component_scores?.rli_score ?? 0),
      [tickerB]: Number(dataB?.component_scores?.rli_score ?? 0),
    },
    {
      metric: "Izin Tambang",
      [tickerA]: Number(dataA?.component_scores?.license_score ?? 0),
      [tickerB]: Number(dataB?.component_scores?.license_score ?? 0),
    },
    {
      metric: "Biaya Produksi",
      [tickerA]: Number(dataA?.component_scores?.cost_score ?? 0),
      [tickerB]: Number(dataB?.component_scores?.cost_score ?? 0),
    },
    {
      metric: "Diversifikasi Ekspor",
      [tickerA]: Number(dataA?.component_scores?.export_score ?? 0),
      [tickerB]: Number(dataB?.component_scores?.export_score ?? 0),
    },
    {
      metric: "Supply Chain",
      [tickerA]: Number(dataA?.component_scores?.contract_score ?? 0),
      [tickerB]: Number(dataB?.component_scores?.contract_score ?? 0),
    },
  ];

  // Automated comparative analysis points
  function generateComparativeVerdict(a?: IssuerDetail, b?: IssuerDetail) {
    if (!a || !b) return null;
    const takeaways: string[] = [];

    // 1. Overall Ground Truth Score
    if (a.ground_truth_score != null && b.ground_truth_score != null) {
      const winner = a.ground_truth_score >= b.ground_truth_score ? a : b;
      const loser = a.ground_truth_score >= b.ground_truth_score ? b : a;
      const diff = Math.abs(a.ground_truth_score - b.ground_truth_score).toFixed(1);
      takeaways.push(
        `${winner.symbol} mengungguli ${loser.symbol} secara komposit (+${diff} poin Ground Truth Score), didorong oleh fundamental fisik dan transparansi data konsesi yang lebih kokoh.`
      );
    }

    // 2. Reserve Life (RLI)
    if (a.rli_years != null && b.rli_years != null) {
      if (Math.abs(a.rli_years - b.rli_years) > 2) {
        const winSym = a.rli_years > b.rli_years ? a.symbol : b.symbol;
        const winVal = Math.max(a.rli_years, b.rli_years);
        const loseSym = a.rli_years > b.rli_years ? b.symbol : a.symbol;
        const loseVal = Math.min(a.rli_years, b.rli_years);
        takeaways.push(
          `Ketahanan Cadangan: ${winSym} memiliki sisa umur tambang terbukti yang jauh lebih panjang (${winVal.toFixed(1)} tahun vs ${loseSym} ${loseVal.toFixed(1)} tahun).`
        );
      }
    }

    // 3. Cash Cost
    if (a.cash_cost_per_ton_usd != null && b.cash_cost_per_ton_usd != null) {
      const lowerSym = a.cash_cost_per_ton_usd < b.cash_cost_per_ton_usd ? a.symbol : b.symbol;
      const higherSym = a.cash_cost_per_ton_usd < b.cash_cost_per_ton_usd ? b.symbol : a.symbol;
      const saving = Math.abs(a.cash_cost_per_ton_usd - b.cash_cost_per_ton_usd).toFixed(1);
      takeaways.push(
        `Efisiensi Operasional: ${lowerSym} menikmati keunggulan biaya kas sebesar $${saving}/ton lebih hemat dibanding ${higherSym}, memberikan margin laba yang lebih terlindungi saat siklus batubara melemah.`
      );
    }

    // 4. Regulatory Cliff
    if (a.license_cliff_3y != null && b.license_cliff_3y != null) {
      if (Math.abs(a.license_cliff_3y - b.license_cliff_3y) > 5) {
        const saferSym = a.license_cliff_3y < b.license_cliff_3y ? a.symbol : b.symbol;
        const saferVal = Math.min(a.license_cliff_3y, b.license_cliff_3y);
        const riskierSym = a.license_cliff_3y < b.license_cliff_3y ? b.symbol : a.symbol;
        const riskierVal = Math.max(a.license_cliff_3y, b.license_cliff_3y);
        takeaways.push(
          `Risiko Lisensi 3-Tahun: ${saferSym} memiliki risiko izin kedaluwarsa yang lebih minim (${saferVal.toFixed(1)}% vs ${riskierSym} ${riskierVal.toFixed(1)}%).`
        );
      }
    }

    return takeaways;
  }

  const verdictPoints = generateComparativeVerdict(dataA, dataB);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-up">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="amber" className="gap-1.5 py-1 px-3">
              <Scale className="h-3.5 w-3.5" />
              <span>Head-to-Head Peer Comparison Studio</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white">Komparasi Emiten Batubara IDX</h1>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-300">
            Bandingkan realitas fisik tambang, umur cadangan terbukti (RLI), struktur biaya tunai, dan ketahanan izin dua emiten secara objektif berbasis data spasial ESDM &amp; laporan resmi.
          </p>
        </div>

        {/* Action button to Scenario */}
        <Button asChild variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 self-start md:self-auto">
          <Link href="/scenario" className="gap-2">
            <span>Uji Sensitivitas Bersama di Scenario Studio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* ── 2. Preset Pairings Selector Strip ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/80 bg-[#080d19]/80 p-3 shadow-lg">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Pasangan Komparasi Populer:
        </span>
        {PRESETS.map((p) => {
          const isActive = (tickerA === p.a && tickerB === p.b) || (tickerA === p.b && tickerB === p.a);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => updateTickers(p.a, p.b)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                isActive
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
              className="relative rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              className="relative rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
            >
              {p.label}
              {isActive && (
                <motion.div
                  layoutId="active-preset-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors ${
                  isActive ? "text-slate-950 font-black" : "text-slate-300 hover:text-white"
                }`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Selector Cards & Ticker Dropdowns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selector A */}
        <Card className="p-5 border-amber-500/30 bg-gradient-to-br from-[#0e1626] to-[#080d19] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Emiten Primer (A)
            </span>
            {dataA && <ConfidenceBadge dataQuality={dataA.data_quality} />}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={tickerA}
              onChange={(e) => updateTickers(e.target.value, tickerB)}
              className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-lg rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer flex-1"
            >
              {ALL_ISSUERS.map((i) => (
                <option key={i.symbol} value={i.symbol} disabled={i.symbol === tickerB}>
                  {i.symbol} — {i.name}
                </option>
              ))}
            </select>
            {dataA && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/issuer/${dataA.symbol}`} className="gap-1 text-amber-400 hover:text-amber-300">
                  <span>Profil</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {dataA && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Ground Truth Score:</span>
                <span className="text-amber-400 font-mono font-bold text-xl">
                  {dataA.ground_truth_score != null ? dataA.ground_truth_score.toFixed(1) : "—"} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reserve-Backed Value:</span>
                <span className="text-white font-mono font-bold text-xl">
                  {fmt(dataA.reserve_backed_value_usd, { usd: true, digits: 2 })}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Selector B */}
        <Card className="p-5 border-cyan-500/30 bg-gradient-to-br from-[#0c1827] to-[#080d19] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Emiten Pembanding (B)
            </span>
            {dataB && <ConfidenceBadge dataQuality={dataB.data_quality} />}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={tickerB}
              onChange={(e) => updateTickers(tickerA, e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-lg rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer flex-1"
            >
              {ALL_ISSUERS.map((i) => (
                <option key={i.symbol} value={i.symbol} disabled={i.symbol === tickerA}>
                  {i.symbol} — {i.name}
                </option>
              ))}
            </select>
            {dataB && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/issuer/${dataB.symbol}`} className="gap-1 text-cyan-400 hover:text-cyan-300">
                  <span>Profil</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {dataB && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Ground Truth Score:</span>
                <span className="text-cyan-400 font-mono font-bold text-xl">
                  {dataB.ground_truth_score != null ? dataB.ground_truth_score.toFixed(1) : "—"} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reserve-Backed Value:</span>
                <span className="text-white font-mono font-bold text-xl">
                  {fmt(dataB.reserve_backed_value_usd, { usd: true, digits: 2 })}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* ── 4. Dual-Spider Radar Chart & Synthesis ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dual Radar Chart (7 cols) */}
            <Card className="lg:col-span-7 p-6 border-slate-800/80 bg-[#080d19]/90 space-y-4 shadow-2xl flex flex-col justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-amber-400" />
                  Dual-Radar: Profil Multi-Dimensi Komparatif
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Perbandingan 5 pilar Ground Truth Score antara <span className="text-amber-400 font-bold">{tickerA}</span> (emas) dan <span className="text-cyan-400 font-bold">{tickerB}</span> (cyan)
                </CardDescription>
              </div>

              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} stroke="#334155" tick={false} axisLine={false} />
                    <Radar
                      name={tickerA}
                      dataKey={tickerA}
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Radar
                      name={tickerB}
                      dataKey={tickerB}
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-2 flex items-center justify-between">
                <span>Skor dinormalisasi 0-100 per pilar metodologi M8</span>
                <span className="font-mono text-amber-400">GALI M8 Multi-Factor</span>
              </div>
            </Card>

            {/* Synthesis Verdict Card (5 cols) */}
            <Card className="lg:col-span-5 p-6 border-slate-800/80 bg-gradient-to-br from-[#0c1424] via-[#080d19] to-[#060911] space-y-4 shadow-2xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-white">
                      Comparative Takeaways
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    Auto-Synthesized
                  </Badge>
                </div>

                {verdictPoints && verdictPoints.length > 0 ? (
                  <div className="space-y-3">
                    {verdictPoints.map((point, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1">
                        <div className="flex items-start gap-2">
                          <Trophy className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-300 leading-relaxed">{point}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Memuat sintesis komparatif emiten terpilih...
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold border-slate-700 bg-slate-900/60 hover:bg-slate-800">
                  <Link href={`/scenario?a=${tickerA}&b=${tickerB}`}>
                    Uji Ketahanan Makro {tickerA} vs {tickerB} →
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* ── 5. Side-by-Side Direct Metric Comparison Table ── */}
          <Card className="p-6 border-slate-800/80 bg-[#080d19]/90 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Tabel Komparasi Metrik Fundamental &amp; Fisik Tambang
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Perbandingan langsung parameter operasional dengan penanda keunggulan komparatif (Advantage)
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[11px] text-amber-400 border-amber-500/30">
                {tickerA} vs {tickerB}
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Metrik Fundamental</TableHead>
                  <TableHead className="text-center font-bold font-mono text-amber-400 w-1/4">
                    {tickerA}
                  </TableHead>
                  <TableHead className="text-center font-bold font-mono text-cyan-400 w-1/4">
                    {tickerB}
                  </TableHead>
                  <TableHead className="text-right w-1/6">Keunggulan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 1. Ground Truth Score */}
                <ComparisonRow
                  label="M8 Ground Truth Score"
                  tooltip="Skor gabungan transparansi fisik, umur cadangan, risiko perizinan, dan efisiensi biaya (0-100)."
                  valA={dataA?.ground_truth_score != null ? `${dataA.ground_truth_score.toFixed(1)} / 100` : "—"}
                  valB={dataB?.ground_truth_score != null ? `${dataB.ground_truth_score.toFixed(1)} / 100` : "—"}
                  winner={
                    (dataA?.ground_truth_score ?? 0) > (dataB?.ground_truth_score ?? 0)
                      ? tickerA
                      : (dataB?.ground_truth_score ?? 0) > (dataA?.ground_truth_score ?? 0)
                      ? tickerB
                      : "Tie"
                  }
                />

                {/* 2. RLI */}
                <ComparisonRow
                  label="Reserve Life Index (RLI)"
                  tooltip="Sisa umur cadangan terbukti berdasarkan kapasitas penambangan tahunan (tahun)."
                  valA={dataA?.rli_years != null ? fmt(dataA.rli_years, { suffix: " thn" }) : "—"}
                  valB={dataB?.rli_years != null ? fmt(dataB.rli_years, { suffix: " thn" }) : "—"}
                  winner={
                    (dataA?.rli_years ?? 0) > (dataB?.rli_years ?? 0)
                      ? tickerA
                      : (dataB?.rli_years ?? 0) > (dataA?.rli_years ?? 0)
                      ? tickerB
                      : "Tie"
                  }
                />

                {/* 3. Implied Life Gap */}
                <ComparisonRow
                  label="Disparitas Umur Pasar vs Fisik (Gap)"
                  tooltip="Selisih antara ekspektasi umur tambang tersirat di harga pasar saham vs cadangan terbukti ESDM."
                  valA={
                    dataA?.implied_life_years != null && dataA?.rli_years != null
                      ? `${(dataA.implied_life_years - dataA.rli_years) > 0 ? "+" : ""}${(dataA.implied_life_years - dataA.rli_years).toFixed(1)} thn`
                      : "—"
                  }
                  valB={
                    dataB?.implied_life_years != null && dataB?.rli_years != null
                      ? `${(dataB.implied_life_years - dataB.rli_years) > 0 ? "+" : ""}${(dataB.implied_life_years - dataB.rli_years).toFixed(1)} thn`
                      : "—"
                  }
                  winner="Informational"
                />

                {/* 4. Cash Cost */}
                <ComparisonRow
                  label="Cash Cost Penambangan ($/ton)"
                  tooltip="Biaya tunai operasional untuk menambang 1 ton batubara. Makin rendah makin aman terhadap koreksi harga komoditas."
                  valA={dataA?.cash_cost_per_ton_usd != null ? `$${dataA.cash_cost_per_ton_usd.toFixed(2)}/t` : "—"}
                  valB={dataB?.cash_cost_per_ton_usd != null ? `$${dataB.cash_cost_per_ton_usd.toFixed(2)}/t` : "—"}
                  winner={
                    dataA?.cash_cost_per_ton_usd != null && dataB?.cash_cost_per_ton_usd != null
                      ? dataA.cash_cost_per_ton_usd < dataB.cash_cost_per_ton_usd
                        ? tickerA
                        : tickerB
                      : "Tie"
                  }
                />

                {/* 5. Breakeven Benchmark */}
                <ComparisonRow
                  label="Harga Acuan Impas (Breakeven)"
                  tooltip="Harga patokan batubara internasional agar emiten mencapai titik impas operasional."
                  valA={dataA?.breakeven_benchmark_price_usd != null ? `$${dataA.breakeven_benchmark_price_usd.toFixed(2)}/t` : "—"}
                  valB={dataB?.breakeven_benchmark_price_usd != null ? `$${dataB.breakeven_benchmark_price_usd.toFixed(2)}/t` : "—"}
                  winner={
                    dataA?.breakeven_benchmark_price_usd != null && dataB?.breakeven_benchmark_price_usd != null
                      ? dataA.breakeven_benchmark_price_usd < dataB.breakeven_benchmark_price_usd
                        ? tickerA
                        : tickerB
                      : "Tie"
                  }
                />

                {/* 6. License Cliff 3-Yr */}
                <ComparisonRow
                  label="Risiko License Cliff (3 Tahun)"
                  tooltip="Persentase izin IUP/IUPK yang akan kedaluwarsa dalam jangka pendek. Nilai lebih rendah = risiko regulasi lebih minim."
                  valA={dataA?.license_cliff_3y != null ? `${dataA.license_cliff_3y.toFixed(1)}%` : "—"}
                  valB={dataB?.license_cliff_3y != null ? `${dataB.license_cliff_3y.toFixed(1)}%` : "—"}
                  winner={
                    dataA?.license_cliff_3y != null && dataB?.license_cliff_3y != null
                      ? dataA.license_cliff_3y < dataB.license_cliff_3y
                        ? tickerA
                        : tickerB
                      : "Tie"
                  }
                />

                {/* 7. Reserve-Backed Value */}
                <ComparisonRow
                  label="Reserve-Backed Value (RBV)"
                  tooltip="Valuasi DCF berbasis cadangan terbukti dan finite annuity."
                  valA={fmt(dataA?.reserve_backed_value_usd, { usd: true, digits: 2 })}
                  valB={fmt(dataB?.reserve_backed_value_usd, { usd: true, digits: 2 })}
                  winner="Informational"
                />

                {/* 8. Calorific Value */}
                <ComparisonRow
                  label="Rata-rata Nilai Kalori (CV)"
                  tooltip="Kualitas energi batubara (kcal/kg). Kalori lebih tinggi umumnya diperdagangkan dengan harga premium."
                  valA={dataA?.weighted_cv_kcal != null ? `${dataA.weighted_cv_kcal.toFixed(0)} kcal/kg` : "—"}
                  valB={dataB?.weighted_cv_kcal != null ? `${dataB.weighted_cv_kcal.toFixed(0)} kcal/kg` : "—"}
                  winner={
                    (dataA?.weighted_cv_kcal ?? 0) > (dataB?.weighted_cv_kcal ?? 0)
                      ? tickerA
                      : (dataB?.weighted_cv_kcal ?? 0) > (dataA?.weighted_cv_kcal ?? 0)
                      ? tickerB
                      : "Tie"
                  }
                />

                {/* 9. Top Export Destination */}
                <ComparisonRow
                  label="Pasar Ekspor Utama &amp; Porsi"
                  tooltip="Negara tujuan pengapalan batubara terbesar dan persentase volumenya."
                  valA={dataA?.top_destination ? `${dataA.top_destination} (${dataA.top_destination_pct?.toFixed(0)}%)` : "—"}
                  valB={dataB?.top_destination ? `${dataB.top_destination} (${dataB.top_destination_pct?.toFixed(0)}%)` : "—"}
                  winner="Informational"
                />

                {/* 10. Data Provenance */}
                <ComparisonRow
                  label="Kualitas &amp; Transparansi Data"
                  tooltip="Tingkat kelengkapan data (Full, Partial, Minimal) berdasarkan audit silang ESDM vs Laporan Tahunan."
                  valA={dataA?.data_quality ? dataA.data_quality.toUpperCase() : "—"}
                  valB={dataB?.data_quality ? dataB.data_quality.toUpperCase() : "—"}
                  winner={
                    dataA?.data_quality === "full" && dataB?.data_quality !== "full"
                      ? tickerA
                      : dataB?.data_quality === "full" && dataA?.data_quality !== "full"
                      ? tickerB
                      : "Tie"
                  }
                />
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  tooltip,
  valA,
  valB,
  winner,
}: {
  label: string;
  tooltip: string;
  valA: string;
  valB: string;
  winner: string;
}) {
  return (
    <TableRow className="font-mono text-xs">
      <TableCell className="font-sans font-medium text-slate-300">
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="group relative inline-flex items-center cursor-help">
            <HelpCircle className="h-3 w-3 text-slate-500 hover:text-amber-400" />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-52 rounded-lg border border-slate-700 bg-slate-900/95 p-2 text-[10px] text-slate-200 shadow-xl backdrop-blur-md font-sans normal-case">
              {tooltip}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center font-bold text-slate-200">
        {valA}
      </TableCell>
      <TableCell className="text-center font-bold text-slate-200">
        {valB}
      </TableCell>
      <TableCell className="text-right">
        {winner === "Tie" ? (
          <Badge variant="secondary" className="font-sans text-[10px]">
            Setara
          </Badge>
        ) : winner === "Informational" ? (
          <span className="text-slate-500 text-[10px] font-sans">—</span>
        ) : (
          <Badge variant="amber" className="font-mono text-[10px] font-bold">
            🏆 {winner}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
