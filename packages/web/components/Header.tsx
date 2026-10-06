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
  Sparkles,
} from "lucide-react";

import { NAVIGATION_PAGES } from "@/lib/navigation";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleCollapse: () => void;
  isCollapsed?: boolean;
  onOpenSearch: () => void;
  onOpenAi?: () => void;
  apiOnline?: boolean | null;
}

const ROUTE_CONTEXTS: Record<string, { title: string; category: string; desc: string }> = Object.fromEntries(NAVIGATION_PAGES.map((page) => [page.href, { title: page.label, category: page.category, desc: page.description }]));

export function Header({
  onToggleSidebar,
  onToggleCollapse,
  isCollapsed = false,
  onOpenSearch,
  onOpenAi,
  apiOnline,
}: HeaderProps) {
  const pathname = usePathname();
  const [macroOpen, setMacroOpen] = useState(false);

  // Derive title from pathname, handling /issuer/[symbol]
  let context = ROUTE_CONTEXTS[pathname];
  if (!context && pathname.startsWith("/issuer/")) {
    const symbol = pathname.split("/")[2]?.toUpperCase() || "ISSUER";
    context = {
      title: `${symbol} · Fundamental`,
      category: "Coal issuer",
      desc: `Reserve, license, and cost analysis for ${symbol}`,
    };
  }
  if (!context) {
    context = {
      title: "GALI analysis",
      category: "Fundamental research",
      desc: "Fundamentals of Indonesian mining issuers",
    };
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-line bg-surface">
      {/* Main Topbar Row */}
      <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Sidebar Toggle & Breadcrumb Context */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="gali-icon-button lg:hidden"
            aria-label="Open navigation menu"
          >
            <PanelLeft className="h-5 w-5 text-brand" />
          </button>

          {/* Desktop Fold / Unfold Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="gali-icon-button hidden lg:flex"
            title={isCollapsed ? "Expand navigation (Ctrl+B)" : "Collapse navigation (Ctrl+B)"}
            aria-label="Collapse or expand navigation"
          >
            <PanelLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium text-muted">
              <span className="text-brand">{context.category}</span>
              <ChevronRight className="h-3 w-3 text-subtle" />
              <span className="truncate text-ink-soft">{context.title}</span>
            </div>
            <p className="text-sm font-semibold tracking-tight text-ink sm:text-lg truncate">
              {context.title}
            </p>
          </div>
        </div>

        {/* Right: Quick Macro Ticker, Search, & Live Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Macro Indicators (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 text-[12px]">
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-muted px-2.5 py-1 text-ink-soft">
              <span className="text-muted font-medium">Discount rate:</span>
              <span className="font-numeric font-bold text-info">12.0%</span>
            </div>
          </div>

          {/* Macro Toggle on Tablet */}
          <button
            onClick={() => setMacroOpen(!macroOpen)}
            className="hidden md:flex xl:hidden min-h-10 items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-soft hover:border-line-strong"
            title="View model assumptions"
          >
            <Sliders className="h-3.5 w-3.5 text-brand" />
            <span className="text-[12px] font-numeric">Assumptions</span>
            {macroOpen ? <ChevronUp className="h-3 w-3 text-muted" /> : <ChevronDown className="h-3 w-3 text-muted" />}
          </button>

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="gali-button gali-button-secondary max-sm:w-11 max-sm:px-0"
            aria-label="Search issuers or features (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-brand group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 font-numeric text-[12px] text-muted">
              ⌘K
            </kbd>
          </button>

          {/* Data Assistant Trigger */}
          {onOpenAi && (
            <button
              onClick={onOpenAi}
              className="gali-button gali-button-secondary max-sm:w-11 max-sm:px-0"
              title="Open data assistant (Ctrl/⌘J)"
              aria-label="Open data assistant"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span className="hidden sm:inline">Data assistant</span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-brand-line bg-surface px-1 py-0.2 font-numeric text-[12px] text-brand">
                ⌘J
              </kbd>
            </button>
          )}

          {/* API Status Badge */}
          <div className="gali-status gali-status-neutral hidden sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-positive"
                  : apiOnline === false
                  ? "bg-negative"
                  : "bg-neutral animate-pulse"
              }`}
            />
            <span className="text-[12px] font-numeric font-medium text-ink-soft hidden sm:inline">
              {apiOnline === true ? "Data ready" : apiOnline === false ? "Data unavailable" : "Checking…"}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Macro Details on tablet/mobile */}
      {macroOpen && (
        <div className="border-t border-line bg-surface px-4 py-2.5 text-sm text-ink-soft animate-in fade-in duration-150 xl:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Discount rate:</span>
              <strong className="text-info font-numeric">12.0%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Variable-cost share:</span>
              <strong className="text-info font-numeric">65.0%</strong>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
