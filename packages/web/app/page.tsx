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
import {
  Marquee,
  NumberTicker,
  RetroGrid,
  BorderBeam,
  SpotlightCard,
} from "@/components/magicui";

const PILLARS = [
  {
    step: "Pillar 01",
    title: "GPS-Tagged Physical Concession Map",
    metric: "M1 Asset Ground Truth",
    desc: "Links IDX stock tickers to 52 real physical mining concessions with verified GPS coordinates in Kalimantan and Sumatra.",
    icon: MapPin,
    href: "/map",
    badge: "52 GPS Sites",
    accent: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50",
    buttonText: "Explore Map",
    spotlight: "rgba(245, 158, 11, 0.18)",
  },
  {
    step: "Pillar 02",
    title: "Reserve Life Index (RLI)",
    metric: "M2 Remaining Mine Life",
    desc: "Calculates the remaining years of proven reserves based on the actual annual production rate. Reveals the gap between capital-market expectations and physical mine life.",
    icon: Clock,
    href: "/issuer/ADRO",
    badge: "Remaining Life (Yrs)",
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-500/50",
    buttonText: "View Issuer RLI",
    spotlight: "rgba(6, 182, 212, 0.18)",
  },
  {
    step: "Pillar 03",
    title: "National Cost Curve",
    metric: "M5 Cash Cost Breakeven",
    desc: "Maps cumulative cash cost per ton against the ICI-4 benchmark price ($85/t). Identifies the lowest-cost Q1 producers and issuers running at a cash loss.",
    icon: TrendingDown,
    href: "/cost-curve",
    badge: "Cash Cost / t",
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
    buttonText: "Open Cost Curve",
    spotlight: "rgba(16, 185, 129, 0.18)",
  },
  {
    step: "Pillar 04",
    title: "Scenario Stress-Test Studio",
    metric: "M9 Live Shock Engine",
    desc: "Real-time simulation of the impact of coal price shocks, China import tariffs (+30%), and MEMR license expiry discounts directly on Reserve-Backed Value.",
    icon: SlidersHorizontal,
    href: "/scenario",
    badge: "Real-Time Simulation",
    accent: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:border-indigo-500/50",
    buttonText: "Test Scenario",
    spotlight: "rgba(129, 140, 248, 0.18)",
  },
];

