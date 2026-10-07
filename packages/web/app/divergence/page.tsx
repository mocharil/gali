"use client";

import { ValuationLens } from "@/components/ValuationLens";
import { useQuery } from "@tanstack/react-query";
import { AppLink as Link } from "@/components/AppLink";
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
} from "lucide-react";

import { api } from "@/lib/api";
import { quadrantLabel } from "@/lib/market";
import { IssuerLogo } from "@/components/IssuerLogo";
import { DataState } from "@/components/DataState";
import { PageLoading } from "@/components/LoadingState";
import { Skeleton } from "@/components/Skeleton";
import {
  Card,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default function DivergencePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["flow-overlay"],
    queryFn: () => api.getFlowOverlay(),
  });

  const issuers = data?.issuers ?? [];
  const sorted = [...issuers].sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  if (error) return <div className="mx-auto max-w-7xl p-6"><DataState error={error} onRetry={() => refetch()} /></div>;
  if (isLoading) return <PageLoading label="Loading the valuation map…" />;
  if (!isLoading && !issuers.length) return <div className="mx-auto max-w-7xl p-6"><DataState empty /></div>;

  return (
    <div className="gali-page space-y-8 animate-fade-up">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1.5 py-1 px-3 border-info-line bg-info-soft text-info">
              <Activity className="h-3.5 w-3.5 text-info" />
              <span>M9 · Valuation positions &amp; fund flows</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-ink">Where reserve value meets market price.</h1>
          <p className="mt-1 max-w-3xl text-sm sm:text-sm text-ink-soft">
            Compare fundamental scores, valuation positions, and fund flows to explore relative differences between issuers. Classification uses peers with complete gaps and scores. A position relative to the median does not establish fair equity value.
          </p>
        </div>
      </div>

      <ValuationLens />
      {/* ── 2. 4 Kuadrans Explanation Cards (shadcn Cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-positive-line bg-positive-soft p-5 space-y-2 hover:border-positive-line transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-positive">Quadrant I</span>
            <ShieldCheck className="h-4 w-4 text-positive" />
          </div>
          <div className="font-bold text-ink text-sm">Lower gap / higher score</div>
          <p className="text-[12px] text-muted leading-relaxed">
            RBV gap percentile below 50 and score percentile of at least 50 within the dataset.
          </p>
        </Card>

        <Card className="border-info-line bg-info-soft p-5 space-y-2 hover:border-info-line transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-info">Quadrant II</span>
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div className="font-bold text-ink text-sm">Higher gap / higher score</div>
          <p className="text-[12px] text-muted leading-relaxed">
            Both RBV gap and score percentiles are at least 50 within the dataset.
          </p>
        </Card>

        <Card className="border-brand-line bg-brand-soft p-5 space-y-2 hover:border-brand-line transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-brand">Quadrant III</span>
            <TrendingDown className="h-4 w-4 text-brand" />
          </div>
          <div className="font-bold text-ink text-sm">Higher gap / lower score</div>
          <p className="text-[12px] text-muted leading-relaxed">
            RBV gap percentile of at least 50 and score percentile below 50 within the dataset.
          </p>
        </Card>

        <Card className="border-negative-line bg-negative-soft p-5 space-y-2 hover:border-negative-line transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-negative">Quadrant IV</span>
            <Info className="h-4 w-4 text-negative" />
          </div>
          <div className="font-bold text-ink text-sm">Lower gap / lower score</div>
          <p className="text-[12px] text-muted leading-relaxed">
            Both RBV gap and score percentiles are below 50 within the dataset.
          </p>
        </Card>
      </div>

      {/* ── 3. Main Divergence Table (shadcn Table) ── */}
      <Card className="border-line bg-surface p-5 space-y-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-ink">
            Relative positions of coal issuers
          </CardTitle>
          <Badge variant="secondary" className="font-numeric text-[12px]">
            Ordered by fundamental score
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead className="text-right">Fundamental score</TableHead>
                <TableHead className="text-right">Market capitalization (IDR)</TableHead>
                <TableHead className="text-right">RBV vs Mkt Gap (%)</TableHead>
                <TableHead className="text-right">Foreign fund flows (30 days)</TableHead>
                <TableHead className="text-center">Relative quadrant</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item, idx) => {
                const score = item.ground_truth_score;
                const quadrant = quadrantLabel(item.quadrant);
                const gap = item.rbv_gap_pct;
                const flow = item.net_foreign_flow_30d_idr;

                let badgeVariant: "success" | "cyan" | "warning" | "destructive" = "cyan";
                if (quadrant === "Higher gap / lower score" || quadrant === "Lower gap / lower score") badgeVariant = "warning";


                return (
                  <TableRow key={item.symbol} className="font-numeric">
                    <TableCell className="text-muted font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <IssuerLogo symbol={item.symbol} size="sm" className="shrink-0" />
                        <div>
                          <div className="font-bold text-ink">{item.symbol}</div>
                          <div className="text-[12px] text-muted font-sans truncate max-w-[160px]">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-brand text-sm">
                      {score != null ? score.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-ink-soft">
                      {item.market_cap_idr != null ? `Rp ${(item.market_cap_idr / 1e12).toFixed(1)}T` : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${gap != null && gap > 0 ? "text-positive" : "text-negative"}`}>
                      {gap != null ? `${gap > 0 ? "+" : ""}${gap.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className={`text-right ${flow != null && flow >= 0 ? "text-positive" : "text-negative"}`}>
                      {flow != null ? `Rp ${(flow / 1e9).toFixed(1)}B` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={badgeVariant}>{quadrant}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/issuer/${item.symbol}`} className="gap-1 font-sans">
                          <span>Analyze</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
