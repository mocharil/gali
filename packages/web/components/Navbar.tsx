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
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Close the mobile menu automatically on route change.
  useEffect(() => {
    setMobileOpen(false);
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#080c14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/gali_logo.png"
                alt="GALI logo"
                width={40}
                height={40}
                priority
                className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-white">GALI</span>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
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
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-800 text-amber-400 border border-slate-700 shadow-sm"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400 animate-pulse"
                  : apiOnline === false
                  ? "bg-rose-500"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300">
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:text-white md:hidden"
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav-menu"
          className="border-t border-slate-800 bg-[#080c14] px-4 py-3 md:hidden"
          aria-label="Navigasi utama (mobile)"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-800 text-amber-400 border border-slate-700"
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
              className="mt-1 flex items-center gap-2.5 rounded-lg border-t border-slate-800 px-3 py-2.5 pt-3.5 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4" />
              GitHub Repository
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
