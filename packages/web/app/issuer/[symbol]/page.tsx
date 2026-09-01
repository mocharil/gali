"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Ship,
  Network,
  Pickaxe,
  SlidersHorizontal,
} from "lucide-react";

import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { Skeleton } from "@/components/Skeleton";

const ALL_ISSUERS = [
  { symbol: "AADI", label: "AADI" },
  { symbol: "ADMR", label: "ADMR" },
  { symbol: "ADRO", label: "ADRO" },
  { symbol: "BUMI", label: "BUMI" },
  { symbol: "BYAN", label: "BYAN" },
  { symbol: "DSSA", label: "DSSA" },
  { symbol: "GEMS", label: "GEMS" },
  { symbol: "ITMG", label: "ITMG" },
  { symbol: "PTBA", label: "PTBA" },
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

export default function IssuerDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router = useRouter();
  const sym = (symbol || "").toUpperCase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issuer", sym],
    queryFn: () => api.getIssuerDetail(sym),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6" aria-busy="true" aria-label={`Memuat data ${sym}`}>
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Emiten &quot;{sym}&quot; Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          Simbol ini tidak terdaftar dalam universe 9 emiten batubara in-scope Sectors Hackathon 2026.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Leaderboard
        </Link>
      </div>
    );
  }

  const gapYears =
    data.reserve_life_gap_years != null
      ? data.reserve_life_gap_years
      : data.implied_life_years != null && data.rli_years != null
        ? data.implied_life_years - data.rli_years
        : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Beranda Executive
        </Link>

        {/* Quick Ticker Switcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Pilih emiten:</span>
          {ALL_ISSUERS.map((i) => (
            <button
              key={i.symbol}
              onClick={() => router.push(`/issuer/${i.symbol}`)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                i.symbol === sym
                  ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              {i.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#0d1829] via-[#090e1a] to-[#060911] p-6 sm:p-8">
        {/* ambient glow orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-cyan-500/8 blur-[70px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            {/* Symbol + badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                {data.symbol}
              </h1>
              <ConfidenceBadge dataQuality={data.data_quality} />
            </div>
            <p className="text-base font-semibold text-slate-200">{data.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Sektor Energi · Pertambangan Batubara IDX
              </span>
              {data.ground_truth_score != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400">
                  Ground Truth Score: {data.ground_truth_score.toFixed(1)} / 100
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/scenario"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-2 text-xs font-bold text-cyan-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Stress-Test
            </Link>
            <EvidenceDrawer symbol={data.symbol} runId={data.run_id} evidence={data.evidence as never} />
          </div>
        </div>
      </div>

      {/* 4 Core Fundamental Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* RLI */}
        <MetricTile
          icon={Clock}
          label="Reserve Life Index (RLI)"
          value={data.rli_years != null ? fmt(data.rli_years, { suffix: " thn" }) : "null"}
          sub={
            data.rli_years == null
              ? "Cadangan tidak dilaporkan di laporan resmi"
              : gapYears != null
                ? `Pasar menyiratkan ${fmt(data.implied_life_years, { suffix: " thn" })} (gap ${gapYears > 0 ? "+" : ""}${fmt(gapYears, { suffix: " thn" })})`
                : "Market cap belum ter-ingest"
          }
          accent={data.rli_years == null ? "text-slate-500" : "text-cyan-400"}
          badge={data.rli_years != null ? `${data.rli_years.toFixed(1)} Tahun Aktual` : undefined}
        />

        {/* License Cliff */}
        <MetricTile
          icon={AlertTriangle}
          label="License Cliff (3 Tahun)"
          value={data.license_cliff_3y != null ? fmt(data.license_cliff_3y, { suffix: "%" }) : "—"}
          sub={`Clean & Clear (CNC) coverage: ${fmt(data.cnc_coverage_pct, { suffix: "%" })}`}
          accent={data.license_cliff_3y && data.license_cliff_3y > 30 ? "text-rose-400" : "text-amber-400"}
          badge={data.license_cliff_3y != null ? (data.license_cliff_3y > 30 ? "Risiko Tinggi" : "Terkendali") : undefined}
        />

        {/* Cash Cost */}
        <MetricTile
          icon={Ship}
          label="Cash Cost / Breakeven"
          value={data.cash_cost_per_ton_usd != null ? `$${data.cash_cost_per_ton_usd.toFixed(2)}/t` : "null"}
          sub={
            data.breakeven_benchmark_price_usd != null
              ? `Harga acuan impas: $${data.breakeven_benchmark_price_usd.toFixed(2)}/t`
              : "Finansial tidak dilaporkan"
          }
          accent={data.cash_cost_per_ton_usd == null ? "text-slate-500" : "text-emerald-400"}
        />

        {/* RBV */}
        <MetricTile
          icon={Network}
          label="Reserve-Backed Value"
          value={data.reserve_backed_value_usd != null ? fmt(data.reserve_backed_value_usd, { usd: true, digits: 2 }) : "null"}
          sub={
            data.rbv_gap_pct != null
              ? `Gap vs market cap: ${data.rbv_gap_pct > 0 ? "+" : ""}${data.rbv_gap_pct.toFixed(1)}%`
              : "Market cap belum ter-ingest"
          }
          accent={data.reserve_backed_value_usd == null ? "text-slate-500" : "text-indigo-400"}
        />
      </div>

      {/* Coal Quality & Export Destination Profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl border border-slate-800 p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Pickaxe className="h-4 w-4 text-amber-400" />
              Profil Kualitas Geologis &amp; Pasar Ekspor
            </h2>
            <span className="text-[11px] font-mono text-slate-500">M4 &amp; M7 Metrik</span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Grade Benchmark" value={data.benchmark_grade ?? "—"} />
            <Field
              label="Diskon Kualitas"
              value={data.quality_discount_pct != null ? `${data.quality_discount_pct.toFixed(1)}%` : "—"}
            />
            <Field
              label="Kalori Rata-rata"
              value={data.weighted_cv_kcal != null ? `${data.weighted_cv_kcal.toFixed(0)} kcal/kg` : "—"}
            />
            <Field label="Negara Tujuan Terbesar" value={data.top_destination ?? "—"} />
            <Field
              label="Porsi Volume Ekspor"
              value={data.top_destination_pct != null ? `${data.top_destination_pct.toFixed(1)}%` : "—"}
            />
            <Field
              label="Destination HHI"
              value={data.destination_hhi != null ? data.destination_hhi.toFixed(0) : "—"}
              sub={data.destination_hhi != null ? (data.destination_hhi > 2500 ? "Konsentrasi Tinggi" : "Terdiversifikasi") : undefined}
            />
          </dl>
        </div>

        {/* Ground Truth Score Breakdown Tile */}
        <div className="glass-card rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Ground Truth Score</h2>
              <span className="text-[11px] font-mono text-amber-400 font-bold">M8 Komposit</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black text-amber-400">
                {data.ground_truth_score != null ? data.ground_truth_score.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-slate-500 font-bold">/ 100</span>
            </div>

            <div className="mt-4 space-y-2">
              {data.component_scores &&
                Object.entries(data.component_scores as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-mono font-bold text-slate-200">{v.toFixed(0)}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500">
            Skor dinormalisasi otomatis jika komponen parsial tidak dilaporkan.
          </div>
        </div>
      </div>

      {/* Connected Operating Entities Network */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400" />
              Entitas Tambang &amp; Konsesi Operasi Terhubung ({data.linked_entities?.length ?? 0})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Graf kepemilikan efektif dan entitas pemegang IUP/IUPK yang diatribusikan ke emiten ini
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.linked_entities?.map((e) => (
            <div
              key={e.company_slug}
              className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1.5 transition-colors hover:border-slate-700"
            >
              <div className="truncate text-xs font-bold text-slate-200">{e.name}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-cyan-400 font-semibold">{e.effective_ownership_pct?.toFixed(1)}%</span>
                <span>Kepemilikan Efektif</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span>Keyakinan Linkage:</span>
                <span className="font-mono text-slate-300">
                  {e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
            </div>
          ))}
          {(!data.linked_entities || data.linked_entities.length === 0) && (
            <div className="col-span-full py-6 text-center text-xs text-slate-500">
              Tidak ada entitas operasi terpisah (operasi langsung oleh induk emiten).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
  badge?: string;
}) {
  const isNull = value === "null";
  return (
    <div className="glass-card group rounded-2xl border border-slate-800 p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-700">
      {/* top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60 ${accent.replace('text-', 'bg-')}`} />
      <div>
        <div className="flex items-center justify-between">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.replace('text-', 'bg-').replace('400','500/10')} border ${accent.replace('text-', 'border-').replace('400','500/20')}`}>
            <Icon className={`h-4 w-4 ${accent}`} />
          </div>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border ${
              badge.includes('Tinggi') || badge.includes('High')
                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                : badge.includes('Aktual') || badge.includes('Thn')
                ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
        <div className={`mt-1.5 font-mono text-2xl font-black leading-none ${isNull ? 'text-slate-600' : accent}`}>
          {isNull ? 'N/A' : value}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/60 pt-2.5 leading-relaxed">{sub}</p>
    </div>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-bold text-slate-100">{value}</dd>
      {sub && <div className="text-[10px] text-amber-400 mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}
