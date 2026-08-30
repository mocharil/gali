"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Play, TrendingDown, TrendingUp, Minus } from "lucide-react";
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

  function runScenario() {
    mutation.mutate({
      price_shock_pct: priceShockPct,
      destination_shocks: Object.fromEntries(Object.entries(countryShocks).filter(([, v]) => v > 0)),
      license_cliff_expiry_shock: licenseCliffShock,
      // Matches gali_core.config.Assumptions defaults -- shown in the AssumptionBar above.
      discount_rate: 0.12,
      variable_cost_share: 0.65,
    });
  }

  // Auto-run simulation on mount and debounced on parameter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runScenario();
    }, 150);
    return () => clearTimeout(timer);
  }, [priceShockPct, countryShocks, licenseCliffShock]);

  const impacts = mutation.data?.impacts ?? [];
  const sorted = [...impacts].sort((a, b) => (a.post_shock_rank ?? 99) - (b.post_shock_rank ?? 99));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white">Scenario Studio</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Geser parameter, lihat Reserve-Backed Value dan ranking bergerak live — dihitung server-side dari
        data ter-cache, tanpa memanggil Sectors API. Skenario kosong (semua nol) menghasilkan delta nol
        persis, diverifikasi lewat regression test.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card space-y-5 rounded-xl border border-slate-800 p-5 lg:col-span-1">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">Shock harga komoditas</label>
              <span className="font-mono text-amber-400">{(priceShockPct * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={-0.5}
              max={0.3}
              step={0.01}
              value={priceShockPct}
              onChange={(e) => setPriceShockPct(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>-50%</span>
              <span>+30%</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300">Shock permintaan per negara</label>
            <div className="space-y-2.5">
              {COUNTRIES.map((c) => (
                <div key={c}>
                  <div className="mb-0.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{c}</span>
                    <span className="font-mono text-cyan-400">{Math.round((countryShocks[c] ?? 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={countryShocks[c] ?? 0}
                    onChange={(e) => setCountryShocks((s) => ({ ...s, [c]: Number(e.target.value) }))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={licenseCliffShock}
              onChange={(e) => setLicenseCliffShock(e.target.checked)}
              className="accent-rose-500"
            />
            Terapkan kegagalan perpanjangan izin (3-thn cliff)
          </label>

          <button
            onClick={runScenario}
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {mutation.isPending ? "Menghitung…" : "Jalankan Skenario"}
          </button>

          {mutation.data && (
            <p className="text-center text-[11px] text-slate-600">
              Dihitung dalam {mutation.data.execution_time_ms.toFixed(1)} ms
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          {!mutation.data && !mutation.isPending && (
            <div className="glass-card flex h-full min-h-[300px] items-center justify-center rounded-xl border border-slate-800 p-8 text-center text-sm text-slate-500">
              Atur parameter di kiri lalu klik &quot;Jalankan Skenario&quot; untuk melihat dampaknya pada
              Reserve-Backed Value setiap emiten.
            </div>
          )}
          {sorted.length > 0 && (
            <div className="space-y-2">
              {sorted.map((imp) => (
                <ImpactRow key={imp.symbol} imp={imp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ imp }: { imp: IssuerScenarioImpact }) {
  if (imp.is_partial) {
    return (
      <div className="glass-card flex items-center justify-between rounded-xl border border-slate-800/60 p-3 opacity-50">
        <Link href={`/issuer/${imp.symbol}`} className="font-mono font-bold text-slate-400 hover:underline">
          {imp.symbol}
        </Link>
        <span className="text-[11px] text-slate-600">Data parsial — RBV tidak dapat disimulasikan</span>
      </div>
    );
  }

  const delta = imp.delta_rbv_pct ?? 0;
  const Icon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const color = delta > 0.5 ? "text-emerald-400" : delta < -0.5 ? "text-rose-400" : "text-slate-500";
  const rankMoved = imp.rank_change != null && imp.rank_change !== 0;

  return (
    <div className="glass-card flex items-center justify-between rounded-xl border border-slate-800 p-3 transition-colors hover:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center font-mono text-xs text-slate-500">#{imp.post_shock_rank ?? "—"}</span>
        <Link href={`/issuer/${imp.symbol}`} className="font-mono font-bold text-white hover:underline">
          {imp.symbol}
        </Link>
        {rankMoved && (
          <span className={`text-[10px] font-semibold ${(imp.rank_change ?? 0) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {(imp.rank_change ?? 0) > 0 ? "▲" : "▼"} {Math.abs(imp.rank_change ?? 0)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-6 text-right">
        <div className="text-xs text-slate-500">
          ${((imp.post_shock_rbv_usd ?? 0) / 1e9).toFixed(2)}B
          <span className="ml-1 text-slate-700">← ${((imp.baseline_rbv_usd ?? 0) / 1e9).toFixed(2)}B</span>
        </div>
        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
