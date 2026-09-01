"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Pickaxe,
  MapPin,
  SlidersHorizontal,
  TrendingDown,
  LineChart,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  X,
  Keyboard,
} from "lucide-react";

const COAL_TITANS = [
  { symbol: "AADI", name: "Adaro Andalan Indonesia Tbk", quality: "LENGKAP", score: 62.1 },
  { symbol: "ADMR", name: "Adaro Minerals Indonesia Tbk", quality: "LENGKAP", score: 65.4 },
  { symbol: "ADRO", name: "Alamtri Resources Indonesia Tbk", quality: "PARSIAL", score: 47.4 },
  { symbol: "BUMI", name: "Bumi Resources Tbk", quality: "LENGKAP", score: 58.9 },
  { symbol: "BYAN", name: "Bayan Resources Tbk", quality: "LENGKAP", score: 78.2 },
  { symbol: "DSSA", name: "Dian Swastatika Sentosa Tbk", quality: "PARSIAL", score: 39.8 },
  { symbol: "GEMS", name: "Golden Energy Mines Tbk", quality: "LENGKAP", score: 71.5 },
  { symbol: "ITMG", name: "Indo Tambangraya Megah Tbk", quality: "LENGKAP", score: 68.3 },
  { symbol: "PTBA", name: "Bukit Asam Tbk", quality: "LENGKAP", score: 74.0 },
];

const PAGES = [
  { href: "/", label: "Executive Dashboard", desc: "Leaderboard skor fundamental & peta nasional", icon: Pickaxe },
  { href: "/map", label: "National Concession Map", desc: "Peta sebaran 52 koordinat situs tambang ber-GPS", icon: MapPin },
  { href: "/scenario", label: "Scenario Studio", desc: "Simulasi stress-test harga batubara & tarif impor", icon: SlidersHorizontal },
  { href: "/cost-curve", label: "National Cost Curve", desc: "Tangga biaya tunai (cash cost) vs harga acuan ICI", icon: TrendingDown },
  { href: "/divergence", label: "Market Divergence", desc: "Matriks valuasi cadangan fisik vs harga pasar", icon: LineChart },
  { href: "/coverage", label: "Truth Audit & Ledger", desc: "Audit kejujuran data & pengeluaran kredit API", icon: ShieldCheck },
  { href: "/methodology", label: "Metodologi & Formula", desc: "Transparansi rumus matematis M1–M9 & disclaimer", icon: BookOpen },
];

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0a0f1d] shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
          <Search className="h-4 w-4 text-amber-400 shrink-0" />
          <input
            type="text"
            placeholder="Ketik simbol emiten (ADRO, BYAN) atau navigasi halaman..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Issuers Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Pickaxe className="h-3 w-3" />
              <span>Emiten Pertambangan Batubara ({filteredIssuers.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {filteredIssuers.map((i) => (
                <button
                  key={i.symbol}
                  onClick={() => {
                    router.push(`/issuer/${i.symbol}`);
                    onClose();
                  }}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-2.5 text-left transition-colors hover:border-amber-500/40 hover:bg-slate-800/80 group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400 group-hover:text-amber-300">
                        {i.symbol}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Skor: {i.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{i.name}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Pages Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Halaman &amp; Alat Analisis ({filteredPages.length})</span>
            </div>
            <div className="space-y-1 mt-1">
              {filteredPages.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.href}
                    onClick={() => {
                      router.push(p.href);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-2.5 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-800/80 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                          {p.label}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Shortcut Info */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/80 px-4 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 border border-slate-800 font-mono text-[10px] text-slate-400">
              <Keyboard className="h-3 w-3" /> Esc
            </span>
            <span>untuk menutup</span>
          </div>
          <span className="font-mono text-slate-400">GALI Fast Navigator</span>
        </div>
      </div>
    </div>
  );
}
