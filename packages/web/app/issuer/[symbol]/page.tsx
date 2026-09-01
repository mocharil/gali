"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, AlertTriangle, Ship, Network } from "lucide-react";
import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { Skeleton } from "@/components/Skeleton";

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
  const sym = symbol.toUpperCase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issuer", sym],
    queryFn: () => api.getIssuerDetail(sym),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label={`Memuat data ${sym}`}>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-sm text-rose-400">Emiten &quot;{sym}&quot; tidak ditemukan di universe in-scope.</p>
        <Link href="/" className="mt-4 inline-block text-xs text-amber-400 hover:underline">
          ← Kembali ke beranda
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Beranda
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-3xl font-black text-white">{data.symbol}</h1>
            <ConfidenceBadge dataQuality={data.data_quality} />
          </div>
          <p className="mt-1 text-sm text-slate-400">{data.name}</p>
        </div>
        <EvidenceDrawer symbol={data.symbol} runId={data.run_id} evidence={data.evidence as never} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          icon={Clock}
          label="Reserve Life Index (aktual)"
          value={data.rli_years != null ? fmt(data.rli_years, { suffix: " thn" }) : "null"}
          sub={
            data.rli_years == null
              ? "Cadangan tidak dilaporkan — RLI tidak dapat dihitung"
              : gapYears != null
                ? `Pasar menyiratkan ${fmt(data.implied_life_years, { suffix: " thn" })} (gap ${gapYears > 0 ? "+" : ""}${fmt(gapYears, { suffix: " thn" })})`
                : "Market cap belum ter-ingest — gap tidak dapat dihitung"
          }
          accent={data.rli_years == null ? "text-slate-600" : "text-cyan-400"}
        />
        <MetricTile
          icon={AlertTriangle}
          label="License Cliff (3 tahun)"
          value={data.license_cliff_3y != null ? fmt(data.license_cliff_3y, { suffix: "%" }) : "—"}
          sub={`CNC coverage: ${fmt(data.cnc_coverage_pct, { suffix: "%" })}`}
          accent="text-amber-400"
        />
        <MetricTile
          icon={Ship}
          label="Cash Cost / Breakeven"
          value={data.cash_cost_per_ton_usd != null ? `$${data.cash_cost_per_ton_usd.toFixed(2)}/t` : "null"}
          sub={
            data.breakeven_benchmark_price_usd != null
              ? `Breakeven benchmark: $${data.breakeven_benchmark_price_usd.toFixed(2)}/t`
              : "Finansial tidak dilaporkan"
          }
          accent={data.cash_cost_per_ton_usd == null ? "text-slate-600" : "text-emerald-400"}
        />
        <MetricTile
          icon={Network}
          label="Reserve-Backed Value"
          value={data.reserve_backed_value_usd != null ? fmt(data.reserve_backed_value_usd, { usd: true, digits: 2 }) : "null"}
          sub={
            data.rbv_gap_pct != null
              ? `Gap vs market cap: ${data.rbv_gap_pct > 0 ? "+" : ""}${data.rbv_gap_pct.toFixed(1)}%`
              : "Market cap belum ter-ingest"
          }
          accent={data.reserve_backed_value_usd == null ? "text-slate-600" : "text-indigo-400"}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-xl border border-slate-800 p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Kualitas &amp; Destinasi</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Grade Benchmark" value={data.benchmark_grade ?? "—"} />
            <Field label="Diskon Kualitas" value={data.quality_discount_pct != null ? `${data.quality_discount_pct.toFixed(1)}%` : "—"} />
            <Field label="Kalori Tertimbang" value={data.weighted_cv_kcal != null ? `${data.weighted_cv_kcal.toFixed(0)} kcal` : "—"} />
            <Field label="Tujuan Utama" value={data.top_destination ?? "—"} />
            <Field label="% Volume ke Tujuan Utama" value={data.top_destination_pct != null ? `${data.top_destination_pct.toFixed(1)}%` : "—"} />
            <Field label="Destination HHI" value={data.destination_hhi != null ? data.destination_hhi.toFixed(0) : "—"} />
          </dl>
        </div>
        <div className="glass-card rounded-xl border border-slate-800 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Ground Truth Score</h2>
          <div className="font-mono text-3xl font-bold text-amber-400">
            {data.ground_truth_score != null ? data.ground_truth_score.toFixed(1) : "—"}
            <span className="text-sm text-slate-500"> / 100</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.component_scores &&
              Object.entries(data.component_scores as Record<string, number>).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                  <span className="font-mono text-slate-300">{v.toFixed(0)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-800 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">
          Entitas Operasi Terhubung ({data.linked_entities?.length ?? 0})
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.linked_entities?.map((e) => (
            <div key={e.company_slug} className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
              <div className="truncate text-xs font-semibold text-slate-200">{e.name}</div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>{e.effective_ownership_pct?.toFixed(2)}% kepemilikan efektif</span>
                <span className="font-mono">{e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : ""}</span>
              </div>
            </div>
          ))}
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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="glass-card rounded-xl border border-slate-800 p-4">
      <Icon className={`h-4 w-4 ${accent}`} />
      <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-xl font-bold ${value === "null" ? "text-slate-600" : "text-white"}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-200">{value}</dd>
    </div>
  );
}
