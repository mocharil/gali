import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(await readFile(path.join(root, "lib/simulation/dataset.json"), "utf8"));
const fixtures = JSON.parse(await readFile(path.join(root, "../../data/simulation/scenario-reference.json"), "utf8"));
const directory = await mkdtemp(path.join(os.tmpdir(), "gali-scenario-"));
try {
  const code = await readFile(path.join(root, "lib/simulation/scenario.ts"), "utf8");
  const modulePath = path.join(directory, "scenario.mjs");
  await writeFile(modulePath, ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
  const { simulateScenario, parseScenarioRequest } = await import(pathToFileURL(modulePath));
  let comparisons = 0;
  for (const fixture of fixtures) {
    const actual = simulateScenario(dataset.scenario_inputs, fixture.request);
    assert.deepEqual(JSON.parse(JSON.stringify(actual.params)), fixture.expected.params);
    assert.equal(actual.impacts.length, fixture.expected.impacts.length);
    for (const expected of fixture.expected.impacts) {
      const row = actual.impacts.find((value) => value.symbol === expected.symbol);
      assert.ok(row, expected.symbol);
      for (const [key, value] of Object.entries(expected)) {
        if (typeof value === "number" && !key.includes("rank")) {
          assert.ok(typeof row[key] === "number" && Math.abs(row[key] - value) <= .02, `${expected.symbol}.${key}: ${row[key]} != ${value}, params ${JSON.stringify(fixture.request)}`);
        } else assert.deepEqual(row[key], value, `${expected.symbol}.${key}`);
        comparisons++;
      }
    }
  }
  for (const request of [null, [], { price_shock_pct: null }, { price_shock_pct: -1.1 }, { price_shock_pct: "-0.2" }, { discount_rate: 0 }, { variable_cost_share: 1.1 }, { license_cliff_expiry_shock: "true" }, { destination_shocks: { China: -0.1 } }, { destination_shocks: { " ": .2 } }, { destination_shocks: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [String(i), .2])) }]) {
    assert.throws(() => parseScenarioRequest(request));
  }
  const zero = simulateScenario(dataset.scenario_inputs, {});
  assert.ok(zero.impacts.filter((row) => !row.is_partial).every((row) => row.delta_rbv_usd === 0 && row.rank_change === 0));
  const wiped = simulateScenario(dataset.scenario_inputs, { price_shock_pct: -1 });
  assert.ok(wiped.impacts.filter((row) => !row.is_partial).every((row) => row.post_shock_rbv_usd === 0 && row.delta_rbv_pct === -100));
  const cap = simulateScenario([{ ...dataset.scenario_inputs[0], rli_years: 100, baseline_rbv_usd: null }], {});
  const thirty = simulateScenario([{ ...dataset.scenario_inputs[0], rli_years: 30, baseline_rbv_usd: null }], {});
  assert.equal(cap.impacts[0].baseline_rbv_usd, thirty.impacts[0].baseline_rbv_usd);
  console.log(`PASS: ${fixtures.length} Python reference scenarios, ${comparisons} field comparisons, request validation, zero baseline, total price loss, 30-year cap.`);
} finally { await rm(directory, { recursive: true, force: true }); }
