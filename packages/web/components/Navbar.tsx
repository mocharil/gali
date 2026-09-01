"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Pickaxe,
  MapPin,
  SlidersHorizontal,
  TrendingDown,
  LineChart,
  ShieldCheck,
  BookOpen,
  Github,
  Menu,
  X,
  Search,
  ChevronDown,
} from "lucide-react";

const COAL_TITANS = [
  { symbol: "AADI", name: "Adaro Andalan Indonesia" },
  { symbol: "ADMR", name: "Adaro Minerals Indonesia" },
  { symbol: "ADRO", name: "Alamtri Resources Indonesia" },
  { symbol: "BUMI", name: "Bumi Resources" },
  { symbol: "BYAN", name: "Bayan Resources" },
  { symbol: "DSSA", name: "Dian Swastatika Sentosa" },
  { symbol: "GEMS", name: "Golden Energy Mines" },
  { symbol: "ITMG", name: "Indo Tambangraya Megah" },
  { symbol: "PTBA", name: "Bukit Asam" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Close the mobile menu and search automatically on route change.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navItems = [
    { href: "/", label: "Executive", icon: Pickaxe },
    { href: "/map", label: "National Map", icon: MapPin },
    { href: "/scenario", label: "Scenario Studio", icon: SlidersHorizontal },
    { href: "/cost-curve", label: "Cost Curve", icon: TrendingDown },
    { href: "/divergence", label: "Divergence", icon: LineChart },
    { href: "/coverage", label: "Truth Audit", icon: ShieldCheck },
    { href: "/methodology", label: "Methodology", icon: BookOpen },
  ];

  const filteredIssuers = searchQuery
    ? COAL_TITANS.filter(
        (i) =>
          i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COAL_TITANS;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/gali_logo.png"
                alt="GALI logo"
                width={38}
                height={38}
                priority
                className="h-9 w-9 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-white">GALI</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] font-medium tracking-tight text-slate-400">
                Ground-Truth Intelligence for IDX Mining
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-slate-800/90 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mid Screen nav (condensed for lg screens) */}
        <nav className="hidden md:flex xl:hidden items-center gap-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-800 text-amber-400 border border-slate-700"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
                title={item.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Status, Search, & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Ticker Search Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800"
              aria-label="Cari emiten tambang"
              aria-expanded={searchOpen}
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline font-mono">Emiten</span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${searchOpen ? "rotate-180" : ""}`} />
            </button>

            {searchOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#0c1322] p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <input
                  type="text"
                  placeholder="Cari simbol (ADRO, BYAN...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
                />
                <div className="mt-1.5 max-h-56 overflow-y-auto space-y-0.5">
                  {filteredIssuers.map((i) => (
                    <button
                      key={i.symbol}
                      onClick={() => {
                        router.push(`/issuer/${i.symbol}`);
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-800/80 group"
                    >
                      <div>
                        <span className="font-mono font-bold text-amber-400 group-hover:text-amber-300">{i.symbol}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{i.name}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">→</span>
                    </button>
                  ))}
                  {filteredIssuers.length === 0 && (
                    <div className="py-3 text-center text-xs text-slate-500">Tidak ada emiten cocok</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* API Status Badge */}
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : apiOnline === false
                  ? "bg-rose-500"
                  : "bg-slate-500 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300 hidden sm:inline font-mono">
              {apiOnline === true ? "API Live" : apiOnline === false ? "API Offline" : "Connecting..."}
            </span>
          </div>

          <a
            href="https://github.com/mocharil/gali"
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-slate-700 hover:text-white sm:flex"
            title="GitHub Repository"
            aria-label="Buka repository GitHub GALI di tab baru"
          >
            <Github className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:text-white xl:hidden"
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav-menu"
          className="border-t border-slate-800 bg-[#080c14]/95 px-4 py-4 xl:hidden shadow-2xl backdrop-blur-2xl"
          aria-label="Navigasi utama (mobile)"
        >
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-800 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
            <a
              href="https://github.com/mocharil/gali"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4 text-amber-400" />
              GitHub Repository (mocharil/gali)
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
