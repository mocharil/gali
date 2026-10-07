"use client";

import { useRef } from "react";
import { AppLink as Link } from "@/components/AppLink";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Github, X, PanelLeftOpen, ChevronDown } from "lucide-react";
import { NAVIGATION_GROUPS } from "@/lib/navigation";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { useHydrated } from "@/lib/useHydrated";
import { useDialog } from "@/lib/useDialog";
import { IssuerLogo } from "@/components/IssuerLogo";

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  onOpenSearch?: () => void;
  apiOnline?: boolean | null;
}

const MENU_GROUPS = NAVIGATION_GROUPS;

export function Sidebar({ isOpen = false, isCollapsed = false, onClose, onToggleCollapse, onOpenSearch, apiOnline }: SidebarProps) {
  const pathname = usePathname();
  // Server HTML and the first client render must agree, so the issuer list always starts closed and opens after hydration.
  const hydrated = useHydrated();
  const { data: issuers } = useIssuerUniverse();
  const panelRef = useRef<HTMLElement>(null);
  const folded = isCollapsed && !isOpen;
  useDialog(isOpen, () => onClose?.(), panelRef);
  const status = apiOnline === true ? "Data ready" : apiOnline === false ? "Data unavailable" : "Checking…";
  return <>
    {isOpen && <div className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside ref={panelRef} aria-label="App navigation" className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200 ${folded ? "w-[72px]" : "w-64"} ${isOpen ? "translate-x-0" : "max-lg:-translate-x-full"}`}>
      <div className={`flex h-[72px] shrink-0 items-center ${folded ? "justify-center px-2" : "justify-between px-5"}`}>
        <Link href="/dashboard" onClick={onClose} title="GALI dashboard" className="flex min-w-0 items-center gap-3">
          <Image src="/gali_logo.png" alt="GALI logo" width={38} height={38} priority className="shrink-0" />
          {!folded && <div><span className="text-[22px] font-bold tracking-[.035em] text-ink">GALI</span><p className="text-[12px] leading-tight text-muted">Mining intelligence</p></div>}
        </Link>
        <button type="button" aria-label="Close navigation" onClick={onClose} className="gali-icon-button lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <div className={`${folded ? "px-3" : "px-4"} py-3`}>
        <button type="button" onClick={() => { onOpenSearch?.(); onClose?.(); }} aria-label="Open search" title="Search (Ctrl+K)" className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-muted text-[13px] text-muted transition-colors hover:border-line-strong ${folded ? "justify-center" : "px-3"}`}>
          <Search className="h-4 w-4 shrink-0" />{!folded && <><span className="flex-1 text-left">Search issuers or features</span><kbd className="rounded border border-line bg-surface px-1.5 text-[12px]">⌘K</kbd></>}
        </button>
      </div>
      <nav aria-label="GALI research" className={`min-h-0 flex-1 space-y-4 overflow-y-auto pb-6 ${folded ? "px-3" : "px-4"}`}>
        {MENU_GROUPS.map((group) => <div key={group.title}>
          {!folded && <p className="px-3 py-1 text-[12px] font-medium text-subtle">{group.title}</p>}
          <div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} showPending={!folded} onClick={onClose} aria-current={pathname === item.href ? "page" : undefined} aria-label={item.label} title={folded ? item.label : undefined} className={`gali-nav-item ${folded ? "justify-center px-0" : ""}`}><item.icon />{!folded && <span className="leading-snug">{item.label}</span>}</Link>)}</div>
        </div>)}
        {!folded && <details key={pathname} open={hydrated && pathname.startsWith("/issuer/")} className="group/issuers border-t border-line pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-[12px] font-medium text-muted hover:bg-surface-muted [&::-webkit-details-marker]:hidden"><span>Issuer list · {issuers?.length ?? 0}</span><ChevronDown className="h-3.5 w-3.5 transition-transform group-open/issuers:rotate-180" /></summary>
          <div className="mt-2 grid grid-cols-3 gap-2">{(issuers ?? []).map((issuer) => <Link key={issuer.symbol} href={`/issuer/${issuer.symbol}`} showPending onClick={onClose} aria-current={pathname === `/issuer/${issuer.symbol}` ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border p-2 leading-tight transition-colors ${pathname === `/issuer/${issuer.symbol}` ? "border-brand-line bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"}`}><IssuerLogo symbol={issuer.symbol} size="xs" className="mb-1" /><span className="text-[12px] font-semibold text-ink">{issuer.symbol}</span><span className="font-numeric text-[11px] text-muted">{issuer.ground_truth_score?.toFixed(1) ?? "—"}</span></Link>)}</div>
        </details>}
      </nav>
      <div className={`shrink-0 border-t border-line ${folded ? "flex flex-col items-center gap-3 p-3" : "p-4"}`}>
        {folded ? <button type="button" onClick={onToggleCollapse} aria-label="Expand navigation" title="Expand navigation (Ctrl+B)" className="gali-icon-button"><PanelLeftOpen className="h-4 w-4" /></button> : null}
        <div className="flex w-full items-center justify-between gap-2 text-[12px] text-muted">
          <span title={status} className={`inline-flex items-center gap-2 ${folded ? "mx-auto" : ""}`}><span className={`h-1.5 w-1.5 rounded-full ${apiOnline === true ? "bg-positive" : apiOnline === false ? "bg-negative" : "bg-neutral"}`} />{!folded && status}</span>
          {!folded && <a href="https://github.com/mocharil/gali" target="_blank" rel="noreferrer" aria-label="GALI on GitHub" className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-surface-muted"><Github className="h-4 w-4" /></a>}
        </div>
      </div>
    </aside>
  </>;
}
