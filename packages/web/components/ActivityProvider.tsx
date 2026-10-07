"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NAVIGATION_PAGES } from "@/lib/navigation";

type ActivityKind = "navigation" | "action" | "analysis";
type Activity = { id: number; label: string; kind: ActivityKind };
type NavigationOptions = { replace?: boolean; scroll?: boolean };
type ActivityContextValue = {
  begin: (label: string, kind?: ActivityKind) => () => void;
  navigate: (href: string, options?: NavigationOptions) => void;
  destination: string | null;
};
const ActivityContext = createContext<ActivityContextValue | null>(null);

export function routeLabel(href: string) {
  const pathname = href.split(/[?#]/)[0];
  const issuer = /^\/issuer\/([a-z0-9]+)$/i.exec(pathname);
  return issuer ? `${issuer[1].toUpperCase()} profile` : NAVIGATION_PAGES.find((page) => page.href === pathname)?.label ?? (pathname === "/" ? "GALI overview" : "page");
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sequence = useRef(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [navigating, startTransition] = useTransition();
  const fetching = useIsFetching();
  const begin = useCallback((label: string, kind: ActivityKind = "action") => {
    const id = ++sequence.current;
    setActivities((current) => [...current, { id, label, kind }]);
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      setActivities((current) => current.filter((item) => item.id !== id));
    };
  }, []);
  const navigate = useCallback((href: string, options: NavigationOptions = {}) => {
    if (new URL(href, window.location.href).href === window.location.href) return;
    setDestination(href);
    startTransition(() => {
      if (options.replace) router.replace(href, { scroll: options.scroll });
      else router.push(href, { scroll: options.scroll });
    });
  }, [router]);
  useEffect(() => { if (!navigating) setDestination(null); }, [navigating]);
  const context = useMemo(() => ({ begin, navigate, destination: navigating ? destination : null }), [begin, navigate, navigating, destination]);
  const navigation = activities.findLast((item) => item.kind === "navigation");
  const action = activities.at(-1);
  const label = navigating && destination ? `Opening ${routeLabel(destination)}…` : navigation?.label ?? action?.label ?? (fetching ? "Loading analysis data…" : null);
  return <ActivityContext.Provider value={context}>
    {children}
    {label && <div className="pointer-events-none fixed inset-0 z-[70]" data-testid="app-activity">
      <div className="h-1 overflow-hidden bg-brand-soft" aria-hidden="true"><div className="gali-loading-progress h-full w-1/3 bg-brand" /></div>
      <div role="status" aria-live="polite" aria-atomic="true" className="absolute bottom-4 right-4 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-2xl border border-info-line bg-surface px-4 py-3 text-[12px] font-medium text-info shadow-panel">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>{label}</span>
      </div>
    </div>}
  </ActivityContext.Provider>;
}

export function useActivity() {
  const value = useContext(ActivityContext);
  if (!value) throw new Error("Activity hooks must be used inside ActivityProvider.");
  return value;
}

export function useActivityFlag(active: boolean, label: string, kind: ActivityKind = "action") {
  const { begin } = useActivity();
  useEffect(() => active ? begin(label, kind) : undefined, [active, label, kind, begin]);
}
