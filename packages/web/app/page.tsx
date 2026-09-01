"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Sparkles,
  MapPin,
  SlidersHorizontal,
  TrendingDown,
  ShieldCheck,
  BookOpen,
  Pickaxe,
  CheckCircle2,
  Flame,
  Clock,
  Compass,
} from "lucide-react";
import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  return `$${n.toFixed(0)}`;
}

const PILLARS = [
  {
    step: "Pilar 01",
    title: "Peta Konsesi Fisik Ber-GPS",
    metric: "M1 Asset Ground Truth",
    desc: "Menghubungkan kode saham di BEI ke 52 konsesi tambang fisik nyata dengan koordinat GPS terverifikasi di Kalimantan dan Sumatra.",
    icon: MapPin,
    href: "/map",
    badge: "52 Situs GPS",
    accent: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50",
    buttonText: "Eksplorasi Peta",
  },
  {
    step: "Pilar 02",
    title: "Reserve Life Index (RLI)",
    metric: "M2 Sisa Umur Tambang",
    desc: "Menghitung sisa tahun cadangan terbukti berdasarkan laju produksi tahunan aktual. Mengungkap gap antara ekspektasi pasar modal vs umur tambang fisik.",
    icon: Clock,
    href: "/issuer/ADRO",
    badge: "Sisa Umur Thn",
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-500/50",
    buttonText: "Lihat RLI Emiten",
  },
  {
    step: "Pilar 03",
    title: "Kurva Biaya Nasional",
    metric: "M5 Cash Cost Breakeven",
    desc: "Memetakan cumulative cash cost per ton terhadap harga acuan pasar ICI-4 ($85/t). Mengidentifikasi produsen Q1 terendah dan emiten yang merugi tunai.",
    icon: TrendingDown,
    href: "/cost-curve",
    badge: "Cash Cost / t",
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
    buttonText: "Buka Cost Curve",
  },
  {
    step: "Pilar 04",
    title: "Scenario Stress-Test Studio",
    metric: "M9 Live Shock Engine",
    desc: "Simulasi real-time dampak shock harga batubara, tarif impor China (+30%), dan diskon kedaluwarsa izin ESDM langsung ke valuasi Reserve-Backed Value.",
    icon: SlidersHorizontal,
    href: "/scenario",
    badge: "Simulasi Real-Time",
    accent: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:border-indigo-500/50",
    buttonText: "Uji Skenario",
  },
];

