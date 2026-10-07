import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = await mkdtemp(path.join(root, ".methodology-test-"));
try {
  const source = await readFile(path.join(root, "lib/methodologyDoc.ts"), "utf8");
  await writeFile(path.join(directory, "doc.cjs"), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
  const { parseMethodology, normalizeMath } = createRequire(import.meta.url)(path.join(directory, "doc.cjs"));
  const doc = parseMethodology(await readFile(path.join(root, "../../docs/METRICS.md"), "utf8"));

  const metrics = doc.sections.flatMap((section) => section.metrics ?? []);
  assert.deepEqual(metrics.map((metric) => metric.code), ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"]);
  assert.equal(metrics.find((metric) => metric.code === "M2").id, "rbv");
  assert.equal(metrics.find((metric) => metric.code === "M8").id, "score");
  for (const metric of metrics) {
    assert.ok(metric.description, `${metric.code} needs a description`);
    assert.ok(metric.blocks.some((block) => block.body.includes("$")), `${metric.code} needs at least one formula`);
  }
  assert.equal(doc.sections.length, 5);
  assert.equal(doc.sections[0].principles.length, 4);
  assert.ok(doc.version && doc.updated && doc.subtitle);
  assert.ok(doc.disclaimer && !doc.disclaimer.includes("[!IMPORTANT]"));
  assert.ok(!doc.sections.some((section) => (section.body ?? "").includes("[!IMPORTANT]")), "the disclaimer is shown once, as its own callout");

  const display = normalizeMath("$$a = b$$\n$$c = d$$");
  assert.equal(display.split("\n").filter((line) => line.trim() === "$$").length, 4, "each formula becomes its own fenced block");
  assert.ok(normalizeMath("Default $16,200.0$ IDR/USD").includes("16{,}200.0"));
  const currency = "Price is $5 and $6 later"; assert.equal(normalizeMath(currency), currency, "text without thousands separators is left untouched");
  console.log(`PASS: methodology document parses into ${metrics.length} metrics, ${doc.sections.length} sections and display-math blocks.`);
} finally { await rm(directory, { recursive: true, force: true }); }
