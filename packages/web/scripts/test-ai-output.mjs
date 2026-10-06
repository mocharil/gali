import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

// Test-only response prose. Values and citations pass through the real server
// grounding and narrative validator. This does not call or emulate live Gemini.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = await mkdtemp(path.join(root, ".ai-tests-output-"));
const require = createRequire(import.meta.url);
const originalMode = process.env.GALI_DATA_MODE;
process.env.GALI_DATA_MODE = "simulation";
const results = [];
async function test(name, work) {
  try { await work(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL: ${name}: ${error.message}`); }
}
const claim = (text, ...evidence_ids) => ({ text, evidence_ids });
const finding = (kind, title, text, ...ids) => ({ kind, title, ...claim(text, ...ids) });
const narrative = (title, summary, findings, follow_up_questions, status = "answered") => ({ status, title, summary, findings, follow_up_questions });

try {
  for (const name of ["types", "scores", "presentation", "research", "simulation/dataset", "simulation/scenario", "ai/types", "ai/scenario", "ai/presentation", "ai/export", "ai/server/data", "ai/server/context", "ai/server/narrative"]) {
    const source = await readFile(path.join(root, "lib", `${name}.ts`), "utf8");
    const code = ts.transpileModule(source.replace('import "server-only";', ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText.replace(/require\("(\.[^"]+)"\)/g, (_, value) => `require("${value.endsWith(".json") ? value : value + ".cjs"}")`);
    await mkdir(path.dirname(path.join(directory, `${name}.cjs`)), { recursive: true });
    await writeFile(path.join(directory, `${name}.cjs`), code);
  }
  await writeFile(path.join(directory, "simulation/dataset.json"), await readFile(path.join(root, "lib/simulation/dataset.json")));
  const load = (name) => require(path.join(directory, `${name}.cjs`));
  const { buildGroundingContext } = load("ai/server/context");
  const { validateNarrative } = load("ai/server/narrative");
  const { aiBriefMarkdown } = load("ai/export");
  const { scenarioFromUrl } = load("ai/scenario");
  const signal = () => new AbortController().signal;
  const activeParams = { price_shock_pct: -.2, destination_shocks: { China: .3 }, discount_rate: .16, variable_cost_share: .5, license_cliff_expiry_shock: true };
  const cases = [
    { id: "comparison", question: "Bandingkan kekuatan dan risiko BUMI dengan BYAN", request: { mode: "chat", question: "Compare BUMI and BYAN", symbols: ["BUMI", "BYAN"] }, response: narrative(
      "Cost resilience comes with different exposures",
      claim("BYAN has a lower cash cost of {{BYAN.cash_cost_per_ton_usd}} against BUMI's {{BUMI.cash_cost_per_ton_usd}}, alongside a longer reserve life. These operating advantages should be assessed against destination concentration and license exposure before drawing a valuation conclusion.", "BYAN.cash_cost_per_ton_usd", "BUMI.cash_cost_per_ton_usd", "BYAN.rli_years", "BUMI.rli_years", "method.rbv"),
      [
        finding("finding", "A stronger unit-cost buffer", "BYAN's unit margin is {{BYAN.unit_margin_usd}} against BUMI's {{BUMI.unit_margin_usd}} in the active dataset. This suggests a larger operating buffer at the supplied realized prices; it does not establish that every future price shock will affect the issuers equally.", "BYAN.unit_margin_usd", "BUMI.unit_margin_usd", "method.scenario"),
        finding("finding", "Reserve life needs an operating context", "BYAN's reserve life is {{BYAN.rli_years}} and BUMI's is {{BUMI.rli_years}}. The measure holds annual production constant and cannot establish license renewal, future recovery, or the economics of extracting all remaining reserves.", "BYAN.rli_years", "BUMI.rli_years", "method.reserve_life"),
        finding("risk", "Sales concentration can offset cost strength", "BYAN's largest destination is {{BYAN.top_destination}} with {{BYAN.top_destination_pct}} of sales volume; BUMI's largest-destination share is {{BUMI.top_destination_pct}}. Concentration can increase sensitivity to a local demand reduction, but volume shares do not establish revenue exposure.", "BYAN.top_destination", "BYAN.top_destination_pct", "BUMI.top_destination_pct", "method.destination"),
        finding("risk", "Expiry exposure needs renewal evidence", "BUMI's linked licensed area expiring within the near-term window is {{BUMI.license_cliff_3y}}, compared with {{BYAN.license_cliff_3y}} for BYAN. These figures locate an exposure for research; they do not represent probabilities of failed renewal or site-level production losses.", "BUMI.license_cliff_3y", "BYAN.license_cliff_3y", "method.license"),
        finding("limitation", "Modeled reserves are not equity value", "The supplied RBV model capitalizes gross profit and excludes overhead, tax, capital expenditure, working capital, and the debt/cash bridge. A large modeled gap therefore requires reconciliation before it can support an equity-value interpretation.", "method.rbv"),
        finding("next_step", "Reconcile periods and operating scope", "Compare the issuer reporting periods, realized prices, ownership scope, and renewal evidence. Then run a combined scenario with explicit assumptions rather than adding unrelated stress-test results.", "BUMI.financial_years", "BYAN.financial_years", "method.ownership", "method.attribution"),
      ], ["What could reverse BYAN's operating advantage?", "Which license evidence should I inspect first?", "How do the issuers react to the same price shock?"] ) },
    { id: "active_itmg", question: "Explain ITMG's active scenario", request: { mode: "brief", question: "Explain ITMG's active scenario", symbols: ["ITMG"], scenario: activeParams }, response: narrative(
      "ITMG's scenario is driven by operating economics",
      claim("ITMG's modeled RBV changes by {{scenario.active.ITMG.change_pct}} in the selected scenario. Read this result alongside price pressure, exposed destination volume, and the discount-rate assumption rather than treating it as a forecast.", "scenario.active.ITMG.change_pct", "method.scenario", "method.sensitivity"),
      [
        finding("finding", "Trace the calculated drivers", "The price contribution to modeled RBV change is {{scenario.active.ITMG.driver.price}} and the volume contribution is {{scenario.active.ITMG.driver.volume}}. Interactions belong to the driver applied later in GALI's fixed attribution order.", "scenario.active.ITMG.driver.price", "scenario.active.ITMG.driver.volume", "method.attribution"),
        finding("risk", "Cost rigidity can amplify lost sales", "Modeled scenario revenue is {{scenario.active.ITMG.post_shock_revenue_usd}} and costs are {{scenario.active.ITMG.post_shock_cost_usd}}. Fixed costs remain when destination volume falls; the assumed variable-cost share changes how much cost can adjust.", "scenario.active.ITMG.post_shock_revenue_usd", "scenario.active.ITMG.post_shock_cost_usd", "method.scenario"),
        finding("limitation", "Sensitivity is an assumption range", "The tested RBV-change range runs from {{scenario.active.ITMG.sensitivity_low}} to {{scenario.active.ITMG.sensitivity_high}}. It varies price and discount-rate assumptions while holding the other active parameters fixed; it is not a confidence interval.", "scenario.active.ITMG.sensitivity_low", "scenario.active.ITMG.sensitivity_high", "method.sensitivity"),
        finding("next_step", "Inspect the operating basis", "Review the {{scenario.active.ITMG.basis}} basis, reconcile reported costs, and test an alternative variable-cost assumption. Validate license renewal exposure separately from a destination-demand assumption.", "scenario.active.ITMG.basis", "method.scenario", "method.license"),
      ], ["Which assumption changes ITMG's result most?", "How should I interpret the driver order?"] ) },
    { id: "gross_loss", question: "Explain BUMI's severe downside scenario", request: { mode: "brief", question: "Explain BUMI's severe downside scenario", symbols: ["BUMI"], scenario: { ...activeParams, price_shock_pct: -.5, destination_shocks: { China: .5 } } }, response: narrative(
      "The valuation floor does not remove operating losses",
      claim("BUMI's modeled gross profit falls to {{scenario.active.BUMI.post_shock_gp_usd}} while scenario RBV is {{scenario.active.BUMI.post_shock_rbv_usd}}. The zero valuation floor limits the annuity output; it does not mean the operation avoids a loss.", "scenario.active.BUMI.post_shock_gp_usd", "scenario.active.BUMI.post_shock_rbv_usd", "method.scenario"),
      [
        finding("finding", "The loss remains visible", "Scenario gross loss is {{scenario.active.BUMI.gross_loss_usd}} under the selected assumptions. Revenue pressure and reduced exposed sales volume act against a cost base that cannot fall proportionally when part of it is fixed.", "scenario.active.BUMI.gross_loss_usd", "method.scenario"),
        finding("risk", "A floor can hide further deterioration", "RBV change is {{scenario.active.BUMI.change_pct}}. Further operating deterioration can deepen a gross loss without reducing an already floored modeled value, so review the gross-profit result alongside the annuity measure.", "scenario.active.BUMI.change_pct", "scenario.active.BUMI.post_shock_gp_usd", "method.scenario"),
        finding("limitation", "This is a stress assumption", "The price-change assumption is {{scenario.active.price}} and the exposed China-volume reduction is {{scenario.active.demand.China}}. Neither is a forecast or a probability, and RBV omits costs required for a complete cash-flow and equity assessment.", "scenario.active.price", "scenario.active.demand.China", "method.sensitivity", "method.rbv"),
        finding("next_step", "Research liquidity and cost flexibility", "Validate the reconciled operating inputs and examine cost flexibility, liquidity, and obligations using evidence outside this model. The active dataset cannot establish financing capacity from a floored RBV result.", "scenario.active.BUMI.basis", "method.rbv", "method.scope"),
      ], ["Why can gross loss grow after RBV reaches its floor?", "Which cost assumptions should I challenge?"] ) },
    { id: "partial_data", question: "Can I compare PTBA and DSSA on cost and reserve value?", request: { mode: "chat", question: "Compare PTBA and DSSA", symbols: ["PTBA", "DSSA"] }, response: narrative(
      "The available metrics do not support a full comparison",
      claim("PTBA cash cost: {{PTBA.cash_cost_per_ton_usd}}. DSSA reserve life: {{DSSA.rli_years}}. These gaps prevent a like-for-like cost and reserve-value comparison; they should remain visible rather than being filled with zero.", "PTBA.cash_cost_per_ton_usd", "DSSA.rli_years", "method.scope"),
      [
        finding("finding", "Some observations are still supported", "PTBA's available reserve life is {{PTBA.rli_years}} and DSSA's available cash cost is {{DSSA.cash_cost_per_ton_usd}}. These are different dimensions and do not establish an overall winner.", "PTBA.rli_years", "DSSA.cash_cost_per_ton_usd", "method.reserve_life"),
        finding("risk", "An incomplete comparison can mislead", "PTBA modeled RBV: {{PTBA.reserve_backed_value_usd}}. DSSA modeled RBV: {{DSSA.reserve_backed_value_usd}}. Missing model outputs cannot establish that either issuer has no asset value or no exposure to operating risk.", "PTBA.reserve_backed_value_usd", "DSSA.reserve_backed_value_usd", "method.rbv"),
        finding("limitation", "Coverage constrains the conclusion", "A complete score rank requires every required pillar and full score weight coverage. Partial issuer evidence should be researched as a gap, rather than assigned a complete rank.", "PTBA.ranking_status", "DSSA.ranking_status", "method.score"),
        finding("next_step", "Recover the missing inputs", "Verify PTBA's attributable financial inputs and DSSA's paired attributable reserves and production. Check reporting periods and ownership before rerunning the model.", "PTBA.cash_cost_per_ton_usd", "DSSA.rli_years", "method.rbv", "method.ownership"),
      ], ["Which missing inputs block PTBA's RBV?", "Which DSSA operating evidence is available?"], "insufficient_data" ) },
    { id: "provisional_score", question: "Can ADMR receive a complete rank?", request: { mode: "chat", question: "Explain ADMR's score coverage", symbols: ["ADMR"] }, response: narrative(
      "ADMR's score needs its missing pillar",
      claim("ADMR's score weight coverage is {{ADMR.confidence_pct}} and its ranking status is {{ADMR.ranking_status}}. Weight coverage describes available model inputs; it is not statistical confidence or the likelihood that an investment succeeds.", "ADMR.confidence_pct", "ADMR.ranking_status", "method.score"),
      [
        finding("finding", "Available operating inputs remain useful", "ADMR's reserve life is {{ADMR.rli_years}} and its cash cost is {{ADMR.cash_cost_per_ton_usd}}. These supplied observations can inform a focused question even while the full score remains provisional.", "ADMR.rli_years", "ADMR.cash_cost_per_ton_usd"),
        finding("limitation", "Incomplete weight coverage prevents a complete rank", "The active universe contains {{dataset.rankable}} issuers eligible for complete score ranking. ADMR should be excluded from that ordering until all required score pillars are available.", "dataset.rankable", "ADMR.ranking_status", "method.score"),
        finding("next_step", "Inspect the missing component", "Review contractor-concentration evidence and confirm how missing inputs affect the reported score. Recover the missing pillar before comparing complete ranks.", "ADMR.pillar.contractor_risk", "method.score"),
      ], ["How does score coverage differ from data completeness?"] ) },
    { id: "dashboard_stress", question: "Write a balanced resilience brief", request: { mode: "brief", question: "Write a balanced resilience brief" }, response: narrative(
      "Resilience differs across the separate stress tests",
      claim("The price-pressure test changes the complete-core issuer-model aggregate by {{scenario.price.aggregate_change_pct}}; the China-demand test changes it by {{scenario.china.aggregate_change_pct}}. These tests are separate and cannot be added to infer a combined scenario.", "scenario.price.aggregate_change_pct", "scenario.china.aggregate_change_pct", "method.attribution"),
      [
        finding("finding", "Keep aggregation scope explicit", "The price test includes {{scenario.price.aggregate_count}} eligible complete-core issuer models, while {{dataset.rankable}} issuers qualify for complete score ranking. Core metric coverage and complete score coverage are distinct eligibility checks.", "scenario.price.aggregate_count", "dataset.rankable", "method.score"),
        finding("risk", "License exposure has a separate mechanism", "The license-expiry test changes the modeled aggregate by {{scenario.license.aggregate_change_pct}}. It applies an explicit no-renewal stress to linked area exposure; the result is neither a forecast nor a site-level production-loss estimate.", "scenario.license.aggregate_change_pct", "method.license"),
        finding("limitation", "The aggregate is not an industry valuation", "Shared operating entities may appear in more than one issuer model, and RBV excludes the equity bridge and costs beyond gross profit. The issuer-model sum cannot establish an industry total or portfolio fair value.", "method.ownership", "method.rbv"),
        finding("next_step", "Move from screening to issuer research", "Inspect the issuer-level cost basis, destination volume, ownership, and renewal evidence. Then construct a combined scenario and assess sensitivity with explicit assumptions.", "method.destination", "method.scenario", "method.attribution"),
      ], ["Which issuers are most exposed to price pressure?", "How should I build a combined scenario?"] ) },
    { id: "out_of_scope", question: "What is BYAN's latest news and current share price?", request: { mode: "chat", question: "What is BYAN's latest news and current share price?", symbols: ["BYAN"] }, response: narrative(
      "The active dataset cannot answer a live-market question",
      claim("GALI does not browse news or retrieve current market prices for this answer. I can explain BYAN's supplied operating evidence and model limitations, but cannot establish a current share price or verify a recent event.", "method.scope"),
      [
        finding("limitation", "The snapshot has a defined scope", "The active dataset snapshot is {{dataset.snapshot}}. Its date describes this publication and does not establish freshness for external market news or prices.", "dataset.snapshot", "method.scope"),
        finding("next_step", "Separate market verification from model interpretation", "Check an appropriate live-market source for the external fact, then compare any verified information with the operating and valuation assumptions available in GALI.", "method.scope", "method.rbv"),
      ], ["What does BYAN's available operating evidence show?"], "out_of_scope" ) },
  ];
  const long = structuredClone(cases[0]); long.id = "long_response"; long.question = "ResearchContext".repeat(60); long.request.question = "Compare BUMI and BYAN with a detailed evidence view";
  long.response.title = "ReserveValueSensitivity".repeat(5);
  long.response.findings[0].text += "\n\n" + "Reconcile realized prices, ownership scope, cost behavior, and reporting periods before translating an operating observation into a valuation conclusion. ".repeat(7) + "EvidenceContext".repeat(8);
  long.response.findings[0].evidence_ids = ["BYAN.unit_margin_usd", "BUMI.unit_margin_usd", "method.scenario", "method.rbv", "method.ownership", "method.scope"];
  cases.push(long);
  const fixtures = {};
  for (const item of cases) {
    await test(`${item.id}: grounded structure, exact facts, missing-value semantics and export`, async () => {
      const context = await buildGroundingContext(item.request, signal());
      for (const id of [item.response.summary, ...item.response.findings].flatMap((part) => part.evidence_ids)) assert.ok(context.evidence.some((fact) => fact.id === id), `Test fixture references unavailable fact: ${id}`);
      const validated = validateNarrative(JSON.stringify(item.response), context, item.request.mode === "brief");
      const cited = new Set([validated.summary, ...validated.findings].flatMap((part) => part.evidence_ids));
      const answer = { ...validated, request_id: `qa-output-${item.id}`, provider: "gemini_vertex", model: "gemini-3.8-flash", generated_at: "2026-10-06T02:00:00.000Z", cached: false, evidence: context.evidence.filter((fact) => cited.has(fact.id)), snapshot: context.snapshot, usage: { input_tokens: null, output_tokens: null } };
      assert.equal(answer.evidence.length, cited.size); assert.ok(answer.evidence.every((fact) => fact.href.startsWith("/") && fact.source));
      for (const part of [item.response.summary, ...item.response.findings]) {
        for (const id of part.text.matchAll(/\{\{([A-Za-z0-9_.-]+)\}\}/g)) {
          const expected = context.evidence.find((fact) => fact.id === id[1]);
          assert.ok(expected); assert.ok(aiBriefMarkdown(answer).includes(expected.value));
        }
      }
      assert.equal(JSON.stringify(answer).includes("{{"), false);
      const markdown = aiBriefMarkdown(answer); assert.ok(markdown.includes("## Evidence")); assert.ok(markdown.includes(`Dataset source: ${context.snapshot.source_type}`));
      fixtures[item.id] = { question: item.question, request: item.request, answer };
      if (item.id === "gross_loss") {
        assert.ok(answer.evidence.find((fact) => fact.id.endsWith("post_shock_gp_usd")).raw_value < 0);
        assert.equal(answer.evidence.find((fact) => fact.id.endsWith("post_shock_rbv_usd")).raw_value, 0);
      }
      if (item.id === "partial_data") {
        assert.ok(answer.summary.text.includes("Unavailable")); assert.equal(answer.status, "insufficient_data");
        assert.equal(answer.evidence.find((fact) => fact.id === "DSSA.rli_years").raw_value, null);
      }
      if (item.id === "provisional_score") assert.equal(context.orderings.ground_truth_score.includes("ADMR"), false);
    });
  }
  const active = fixtures.active_itmg;
  await test("Issuer scenario references reopen the discussed issuer and identical assumptions", () => {
    for (const fact of active.answer.evidence.filter((entry) => entry.id.startsWith("scenario.active.ITMG."))) {
      const url = new URL(fact.href, "http://localhost"); assert.equal(url.searchParams.get("issuer"), "ITMG"); assert.deepEqual(scenarioFromUrl(url), activeParams);
    }
  });
  await test("Method references have distinct readable labels", () => {
    const labels = fixtures.comparison.answer.evidence.filter((item) => item.quality === "methodology").map((item) => item.label);
    assert.equal(new Set(labels).size, labels.length); assert.ok(labels.includes("RBV model boundaries"));
  });
  const comparison = await buildGroundingContext(cases[0].request, signal());
  await test("Malformed or ungrounded responses never become presentable answers", () => {
    const modifications = [
      (value) => { value.summary.text = "The cost is 3 USD."; },
      (value) => { value.summary.evidence_ids = ["UNKNOWN.cash_cost"]; },
      (value) => { value.summary.text = "The cost is {{BUMI.unit_margin_usd}}."; value.summary.evidence_ids = ["method.rbv"]; },
      (value) => { value.findings = []; },
      (value) => { value.findings[0].text = "<script>untrusted()</script>"; },
      (value) => { value.summary.text = "See https://example.invalid"; },
      (value) => { value.follow_up_questions = ["Expect 100% returns?"]; },
      (value) => { value.summary.text = "word ".repeat(400); },
    ];
    for (const change of modifications) { const value = structuredClone(cases[0].response); change(value); assert.throws(() => validateNarrative(JSON.stringify(value), comparison), (error) => error.code === "AI_UNVERIFIED_ANSWER"); }
  });
  await test("Plain-text responses reject Markdown decoration and concealed directional formatting", () => {
    for (const dirty of ["**Strong claim**", "```json\nClaim\n```", "# Claim heading", "Misleading\u202eclaim"]) {
      const value = structuredClone(cases[0].response); value.summary.text = dirty;
      assert.throws(() => validateNarrative(JSON.stringify(value), comparison), (error) => error.code === "AI_UNVERIFIED_ANSWER");
    }
  });
  await test("Whitespace is normalized without changing words or resolved metric values", () => {
    const value = structuredClone(cases[0].response); value.title = "  Cost   resilience \n comparison  "; value.summary.text = "  Cost:  {{BUMI.cash_cost_per_ton_usd}}.\r\n\r\n\r\nCheck   the model.  "; value.summary.evidence_ids = ["BUMI.cash_cost_per_ton_usd"];
    const result = validateNarrative(JSON.stringify(value), comparison);
    assert.equal(result.title, "Cost resilience comparison"); assert.equal(result.summary.text, "Cost: 52.00 USD/ton.\n\nCheck the model.");
  });
  await test("Repeated follow-up questions are displayed only once", () => {
    const value = structuredClone(cases[0].response); value.follow_up_questions = ["What should I verify?", "What should I verify?", "Which model limit matters most?"];
    assert.deepEqual(validateNarrative(JSON.stringify(value), comparison).follow_up_questions, ["What should I verify?", "Which model limit matters most?"]);
  });
  await test("Markdown export preserves finding kinds and limited-answer status", () => {
    const partial = aiBriefMarkdown(fixtures.partial_data.answer); assert.ok(partial.includes("Response status: Insufficient data")); assert.ok(partial.includes("Analytical limit"));
    assert.ok(aiBriefMarkdown(fixtures.out_of_scope.answer).includes("Response status: Outside dataset scope"));
  });
  await mkdir(path.join(root, "e2e/fixtures"), { recursive: true });
  await writeFile(path.join(root, "e2e/fixtures/gemini-output-scenarios.json"), JSON.stringify(fixtures, null, 2) + "\n");
  const version = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
  const report = { version, generated_at: new Date().toISOString(), live_provider_test: false, response_source: "Authored test-only prose validated against real server-built evidence; no Gemini request", scenarios: Object.keys(fixtures), passed: results.filter((item) => item.passed).length, failed: results.filter((item) => !item.passed).length, tests: results };
  await mkdir(path.join(root, "../../docs/qa"), { recursive: true });
  await writeFile(path.join(root, "../../docs/qa/gemini-output-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`${report.failed ? "FAIL" : "PASS"}: ${report.passed}/${results.length} AI output checks across ${report.scenarios.length} scenarios. Live Gemini not exercised.`);
  if (report.failed) process.exitCode = 1;
} finally {
  if (originalMode === undefined) delete process.env.GALI_DATA_MODE; else process.env.GALI_DATA_MODE = originalMode;
  await rm(directory, { recursive: true, force: true });
}
