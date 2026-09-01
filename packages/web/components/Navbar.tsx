"use client";

import React, { useState, useEffect } from "react";
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
  Github,
  Menu,
  X,
  Search,
} from "lucide-react";

import { CommandPalette } from "./CommandPalette";

export function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Global hotkey: Ctrl/Cmd+K or "/" to open Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-close on route change
  useEffect(() => {
    setMobileOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ── Brand ── */}
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
              <p className="text-[10px] font-medium tracking-tight text-slate-400 hidden sm:block">
                Ground-Truth Intelligence for IDX Mining
              </p>
            </div>
          </Link>

          {/* ── Desktop nav (≥xl) ── */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-slate-800/90 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Tablet nav (md–xl): icons + short labels ── */}
          <nav className="hidden md:flex xl:hidden items-center gap-0.5">
            {navItems.slice(0, 5).map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-800 text-amber-400 border border-slate-700"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-2">
            {/* Command Palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-amber-500/40 hover:text-slate-200 group"
              aria-label="Buka Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Cari...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                ⌘K
              </kbd>
            </button>

            {/* API status dot */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiOnline === true
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                    : apiOnline === false
                    ? "bg-rose-500"
                    : "bg-slate-500 animate-pulse"
                }`}
              />
              <span className="text-[11px] font-mono font-medium text-slate-300">
                {apiOnline === true ? "Live" : apiOnline === false ? "Offline" : "…"}
              </span>
            </div>

            {/* GitHub link */}
            <a
              href="https://github.com/mocharil/gali"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>

            {/* Hamburger (mobile / tablet) */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:text-white xl:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <nav
            id="mobile-nav-drawer"
            className="border-t border-slate-800 bg-[#080c14]/98 px-4 py-4 xl:hidden backdrop-blur-2xl shadow-2xl"
            aria-label="Mobile navigation"
          >
            {/* Search shortcut row */}
            <button
              onClick={() => {
                setMobileOpen(false);
                setPaletteOpen(true);
              }}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm font-semibold text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-400" />
                <span>Cari emiten atau halaman…</span>
              </div>
              <span className="font-mono text-xs text-slate-500">⌘K</span>
            </button>

            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-slate-800 text-amber-400 border border-amber-500/30"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <a
              href="https://github.com/mocharil/gali"
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4 text-amber-400" />
              GitHub (mocharil/gali)
            </a>
          </nav>
        )}
      </header>

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