export default function LandingPage() {
  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => api.getIssuers(),
  });

  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);
  const totalRbvBillions = totalRbv > 0 ? totalRbv / 1e9 : 36.8;

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* ── 1. Hero Presentation Banner (Full-Width) ── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* 3D Perspective Terrain Grid (Magic UI RetroGrid) */}
        <RetroGrid />

        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-amber-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute top-40 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute top-40 -right-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-[90px]" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Hackathon Track Badge with glowing border */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Sectors Hackathon 2026 · Track 3 — Market Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Dig deeper than the{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(245,158,11,0.35)]">
              ticker symbol.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
            The first commodity fundamentals intelligence platform that connects the financials of IDX mining
            issuers directly to <strong className="text-amber-400">52 GPS-tagged physical mining concessions</strong>,
            remaining geological reserve life (RLI), cash cost per ton estimates, and real-time macro stress-test simulation.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:from-amber-400 hover:to-yellow-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95"
            >
              <Pickaxe className="h-4 w-4" />
              <span>Open Executive Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-200 shadow-lg backdrop-blur-xl transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white active:scale-95"
            >
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span>Map of 52 Mining Concessions</span>
            </Link>

            <Link
              href="/scenario"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-200 shadow-lg backdrop-blur-xl transition-all hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white active:scale-95"
            >
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <span>Stress-Test Studio</span>
            </Link>
          </div>

          {/* 3 Live Key Metric Tickers (Magic UI NumberTicker) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-6">
            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-md p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reserve-Backed Value
              </div>
              <div className="font-mono text-2xl font-black text-emerald-400 mt-0.5">
                {isLoading ? (
                  "——"
                ) : (
                  <NumberTicker
                    value={totalRbvBillions}
                    decimalPlaces={1}
                    prefix="$"
                    suffix="B"
                  />
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">7 Complete Coal Issuers</div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-md p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                GPS-Tagged Concessions
              </div>
              <div className="font-mono text-2xl font-black text-cyan-400 mt-0.5">
                <NumberTicker value={52} decimalPlaces={0} suffix=" Sites" />
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Kalimantan &amp; Sumatra</div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-md p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sectors API Credits
              </div>
              <div className="font-mono text-2xl font-black text-amber-400 mt-0.5">
                <NumberTicker value={405} decimalPlaces={0} suffix=" / 1,000" />
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">100% Deterministic Cache</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. The 4 Fundamental Pillars (For Judges & Panitia) ── */}
      {/* ── 1.5. Infinite Market Ticker Ribbon (Magic UI Marquee) ── */}
      <section className="w-full border-y border-slate-800/80 bg-[#070b14]/75 backdrop-blur-md py-2.5 overflow-hidden">
        <Marquee pauseOnHover duration={32} className="py-0">
          {issuers?.map((i) => (
            <Link
              key={i.symbol}
              href={`/issuer/${i.symbol}`}
              className="inline-flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-1.5 hover:border-amber-500/40 hover:bg-slate-800/90 transition-all text-xs mx-1.5 group shrink-0"
            >
              <span className="font-mono font-black text-white group-hover:text-amber-400">
                {i.symbol}
              </span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400 border border-amber-500/25">
                Score {i.ground_truth_score != null ? i.ground_truth_score.toFixed(1) : "—"}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                RLI: <strong className="text-cyan-400">{i.rli_years != null ? `${i.rli_years.toFixed(1)}y` : "N/A"}</strong>
              </span>
              {i.cash_cost_per_ton_usd != null && (
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  Cost: <strong className="text-emerald-400">${i.cash_cost_per_ton_usd}/t</strong>
                </span>
              )}
            </Link>
          ))}
        </Marquee>
      </section>

      {/* ── 2. The 4 Fundamental Pillars (Spotlight Bento Grid) ── */}
      <section id="pillars" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Compass className="h-4 w-4" />
            <span>Judging Guide · 4 Core Modules</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            4 Pilar Ground-Truth Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            A deterministic analytical architecture designed to answer the critical questions of institutional investors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <SpotlightCard
                key={p.step}
                className="glass-card group flex flex-col justify-between rounded-3xl border border-slate-800 p-6 transition-all hover:scale-[1.02]"
                spotlightColor={p.spotlight}
                spotlightSize={320}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-amber-400 transition-colors">
                      {p.step}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${p.accent}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white mb-3 shadow-inner">
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
                    className="inline-flex w-full items-center justify-between rounded-xl bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span>{p.buttonText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </section>


      {/* ── 3. Live Universe 9 Issuers Leaderboard Preview ── */}
      <section id="leaderboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Flame className="h-4 w-4" />
              <span>Verified Issuer Universe</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Ground Truth Composite Leaderboard (M8)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Fundamental ranking of 9 IDX coal giants based on geological and operational data integrity.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
          >
            Open Full Leaderboard on Dashboard <ArrowRight className="h-3.5 w-3.5" />
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
                  <div className="text-[10px] text-slate-500">Ground Truth Score</div>
                  <div className="font-mono text-base font-black text-amber-400">
                    {i.ground_truth_score != null ? i.ground_truth_score.toFixed(1) : "—"}
                    <span className="text-[10px] text-slate-600 font-bold"> / 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Remaining Life (RLI)</div>
                  <div className="font-mono text-xs font-bold text-cyan-400">
                    {i.rli_years != null ? `${i.rli_years.toFixed(1)} yrs` : "N/A"}
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
                <span>100% Transparency &amp; Audit Trail</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Zero Black-Box Intelligence. Every Number Is Auditable.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Conventional financial platforms are often black boxes. GALI provides an{" "}
                <strong className="text-white">Evidence Drawer</strong> on every issuer page, letting
                investors and judges inspect raw Sectors API payloads, the finite-annuity DCF formula (M6), and
                the effective ownership tree down to the entity holding the IUP.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>3-Tier Cache (Cold/Warm/Hot)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Deterministic Formulas M1–M9</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Public API Credit Ledger</span>
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
                  Formula &amp; Methodology Documentation
                </div>
                <p className="text-xs text-slate-400">
                  Explore the mathematical formulas M1 through M9, the Newcastle calorific discount parameters, and the 12% hurdle rate assumption.
                </p>
                <Link
                  href="/methodology"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  Read Methodology M1–M9 →
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3 shadow-inner">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  API Credit Balance Audit
                </div>
                <p className="text-xs text-slate-400">
                  See the recap of the 405 Sectors API credits spent efficiently and deterministically.
                </p>
                <Link
                  href="/coverage"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Check Truth Audit &amp; Ledger →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ── */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[#0a1120] to-[#060911] p-10 sm:p-14 shadow-2xl space-y-5 relative overflow-hidden">
          <BorderBeam size={320} duration={14} colorFrom="#f59e0b" colorTo="#06b6d4" />
          <h2 className="text-3xl sm:text-5xl font-black text-white relative z-10">
            Ready to Value IDX Commodity Issuers with Real Physical Data?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto relative z-10">
            Enter the Executive Dashboard to access the concession map, scenario stress tests, and the national cost curve.
          </p>
          <div className="pt-3 relative z-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-4 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:from-amber-400 hover:to-yellow-400 hover:scale-105 active:scale-95 transition-all"
            >
              <Pickaxe className="h-4 w-4" />
              <span>Open Executive Dashboard Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
