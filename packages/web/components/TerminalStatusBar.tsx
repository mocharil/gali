"use client";

import { AppLink as Link } from "@/components/AppLink";

export function TerminalStatusBar({ apiOnline }: { apiOnline?: boolean | null }) {
  return <footer className="shrink-0 border-t border-line bg-surface px-4 py-5 text-[12px] text-muted sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="font-semibold tracking-wide text-ink-soft">GALI</span><span>Fundamental analysis · M1–M9</span></div>
      <div className="flex flex-wrap items-center gap-4"><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${apiOnline === true ? "bg-positive" : apiOnline === false ? "bg-negative" : "bg-neutral"}`} />{apiOnline === true ? "Data ready" : apiOnline === false ? "Data unavailable" : "Checking…"}</span><Link href="/coverage" className="hover:text-brand">Data coverage</Link><Link href="/methodology" className="hover:text-brand">Methodology</Link></div>
    </div>
    <p className="mx-auto mt-3 max-w-[1440px] text-[12px] text-subtle">GALI provides information and analysis, not investment advice. It offers no buy or sell recommendations or trade execution.</p>
  </footer>;
}
