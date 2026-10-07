"use client";

import { VisualIntro } from "@/components/VisualIntro";
import { useQuery } from "@tanstack/react-query";
import { AppLink as Link } from "@/components/AppLink";
import { ShieldCheck, CheckCircle2, Database, Coins, ArrowRight } from "lucide-react";

import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { IssuerLogo } from "@/components/IssuerLogo";
import { DataState } from "@/components/DataState";
import { PageLoading } from "@/components/LoadingState";
import { Skeleton } from "@/components/Skeleton";
import { useDataset } from "@/components/DatasetContext";

function Bar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-positive" : pct >= 40 ? "bg-gold" : "bg-negative";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function CoveragePage() {
  const dataset = useDataset();
  const local = dataset.mode === "simulation";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => api.getCoverage(),
  });

  if (error) return <div className="mx-auto max-w-6xl p-6"><DataState error={error} onRetry={() => refetch()} /></div>;
  if (isLoading) return <PageLoading label="Loading data coverage…" />;

  return (
    <div className="gali-page space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-positive-line bg-positive-soft px-3 py-1 text-sm font-bold text-positive mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Data coverage &amp; sources</span>
          </div>
          <h1 className="text-3xl font-bold text-ink">Know what the analysis can see.</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            Available dataset coverage, metric sources, and recorded credit usage.
          </p>
        </div>
      </div>

      {data && <VisualIntro asset="data-modules" eyebrow="Input availability" title="Complete, partial, and missing." description="Coverage shows which inputs are available to the model. It does not measure statistical confidence or the certainty of an investment outcome.">
        <p className="font-numeric text-4xl font-bold text-info">{data.in_universe_issuers.length ? (data.in_universe_issuers.filter((issuer) => issuer.quality === "LENGKAP").length / data.in_universe_issuers.length * 100).toFixed(1) + "%" : "Unavailable"}</p>
        <p className="mt-1 text-sm text-ink-soft">{data.in_universe_issuers.filter((issuer) => issuer.quality === "LENGKAP").length} of {data.in_universe_issuers.length} issuers have complete core metrics.</p><p className="mt-3 text-[12px] font-semibold text-brand">Missing inputs stay missing.</p>
      </VisualIntro>}
      {local && <section id="dataset-origin" className="rounded-2xl border border-info-line bg-info-soft p-5 space-y-3"><h2 className="text-sm font-bold text-info">Dataset origin &amp; method</h2><p className="text-sm leading-relaxed text-ink-soft">Snapshot {dataset.as_of}: 9 issuer identities, 18 fictional operators, 36 sites, and 62 licenses. Financials, reserves, production, transactions, and licenses are synthetic, rather than actual company reports or Sectors API responses.</p><p className="text-sm leading-relaxed text-muted">RLI, RBV, cash cost, concentration, and scores are derived using GALI&apos;s Python engine. Scenarios are recalculated locally with formulas verified against Python results. Missing PTBA/DSSA inputs remain empty; ADMR has one contract without an end date. Sources and assumptions are available in Evidence &amp; Provenance.</p><p className="text-[12px] text-muted">Version {dataset.version} · This mode consumes no API credits. Sectors integration is available in a separate mode.</p></section>}
      {/* Credit Ledger & Status cakupan Tile */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-sm font-semibold uppercase tracking-wider">Coverage status</span>
              <CheckCircle2 className="h-4 w-4 text-positive" />
            </div>
            <div className="mt-1 font-numeric text-2xl font-bold text-positive">
              {data.gate_decision}
            </div>
            <p className="mt-2 text-[12px] text-muted">Data completeness status, rather than confirmation of submission eligibility.</p>
          </div>

          <div className="glass-card rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-sm font-semibold uppercase tracking-wider">{local ? "API credits required" : "Sectors credit budget"}</span>
              <Coins className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-1 font-numeric text-2xl font-bold text-brand">
              {data.credits_used} <span className="text-sm text-muted">{local ? "credits" : `/ ${data.credits_cap}`}</span>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {local ? "All pages use the local dataset without calling the Sectors API." : `${Math.max(0, data.credits_cap - data.credits_used)} credits remaining (${data.credits_cap > 0 ? (Math.max(0, 1 - data.credits_used / data.credits_cap) * 100).toFixed(1) : "0.0"}% of grant)`}
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-sm font-semibold uppercase tracking-wider">Issuers in the dataset</span>
              <Database className="h-4 w-4 text-info" />
            </div>
            <div className="mt-1 font-numeric text-2xl font-bold text-info">
              {data.in_universe_issuers?.length ?? 0} issuers
            </div>
            <p className="mt-2 text-[12px] text-muted">{data.in_universe_issuers.filter((i) => i.quality === "LENGKAP").length} complete + {data.in_universe_issuers.filter((i) => i.quality !== "LENGKAP").length} partial</p>
          </div>
        </div>
      )}

      {data && <p className="text-sm text-muted">Updated: {new Date(data.updated_at).toLocaleString("en-US")}</p>}

      {/* Coverage Progress Bars */}
      <div className="glass-card rounded-2xl border border-line p-6 space-y-5">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Data component coverage
        </h2>

        <div className="space-y-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          {data?.metrics.map((m) => (
            <div
              key={m.entity}
              className="rounded-xl border border-line bg-surface p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-soft">{m.entity}</span>
                <span className="font-numeric text-sm font-bold text-ink">
                  {m.numerator} / {m.denominator}{" "}
                  <span className="text-brand font-semibold">({m.coverage_pct.toFixed(1)}%)</span>
                </span>
              </div>
              <Bar pct={m.coverage_pct} />
              <p className="text-[12px] text-muted">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* In-Universe Issuers Table */}
      <div className="glass-card rounded-2xl border border-line p-6 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Coverage by issuer ({data?.in_universe_issuers.length ?? 0})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Company name</th>
                <th className="px-4 py-3">Metric completeness</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.in_universe_issuers.map((i) => (
                <tr key={String(i.symbol)} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <IssuerLogo symbol={String(i.symbol)} size="xs" />
                      <span className="font-numeric font-bold text-ink">{String(i.symbol)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-soft">{String(i.name)}</td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge dataQuality={String(i.quality) as "LENGKAP" | "PARSIAL"} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/issuer/${String(i.symbol)}`}
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand transition-colors font-semibold"
                    >
                      View profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
