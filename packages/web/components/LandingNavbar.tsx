"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";

const LINKS = [{ href: "/compare", label: "Compare" }, { href: "/map", label: "Mining map" }, { href: "/methodology", label: "Methodology" }];

export function LandingNavbar({ apiOnline, onOpenAi }: { apiOnline?: boolean | null; onOpenAi?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-line bg-surface">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-3 shrink-0"><Image src="/gali_logo.png" alt="GALI logo" width={36} height={36} priority /><span className="text-xl font-bold tracking-wider text-ink">GALI</span></Link>
      <nav aria-label="Main navigation" className="hidden lg:flex gap-6 text-sm text-muted">{LINKS.map((link) => <Link key={link.href} href={link.href} className="hover:text-brand">{link.label}</Link>)}</nav>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden xl:inline text-sm text-muted">{apiOnline === true ? "Data Ready" : apiOnline === false ? "Data Unavailable" : "Checking…"}</span>
        {onOpenAi && <button onClick={onOpenAi} aria-label="Open data assistant" className="gali-button gali-button-secondary max-sm:w-11 max-sm:px-0"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Data Assistant</span></button>}
        <Link href="/dashboard" className="gali-button gali-button-primary hidden sm:inline-flex">Dashboard<ArrowRight className="h-3.5 w-3.5" /></Link>
        <button aria-label="Menu" aria-expanded={mobileOpen} aria-controls="landing-menu" onClick={() => setMobileOpen((open) => !open)} className="gali-icon-button lg:hidden">{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
      </div>
    </div>
    {mobileOpen && <nav id="landing-menu" aria-label="Mobile navigation" className="border-t border-line p-4 space-y-2 lg:hidden">{[{ href: "/dashboard", label: "Dashboard" }, ...LINKS, { href: "/scenario", label: "Scenario Studio" }].map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block min-h-11 rounded-xl px-3 py-3 text-sm text-ink-soft hover:bg-surface-hover">{link.label}</Link>)}</nav>}
  </header>;
}
