import React from "react";
import Link from "next/link";
import { ShieldAlert, Database, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-[#060910] text-slate-400">
      {/* Disclaimer Banner */}
      <div className="border-b border-slate-800/80 bg-amber-500/5 py-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-400">LEGAL & REGULATORY DISCLAIMER: </span>
            GALI is an independent fundamental analytics platform built for the Sectors Hackathon 2026. All
            data, reserve life estimates, discounted reserve-backed valuations, and live scenario shocks are
            provided solely for educational, research, and technical analytical purposes. GALI contains no
            trade execution mechanisms and does NOT provide investment advice, trading recommendations, or financial
            solicitations. Always conduct independent due diligence with certified financial advisors.
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white">GALI</span>
              <span className="text-xs text-slate-500">| Project GALI Monorepo</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Ground-Truth fundamental intelligence for IDX commodity and energy issuers. Linking corporate balance
              sheets to physical mining concessions, remaining reserve years, concession license cliff horizons,
              and live macroeconomic stress-testing.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-amber-400" />
                <span>Sectors API Cold/Warm/Hot Cache</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>404 / 1,000 Credits Spent</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Intelligence Surfaces</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">
                  Executive Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-amber-400 transition-colors">
                  National Concession Map
                </Link>
              </li>
              <li>
                <Link href="/scenario" className="hover:text-amber-400 transition-colors">
                  Live Scenario Studio
                </Link>
              </li>
              <li>
                <Link href="/cost-curve" className="hover:text-amber-400 transition-colors">
                  National Cost Curve
                </Link>
              </li>
              <li>
                <Link href="/divergence" className="hover:text-amber-400 transition-colors">
                  Valuation Divergence
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Transparency & Audit</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/coverage" className="hover:text-amber-400 transition-colors">
                  Truth Audit & Data Coverage
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-amber-400 transition-colors">
                  Formulas & Methodology (M1–M9)
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/mocharil/gali"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-400 transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>© 2026 GALI. Open Source under MIT License. Sectors Hackathon 2026.</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Postgres 16 + Redis + FastAPI 0.115 + Next.js 15 App Router</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