export default function LandingPage() {
  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => api.getIssuers(),
  });

  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* ── 1. Hero Presentation Banner (Full-Width) ── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-amber-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute top-40 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute top-40 -right-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-[90px]" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Hackathon Track Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sectors Hackathon 2026 · Track 3 — Market Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Gali lebih dalam dari{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(245,158,11,0.3)]">
              kode sahamnya.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
            Platform intelijen fundamental komoditas pertama yang menghubungkan neraca keuangan emiten tambang
            IDX langsung ke <strong className="text-amber-400">52 konsesi tambang fisik ber-GPS</strong>, sisa
            umur cadangan geologis (RLI), estimasi cash cost per ton, dan simulasi stress-test makro real-time.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:from-amber-400 hover:to-yellow-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95"
            >
              <Pickaxe className="h-4 w-4" />
              <span>Buka Executive Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-200 shadow-lg backdrop-blur-xl transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white active:scale-95"
            >
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span>Peta 52 Konsesi Tambang</span>
            </Link>

            <Link
              href="/scenario"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-200 shadow-lg backdrop-blur-xl transition-all hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white active:scale-95"
            >
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <span>Stress-Test Studio</span>
            </Link>
          </div>

          {/* 3 Live Key Metric Tickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reserve-Backed Value
              </div>
              <div className="font-mono text-2xl font-black text-emerald-400 mt-0.5">
                {isLoading ? "——" : fmtUSD(totalRbv, 1)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">7 Emiten Batubara Lengkap</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Konsesi Ber-GPS
              </div>
              <div className="font-mono text-2xl font-black text-cyan-400 mt-0.5">52 Situs</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Kalimantan &amp; Sumatra</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sectors API Credits
              </div>
              <div className="font-mono text-2xl font-black text-amber-400 mt-0.5">405 / 1,000</div>
              <div className="text-[10px] text-slate-500 mt-0.5">100% Deterministic Cache</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. The 4 Fundamental Pillars (For Judges & Panitia) ── */}
      <section id="pillars" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Compass className="h-4 w-4" />
            <span>Panduan Evaluasi Juri · 4 Modul Inti</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            4 Pilar Ground-Truth Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Arsitektur analitis deterministik yang dirancang untuk menjawab pertanyaan kritis investor institusional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.step}
                className="glass-card group flex flex-col justify-between rounded-3xl border border-slate-800 p-6 transition-all hover:scale-[1.02]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-amber-400">
                      {p.step}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${p.accent}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white mb-3">
                    <Icon className="h-5 w-5 text-amber-400" />
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {p.title}
                  </h3>
                  <div className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">
                    {p.metric}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">{p.desc}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800/80">
                  <Link
                    href={p.href}
                    className="inline-flex w-full items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span>{p.buttonText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Live Universe 9 Emiten Leaderboard Preview ── */}
      <section id="leaderboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Flame className="h-4 w-4" />
              <span>Universe Emiten Terverifikasi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Ground Truth Composite Leaderboard (M8)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Peringkat fundamental 9 raksasa batubara IDX berdasarkan integritas data geologis dan operasional.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
          >
            Buka Leaderboard Lengkap di Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {issuers?.map((i, idx) => (
            <Link
              key={i.symbol}
              href={`/issuer/${i.symbol}`}
              className="glass-card group rounded-2xl border border-slate-800 p-4 transition-all hover:border-amber-500/40 hover:bg-slate-800/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <span className="font-mono text-lg font-black text-white group-hover:text-amber-300">
                      {i.symbol}
                    </span>
                  </div>
                  <ConfidenceBadge dataQuality={i.data_quality} />
                </div>
                <div className="text-xs text-slate-400 truncate mt-1">{i.name}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500">Skor Ground Truth</div>
                  <div className="font-mono text-base font-black text-amber-400">
                    {i.ground_truth_score != null ? i.ground_truth_score.toFixed(1) : "—"}
                    <span className="text-[10px] text-slate-600 font-bold"> / 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Sisa Umur (RLI)</div>
                  <div className="font-mono text-xs font-bold text-cyan-400">
                    {i.rli_years != null ? `${i.rli_years.toFixed(1)} thn` : "N/A"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. Zero Black-Box Architecture & Provenance ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-[#0a1120] via-slate-900/60 to-[#060911] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>100% Transparansi &amp; Audit Trail</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Zero Black-Box Intelligence. Setiap Angka Bisa Diaudit.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Platform keuangan konvensional seringkali menjadi black-box. GALI menyajikan{" "}
                <strong className="text-white">Evidence Drawer</strong> di setiap halaman emiten, memungkinkan
                investor dan juri menginspeksi payload mentah Sectors API, formula DCF finite annuity (M6), dan
                pohon kepemilikan efektif hingga ke entitas pemegang IUP.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>3-Tier Cache (Cold/Warm/Hot)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Formula Deterministik M1–M9</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Ledger Kredit API Publik</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>FastAPI + PostgreSQL + Redis</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3 shadow-inner">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Dokumentasi Rumus &amp; Metodologi
                </div>
                <p className="text-xs text-slate-400">
                  Pelajari rumus matematis M1 hingga M9, parameter diskon kalori Newcastle, dan asumsi hurdle rate 12%.
                </p>
                <Link
                  href="/methodology"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  Baca Metodologi M1–M9 →
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3 shadow-inner">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Audit Saldo Kredit API
                </div>
                <p className="text-xs text-slate-400">
                  Lihat rekapitulasi 405 kredit Sectors API yang dikeluarkan secara efisien dan deterministik.
                </p>
                <Link
                  href="/coverage"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Cek Truth Audit &amp; Ledger →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ── */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[#0a1120] to-[#060911] p-10 sm:p-14 shadow-2xl space-y-5 relative">
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Siap Menilai Emiten Komoditas IDX dengan Data Fisik Nyata?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Masuk ke Executive Dashboard untuk mengakses peta konsesi, stress-test skenario, dan kurva biaya nasional.
          </p>
          <div className="pt-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-8 py-4 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all"
            >
              <Pickaxe className="h-4 w-4" />
              <span>Buka Executive Dashboard Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
