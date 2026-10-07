import React from "react";
import { AppLink as Link } from "@/components/AppLink";
import { ShieldAlert, Database, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface text-muted">
      {/* Disclaimer Banner */}
      <div className="border-b border-line bg-surface-muted py-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="text-sm text-ink-soft leading-relaxed">
            <span className="font-bold text-brand">LEGAL & REGULATORY DISCLAIMER: </span>
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
              <span className="text-lg font-bold tracking-wider text-ink">GALI</span>
              <span className="text-sm text-muted">| Mining intelligence</span>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-md">
              Fundamental intelligence for IDX mining issuers. Explore reserves, license expiry exposure,
              cost positions, and scenario sensitivity with traceable evidence and assumptions.
            </p>
            <div className="flex items-center gap-4 flex-wrap text-[12px] text-muted pt-2">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-brand" />
                <span>Data, evidence & provenance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-positive" />
                <span>Coverage & credit ledger</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold tracking-tight text-ink mb-3">Intelligence Surfaces</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-brand transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-brand transition-colors">
                  Mining map
                </Link>
              </li>
              <li>
                <Link href="/scenario" className="hover:text-brand transition-colors">
                  Scenario Studio
                </Link>
              </li>
              <li>
                <Link href="/cost-curve" className="hover:text-brand transition-colors">
                  Cost curve
                </Link>
              </li>
              <li>
                <Link href="/divergence" className="hover:text-brand transition-colors">
                  Valuation map
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold tracking-tight text-ink mb-3">Transparency & Audit</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/coverage" className="hover:text-brand transition-colors">
                  Data coverage
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-brand transition-colors">
                  Methodology (M1–M9)
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/mocharil/gali"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div>© 2026 GALI. Open Source under MIT License. Sectors Hackathon 2026.</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-positive" />
            <span>Sectors Hackathon · Market Intelligence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
