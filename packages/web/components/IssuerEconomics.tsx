"use client";

import { AppLink as Link } from "@/components/AppLink";
import { BarChart3, Globe2, ShieldAlert } from "lucide-react";
import type { IssuerDetail } from "@/lib/types";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const colors = ["bg-info", "bg-gold", "bg-neutral", "bg-info/65", "bg-gold/65", "bg-neutral/65"];
const money = (value: number | null | undefined) => value == null ? "—" : `$${value.toFixed(2)}/t`;

export function IssuerEconomics({ data }: { data: IssuerDetail }) {
  const inputs = object(data.evidence?.scenario_inputs);
  const destinations = Array.isArray(inputs.destinations) ? inputs.destinations.map(object).filter((row) => typeof row.country === "string" && number(row.pct_of_sales_volume) != null) : [];
  const licenses = Array.isArray(data.evidence?.licenses) ? data.evidence.licenses.map(object) : [];
  const revenue = number(inputs.attributable_revenue_usd), costs = number(inputs.attributable_cost_usd);
  const margin = data.unit_margin_usd != null && data.realized_price_per_ton_usd != null && data.realized_price_per_ton_usd > 0 ? data.unit_margin_usd / data.realized_price_per_ton_usd * 100 : null;
  const leverage = revenue != null && costs != null && revenue > costs ? revenue / (revenue - costs) : null;
  const priceFall = leverage != null ? 20 * leverage : null;
  const totalArea = licenses.reduce((sum, row) => sum + (number(row.licensed_area_ha) ?? 0), 0);

  return <section className="space-y-6" data-testid="issuer-economics">
    <div className="gali-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><BarChart3 className="h-4 w-4 text-positive" />Cost per ton &amp; margin resilience</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Realized price", value: money(data.realized_price_per_ton_usd), hint: "Revenue / sales volume" },
          { label: "Margin per ton", value: money(data.unit_margin_usd), hint: "Realized price − cash cost" },
          { label: "Price cushion", value: margin == null ? "—" : `${margin.toFixed(1)}%`, hint: "Price decline until modeled margin reaches zero" },
          { label: "Gross profit sensitivity", value: leverage == null ? "—" : `${leverage.toFixed(2)}×`, hint: "Revenue / modeled gross profit" },
        ].map((item) => <div key={item.label} className="min-w-0"><p className="text-[12px] uppercase tracking-wider text-muted">{item.label}</p><p className="mt-2 font-numeric text-2xl font-semibold text-ink">{item.value}</p><p className="mt-1 text-[12px] text-muted">{item.hint}</p></div>)}
      </div>
      <div className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">{priceFall == null ? "Cost inputs are incomplete; margin sensitivity cannot be calculated yet." : <>At constant volume and costs, a price decline of <strong className="text-ink">20%</strong> reduces modeled gross profit by approximately <strong className="text-negative">{priceFall.toFixed(1)}%</strong>{priceFall > 100 ? "; modeled gross profit becomes negative" : priceFall === 100 ? "; gross profit reaches zero" : ""}. </>}<Link href={`/scenario?price=-0.2&issuer=${data.symbol}`} className="text-info hover:underline">Test price and volume changes together →</Link><p className="mt-2 text-[12px] text-muted">Cash cost is a mining COGS proxy. This margin excludes overhead, tax, capex, and working capital; it is not net profit or free cash flow.</p></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="gali-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Globe2 className="h-4 w-4 text-info" />Sales destination breakdown</h2>
        <p className="mt-2 text-sm text-muted">Volume distribution includes domestic and export markets.</p>
        {destinations.length ? <><div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-hover" aria-label="Volume distribution by country">{destinations.map((row,index) => <div key={String(row.country)} style={{ width: `${Number(row.pct_of_sales_volume)}%` }} className={colors[index % colors.length]} title={`${row.country}: ${row.pct_of_sales_volume}%`} />)}</div><div className="mt-4 space-y-3">{destinations.map((row,index) => <div key={String(row.country)} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-ink-soft"><span className={`h-2 w-2 rounded-full ${colors[index % colors.length]}`} />{String(row.country)}</span><span className="font-numeric text-ink-soft">{Number(row.pct_of_sales_volume).toFixed(1)}%</span></div>)}</div></> : <p className="mt-5 text-sm text-muted">Country breakdown is unavailable. Largest destination: {data.top_destination ?? "—"} ({data.top_destination_pct?.toFixed(1) ?? "—"}%).</p>}
        <Link href={`/scenario?china=0.3&issuer=${data.symbol}`} className="mt-5 inline-block text-sm text-info hover:underline">Test a 30% drop in China demand →</Link>
      </div>
      <div className="gali-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldAlert className="h-4 w-4 text-brand" />License renewal windows</h2>
        <p className="mt-2 text-sm text-muted">Cumulative share of licensed area expiring from the snapshot date.</p>
        <div className="mt-5 space-y-4">{[{ label: "≤1 year", value: data.license_cliff_1y, color: "bg-negative" }, { label: "≤3 years", value: data.license_cliff_3y, color: "bg-gold" }, { label: "≤5 years", value: data.license_cliff_5y, color: "bg-info" }].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-sm text-ink-soft"><span>{item.label}</span><span className="font-numeric">{item.value?.toFixed(1) ?? "—"}%</span></div><div className="h-2 rounded-full bg-surface-hover"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(item.value ?? 0, 100)}%` }} /></div></div>)}</div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">Licensed area is not a share of production. Read expiry exposure alongside reserve life, locations, and renewal status.</p><Link href={`/scenario?cliff=1&issuer=${data.symbol}`} className="mt-4 inline-block text-sm text-brand hover:underline">Test no license renewal →</Link>
      </div>
    </div>
    {licenses.length > 0 && <details className="gali-card p-5"><summary className="cursor-pointer text-sm font-semibold text-ink-soft">Explore {licenses.length} licenses · {totalArea.toLocaleString("en-US", { maximumFractionDigits: 0 })} ha</summary><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-muted"><tr><th className="p-2">License code</th><th className="p-2">Area (ha)</th><th className="p-2">Expires</th><th className="p-2">Status</th></tr></thead><tbody className="divide-y divide-line">{licenses.map((row,index) => <tr key={String(row.wiup_code ?? index)}><td className="p-2 font-numeric text-ink-soft">{String(row.wiup_code ?? "—")}</td><td className="p-2 font-numeric text-ink-soft">{number(row.licensed_area_ha)?.toLocaleString("en-US", { maximumFractionDigits: 1 }) ?? "—"}</td><td className="p-2 whitespace-nowrap text-brand">{String(row.license_expiry_date ?? "—")}</td><td className="p-2 text-muted">{String(row.cnc ?? "—")}</td></tr>)}</tbody></table></div></details>}
  </section>;
}
