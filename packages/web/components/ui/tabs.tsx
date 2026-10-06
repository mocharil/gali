"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{ value: string; id: string; change: (value: string) => void } | null>(null);

export function Tabs({ value, onValueChange, defaultValue = "", children, className }: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const change = (next: string) => { setInternalValue(next); onValueChange?.(next); };
  return <TabsContext.Provider value={{ value: value ?? internalValue, id, change }}><div className={cn("min-w-0 space-y-6", className)}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ children, className, label = "Analysis sections" }: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  function navigate(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
    tabs[next]?.click();
  }
  return <div role="tablist" aria-label={label} onKeyDown={navigate} className={cn("grid w-full min-w-0 grid-cols-2 gap-1 rounded-2xl sm:flex sm:flex-wrap border border-line bg-surface-muted p-1.5 print:hidden", className)}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return <button type="button" role="tab" id={`${ctx?.id}-tab-${value}`} aria-controls={`${ctx?.id}-panel-${value}`} aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => ctx?.change(value)} className={cn("inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors", active ? "border border-line bg-surface text-ink shadow-sm" : "border border-transparent text-muted hover:text-ink", className)}>{children}</button>;
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div role="tabpanel" id={`${ctx.id}-panel-${value}`} aria-labelledby={`${ctx.id}-tab-${value}`} tabIndex={0} className={cn("min-w-0 space-y-6 animate-fade-up", className)}>{children}</div>;
}
