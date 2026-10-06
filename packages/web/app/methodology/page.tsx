import { MethodologyExplorer } from "@/components/MethodologyExplorer";
import fs from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
    <div className="gali-page max-w-6xl">
      <MethodologyExplorer />
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-line bg-brand-soft p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm leading-relaxed text-brand">
          <strong>GALI is an information and analysis tool, not investment advice.</strong> All
          metrics below are mathematical derivations of the active dataset, presented for research and
          transparency — not buy/sell recommendations. GALI has no trade execution mechanism of any
          kind. Do your own independent research and consult a licensed financial advisor before
          making any financial decision.
        </p>
      </div>

      <article className="prose prose-sm sm:prose-base max-w-none prose-headings:text-ink prose-a:text-brand prose-code:text-info prose-strong:text-ink-soft prose-table:text-sm">
        <ReactMarkdown components={{ h1: ({ children }) => <h2>{children}</h2>, h3: ({ children }) => <h3 id={String(children).startsWith("M2") ? "rbv" : String(children).startsWith("M8") ? "score" : undefined}>{children}</h3> }} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
