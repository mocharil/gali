// Splits docs/METRICS.md into a structured model so the Methodology page can lay it out as
// cards, formula panels and navigation while the markdown file stays the single source of truth.

export interface MethodBlock { label: string; body: string }
export interface MethodMetric {
  id: string; code: string; title: string; short: string;
  description: string | null; blocks: MethodBlock[]; notes: string[];
}
export interface MethodPrinciple { title: string; text: string }
export interface MethodSection {
  id: string; number: string; title: string; short: string;
  kind: "overview" | "metrics" | "prose";
  intro: string; principlesTitle?: string; principles?: MethodPrinciple[];
  metrics?: MethodMetric[]; body?: string;
}
export interface MethodDoc {
  title: string; subtitle: string; version: string | null; updated: string | null;
  sections: MethodSection[]; disclaimer: string | null;
}

const SECTION_IDS: Record<string, { id: string; short: string }> = {
  "1": { id: "overview", short: "Overview & principles" },
  "2": { id: "metrics", short: "Metrics M1–M9" },
  "3": { id: "scenario-engine", short: "Scenario engine" },
  "4": { id: "local-dataset", short: "Local dataset" },
  "5": { id: "limitations", short: "Limitations & disclaimer" },
};
// These ids are deep-linked from the issuer profile pages.
const METRIC_ANCHORS: Record<string, string> = { M2: "rbv", M8: "score" };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = (value: string) => value.replace(/\*\*/g, "").replace(/`/g, "").trim();
const titleCase = (value: string) => value !== value.toUpperCase() ? value
  : value.split(" ").map((word) => word === "GALI" || word === "&" ? word : word.charAt(0) + word.slice(1).toLowerCase()).join(" ");

function parseBlocks(body: string): { blocks: MethodBlock[]; notes: string[] } {
  const blocks: MethodBlock[] = [];
  const notes: string[] = [];
  let current: { label: string; lines: string[] } | null = null;
  let paragraph: string[] = [];
  const flushNote = () => { if (paragraph.length) notes.push(paragraph.join("\n").trim()); paragraph = []; };
  const closeBlock = () => {
    if (current) blocks.push({ label: current.label, body: current.lines.join("\n").trim() });
    current = null;
  };
  for (const line of body.split("\n")) {
    if (/^---+\s*$/.test(line)) continue;
    const bullet = line.match(/^- \*\*(.+?)\*\*\s*:?\s*(.*)$/);
    if (bullet) {
      flushNote(); closeBlock();
      current = { label: bullet[1].replace(/:$/, "").trim(), lines: bullet[2] ? [bullet[2]] : [] };
      continue;
    }
    if (current && (line.startsWith("  ") || line.trim() === "")) { current.lines.push(line.startsWith("  ") ? line.slice(2) : ""); continue; }
    if (line.trim() === "") { flushNote(); continue; }
    closeBlock();
    paragraph.push(line);
  }
  flushNote(); closeBlock();
  return { blocks, notes };
}

function parseMetric(heading: string, body: string): MethodMetric | null {
  const match = heading.match(/^(M\d+)\s*[—–-]\s*(.+)$/);
  if (!match) return null;
  const { blocks, notes } = parseBlocks(body);
  const descriptionIndex = blocks.findIndex((block) => /^description$/i.test(block.label));
  const description = descriptionIndex >= 0 ? blocks.splice(descriptionIndex, 1)[0].body : null;
  const title = match[2].trim();
  return { id: METRIC_ANCHORS[match[1]] ?? match[1].toLowerCase(), code: match[1], title, short: title.split(/ \(| & /)[0], description, blocks, notes };
}

export function parseMethodology(source: string): MethodDoc {
  const text = source.replace(/\r\n?/g, "\n");
  const firstSection = text.search(/^## /m);
  const preamble = firstSection === -1 ? text : text.slice(0, firstSection);
  let rest = firstSection === -1 ? "" : text.slice(firstSection);

  const title = titleCase(plain((preamble.match(/^# (.+)$/m)?.[1]) ?? "Methodology"));
  const quote = preamble.split("\n").filter((line) => line.startsWith(">")).map((line) => line.replace(/^>\s?/, ""));
  const subtitle = plain(quote[0] ?? "");
  const meta = quote.join(" ");
  const version = meta.match(/Version:\s*`([^`]+)`/)?.[1] ?? null;
  const updated = meta.match(/Updated:\s*\*\*([^*]+)\*\*/)?.[1] ?? null;

  let disclaimer: string | null = null;
  rest = rest.replace(/(?:^>.*(?:\n|$))+/gm, (block) => {
    if (!block.includes("[!IMPORTANT]")) return block;
    disclaimer = block.split("\n").map((line) => line.replace(/^>\s?/, "")).filter((line) => !line.includes("[!IMPORTANT]")).join("\n").trim();
    return "";
  });

  const sections: MethodSection[] = rest.split(/^## /m).slice(1).map((part) => {
    const [headingLine, ...lines] = part.split("\n");
    const heading = headingLine.match(/^(\d+)\.\s*(.+)$/);
    const number = heading?.[1] ?? "";
    const sectionTitle = (heading?.[2] ?? headingLine).trim();
    const known = SECTION_IDS[number];
    const chunks = lines.join("\n").split(/^### /m);
    const subs = chunks.slice(1).map((chunk) => ({ heading: chunk.split("\n")[0].trim(), body: chunk.split("\n").slice(1).join("\n") }));
    const base = { id: known?.id ?? slug(sectionTitle), number, title: sectionTitle, short: known?.short ?? sectionTitle };

    const metrics = subs.map((sub) => parseMetric(sub.heading, sub.body)).filter((item): item is MethodMetric => item !== null);
    if (metrics.length) return { ...base, kind: "metrics" as const, intro: chunks[0].replace(/^---+\s*$/gm, "").trim(), metrics };

    const listing = subs.find((sub) => /^\d+\.\s+\*\*/m.test(sub.body));
    if (listing) {
      const principles = listing.body.split("\n").map((line) => line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*:?\s*(.*)$/)).filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => ({ title: m[1].replace(/:$/, "").trim(), text: m[2].trim() }));
      return { ...base, kind: "overview" as const, intro: chunks[0].replace(/^---+\s*$/gm, "").trim(), principlesTitle: listing.heading.replace(/:$/, ""), principles };
    }
    return { ...base, kind: "prose" as const, intro: "", body: lines.join("\n").replace(/^---+\s*$/gm, "").trim() };
  });

  return { title, subtitle, version, updated, sections, disclaimer };
}

// Display formulas are written as one `$$…$$` line each, usually back to back. Without blank lines
// the markdown parser reads them as one run-on paragraph of inline math, so each one is promoted
// to a fenced block. Thousands separators inside math (16,200.0) are protected from KaTeX's
// punctuation spacing, which would otherwise render them as "16, 200.0".
export function normalizeMath(markdown: string): string {
  const protect = (math: string) => math.replace(/(\d),(?=\d{3}\b)/g, "$1{,}");
  const lines = markdown.split("\n").flatMap((line) => {
    const display = line.match(/^(\s*)\$\$(.+)\$\$\s*$/);
    return display ? ["", `${display[1]}$$`, `${display[1]}${protect(display[2].trim())}`, `${display[1]}$$`, ""] : [line];
  });
  return lines.join("\n").replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, math: string) => `$${protect(math)}$`);
}
