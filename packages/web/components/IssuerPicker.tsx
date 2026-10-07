"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { IssuerLogo } from "@/components/IssuerLogo";
import { cn } from "@/lib/utils";

export interface IssuerOption { symbol: string; name: string; score?: number | null }

const TONES = { neutral: "text-subtle", brand: "text-brand", info: "text-info" } as const;

// Some datasets name an issuer "BYAN · Coal portfolio"; the ticker is already shown in bold, so repeat nothing.
const describe = (option: IssuerOption) => [
  option.name.replace(new RegExp(String.raw`^${option.symbol}\s*[·\-–—]\s*`, "i"), "") || "Selected issuer",
  option.score != null ? `Score ${option.score.toFixed(1)}` : null,
].filter(Boolean).join(" · ");

/** A labelled issuer selector with logos: the current choice, its full name and a visible "Change" cue. */
export function IssuerPicker({ label, value, options, onChange, disabled = {}, hint = "Change", tone = "neutral", className }: {
  label: string;
  value: string;
  options: IssuerOption[];
  onChange: (symbol: string) => void;
  /** symbol -> short reason it cannot be chosen, e.g. "Selected as Issuer A" */
  disabled?: Record<string, string>;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = options.some((option) => option.symbol === value) ? options : [{ symbol: value, name: "" }, ...options];
  const selected = list.find((option) => option.symbol === value)!;
  const isDisabled = (index: number) => Boolean(disabled[list[index].symbol]);
  const optionId = (index: number) => `${id}-option-${index}`;

  const step = (from: number, direction: 1 | -1) => {
    for (let n = 1; n <= list.length; n++) {
      const index = (from + direction * n + list.length * n) % list.length;
      if (!isDisabled(index)) return index;
    }
    return from;
  };
  const show = () => { setActive(Math.max(0, list.findIndex((option) => option.symbol === value))); setOpen(true); };
  const choose = (index: number) => {
    if (isDisabled(index)) return;
    if (list[index].symbol !== value) onChange(list[index].symbol);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    // Scroll inside the list only. scrollIntoView would also scroll the page, sliding options under a stationary
    // mouse pointer and making the highlight jump.
    const container = listRef.current;
    const element = open ? document.getElementById(optionId(active)) : null;
    if (!container || !element) return;
    if (element.offsetTop < container.scrollTop) container.scrollTop = element.offsetTop - 4;
    else if (element.offsetTop + element.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = element.offsetTop + element.offsetHeight - container.clientHeight + 4;
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); if (open) setActive((current) => step(current, 1)); else show(); break;
      case "ArrowUp": event.preventDefault(); if (open) setActive((current) => step(current, -1)); else show(); break;
      case "Home": if (open) { event.preventDefault(); setActive(step(-1, 1)); } break;
      case "End": if (open) { event.preventDefault(); setActive(step(list.length, -1)); } break;
      case "Enter": case " ": event.preventDefault(); if (open) choose(active); else show(); break;
      case "Escape": if (open) { event.preventDefault(); setOpen(false); } break;
      case "Tab": setOpen(false); break;
    }
  }

  return <div ref={root} className={cn("relative min-w-0", className)} data-testid="issuer-picker" data-symbol={value}>
    <span id={`${id}-label`} className={cn("mb-1.5 block text-[11px] font-semibold uppercase tracking-wider", TONES[tone])}>{label}</span>
    <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-label ${id}-value`}
      aria-activedescendant={open ? optionId(active) : undefined} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKeyDown}
      className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-line-strong bg-surface px-3 py-2 text-left shadow-sm transition-colors hover:border-brand-line hover:bg-surface-muted aria-expanded:border-brand-line">
      <IssuerLogo symbol={selected.symbol} size="md" className="shrink-0" />
      <span id={`${id}-value`} className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight text-ink">{selected.symbol}</span>
        <span className="block truncate text-[12px] leading-snug text-muted">{describe(selected)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-info">
        <span className="hidden sm:inline">{hint}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </span>
    </button>
    {open && <ul ref={listRef} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-panel)]">
      {list.map((option, index) => {
        const reason = disabled[option.symbol];
        const isSelected = option.symbol === value;
        return <li key={option.symbol} id={optionId(index)} role="option" aria-selected={isSelected} aria-disabled={Boolean(reason) || undefined}
          onPointerDown={(event) => event.preventDefault()} onMouseMove={() => { if (!reason && active !== index) setActive(index); }} onClick={() => choose(index)}
          className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm", reason ? "cursor-not-allowed opacity-50" : "cursor-pointer", index === active && !reason && "bg-surface-muted", isSelected && "bg-brand-soft")}>
          <IssuerLogo symbol={option.symbol} size="sm" className="shrink-0" />
          <span className="min-w-0 flex-1"><span className="block font-bold leading-tight text-ink">{option.symbol}</span><span className="block truncate text-[12px] leading-snug text-muted">{reason ?? describe(option)}</span></span>
          {isSelected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
        </li>;
      })}
    </ul>}
  </div>;
}
