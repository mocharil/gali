"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Pickaxe,
  ArrowRight,
  Github,
  Menu,
  X,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";

interface LandingNavbarProps {
  apiOnline?: boolean | null;
}

export function LandingNavbar({ apiOnline }: LandingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 p-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-transform group-hover:scale-105">
            <Image
              src="/gali_logo.png"
              alt="GALI logo"
              width={38}
              height={38}
              priority
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-wider text-white">GALI</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                v1.0
              </span>
            </div>
            <p className="text-[10px] font-semibold tracking-tight text-slate-400 hidden sm:block">
              Ground-Truth Mining Intelligence for IDX
            </p>
          </div>
        </Link>

        {/* Center Nav Links for Landing Page */}
        <nav className="hidden md:flex items-center gap-1">
          <a
            href="#pillars"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            4 Pilar Fundamental
          </a>
          <a
            href="#leaderboard"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            Leaderboard 9 Emiten
          </a>
          <Link
            href="/map"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors flex items-center gap-1"
          >
            <MapPin className="h-3 w-3 text-cyan-400" />
            Peta 52 Tambang
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            Rumus M1–M9
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* API Status Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : apiOnline === false
                  ? "bg-rose-500"
                  : "bg-slate-500 animate-pulse"
              }`}
            />
            <span className="text-[10px] font-mono text-slate-300">
              {apiOnline === true ? "API Live" : apiOnline === false ? "Offline" : "Checking..."}
            </span>
          </div>

          <a
            href="https://github.com/mocharil/gali"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
            title="GitHub Repository"
          >
            <Github className="h-4 w-4" />
          </a>

          {/* Primary CTA: Launch Dashboard App */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all hover:from-amber-400 hover:to-yellow-400 hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] active:scale-95"
          >
            <Pickaxe className="h-3.5 w-3.5" />
            <span>Buka Dashboard App</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-[#080d19]/95 px-4 py-4 md:hidden backdrop-blur-2xl space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between rounded-xl bg-amber-500 p-3 text-xs font-black text-black"
          >
            <div className="flex items-center gap-2">
              <Pickaxe className="h-4 w-4" />
              <span>Masuk ke Executive Dashboard</span>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#pillars"
            onClick={() => setMobileOpen(false)}
            className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            4 Pilar Fundamental Tambang
          </a>
          <a
            href="#leaderboard"
            onClick={() => setMobileOpen(false)}
            className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Leaderboard 9 Emiten
          </a>
          <Link
            href="/map"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            Peta Konsesi 52 Tambang
          </Link>
          <Link
            href="/scenario"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
            Scenario Studio Stress-Test
          </Link>
          <Link
            href="/methodology"
            onClick={() => setMobileOpen(false)}
            className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Rumus Matematis &amp; Metodologi
          </Link>
          <a
            href="https://github.com/mocharil/gali"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400"
          >
            <Github className="h-4 w-4 text-amber-400" />
            GitHub Repository (mocharil/gali)
          </a>
        </div>
      )}
    </header>
  );
}
