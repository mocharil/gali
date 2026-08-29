"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, TrendingDown, Gauge, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { MiningSitesMap } from "@/components/MiningSitesMap";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

function fmtUSD(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  return `$${n.toFixed(0)}`;
}

export default function HomePage() {
  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => api.getIssuers(),
  });

  const complete = issuers?.filter((i) => i.data_quality === "LENGKAP") ?? [];
  const totalRbv = complete.reduce((s, i) => s + (i.reserve_backed_value_usd ?? 0), 0);
  const avgRli =
    complete.length > 0
      ? complete.reduce((s, i) => s + (i.rli_years ?? 0), 0) / complete.filter((i) => i.rli_years != null).length
      : null;
  const worstCliff = issuers
    ? [...issuers].filter((i) => i.license_cliff_3y != null).sort((a, b) => (b.license_cliff_3y ?? 0) - (a.license_cliff_3y ?? 0))[0]
    : null;

  const leaderboard = issuers ? [...issuers].sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1)) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Sectors Hackathon 2026 · Track 3 — Market Intelligence
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
          Gali lebih dalam dari kode sahamnya.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          GALI menilai emiten komoditas IDX dari tambang fisiknya — berapa ton cadangan tersisa, berapa
          tahun lagi habis, berapa biaya per ton, izin mana yang kedaluwarsa, dan ke negara mana dijual —
          lalu membandingkannya dengan yang sedang dihargai pasar.
        </p>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Gauge}
          label="Reserve-Backed Value (7 emiten lengkap)"
          value={fmtUSD(totalRbv)}
          accent="text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingDown}
          label="Rata-rata umur cadangan (RLI)"
          value={avgRli != null ? `${avgRli.toFixed(1)} tahun` : "—"}
          accent="text-cyan-400"
          loading={isLoading}
        />
        <StatCard
          icon={Wallet}
          label="License cliff 3-thn tertinggi"
          value={worstCliff ? `${worstCliff.symbol} · ${worstCliff.license_cliff_3y?.toFixed(0)}%` : "—"}
          accent="text-amber-400"
          loading={isLoading}
        />
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MiningSitesMap compact />
        </div>
        <div className="glass-card rounded-xl border border-slate-800 p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Ground Truth Score — Leaderboard
            </h2>
            <Link href="/divergence" className="text-[11px] font-semibold text-amber-400 hover:text-amber-300">
              Lihat divergensi →
            </Link>
          </div>
          <ol className="space-y-1.5">
            {isLoading &&
              Array.from({ length: 9 }).map((_, i) => (
                <li key={i} className="h-9 animate-pulse rounded-lg bg-slate-900/60" />
              ))}
            {leaderboard.map((issuer, idx) => (
              <li key={issuer.symbol}>
                <Link
                  href={`/issuer/${issuer.symbol}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-900/60"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 text-right text-[11px] font-mono text-slate-500">{idx + 1}</span>
                    <span className="font-mono font-bold text-slate-200">{issuer.symbol}</span>
                    <ConfidenceBadge dataQuality={issuer.data_quality} />
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {issuer.ground_truth_score != null ? issuer.ground_truth_score.toFixed(1) : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard href="/cost-curve" title="Kurva Biaya Nasional" desc="Siapa yang produksi termurah, siapa yang rugi tunai di harga berjalan." />
        <NavCard href="/scenario" title="Scenario Studio" desc="Geser harga komoditas & eksposur negara, ranking berubah live." />
        <NavCard href="/coverage" title="Truth Audit" desc="Kelengkapan data per emiten, apa adanya — termasuk yang kosong." />
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="glass-card rounded-xl border border-slate-800 p-5">
      <Icon className={`h-4 w-4 ${accent}`} />
      <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${loading ? "animate-pulse text-slate-700" : "text-white"}`}>
        {loading ? "—" : value}
      </div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="glass-card group flex flex-col justify-between rounded-xl border border-slate-800 p-5 transition-colors hover:border-amber-500/30"
    >
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">{desc}</p>
      </div>
      <ArrowRight className="mt-4 h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
    </Link>
  );
}
