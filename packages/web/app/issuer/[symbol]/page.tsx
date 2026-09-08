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
  Scale,
  Printer,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from "recharts";

import { api } from "@/lib/api";
import type { IssuerDetail } from "@/lib/types";
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

function MetricTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center cursor-help ml-1">
      <HelpCircle className="h-3 w-3 text-slate-500 hover:text-amber-400 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-52 rounded-lg border border-slate-700 bg-slate-900/95 p-2 text-[10px] text-slate-200 shadow-2xl backdrop-blur-md leading-relaxed text-center normal-case font-normal">
        {text}
      </span>
    </span>
  );
}

function generateExecutiveBrief(data: IssuerDetail) {
  const points: { title: string; desc: string; type: "warning" | "success" | "neutral" }[] = [];

  // 1. RLI vs Implied Life Gap
  if (data.rli_years != null && data.implied_life_years != null) {
    const gap = data.implied_life_years - data.rli_years;
    if (gap > 5) {
      points.push({
        title: "Disparitas Valuasi Cadangan (Implied Gap)",
        desc: `Pasar saat ini menilai saham ${data.symbol} dengan asumsi umur operasional tambang ${data.implied_life_years.toFixed(1)} tahun (implied life). Ini menciptakan gap +${gap.toFixed(1)} tahun di atas cadangan fisik terbukti ESDM (${data.rli_years.toFixed(1)} tahun), mengindikasikan ekspektasi premi tinggi yang menuntut penambahan izin baru atau ekspansi M&A.`,
        type: "warning",
      });
    } else if (gap < -3) {
      points.push({
        title: "Diskon Cadangan Fisik (Deep Value)",
        desc: `Valuasi pasar (${data.implied_life_years.toFixed(1)} tahun implied) berada di bawah potensi cadangan fisik tambang terbukti (${data.rli_years.toFixed(1)} tahun). Terdapat diskon sisa umur cadangan sebesar ${Math.abs(gap).toFixed(1)} tahun yang berpotensi menjadi margin of safety tebal bagi investor jangka panjang.`,
        type: "success",
      });
    } else {
      points.push({
        title: "Valuasi Cadangan Seimbang",
        desc: `Valuasi pasar saat ini terkalibrasi secara rasional dengan umur cadangan fisik terbukti (${data.rli_years.toFixed(1)} thn fisik vs ${data.implied_life_years.toFixed(1)} thn implied), mencerminkan ekspektasi konsensus yang realistis.`,
        type: "neutral",
      });
    }
  } else if (data.rli_years != null) {
    points.push({
      title: "Umur Cadangan Fisik (RLI)",
      desc: `Emiten memiliki sisa umur cadangan batubara terbukti sebesar ${data.rli_years.toFixed(1)} tahun berdasarkan kapasitas produksi tahunan saat ini.`,
      type: "neutral",
    });
  }

  // 2. Cash Cost Position
  if (data.cash_cost_per_ton_usd != null) {
    if (data.cash_cost_per_ton_usd <= 45) {
      points.push({
        title: "Keunggulan Biaya Tunai Rendah (Cost Advantage)",
        desc: `Cash cost penambangan berada di level $${data.cash_cost_per_ton_usd.toFixed(1)}/t (kuartil bawah industri), memberikan bantalan margin EBITDA yang sangat kuat terhadap risiko penurunan harga acuan komoditas dunia.`,
        type: "success",
      });
    } else if (data.cash_cost_per_ton_usd >= 65) {
      points.push({
        title: "Sensitivitas Biaya Tinggi",
        desc: `Cash cost penambangan relatif tinggi di level $${data.cash_cost_per_ton_usd.toFixed(1)}/t, membuat profitabilitas emiten ini lebih sensitif jika indeks harga batubara ICI melemah.`,
        type: "warning",
      });
    } else {
      points.push({
        title: "Struktur Biaya Industri Rata-Rata",
        desc: `Cash cost penambangan berada pada rentang wajar industri ($${data.cash_cost_per_ton_usd.toFixed(1)}/t) dengan ketahanan margin yang moderat.`,
        type: "neutral",
      });
    }
  }

  // 3. License Cliff Expiry Risk
  if (data.license_cliff_3y != null) {
    if (data.license_cliff_3y > 20) {
      points.push({
        title: "Perhatian Risiko Perizinan (License Cliff)",
        desc: `Sebanyak ${data.license_cliff_3y.toFixed(1)}% konsesi operasi tambang akan kedaluwarsa dalam jangka waktu 3 tahun ke depan. Kepastian perpanjangan IUP/IUPK oleh Kementerian ESDM menjadi katalis kunci yang wajib dipantau.`,
        type: "warning",
      });
    } else {
      points.push({
        title: "Landasan Perizinan Aman",
        desc: `Risiko kedaluwarsa izin 3-tahun sangat rendah (${data.license_cliff_3y.toFixed(1)}%), memastikan kepastian operasional jangka menengah tanpa gangguan legalitas konsesi.`,
        type: "success",
      });
    }
  }

  // 4. Export Exposure
  if (data.top_destination && data.top_destination_pct != null) {
    if (data.top_destination_pct >= 40) {
      points.push({
        title: `Ketergantungan Ekspor ${data.top_destination}`,
        desc: `Porsi penjualan ekspor terkonsentrasi sebesar ${data.top_destination_pct.toFixed(1)}% ke ${data.top_destination}, sehingga volume penjualan memiliki eksposur tinggi terhadap kebijakan proteksionisme/kuota negara tersebut.`,
        type: "neutral",
      });
    }
  }

  return points;
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

  const executiveBrief = generateExecutiveBrief(data);

  // Radar data for M8 Ground Truth Score
  const radarData = [
    { subject: "Cadangan (RLI)", score: Number(data.component_scores?.rli_score ?? 0), fullMark: 100 },
    { subject: "Izin (License)", score: Number(data.component_scores?.license_score ?? 0), fullMark: 100 },
    { subject: "Biaya (Cost)", score: Number(data.component_scores?.cost_score ?? 0), fullMark: 100 },
    { subject: "Pasar Ekspor", score: Number(data.component_scores?.export_score ?? 0), fullMark: 100 },
    { subject: "Supply Chain", score: Number(data.component_scores?.contract_score ?? 0), fullMark: 100 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
            <Link
              href={`/compare?a=${data.symbol}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all shadow-lg"
            >
              <Scale className="h-3.5 w-3.5" /> Bandingkan
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-lg"
            >
              <Printer className="h-3.5 w-3.5" /> Cetak One-Pager
            </button>
            <Link
              href="/scenario"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 px-3.5 py-2 text-xs font-bold text-cyan-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 transition-all shadow-lg"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Stress-Test
            </Link>
            <EvidenceDrawer symbol={data.symbol} runId={data.run_id} evidence={data.evidence as never} />
          </div>
        </div>
      </div>

      {/* ── Executive Intelligence Brief (Ground-Truth Synthesis) ── */}
      {executiveBrief.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#0c1322] via-[#080d19] to-[#050810] p-6 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-500/5 blur-[50px]" />
          
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                GALI Executive Intelligence Brief · Realitas Geologis vs Pasar
              </h2>
            </div>
            <span className="text-[10px] font-mono text-amber-400/80 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full font-semibold">
              Deterministic Synthesis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {executiveBrief.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-4 space-y-1.5 transition-colors ${
                  item.type === "warning"
                    ? "border-rose-500/20 bg-rose-500/5"
                    : item.type === "success"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.type === "warning"
                        ? "bg-rose-400"
                        : item.type === "success"
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <h3 className="text-xs font-bold text-white">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Core Fundamental Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* RLI */}
        <MetricTile
          icon={Clock}
          label="Reserve Life Index (RLI)"
          tooltip="Sisa umur cadangan tambang fisik terbukti (tahun) jika laju produksi tahunan konstan berlanjut."
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
          tooltip="Persentase luas konsesi tambang yang masa berlaku izin IUP/IUPK-nya akan kedaluwarsa dalam 3 tahun ke depan."
          value={data.license_cliff_3y != null ? fmt(data.license_cliff_3y, { suffix: "%" }) : "—"}
          sub={`Clean & Clear (CNC) coverage: ${fmt(data.cnc_coverage_pct, { suffix: "%" })}`}
          accent={data.license_cliff_3y && data.license_cliff_3y > 30 ? "text-rose-400" : "text-amber-400"}
          badge={data.license_cliff_3y != null ? (data.license_cliff_3y > 30 ? "Risiko Tinggi" : "Terkendali") : undefined}
        />

        {/* Cash Cost */}
        <MetricTile
          icon={Ship}
          label="Cash Cost / Breakeven"
          tooltip="Estimasi biaya tunai penambangan per ton. Makin rendah, makin tebal bantalan margin jika harga acuan batubara anjlok."
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
          tooltip="Nilai wajar berbasis nilai tunai arus kas terdiskonto (DCF finite annuity) dari sisa cadangan fisik terbukti."
          value={data.reserve_backed_value_usd != null ? fmt(data.reserve_backed_value_usd, { usd: true, digits: 2 }) : "null"}
          sub={
            data.rbv_gap_pct != null
              ? `Gap vs market cap: ${data.rbv_gap_pct > 0 ? "+" : ""}${data.rbv_gap_pct.toFixed(1)}%`
              : "Market cap belum ter-ingest"
          }
          accent={data.reserve_backed_value_usd == null ? "text-slate-500" : "text-indigo-400"}
        />
      </div>

      {/* Coal Quality & Export Destination Profile + Ground Truth Score */}
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
              tooltip="Indeks Herfindahl-Hirschman konsentrasi pasar (>2500 menunjukkan ketergantungan ekspor tinggi)."
              value={data.destination_hhi != null ? data.destination_hhi.toFixed(0) : "—"}
              sub={data.destination_hhi != null ? (data.destination_hhi > 2500 ? "Konsentrasi Tinggi" : "Terdiversifikasi") : undefined}
            />
          </dl>
        </div>

        {/* Ground Truth Score Breakdown Tile with Radar Chart */}
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

            {/* Radar / Spider Chart */}
            <div className="h-44 w-full -my-1">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#334155" tick={false} axisLine={false} />
                  <Radar
                    name={data.symbol}
                    dataKey="score"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 space-y-2">
              {data.component_scores &&
                Object.entries(data.component_scores as Record<string, number | null>).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-mono font-bold text-slate-200">
                        {v != null ? Number(v).toFixed(0) : "N/A"}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          v != null
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-slate-800"
                        }`}
                        style={{ width: `${v != null ? Math.min(100, Math.max(0, Number(v))) : 0}%` }}
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
                <span className="font-mono text-cyan-400 font-semibold">
                  {e.effective_ownership_pct != null ? `${Number(e.effective_ownership_pct).toFixed(1)}%` : "—"}
                </span>
                <span>Kepemilikan Efektif</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span>Keyakinan Linkage:</span>
                <span className="font-mono text-slate-300">
                  {e.confidence != null ? `${(Number(e.confidence) * 100).toFixed(0)}%` : "—"}
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
  tooltip,
  value,
  sub,
  accent,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  tooltip?: string;
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
        <div className="mt-3 flex items-center text-[10px] uppercase tracking-wider font-bold text-slate-500">
          <span>{label}</span>
          {tooltip && <MetricTooltip text={tooltip} />}
        </div>
        <div className={`mt-1.5 font-mono text-2xl font-black leading-none ${isNull ? 'text-slate-600' : accent}`}>
          {isNull ? 'N/A' : value}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/60 pt-2.5 leading-relaxed">{sub}</p>
    </div>
  );
}

function Field({ label, tooltip, value, sub }: { label: string; tooltip?: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
      <dt className="flex items-center text-[11px] font-medium text-slate-400">
        <span>{label}</span>
        {tooltip && <MetricTooltip text={tooltip} />}
      </dt>
      <dd className="mt-1 font-mono text-sm font-bold text-slate-100">{value}</dd>
      {sub && <div className="text-[10px] text-amber-400 mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}
