"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Pickaxe,
  MapPin,
  SlidersHorizontal,
  TrendingDown,
  LineChart,
  ShieldCheck,
  BookOpen,
  Search,
  Github,
  Sparkles,
  ExternalLink,
  Flame,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSearch?: () => void;
  apiOnline?: boolean | null;
}

const MENU_GROUPS = [
  {
    title: "Dashboard & Peta",
    items: [
      {
        href: "/",
        label: "Executive Dashboard",
        desc: "Leaderboard & metrik ringkasan",
        icon: Pickaxe,
        badge: "Utama",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      },
      {
        href: "/map",
        label: "Peta Konsesi Nasional",
        desc: "52 situs tambang fisik GPS",
        icon: MapPin,
        badge: "52 GPS",
        badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      },
    ],
  },
  {
    title: "Analisis Geologis & Pasar",
    items: [
      {
        href: "/scenario",
        label: "Scenario Studio",
        desc: "Simulasi stress-test makro real-time",
        icon: SlidersHorizontal,
        badge: "Simulasi",
        badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      },
      {
        href: "/cost-curve",
        label: "Kurva Biaya Nasional",
        desc: "Cash cost vs harga acuan ICI",
        icon: TrendingDown,
        badge: "M5",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      },
      {
        href: "/divergence",
        label: "Matriks Divergensi",
        desc: "Cadangan fisik vs harga pasar",
        icon: LineChart,
        badge: "M8 vs Cap",
        badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/30",
      },
    ],
  },
  {
    title: "Tata Kelola & Metodologi",
    items: [
      {
        href: "/coverage",
        label: "Truth Audit & Ledger",
        desc: "Audit data mentah & kredit API",
        icon: ShieldCheck,
        badge: "405 Krd",
        badgeColor: "bg-slate-700/60 text-slate-300 border-slate-600",
      },
      {
        href: "/methodology",
        label: "Rumus & Metodologi",
        desc: "Formula matematis M1–M9",
        icon: BookOpen,
        badge: "Docs",
        badgeColor: "bg-slate-700/60 text-slate-300 border-slate-600",
      },
    ],
  },
];

const EMITEN_LIST = [
  { symbol: "BYAN", score: 78.2, quality: "LENGKAP" },
  { symbol: "PTBA", score: 74.0, quality: "LENGKAP" },
  { symbol: "GEMS", score: 71.5, quality: "LENGKAP" },
  { symbol: "ITMG", score: 68.3, quality: "LENGKAP" },
  { symbol: "ADMR", score: 65.4, quality: "LENGKAP" },
  { symbol: "AADI", score: 62.1, quality: "LENGKAP" },
  { symbol: "BUMI", score: 58.9, quality: "LENGKAP" },
  { symbol: "ADRO", score: 47.4, quality: "PARSIAL" },
  { symbol: "DSSA", score: 39.8, quality: "PARSIAL" },
];

export function Sidebar({ isOpen = false, onClose, onOpenSearch, apiOnline }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-[#080d19]/95 backdrop-blur-2xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 group transition-transform active:scale-95"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 p-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Image
                src="/gali_logo.png"
                alt="GALI logo"
                width={36}
                height={36}
                priority
                className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-white">GALI</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] font-semibold tracking-tight text-slate-400">
                Ground-Truth Mining Intelligence
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Search Trigger */}
        <div className="px-4 pt-3.5 pb-1">
          <button
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              if (onClose) onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-400 transition-all hover:border-amber-500/40 hover:bg-slate-800/80 hover:text-slate-200 group shadow-inner"
          >
            <div className="flex items-center gap-2.5">
              <Search className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Cari emiten / fitur...</span>
            </div>
            <kbd className="flex items-center rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-5 scrollbar-thin">
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-slate-800/90 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.12)] font-bold"
                          : "text-slate-300 hover:bg-slate-900/90 hover:text-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            isActive
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-slate-900/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="truncate">{item.label}</div>
                          <div className="text-[10px] font-normal text-slate-500 truncate leading-none mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      {item.badge && (
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-mono font-bold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Universe 9 Emiten Quick Jump */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-amber-400" />
                Universe 9 Emiten IDX
              </span>
              <span className="text-[9px] font-mono text-slate-500">Skor M8</span>
            </div>

            <div className="grid grid-cols-3 gap-1 px-1">
              {EMITEN_LIST.map((emiten) => {
                const isSelected = pathname === `/issuer/${emiten.symbol}`;
                return (
                  <Link
                    key={emiten.symbol}
                    href={`/issuer/${emiten.symbol}`}
                    onClick={onClose}
                    className={`flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all border ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                        : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-xs font-black tracking-tight">{emiten.symbol}</span>
                    <span className="font-mono text-[10px] text-slate-400">{emiten.score.toFixed(1)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="shrink-0 border-t border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2.5">
          {/* Hackathon Track Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="h-3 w-3" />
              </div>
              <div className="text-[10px]">
                <div className="font-bold text-slate-200">Sectors Hackathon 2026</div>
                <div className="text-slate-400">Track 3: Market Intelligence</div>
              </div>
            </div>
          </div>

          {/* Links & Live status */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiOnline === true
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                    : apiOnline === false
                    ? "bg-rose-500"
                    : "bg-slate-500 animate-pulse"
                }`}
              />
              <span className="font-mono text-[10px] text-slate-300">
                {apiOnline === true ? "API Online" : apiOnline === false ? "API Offline" : "Connecting..."}
              </span>
            </div>

            <a
              href="https://github.com/mocharil/gali"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
