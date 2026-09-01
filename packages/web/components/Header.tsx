"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  Sliders,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelLeft,
} from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleCollapse: () => void;
  isCollapsed?: boolean;
  onOpenSearch: () => void;
  apiOnline?: boolean | null;
}

const ROUTE_CONTEXTS: Record<string, { title: string; category: string; desc: string }> = {
  "/dashboard": {
    title: "Executive Dashboard",
    category: "Ringkasan Eksekutif",
    desc: "Leaderboard skor fundamental tambang & peta nasional 52 konsesi",
  },
  "/": {
    title: "Landing Page",
    category: "Beranda Publik",
    desc: "Pengenalan platform intelijen fundamental komoditas IDX",
  },
  "/map": {
    title: "Peta Konsesi Tambang",
    category: "Spasial & Geologis",
    desc: "Visualisasi 52 situs tambang fisik berkoordinat GPS di Kalimantan & Sumatra",
  },
  "/scenario": {
    title: "Scenario Studio",
    category: "Simulasi Finansial",
    desc: "Stress-test real-time terhadap shock harga batubara, tarif impor, dan kepatuhan CNC",
  },
  "/cost-curve": {
    title: "Kurva Biaya Nasional",
    category: "Analisis Margin",
    desc: "Kumulatif cash cost per ton terhadap harga acuan pasar komoditas ICI",
  },
  "/divergence": {
    title: "Matriks Divergensi Pasar",
    category: "Valuasi Cadangan",
    desc: "Membandingkan Reserve-Backed Value (RBV) vs Market Cap & Foreign Flow",
  },
  "/coverage": {
    title: "Truth Audit & Ledger",
    category: "Transparansi Data",
    desc: "Audit data mentah Sectors API dan saldo pengeluaran kredit API",
  },
  "/methodology": {
    title: "Rumus & Metodologi",
    category: "Dokumentasi Teknis",
    desc: "Transparansi formula matematis M1 hingga M9 serta batasan metodologis",
  },
};

export function Header({
  onToggleSidebar,
  onToggleCollapse,
  isCollapsed = false,
  onOpenSearch,
  apiOnline,
}: HeaderProps) {
  const pathname = usePathname();
  const [macroOpen, setMacroOpen] = useState(false);

  // Derive title from pathname, handling /issuer/[symbol]
  let context = ROUTE_CONTEXTS[pathname];
  if (!context && pathname.startsWith("/issuer/")) {
    const symbol = pathname.split("/")[2]?.toUpperCase() || "EMITEN";
    context = {
      title: `${symbol} — Deep-Dive Fundamental`,
      category: "Emiten Batubara IDX",
      desc: `Analisis cadangan fisik, RLI, license cliff, dan cash cost ${symbol}`,
    };
  }
  if (!context) {
    context = {
      title: "GALI Analytics",
      category: "Platform Intelligence",
      desc: "Ground-Truth Intelligence for IDX Mining",
    };
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl">
      {/* Main Topbar Row */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Sidebar Toggle & Breadcrumb Context */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white lg:hidden"
            aria-label="Buka navigasi menu (mobile)"
          >
            <PanelLeft className="h-5 w-5 text-amber-400" />
          </button>

          {/* Desktop Fold / Unfold Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-amber-500/40 hover:bg-slate-800 hover:text-amber-400 transition-all group"
            title={isCollapsed ? "Buka Sidebar Penuh (Ctrl+B)" : "Lipat Sidebar (Ctrl+B)"}
            aria-label="Toggle sidebar fold"
          >
            <PanelLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span className="text-amber-400/90">{context.category}</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="truncate text-slate-300">{context.title}</span>
            </div>
            <h1 className="text-sm font-black tracking-tight text-white sm:text-base truncate">
              {context.title}
            </h1>
          </div>
        </div>

        {/* Right: Quick Macro Ticker, Search, & Live Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Macro Indicators (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px]">
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300">
              <span className="text-slate-500 font-medium">Newcastle:</span>
              <span className="font-mono font-bold text-amber-400">$135.00/t</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300">
              <span className="text-slate-500 font-medium">ICI-4:</span>
              <span className="font-mono font-bold text-emerald-400">$85.00/t</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300">
              <span className="text-slate-500 font-medium">Discount:</span>
              <span className="font-mono font-bold text-cyan-400">12.0%</span>
            </div>
          </div>

          {/* Macro Toggle on Tablet */}
          <button
            onClick={() => setMacroOpen(!macroOpen)}
            className="hidden md:flex xl:hidden items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700"
            title="Lihat asumsi makro"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-mono">Asumsi</span>
            {macroOpen ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
          </button>

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-amber-500/40 hover:text-slate-200 shadow-sm group"
            aria-label="Cari emiten atau fitur (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Cari...</span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* API Status Badge */}
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : apiOnline === false
                  ? "bg-rose-500"
                  : "bg-slate-500 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-mono font-medium text-slate-300 hidden sm:inline">
              {apiOnline === true ? "API Live" : apiOnline === false ? "Offline" : "Checking..."}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Macro Details on tablet/mobile */}
      {macroOpen && (
        <div className="border-t border-slate-800 bg-slate-950/90 px-4 py-2.5 text-xs text-slate-300 animate-in fade-in duration-150 xl:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Newcastle Benchmark:</span>
              <strong className="text-amber-400 font-mono">$135.00/t</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">ICI-4 Acuan:</span>
              <strong className="text-emerald-400 font-mono">$85.00/t</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Real Discount Rate:</span>
              <strong className="text-cyan-400 font-mono">12.0%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Variable Cost:</span>
              <strong className="text-indigo-400 font-mono">65.0%</strong>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
