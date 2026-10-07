"use client";

import { CostUnitEconomics } from "@/components/CostUnitEconomics";
import { useQuery } from "@tanstack/react-query";
import { AppLink as Link } from "@/components/AppLink";
import { Layers } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { api } from "@/lib/api";
import type { CostCurvePoint } from "@/lib/types";
import { DataState } from "@/components/DataState";
import { PageLoading } from "@/components/LoadingState";
import { Skeleton } from "@/components/Skeleton";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IssuerLogo } from "@/components/IssuerLogo";

export default function CostCurvePage() {
  const query = useQuery({ queryKey: ["cost-curve", "Coal"], queryFn: () => api.getCostCurve("Coal") });
  const points = query.data?.points ?? [];
  const benchmark = query.data?.benchmark_price_usd ?? null;
  const capacity = points.at(-1)?.cumulative_volume_mt ?? 0;
  // A numeric X axis and explicit left/right boundaries make width equal to production.
  const steps = points.flatMap((point, index) => [
    { ...point, x: index === 0 ? 0 : points[index - 1].cumulative_volume_mt },
    { ...point, x: point.cumulative_volume_mt },
  ]);
  if (query.isError) return <div className="p-6"><DataState error={query.error} onRetry={() => query.refetch()} /></div>;

  if (query.isLoading) return <PageLoading label="Loading the cost curve…" />;

  return <div className="gali-page space-y-6">
    <div className="border-b border-line pb-6">
      <Badge variant="success" className="mb-3 gap-2"><Layers className="h-3.5 w-3.5" />M4 · Cost curve</Badge>
      <h1 className="text-3xl font-bold text-ink">Understand the economics of one tonne.</h1>
      <p className="mt-2 text-sm text-muted max-w-3xl">Issuers are ordered by lowest cash cost. Each step spans annual volume, using sales or production as a fallback, attributed by ownership. Coverage is limited to the published dataset.</p>
    </div>
    {query.isLoading ? <Skeleton className="h-96 rounded-xl" /> : points.length === 0 ? <DataState empty /> : <>
      <CostUnitEconomics points={points} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Lowest cash cost</p>
          <div className="mt-2 flex items-center gap-2">
            <IssuerLogo symbol={points[0].symbol} size="sm" />
            <p className="text-2xl font-numeric text-positive">{points[0].symbol}</p>
          </div>
          <p className="mt-2 text-sm text-muted">${points[0].cash_cost_per_ton_usd.toFixed(2)} / ton</p>
        </Card>
        <Card className="p-5"><p className="text-sm text-muted">Price reference · Coal series</p><p className="mt-2 text-2xl font-numeric text-brand">{benchmark == null ? "—" : `$${benchmark.toFixed(2)}/t`}</p><p className="mt-2 text-sm text-muted">The benchmark is not adjusted for each product&apos;s quality.</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Attributed volume analyzed</p><p className="mt-2 text-2xl font-numeric text-info">{capacity.toFixed(1)} Mt/year</p><p className="mt-2 text-sm text-muted">{points.length} issuers with available cost inputs.</p></Card>
      </div>
      <Card className="p-5 space-y-4 min-w-0"><CardTitle>Cost curve by annual volume</CardTitle>
        <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={steps} margin={{ top: 15, right: 12, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis type="number" dataKey="x" domain={[0, capacity]} tick={{ fill: "var(--chart-axis)", fontSize: 12 }} label={{ value: "Cumulative volume (Mt/year)", position: "insideBottom", offset: -20, fill: "var(--chart-axis)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 12 }} label={{ value: "USD/ton", angle: -90, position: "insideLeft", fill: "var(--chart-axis)", fontSize: 12 }} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as CostCurvePoint;
            return <div className="rounded-lg border border-line-strong bg-surface p-3 text-sm space-y-1 shadow-panel">
              <p className="font-numeric font-bold text-brand">{point.symbol}</p><p className="text-ink-soft">{point.name}</p>
              <p className="text-ink-soft">Cash cost: ${point.cash_cost_per_ton_usd.toFixed(2)}/t</p>
              <p className="text-muted">Volume: {point.annual_volume_mt.toFixed(1)} Mt/year</p>
              <p className="text-muted">Cumulative: {point.cumulative_volume_mt.toFixed(1)} Mt/year</p>
            </div>;
          }} />
          {benchmark != null && <ReferenceLine y={benchmark} stroke="var(--chart-gold)" strokeDasharray="4 4" label={{ value: `Coal $${benchmark.toFixed(2)}/t`, fill: "var(--chart-gold)", fontSize: 12, position: "insideTopRight" }} />}
          <Area type="linear" dataKey="cash_cost_per_ton_usd" stroke="var(--chart-positive)" strokeWidth={2} fill="var(--chart-positive)" fillOpacity={0.15} isAnimationActive={false} />
        </ComposedChart></ResponsiveContainer></div>
        <p className="text-sm text-muted">The difference from the general benchmark is not a net profit margin. The table uses each issuer&apos;s realized price where available.</p>
      </Card>
      <Card className="p-5 space-y-4"><CardTitle>Cost curve inputs</CardTitle>
        <Table><TableHeader><TableRow><TableHead>Issuer</TableHead><TableHead>Cash cost / ton</TableHead><TableHead>Volume / year</TableHead><TableHead>Realized price / ton</TableHead><TableHead>Margin / ton</TableHead></TableRow></TableHeader>
          <TableBody>{points.map((point) => <TableRow key={point.symbol}><TableCell><Link href={`/issuer/${point.symbol}`} className="inline-flex items-center gap-2 font-numeric font-bold text-ink hover:text-brand"><IssuerLogo symbol={point.symbol} size="xs" /><span>{point.symbol}</span></Link></TableCell><TableCell className="font-numeric">${point.cash_cost_per_ton_usd.toFixed(2)}</TableCell><TableCell className="font-numeric">{point.annual_volume_mt.toFixed(1)} Mt</TableCell><TableCell className="font-numeric">{point.realized_price_per_ton_usd != null ? `$${point.realized_price_per_ton_usd.toFixed(2)}` : "—"}</TableCell><TableCell className="font-numeric">{point.unit_margin_usd != null ? `$${point.unit_margin_usd.toFixed(2)}` : "—"}</TableCell></TableRow>)}</TableBody>
        </Table>
        {(query.data?.partial_issuers_excluded?.length ?? 0) > 0 && <p className="text-sm text-brand">Insufficient inputs: {query.data?.partial_issuers_excluded?.join(", ")}. <Link href="/coverage" className="underline">See the reasons →</Link></p>}
      </Card>
    </>}
  </div>;
}
