"use client";

import React from "react";
import Link from "next/link";
import { Terminal, ShieldCheck, Cpu, Layers } from "lucide-react";

interface TerminalStatusBarProps {
  apiOnline?: boolean | null;
}

export function TerminalStatusBar({ apiOnline }: TerminalStatusBarProps) {
  return (
    <footer className="shrink-0 border-t border-slate-800/80 bg-[#060912]/95 px-4 py-2 text-[11px] font-mono text-slate-400 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        {/* Left: Terminal status & Scope */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-bold text-slate-300">GALI TERMINAL</span>
            <span className="text-slate-600">v1.0.0</span>
          </div>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <div className="hidden items-center gap-1.5 text-slate-400 sm:flex">
            <Layers className="h-3 w-3 text-cyan-400" />
            <span>9 Emiten Batubara IDX · 52 Konsesi GPS</span>
          </div>
        </div>

        {/* Center: Engine & Guarantee */}
        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Deterministic Valuation Engine (M1–M9) · 405 API Credits Spent</span>
        </div>

        {/* Right: API Health & Quick Docs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : apiOnline === false
                  ? "bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="text-slate-400">
              {apiOnline === true ? "API Online" : apiOnline === false ? "API Offline" : "Connecting..."}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <Link
            href="/methodology"
            className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            <Cpu className="h-3 w-3 text-amber-400" />
            <span>Formula Specs</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
