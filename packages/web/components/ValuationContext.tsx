import { ArrowRight, CircleHelp, Calculator } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import type { IssuerDetail } from "@/lib/types";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const usd = (value: number | null | undefined) => value == null ? "—" : Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(1)}M`;

export function ValuationContext({ data }: { data: IssuerDetail }) {
  const assumptions = object(data.evidence?.assumptions);
  const model = object(object(data.evidence?.provenance).rbv_model);
  const rate = number(assumptions.discount_rate);
  const coverage = number(model.financial_coverage_pct);
  const life = data.rli_years == null ? null : Math.min(data.rli_years, 30);
  const factor = data.reserve_backed_value_usd != null && data.attributable_gross_profit_usd != null && data.attributable_gross_profit_usd > 0
    ? data.reserve_backed_value_usd / data.attributable_gross_profit_usd : null;
  const included = Array.isArray(model.included_operator_slugs) ? model.included_operator_slugs.map(String) : [];
  const excluded = Array.isArray(model.excluded_identity_links) ? model.excluded_identity_links.map(String) : [];
  return <section className="gali-card overflow-hidden" data-testid="valuation-context" id="valuation-context">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 sm:p-6"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Calculator className="h-4 w-4 text-brand" />What does RBV calculate?</h2><p className="mt-1 text-sm text-muted">A proxy for gross profit over reserve life, assuming constant annual output.</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand">Model proxy · M2</span></div>
    <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:p-6">
      <div><p className="text-[12px] text-muted">01 / Annual gross profit</p><p className="mt-2 font-numeric text-2xl font-semibold text-ink">{usd(data.attributable_gross_profit_usd)}</p><p className="mt-1 text-[12px] text-muted">Revenue − COGS, attributed by ownership</p></div><ArrowRight className="hidden h-4 w-4 text-subtle sm:block" />
      <div><p className="text-[12px] text-muted">02 / Annuity factor</p><p className="mt-2 font-numeric text-2xl font-semibold text-ink">{factor == null ? "—" : `${factor.toFixed(2)}×`}</p><p className="mt-1 text-[12px] text-muted">{life?.toFixed(1) ?? "—"} years · discount rate {rate == null ? "—" : `${(rate * 100).toFixed(0)}%`}</p></div><ArrowRight className="hidden h-4 w-4 text-subtle sm:block" />
      <div className="rounded-xl bg-brand-soft p-4"><p className="text-[12px] text-brand">03 / Reserve-Backed Value</p><p className="mt-2 font-numeric text-2xl font-semibold text-brand">{usd(data.reserve_backed_value_usd)}</p><p className="mt-1 text-[12px] text-muted">Projection capped at 30 years</p></div>
    </div>
    <div className="border-t border-line bg-surface-muted p-5 sm:p-6"><div className="flex items-start gap-2"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-info" /><div><p className="text-sm leading-relaxed text-ink-soft">The gap compares equity market capitalization with a mining asset proxy. Overhead, tax, capex, working capital, debt, cash, and other assets are not modeled in an equity-value bridge. A premium or discount to RBV is a research question, not a fair-value conclusion.</p><p className="mt-2 text-[12px] text-muted">{coverage == null ? "Financial coverage is unavailable in this run." : `Measured financial coverage: ${coverage.toFixed(0)}% of entities within the model scope.`} RLI requires reserves and production for the same entities. <Link className="font-medium text-info hover:underline" href="/methodology#rbv">Review formulas &amp; assumptions →</Link></p>{(included.length > 0 || excluded.length > 0) && <details className="mt-3"><summary className="cursor-pointer text-[12px] font-medium text-info">Entity scope in the model</summary><p className="mt-2 break-words text-[12px] text-muted">Included operators: {included.join(", ") || "Unavailable"}.</p>{excluded.length > 0 && <p className="mt-1 break-words text-[12px] text-muted">Issuer identity links without their own operating records are excluded: {excluded.join(", ")}. The links remain available in the graph.</p>}</details>}</div></div></div>
  </section>;
}
