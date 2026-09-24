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
    category: "Executive Summary",
    desc: "Mining fundamental score leaderboard & national map of 52 concessions",
  },
  "/": {
    title: "Landing Page",
    category: "Public Home",
    desc: "Introduction to the IDX commodity fundamental intelligence platform",
  },
  "/map": {
    title: "Mining Concession Map",
    category: "Spatial & Geological",
    desc: "Visualization of 52 physical mining sites with GPS coordinates in Kalimantan & Sumatra",
  },
  "/scenario": {
    title: "Scenario Studio",
    category: "Financial Simulation",
    desc: "Real-time stress-test against coal price shocks, import tariffs, and CNC compliance",
  },
  "/cost-curve": {
    title: "National Cost Curve",
    category: "Margin Analysis",
    desc: "Cumulative cash cost per ton against ICI commodity benchmark prices",
  },
  "/divergence": {
    title: "Market Divergence Matrix",
    category: "Reserve Valuation",
    desc: "Comparing Reserve-Backed Value (RBV) vs Market Cap & Foreign Flow",
  },
  "/coverage": {
    title: "Truth Audit & Ledger",
    category: "Data Transparency",
    desc: "Raw Sectors API data audit and API credit spending balance",
  },
  "/methodology": {
    title: "Formulas & Methodology",
    category: "Technical Documentation",
    desc: "Transparency of M1 through M9 mathematical formulas and methodological limitations",
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
    const symbol = pathname.split("/")[2]?.toUpperCase() || "ISSUER";
    context = {
      title: `${symbol} — Deep-Dive Fundamental`,
      category: "IDX Coal Issuer",
      desc: `Analysis of physical reserves, RLI, license cliff, and cash cost for ${symbol}`,
    };
  }
  if (!context) {
    context = {
      title: "GALI Analytics",
      category: "Intelligence Platform",
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
            aria-label="Open navigation menu (mobile)"
          >
            <PanelLeft className="h-5 w-5 text-amber-400" />
          </button>

          {/* Desktop Fold / Unfold Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-amber-500/40 hover:bg-slate-800 hover:text-amber-400 transition-all group"
            title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
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
            title="View macro assumptions"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-mono">Assumptions</span>
            {macroOpen ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
          </button>

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-amber-500/40 hover:text-slate-200 shadow-sm group"
            aria-label="Search issuers or features (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Search...</span>
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
              <span className="text-slate-500">ICI-4 Benchmark:</span>
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
