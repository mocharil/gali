"use client";

import { useId, useState, type ReactNode } from "react";
import { Clock, Coins, FileClock, ArrowRight } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { VisualAsset } from "@/components/VisualAsset";

type Lens = "reserves" | "costs" | "licenses";
const LENSES = [
  { key: "reserves", icon: Clock, label: "Reserve runway", title: "Reserves become a production runway.",
    text: "Reserve life divides remaining reserves by annual production. The estimate changes when either input changes.",
    metric: "Reserve life", href: "/methodology#reserve-life", action: "Understand reserve life" },
  { key: "costs", icon: Coins, label: "Operating economics", title: "Every tonne has an operating cost.",
    text: "Read cash cost alongside realized selling prices, product quality, and the scope of costs.",
    metric: "Cash cost", href: "/cost-curve", action: "Explore cost positions" },
  { key: "licenses", icon: FileClock, label: "License window", title: "An operating asset also has a legal window.",
    text: "Expiring licensed area shows exposure to the permit window. It is not a probability of failed renewal.",
    metric: "License exposure", href: "/scenario?cliff=1", action: "Test a license assumption" },
] as const;

export function MineExplainer({ facts, priority = false, className = "" }: {
  facts?: Partial<Record<Lens, ReactNode>>;
  priority?: boolean;
  className?: string;
}) {
  const [lens, setLens] = useState<Lens>("reserves");
  const id = useId();
  const active = LENSES.find((item) => item.key === lens)!;
  return <section className={`gali-mine-explainer ${className}`} aria-label="Explore the business beneath the mine">
    <div className="gali-mine-stage">
      <VisualAsset name="mine-cutaway" priority={priority} />
      {LENSES.map((item) => <button key={item.key} type="button"
        className={`gali-mine-pin gali-mine-pin-${item.key}`} aria-pressed={lens === item.key}
        aria-controls={id} onClick={() => setLens(item.key)}>
        <item.icon className="h-3.5 w-3.5" /><span>{item.label}</span><span className="gali-mine-dot" />
      </button>)}
    </div>
    <div id={id} className="gali-mine-caption" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{active.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">{active.text}</p>
        <Link href={active.href} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-info">{active.action}<ArrowRight className="h-3 w-3" /></Link>
      </div>
      {facts?.[lens] != null && <div className="shrink-0 text-right"><p className="text-[11px] text-muted">{active.metric}</p><p className="mt-1 font-numeric text-xl font-bold text-ink">{facts[lens]}</p></div>}
    </div>
  </section>;
}
