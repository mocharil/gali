import "./methodology.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { AlertTriangle, BookOpenCheck, CalendarDays, FileText, Info, Layers, ShieldAlert, SlidersHorizontal, Sigma, Target } from "lucide-react";
import { normalizeMath, type MethodBlock, type MethodDoc, type MethodMetric, type MethodSection } from "@/lib/methodologyDoc";
import { MethodologyToc, type TocItem } from "@/components/MethodologyToc";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";

// Decorative 3D illustrations, matched to what each metric or section is about.
const METRIC_VISUALS: Record<string, VisualAssetName> = {
  M1: "reserve-clock", M2: "reserve-value", M3: "license-window", M4: "coal-tonne", M5: "evidence-desk",
  M6: "export-containers", M7: "site-operation", M8: "data-modules", M9: "valuation-lenses",
};
const SECTION_VISUALS: Record<string, VisualAssetName> = {
  overview: "mine-cutaway", "scenario-engine": "scenario-drivers", "local-dataset": "data-modules", limitations: "evidence-desk",
};

function Md({ children, className = "" }: { children: string; className?: string }) {
  return <div className={`method-md ${className}`}><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(children)}</ReactMarkdown></div>;
}

type BlockKind = "formula" | "caution" | "benchmark" | "params" | "detail";
function blockKind(block: MethodBlock): BlockKind {
  if (block.body.trimStart().startsWith("$$")) return "formula";
  if (/limitation|missing|unbounded|caveat/i.test(block.label)) return "caution";
  if (/benchmark|golden/i.test(block.label)) return "benchmark";
  if (/parameter|assumption/i.test(block.label)) return "params";
  return "detail";
}
const KIND_ICON = { formula: Sigma, caution: AlertTriangle, benchmark: Target, params: SlidersHorizontal, detail: Info };

function Block({ block }: { block: MethodBlock }) {
  const kind = blockKind(block);
  const Icon = KIND_ICON[kind];
  return <section className={`method-block method-block-${kind}`}>
    <h4 className="method-label"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{block.label}</h4>
    <Md>{block.body}</Md>
  </section>;
}

function MetricCard({ metric }: { metric: MethodMetric }) {
  return <article id={metric.id} className="method-card method-anchor" aria-labelledby={`${metric.id}-title`}>
    <div className="method-card-top">
      <div className="method-card-intro">
        <header className="method-card-head">
          <span className="method-code">{metric.code}</span>
          <h3 id={`${metric.id}-title`}>{metric.title}</h3>
        </header>
        {metric.description && <Md className="method-lead">{metric.description}</Md>}
      </div>
      {METRIC_VISUALS[metric.code] && <VisualAsset name={METRIC_VISUALS[metric.code]} className="method-art" />}
    </div>
    <div className="method-blocks">{metric.blocks.map((block) => <Block key={block.label} block={block} />)}</div>
    {metric.notes.length > 0 && <aside className="method-notes" aria-label={`${metric.code} notes`}>
      <h4 className="method-label"><Info className="h-3.5 w-3.5" aria-hidden="true" />Notes</h4>
      {metric.notes.map((note) => <Md key={note}>{note}</Md>)}
    </aside>}
  </article>;
}

function SectionHeader({ section }: { section: MethodSection }) {
  const visual = SECTION_VISUALS[section.id];
  return <header className="method-section-head">
    {section.number && <span className="method-number">{section.number}</span>}
    <h2 id={`${section.id}-title`}>{section.title}</h2>
    {visual && <VisualAsset name={visual} className="method-art method-art-head" />}
  </header>;
}

function Section({ section }: { section: MethodSection }) {
  return <section id={section.id} className="method-section method-anchor" aria-labelledby={`${section.id}-title`}>
    <SectionHeader section={section} />
    {section.kind === "overview" && <>
      <Md className="method-lead">{section.intro}</Md>
      <h3 className="method-subtitle">{section.principlesTitle}</h3>
      <ol className="method-principles">
        {section.principles?.map((principle, index) => <li key={principle.title}>
          <span className="method-principle-no">{index + 1}</span>
          <div><h4>{principle.title}</h4><Md>{principle.text}</Md></div>
        </li>)}
      </ol>
    </>}
    {section.kind === "metrics" && <div className="method-metrics">{section.metrics?.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>}
    {section.kind === "prose" && <div className="method-prose-card"><Md>{section.body ?? ""}</Md></div>}
  </section>;
}

export function MethodologyDocument({ doc }: { doc: MethodDoc }) {
  const items: TocItem[] = doc.sections.flatMap((section): TocItem[] => {
    if (section.kind === "metrics") return (section.metrics ?? []).map((metric) => ({ id: metric.id, code: metric.code, label: metric.short, group: "Metrics" }));
    return [{ id: section.id, label: section.short, group: section.number === "1" ? "Foundations" : "Engine & scope" }];
  });
  const metricCount = doc.sections.reduce((sum, section) => sum + (section.metrics?.length ?? 0), 0);
  return <div data-testid="methodology-document">
    <header className="method-hero">
      <div className="flex items-start gap-4">
        <span className="gali-icon-tile shrink-0" aria-hidden="true"><FileText className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="gali-kicker">Methodology reference</p>
          <h2 className="method-title">{doc.title}</h2>
          {doc.subtitle && <p className="method-subtitle-line">{doc.subtitle}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {doc.version && <span className="method-chip method-chip-brand"><Layers className="h-3.5 w-3.5" aria-hidden="true" />Version {doc.version}</span>}
        {doc.updated && <span className="method-chip"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Updated {doc.updated}</span>}
        {metricCount > 0 && <span className="method-chip method-chip-info"><Sigma className="h-3.5 w-3.5" aria-hidden="true" />{metricCount} metrics · M1–M{metricCount}</span>}
        <span className="method-chip"><BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />Scenario engine & provenance audit</span>
      </div>
      <ol className="method-guide" aria-label="How each metric is documented">
        <li><span>1</span><div><strong>Meaning</strong><p>What the metric measures and why it matters.</p></div></li>
        <li><span>2</span><div><strong>Formula</strong><p>Every calculation written step by step.</p></div></li>
        <li><span>3</span><div><strong>Limits</strong><p>Missing-data rules and what it cannot tell you.</p></div></li>
      </ol>
    </header>
    <div className="method-layout">
      <aside className="method-aside"><MethodologyToc items={items} /></aside>
      <div className="method-content">
        {doc.sections.map((section) => <Section key={section.id} section={section} />)}
        {doc.disclaimer && <aside className="method-disclaimer" aria-label="Official disclaimer">
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          <Md>{doc.disclaimer}</Md>
        </aside>}
      </div>
    </div>
  </div>;
}
