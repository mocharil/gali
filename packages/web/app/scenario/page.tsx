"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  BarChart3,
  Globe2,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import type { ScenarioShockRequest } from "@/lib/types";
import {
  Card,
  CardTitle,
  CardDescription,
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

const COUNTRIES = ["China", "India", "Japan", "Korea", "Philippines", "Malaysia"];

export default function ScenarioStudioPage() {
  const [priceShockPct, setPriceShockPct] = useState(0);
  const [countryShocks, setCountryShocks] = useState<Record<string, number>>({});
  const [licenseCliffShock, setLicenseCliffShock] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: ScenarioShockRequest) => api.simulateScenario(body),
  });

  const runScenario = useCallback(() => {
    mutation.mutate({
      price_shock_pct: priceShockPct,
      destination_shocks: Object.fromEntries(Object.entries(countryShocks).filter(([, v]) => v > 0)),
      license_cliff_expiry_shock: licenseCliffShock,
      discount_rate: 0.12,
      variable_cost_share: 0.65,
    });
  }, [priceShockPct, countryShocks, licenseCliffShock, mutation]);

  // Auto-run simulation on mount and debounced on parameter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runScenario();
    }, 150);
    return () => clearTimeout(timer);
  }, [runScenario]);

  // Preset Handlers
  function applyPreset(type: "bear" | "china_tariff" | "cliff" | "bull" | "reset") {
    if (type === "reset") {
      setPriceShockPct(0);
      setCountryShocks({});
      setLicenseCliffShock(false);
    } else if (type === "bear") {
      setPriceShockPct(-0.25);
      setCountryShocks({});
      setLicenseCliffShock(false);
    } else if (type === "china_tariff") {
      setPriceShockPct(-0.1);
      setCountryShocks({ China: 0.3 });
      setLicenseCliffShock(false);
    } else if (type === "cliff") {
      setPriceShockPct(0);
      setCountryShocks({});
      setLicenseCliffShock(true);
    } else if (type === "bull") {
      setPriceShockPct(0.2);
      setCountryShocks({});
      setLicenseCliffShock(false);
    }
  }

  const impacts = mutation.data?.impacts ?? [];
  const sorted = [...impacts].sort((a, b) => (a.post_shock_rank ?? 99) - (b.post_shock_rank ?? 99));

  // Prepare chart data (Baseline RBV vs Post-Shock RBV in $B)
  const chartData = sorted
    .filter((i) => !i.is_partial && i.baseline_rbv_usd != null && i.post_shock_rbv_usd != null)
    .map((i) => ({
      symbol: i.symbol,
      "Baseline RBV ($B)": Number(((i.baseline_rbv_usd ?? 0) / 1e9).toFixed(2)),
      "Post-Shock RBV ($B)": Number(((i.post_shock_rbv_usd ?? 0) / 1e9).toFixed(2)),
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-up">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="amber" className="gap-1.5 py-1 px-3">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>M7 Real-Time Stress Testing Studio</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white">Scenario Studio &amp; Stress Testing</h1>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-300">
            Simulasikan shock makroekonomi (penurunan harga acuan komoditas, tarif impor bilateral, atau berakhirnya izin IUP)
            secara deterministik terhadap Reserve-Backed Value (RBV) seluruh 9 emiten batubara IDX.
          </p>
        </div>

        {/* Presets Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("bear")}
            className="text-rose-400 hover:text-rose-300"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Bear Shock (-25%)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("china_tariff")}
            className="text-amber-400 hover:text-amber-300"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>Tarif China (30%)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("cliff")}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>License Cliff Expiry</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("bull")}
            className="text-emerald-400 hover:text-emerald-300"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Bull Shock (+20%)</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyPreset("reset")}
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Interactive Controls Grid (shadcn Cards) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Parameter Panel (5 cols) */}
        <Card className="lg:col-span-5 p-5 border-slate-800/80 bg-[#080d19]/90 space-y-6 shadow-2xl">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Parameter Shock Makro
            </CardTitle>
            <CardDescription className="mt-0.5 text-[11px] text-slate-400">
              Geser slider untuk melihat dampak sensitivitas valuasi secara instan
            </CardDescription>
          </div>

          {/* Slider 1: Global Price Shock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Shock Harga Batubara (ICI-4):</span>
              <span className={`font-mono text-sm font-black ${priceShockPct < 0 ? "text-rose-400" : priceShockPct > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                {priceShockPct > 0 ? `+${(priceShockPct * 100).toFixed(0)}%` : `${(priceShockPct * 100).toFixed(0)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={priceShockPct}
              onChange={(e) => setPriceShockPct(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-50% (Depresi)</span>
              <span>0% (Baseline)</span>
              <span>+50% (Supercycle)</span>
            </div>
          </div>

          {/* Toggle: License Cliff Shock */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200">Simulasi License Cliff Expiry</div>
              <p className="text-[10px] text-slate-400 max-w-[260px]">
                Asumsikan konsesi yang jatuh tempo dalam ≤ 3 tahun tidak diperpanjang oleh Kementerian ESDM.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLicenseCliffShock((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                licenseCliffShock ? "bg-amber-500" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  licenseCliffShock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Country Bilateral Shocks */}
          <div className="space-y-3 pt-2 border-t border-slate-800/70">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Shock Tarif / Kuota Negara Tujuan Ekspor</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {COUNTRIES.map((c) => {
                const val = countryShocks[c] ?? 0;
                return (
                  <div key={c} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-300">{c}</span>
                      <span className="font-mono text-[10px] text-amber-400">
                        {val > 0 ? `-${(val * 100).toFixed(0)}%` : "0%"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.1"
                      value={val}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setCountryShocks((prev) => ({ ...prev, [c]: next }));
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded bg-slate-800 accent-cyan-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Right Visual Comparison Chart (7 cols) */}
        <Card className="lg:col-span-7 p-5 border-slate-800/80 bg-[#080d19]/90 space-y-4 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Dampak Valuasi: Baseline RBV vs Post-Shock RBV ($B)
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-400">
                Nilai wajar DCF cadangan sebelum &amp; sesudah shock
              </CardDescription>
            </div>
            {mutation.isPending && (
              <Badge variant="amber" className="animate-pulse">
                Menghitung...
              </Badge>
            )}
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="symbol" stroke="#64748b" tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: "bold" }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} label={{ value: "Valuasi ($ Miliar USD)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", fontFamily: "monospace" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="Baseline RBV ($B)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Post-Shock RBV ($B)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
            <span>Model: Finite Annuity DCF M6 (WACC: 12%, VarCost: 65%)</span>
            <span className="font-mono text-emerald-400">Deterministic M7</span>
          </div>
        </Card>
      </div>

      {/* ── 3. Detailed Results Table (shadcn Table) ── */}
      <Card className="border-slate-800/80 bg-[#080d19]/90 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Tabel Dampak Sensitivitas &amp; Perubahan Peringkat Finansial
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {sorted.length} Emiten Terhitung
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Emiten</TableHead>
              <TableHead className="text-right">Baseline RBV</TableHead>
              <TableHead className="text-right">Post-Shock RBV</TableHead>
              <TableHead className="text-right">Delta Valuasi ($)</TableHead>
              <TableHead className="text-right">Delta %</TableHead>
              <TableHead className="text-center">Dampak Peringkat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => {
              const deltaPct = item.delta_rbv_pct ?? 0;
              const deltaUSD = item.delta_rbv_usd ?? 0;
              const rankDiff = item.rank_change ?? ((item.baseline_rank ?? 0) - (item.post_shock_rank ?? 0));

              return (
                <TableRow key={item.symbol} className="font-mono">
                  <TableCell className="font-bold text-amber-400">
                    #{item.post_shock_rank ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-white">{item.symbol}</div>
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {item.baseline_rbv_usd != null ? `$${((item.baseline_rbv_usd) / 1e9).toFixed(2)}B` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {item.post_shock_rbv_usd != null ? `$${((item.post_shock_rbv_usd) / 1e9).toFixed(2)}B` : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${deltaUSD >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {deltaUSD >= 0 ? `+$${(deltaUSD / 1e6).toFixed(1)}M` : `-$${(Math.abs(deltaUSD) / 1e6).toFixed(1)}M`}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${deltaPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {deltaPct >= 0 ? `+${(deltaPct * 100).toFixed(1)}%` : `${(deltaPct * 100).toFixed(1)}%`}
                  </TableCell>
                  <TableCell className="text-center">
                    {rankDiff > 0 ? (
                      <Badge variant="success" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Naik +{rankDiff}</span>
                      </Badge>
                    ) : rankDiff < 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <TrendingDown className="h-3 w-3" />
                        <span>Turun {rankDiff}</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Tetap</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="xs">
                      <Link href={`/issuer/${item.symbol}`} className="gap-1 font-sans">
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
