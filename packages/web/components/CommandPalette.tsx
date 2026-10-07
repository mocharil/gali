"use client";

import React, { useState, useRef } from "react";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { useDialog } from "@/lib/useDialog";
import { DataState } from "./DataState";
import { useActivity } from "./ActivityProvider";
import { Search, Pickaxe, ArrowRight, Sparkles, X, Keyboard } from "lucide-react";
import { NAVIGATION_PAGES } from "@/lib/navigation";
import { IssuerLogo } from "./IssuerLogo";

const PAGES = [{ href: "/", label: "Home", description: "Introduction to GALI and the research workflow", icon: Sparkles }, ...NAVIGATION_PAGES].map((page) => ({ ...page, desc: page.description }));

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { navigate } = useActivity();

  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(isOpen, onClose, panelRef);
  const issuers = useIssuerUniverse(isOpen);
  const COAL_TITANS = issuers.data ?? [];

  if (!isOpen) return null;

  const filteredIssuers = query.trim()
    ? COAL_TITANS.filter(
        (i) =>
          i.symbol.toLowerCase().includes(query.toLowerCase()) ||
          i.name.toLowerCase().includes(query.toLowerCase())
      )
    : COAL_TITANS;

  const filteredPages = query.trim()
    ? PAGES.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.desc.toLowerCase().includes(query.toLowerCase())
      )
    : PAGES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-overlay p-4 pt-20 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog" aria-modal="true" aria-label="Search issuers and features"
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-surface shadow-panel animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search className="h-4 w-4 text-brand shrink-0" />
          <input
            aria-label="Search issuers or pages"
            type="text"
            placeholder="Search tickers (ADRO, BYAN) or features…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="min-h-11 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-sm text-muted hover:text-ink-soft"
            >
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="gali-icon-button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {issuers.isError && <DataState error={issuers.error} onRetry={() => issuers.refetch()} />}
          {issuers.isLoading && <p role="status" className="p-3 text-sm text-muted">Loading issuers…</p>}
          {/* Issuers Section */}
          <div>
            <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Pickaxe className="h-3 w-3" />
              <span>Coal issuers ({filteredIssuers.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {filteredIssuers.map((i) => (
                <button
                  key={i.symbol}
                  onClick={() => {
                    navigate(`/issuer/${i.symbol}`);
                    onClose();
                  }}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand-line hover:bg-surface-hover group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <IssuerLogo symbol={i.symbol} size="sm" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-numeric font-bold text-ink group-hover:text-brand">
                          {i.symbol}
                        </span>
                        <span className="text-[12px] font-numeric text-muted">
                          Score: {i.ground_truth_score != null ? i.ground_truth_score.toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="text-[12px] text-muted truncate">{i.name}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-subtle group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Pages Section */}
          <div>
            <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-info flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Pages &amp; analysis features ({filteredPages.length})</span>
            </div>
            <div className="space-y-1 mt-1">
              {filteredPages.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.href}
                    onClick={() => {
                      navigate(p.href);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-info-line hover:bg-surface-hover group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-hover text-info border border-line-strong">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink group-hover:text-info">
                          {p.label}
                        </div>
                        <div className="text-[12px] text-muted">{p.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-subtle group-hover:text-info group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Shortcut Info */}
        <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5 text-[12px] text-muted">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-line font-numeric text-[12px] text-muted">
              <Keyboard className="h-3 w-3" /> Esc
            </span>
            <span>to close</span>
          </div>
          <span className="font-numeric text-muted">GALI navigation</span>
        </div>
      </div>
    </div>
  );
}
