"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Info } from "lucide-react";
import { api } from "@/lib/api";

export default function DivergencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["flow-overlay"],
    queryFn: () => api.getFlowOverlay(),
  });

  const issuers = data?.issuers ?? [];
  const hasValuationData = issuers.some((i) => i.rbv_gap_pct != null);
  const sorted = [...issuers].sort((a, b) => (b.ground_truth_score ?? -1) - (a.ground_truth_score ?? -1));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white">Market Divergence</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Membandingkan Ground Truth Score (basis aset fisik) dengan valuasi pasar dan arus modal, untuk
        mencari emiten yang dihargai berbeda dari kondisi tambangnya.
      </p>

      {!hasValuationData && !isLoading && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <strong className="text-amber-300">Data valuasi pasar (market cap) belum ter-ingest.</strong>{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px]">rbv_gap_pct</code> dan{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px]">market_cap_idr</code> null untuk
            seluruh emiten — kuadran divergensi (RBV gap × Ground Truth Score) tidak dapat ditampilkan
            sampai ingestion market cap dijalankan. Di bawah ini: Ground Truth Score saja, apa adanya.
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Emiten</th>
              <th className="px-4 py-2">Ground Truth Score</th>
              <th className="px-4 py-2">RBV Gap</th>
              <th className="px-4 py-2">Net Foreign Flow (30h)</th>
              <th className="px-4 py-2">Kuadran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading &&
              Array.from({ length: 9 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-900/60" />
                  </td>
                </tr>
              ))}
            {sorted.map((i) => (
              <tr key={i.symbol} className="hover:bg-slate-900/40">
                <td className="px-4 py-2">
                  <Link href={`/issuer/${i.symbol}`} className="flex items-center gap-2 font-mono font-bold text-amber-400 hover:underline">
                    {i.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono">{i.ground_truth_score?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-slate-600">
                  {i.rbv_gap_pct != null ? `${i.rbv_gap_pct > 0 ? "+" : ""}${i.rbv_gap_pct.toFixed(1)}%` : "null"}
                </td>
                <td className="px-4 py-2 font-mono text-slate-600">
                  {i.net_foreign_flow_30d_idr != null && i.net_foreign_flow_30d_idr !== 0
                    ? `Rp${(i.net_foreign_flow_30d_idr / 1e9).toFixed(1)}M`
                    : "belum ter-ingest"}
                </td>
                <td className="px-4 py-2 text-slate-600">{i.quadrant ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
