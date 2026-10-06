import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = await mkdtemp(path.join(os.tmpdir(), "gali-research-"));
try {
  for (const name of ["scores", "research", "analysis", "presentation"]) {
    const code = await readFile(path.join(root, "lib", `${name}.ts`), "utf8");
    const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('from "./scores"', 'from "./scores.mjs"');
    await writeFile(path.join(directory, `${name}.mjs`), output);
  }
  const { isScoreRankable, scoreRanks, compareScores } = await import(pathToFileURL(path.join(directory, "scores.mjs")));
  const { scenarioBrief } = await import(pathToFileURL(path.join(directory, "research.mjs")));
  const { analyzeIssuers } = await import(pathToFileURL(path.join(directory, "analysis.mjs")));
  const { englishDataset, englishText, qualityLabel } = await import(pathToFileURL(path.join(directory, "presentation.mjs")));
  const dataset = JSON.parse(await readFile(path.join(root, "lib/simulation/dataset.json"), "utf8"));
  const snapshot = JSON.stringify(dataset);
  const presented = englishDataset(dataset);
  assert.equal(JSON.stringify(dataset), snapshot, "Presentation must not mutate the source dataset");
  const numericFields = (input) => {
    if (Array.isArray(input)) return input.map(numericFields);
    if (input !== null && typeof input === "object") return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, numericFields(value)]));
    return typeof input === "string" ? null : input;
  };
  assert.deepEqual(numericFields(presented), numericFields(dataset), "Presentation must preserve every numeric, boolean, and missing value");
  assert.equal(presented.issuers[0].name, "AADI · Coal portfolio");
  assert.equal(presented.issuers[0].data_quality, "LENGKAP", "Quality codes are part of the API contract");
  assert.equal(presented.sites.features[0].properties.province, "South Kalimantan");
  assert.equal(presented.graphs.AADI.nodes[1].label, "AADI Main Corridor");
  assert.equal(presented.coverage.metrics[0].entity, "Reserves and production");
  assert.equal(englishText("PT Adaro Energy Indonesia Tbk"), "PT Adaro Energy Indonesia Tbk", "Legal names must be preserved");
  assert.equal(qualityLabel("LENGKAP"), "Complete");
  assert.equal(qualityLabel("PARSIAL"), "Partial");
  const ranks = scoreRanks(dataset.issuers);
  assert.equal(ranks.has("PTBA"), false);
  assert.equal(ranks.has("DSSA"), false);
  assert.equal(ranks.size, 6);
  const sorted = [...dataset.issuers].sort(compareScores);
  assert.ok(sorted.slice(0, ranks.size).every(isScoreRankable));
  const tied = [{ ...sorted[0], symbol: "A", ground_truth_score: 80 }, { ...sorted[0], symbol: "B", ground_truth_score: 80 }];
  assert.deepEqual([...scoreRanks(tied).values()], [1, 1]);
  assert.equal(isScoreRankable({ ...sorted[0], confidence_pct: 75 }), false);
  assert.equal(isScoreRankable({ ...sorted[0], confidence_pct: Number.NaN }), false);
  const answer = analyzeIssuers("Highest fundamental score", dataset.issuers);
  assert.ok(answer.rows.length && answer.rows.every((row) => isScoreRankable(row.issuer)));
  const partial = analyzeIssuers("PTBA", dataset.issuers);
  assert.ok(partial.rows[0].facts.some((fact) => fact.value.includes("provisional")));
  for (const [question, headline] of [
    ["Compare BUMI and BYAN", "Comparison BUMI and BYAN"],
    ["Issuers with the lowest cash cost", "Cash cost per ton comparison"],
    ["Longest reserve life", "Reserve life at the production rate"],
    ["License exposure within 3 years", "License expiry exposure within 3 years"],
    ["Market valuation vs RBV", "Market capitalization gap versus modeled RBV"],
    ["Export market concentration", "Largest sales destination concentration"],
  ]) {
    const result = analyzeIssuers(question, presented.issuers);
    assert.equal(result.headline, headline, `English question must route correctly: ${question}`);
    assert.ok(result.rows.length);
  }
  assert.equal(analyzeIssuers("Write me a poem", presented.issuers).headline, "Question not supported");
  const fixtures = JSON.parse(await readFile(path.join(root, "../../data/simulation/scenario-reference.json"), "utf8"));
  const lossCase = fixtures.find((fixture) => fixture.request.price_shock_pct === -1);
  const impact = lossCase.expected.impacts.find((row) => row.symbol === "BUMI");
  const brief = scenarioBrief(impact, lossCase.expected.params, dataset.meta);
  assert.ok(brief.includes("synthetic") && brief.includes("2026-09-30") && brief.includes("Gross loss:"));
  assert.ok(brief.includes("confidence interval") && brief.includes("not free cash flow"));
  assert.ok(brief.includes("Interactions are attributed") && brief.includes("/issuer/BUMI"));
  const missing = lossCase.expected.impacts.find((row) => row.symbol === "PTBA");
  assert.ok(scenarioBrief(missing, lossCase.expected.params, dataset.meta).includes("RBV cannot be calculated"));
  console.log("PASS: English presentation, numeric/source integrity, English assistant routing, complete/provisional ranking, and research brief traceability.");
} finally { await rm(directory, { recursive: true, force: true }); }
