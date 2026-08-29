import fs from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Metodologi & Disclaimer — GALI",
};

function readMetricsDoc(): string {
  // docs/METRICS.md lives at the monorepo root, written by gali_core/metrics
  // (task 4.14). This page renders it directly rather than re-typing formulas
  // in JSX -- one source of truth for the methodology, same principle as the
  // rest of this codebase.
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "METRICS.md"),
    path.join(process.cwd(), "docs", "METRICS.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  return "# Metodologi\n\n_docs/METRICS.md tidak ditemukan di build ini._";
}

export default function MethodologyPage() {
  const content = readMetricsDoc();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <p className="text-sm leading-relaxed text-amber-100">
          <strong>GALI adalah alat informasi dan analisis, bukan nasihat investasi.</strong> Seluruh
          metrik di bawah ini adalah turunan matematis dari data publik, disajikan untuk riset dan
          transparansi — bukan rekomendasi beli/jual. GALI tidak memiliki mekanisme eksekusi
          perdagangan dalam bentuk apa pun. Lakukan riset independen dan konsultasi dengan penasihat
          keuangan berlisensi sebelum mengambil keputusan finansial.
        </p>
      </div>

      <article className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-white prose-a:text-amber-400 prose-code:text-cyan-300 prose-strong:text-slate-200 prose-table:text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
