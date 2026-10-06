"use client";

import Link from "next/link";
import { useIssuerUniverse } from "@/lib/useIssuerUniverse";
import { ArrowRight, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { DataState } from "@/components/DataState";
import { ScoreCoverage } from "@/components/ScoreCoverage";
import { compareScores, isScoreRankable } from "@/lib/scores";
import { MineExplainer } from "@/components/MineExplainer";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";

const FEATURES: { asset: VisualAssetName; title: string; text: string; href: string; action: string }[] = [
  { asset: "site-operation", title: "From ticker to mining site", text: "Explore geographic locations and operating entities linked to issuers.", href: "/map", action: "Explore the map" },
  { asset: "reserve-clock", title: "Understand reserve life", text: "Connect remaining reserves to the production rate, then inspect the assumptions.", href: "/dashboard", action: "Review fundamentals" },
  { asset: "coal-tonne", title: "Read the operating economics", text: "Compare per-tonne cash cost, realized selling prices, and product quality.", href: "/cost-curve", action: "Open the cost curve" },
  { asset: "scenario-drivers", title: "See what changes and why", text: "Test prices, demand, and license assumptions alongside the model’s limits.", href: "/scenario", action: "Run a scenario" },
];

export default function LandingPage() {
  const { data: issuers, isLoading, error, refetch } = useIssuerUniverse();
  const leaders = (issuers ?? []).filter(isScoreRankable).sort(compareScores).slice(0, 3);
  const completeCount = issuers?.filter((i) => i.data_quality === "LENGKAP").length ?? 0;
  return <div className="mx-auto gali-hero max-w-[1440px] space-y-14 px-4 pb-20 sm:px-6 lg:px-8">
    <section className="grid items-center gap-8 pt-10 lg:grid-cols-12 lg:gap-10 lg:pt-14">
      <div className="space-y-6 lg:col-span-5">
        <p className="gali-kicker">Mining intelligence</p>
        <h1 className="text-[40px] font-bold leading-[1.08] tracking-[-.035em] text-ink sm:text-[56px] xl:text-[64px]">See the business <span className="text-brand">beneath the ticker.</span></h1>
        <p className="max-w-xl text-lg leading-relaxed text-ink-soft">Connect reserves, operating costs, and license exposure in one view. Explore the physical business behind IDX coal issuers.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="gali-button gali-button-primary h-14 px-6">Start analysis<ArrowRight className="h-4 w-4" /></Link>
          <Link href="/scenario" className="gali-button gali-button-secondary h-14 px-6"><SlidersHorizontal className="h-4 w-4" />Test a scenario</Link>
        </div>
        <p className="flex items-center gap-2 text-[12px] text-muted"><ShieldCheck className="h-4 w-4 shrink-0 text-info" />Information and analysis, not buy or sell recommendations.</p>
      </div>
      <MineExplainer priority className="lg:col-span-7" />
    </section>
    <section aria-label="Fundamental snapshot" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink">A closer look at the issuer universe</h2><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-info">Explore all issuers<ArrowRight className="h-3.5 w-3.5" /></Link></div>
      {isLoading && <p role="status" className="text-sm text-muted">Loading issuer data...</p>}
      {error && <DataState error={error} onRetry={() => void refetch()} />}
      {!isLoading && !error && !leaders.length && <DataState empty />}
      {!error && <div className="grid gap-4 md:grid-cols-3">{leaders.map((issuer) => <Link key={issuer.symbol} href={"/issuer/" + issuer.symbol} className="gali-card gali-illustrated-metric p-5 transition-colors hover:border-brand-line">
        <VisualAsset name="reserve-clock" />
        <div className="min-w-0 flex-1"><p className="font-numeric text-lg font-bold text-ink">{issuer.symbol}</p><p className="mt-1 font-numeric text-[26px] font-bold leading-tight text-brand">{issuer.rli_years == null ? "Unavailable" : issuer.rli_years.toFixed(1) + " years"}</p><p className="mt-1 text-[12px] text-muted">Reserve life at the current production rate</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[12px] text-ink-soft">Score {issuer.ground_truth_score?.toFixed(1) ?? "N/A"}</span><ScoreCoverage coverage={issuer.confidence_pct} eligible={isScoreRankable(issuer)} /></div></div>
      </Link>)}</div>}
      {!!issuers?.length && !error && <p className="text-[12px] text-muted">{issuers.length} issuers · {completeCount} with complete core metrics · {issuers.length - completeCount} partial. Scores describe the available dataset.</p>}
    </section>
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="gali-kicker">Research workflow</p><h2 className="mt-2 text-2xl font-bold text-ink">From physical assets to verifiable analysis</h2></div><Link href="/coverage" className="inline-flex items-center gap-2 text-sm font-medium text-info">Check data coverage<ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map((feature) => <article key={feature.href} className="gali-card flex flex-col p-5">
        <VisualAsset name={feature.asset} className="gali-art-tile" /><h3 className="text-base font-semibold text-ink">{feature.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{feature.text}</p><Link href={feature.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-info">{feature.action}<ArrowRight className="h-4 w-4" /></Link>
      </article>)}</div>
    </section>
    <section className="gali-card flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
      <div className="max-w-2xl"><h2 className="text-xl font-semibold text-ink">Every number has context.</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">Trace inputs, financial assumptions, and missing fields through Evidence &amp; Provenance. Read reserve life, costs, and license exposure together.</p></div>
      <Link href="/methodology" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-info">Read the methodology<ArrowRight className="h-4 w-4" /></Link>
    </section>
  </div>;
}
