"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Pickaxe,
  MapPin,
  SlidersHorizontal,
  TrendingDown,
  LineChart,
  ShieldCheck,
  BookOpen,
  Activity,
  Github,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Pickaxe className="h-5 w-5 text-slate-950 stroke-[2.5]" />
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="GitHub Repository"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
