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
import type { ScenarioShockRequest, IssuerScenarioImpact } from "@/lib/types";

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 mb-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Real-Time Macro Stress Testing</span>
          </div>
          <h1 className="text-3xl font-black text-white">Scenario Studio</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Geser parameter makro, lihat nilai cadangan (RBV) dan urutan ranking emiten berubah seketika —
            dihitung server-side secara instan dengan invariant zero-shock diverifikasi 0.0%.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset("reset")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset (0%)
          </button>
          <button
            onClick={() => applyPreset("bear")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <TrendingDown className="h-3.5 w-3.5" /> Coal Crash -25%
          </button>
          <button
            onClick={() => applyPreset("china_tariff")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Globe2 className="h-3.5 w-3.5" /> Tarif China +30%
          </button>
          <button
            onClick={() => applyPreset("bull")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Supercycle +20%
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Interactive Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              Kontrol Parameter Shock
            </h2>

            {/* Price Shock Slider */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-200">Shock Harga Batubara Global</label>
                <span
                  className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                    priceShockPct < 0
                      ? "bg-rose-500/20 text-rose-400"
                      : priceShockPct > 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {priceShockPct > 0 ? "+" : ""}
                  {(priceShockPct * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={0.3}
                step={0.01}
                value={priceShockPct}
                onChange={(e) => setPriceShockPct(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-500">
                <span>-50% (Bear)</span>
                <span>0% (Baseline)</span>
                <span>+30% (Bull)</span>
              </div>
            </div>

            {/* Export Destination Shocks */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-200">
                Shock Permintaan / Tarif Ekspor Negara
              </label>
              <div className="space-y-3">
                {COUNTRIES.map((c) => {
                  const val = countryShocks[c] ?? 0;
                  return (
                    <div key={c} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{c}</span>
                        <span className="font-mono font-bold text-cyan-400">+{Math.round(val * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={val}
                        onChange={(e) =>
                          setCountryShocks((s) => ({ ...s, [c]: Number(e.target.value) }))
                        }
                        className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* License Cliff Checkbox */}
            <div className="pt-4 border-t border-slate-800/80">
              <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={licenseCliffShock}
                  onChange={(e) => setLicenseCliffShock(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-rose-500 rounded cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-white block">Terapkan Kegagalan Izin ESDM (3-Thn Cliff)</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Menghapus produksi dari konsesi yang izinnya kedaluwarsa dalam 3 tahun tanpa perpanjangan.
                  </span>
                </div>
              </label>
            </div>

            {/* Execution time indicator */}
            {mutation.data && (
              <div className="text-center text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>Latensi Komputasi:</span>
                <span className="text-emerald-400 font-bold">
                  {mutation.data.execution_time_ms.toFixed(1)} ms (In-Memory)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chart & Results (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Visual Recharts Bar Comparison */}
          {chartData.length > 0 && (
            <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Perbandingan Nilai Cadangan (Baseline vs Post-Shock)
                </h2>
                <span className="text-[11px] font-mono text-slate-500">Satuan: Miliar USD ($B)</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="symbol" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b111e",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Baseline RBV ($B)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Post-Shock RBV ($B)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* List of Issuer Impacts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Dampak Pada Emiten ({sorted.length})
              </h2>
              <span className="text-[11px] text-slate-500">Urutan pasca-simulasi</span>
            </div>

            <div
              className={`space-y-2.5 transition-opacity duration-150 ${
                mutation.isPending ? "opacity-50" : "opacity-100"
              }`}
            >
              {sorted.map((imp, idx) => (
                <ImpactCard key={imp.symbol} imp={imp} rankIndex={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpactCard({ imp, rankIndex }: { imp: IssuerScenarioImpact; rankIndex: number }) {
  const deltaPct = imp.delta_rbv_pct;
  const rankDelta = imp.rank_change ?? 0;

  if (imp.is_partial) {
    return (
      <div className="glass-card flex items-center justify-between rounded-xl border border-slate-800/60 p-4 opacity-60">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">{rankIndex}</span>
          <div>
            <Link href={`/issuer/${imp.symbol}`} className="font-mono font-bold text-slate-300 hover:text-white">
              {imp.symbol}
            </Link>
            <div className="text-[11px] text-slate-500">Cadangan/Finansial parsial</div>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">Data Parsial (Exempt from RBV)</span>
      </div>
    );
  }

  return (
    <div className="glass-card group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 p-4 transition-all hover:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 font-mono text-xs font-bold text-amber-400 border border-slate-700">
          {imp.post_shock_rank ?? rankIndex}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/issuer/${imp.symbol}`}
              className="font-mono font-black text-white hover:text-amber-400 transition-colors text-base"
            >
              {imp.symbol}
            </Link>
            {rankDelta !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                  rankDelta > 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {rankDelta > 0 ? `▲ +${rankDelta}` : `▼ ${rankDelta}`}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            Baseline: ${((imp.baseline_rbv_usd ?? 0) / 1e9).toFixed(2)}B ➔ Post-Shock:{" "}
            <span className="font-mono font-bold text-slate-200">
              ${((imp.post_shock_rbv_usd ?? 0) / 1e9).toFixed(2)}B
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
        <div className="text-left sm:text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Perubahan RBV</div>
          <div
            className={`font-mono text-sm font-black ${
              deltaPct != null && deltaPct > 0
                ? "text-emerald-400"
                : deltaPct != null && deltaPct < 0
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {deltaPct != null ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "0.0%"}
          </div>
        </div>

        <Link
          href={`/issuer/${imp.symbol}`}
          className="rounded-lg bg-slate-800 p-2 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-700 transition-colors"
          title="Detail Emiten"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

