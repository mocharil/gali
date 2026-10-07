import { MethodologyExplorer } from "@/components/MethodologyExplorer";
import "katex/dist/katex.min.css";
import { ShieldAlert } from "lucide-react";
import { MethodologyDocument } from "@/components/MethodologyDocument";
import { parseMethodology } from "@/lib/methodologyDoc";
import metricsDoc from "@/content/METRICS.md";

export const metadata = {
  title: "Methodology & Disclaimer",
};

export default function MethodologyPage() {
  const doc = parseMethodology(metricsDoc);

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

      <MethodologyDocument doc={doc} />
    </div>
  );
}
