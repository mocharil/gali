import { CheckCircle2, CircleDashed } from "lucide-react";

export function ScoreCoverage({ coverage, eligible }: { coverage: number | null | undefined; eligible: boolean }) {
  const known = coverage != null && Number.isFinite(coverage);
  const label = known ? `${Math.max(0, Math.min(100, coverage)).toFixed(0)}% weight` : "Coverage unavailable";
  const Icon = eligible ? CheckCircle2 : CircleDashed;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${eligible ? "bg-info-soft text-info" : "bg-brand-soft text-brand"}`} title="Weight coverage of score components, rather than a probability of accuracy or statistical confidence level.">
    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" /><span>{eligible ? "Complete" : "Provisional"} · {label}</span>
  </span>;
}
