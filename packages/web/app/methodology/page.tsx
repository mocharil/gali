import fs from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Methodology & Disclaimer",
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
  return "# Methodology\n\n_docs/METRICS.md was not found in this build._";
}

export default function MethodologyPage() {
  const content = readMetricsDoc();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <p className="text-sm leading-relaxed text-amber-100">
          <strong>GALI is an information and analysis tool, not investment advice.</strong> All
          metrics below are mathematical derivations of public data, presented for research and
          transparency — not buy/sell recommendations. GALI has no trade execution mechanism of any
          kind. Do your own independent research and consult a licensed financial advisor before
          making any financial decision.
        </p>
      </div>

      <article className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-white prose-a:text-amber-400 prose-code:text-cyan-300 prose-strong:text-slate-200 prose-table:text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
