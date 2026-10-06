# GALI 0.5.1: AI output review

This review checks how grounded responses are validated, displayed, linked, and exported. It exercises eight response scenarios with authored test-only prose and actual evidence built by GALI's server. No live Gemini request or user service account was used. The screenshots show these test responses, not observed Gemini generations.

## Scenarios exercised

| Scenario | What the check establishes |
| --- | --- |
| BUMI and BYAN comparison | Supplied cost, margin, reserve-life, destination, and license values resolve into a balanced answer with individual citations. An Indonesian question can be displayed while the tested response remains in English. |
| Active ITMG scenario | Calculated drivers, revenue/costs, sensitivity, and assumptions are cited. Opening issuer-specific evidence retains ITMG and the same Scenario Studio parameters. |
| Severe BUMI downside | A negative gross-profit value remains negative. RBV's zero floor remains separate from the positive gross-loss magnitude. |
| Partial PTBA and DSSA data | Missing metrics remain `Unavailable`, the answer displays an insufficient-data notice, and available observations do not become a complete comparison or rank. |
| Provisional ADMR score | Weight coverage remains an input-coverage measure. ADMR remains excluded from the complete-score ordering. |
| Dashboard resilience brief | Price, China-demand, and license tests remain separate. Complete-core model aggregation and complete-score eligibility remain distinct. |
| Live-market question | An out-of-scope response explains that current news and prices are unavailable, rather than supplying fabricated external facts. |
| Maximum-layout stress | Long unbroken titles/questions, a long paragraph, six findings, multiple references, and three follow-ups wrap without horizontal overflow. This deliberately artificial case tests layout limits. |

The provider contract tests also reject invalid JSON, invented evidence IDs, uncited numeric placeholders, raw numerical assertions, links/HTML, excessive text, Markdown decorations, concealed directional formatting, and incomplete answered research briefs. Repeated follow-up questions are reduced to one displayed question. Whitespace normalization preserves words and resolved metric values.

## Corrections made during testing

- Issuer scenario evidence previously opened the shared scenario without its issuer selection, allowing ITMG evidence to open BUMI. Every issuer-specific scenario reference now carries the relevant issuer and its original assumptions.
- Method references previously shared the same evidence label. Each method now has a distinct readable name, such as **RBV model boundaries** or **Driver attribution order**.
- Long unbroken text could extend outside the answer header. Headers, claims, evidence, and user-question text now wrap inside the available width.
- On small screens, the export button competed with the title. Its labeled download icon preserves title space; the full button label remains visible on larger screens.
- New responses scroll the assistant content to the latest answer, including after a follow-up. Earlier turns remain available in collapsed entries.
- Markdown downloads now retain the answer's limited-data/scope status and finding categories, as well as the exact metrics, citations, snapshot, and dataset provenance.
- The system instruction now asks for a short direct summary, compact findings that explain mechanisms, distinct next questions, and currency/units supplied by placeholders without duplicating them.

## Verification results

- **39 contract checks passed:** 24 existing AI integration checks and 15 output checks across eight scenarios.
- **29 focused browser checks passed:** 20 output/readability cases and nine existing Gemini integration cases on a production build.
- Desktop at **1440 px**, mobile at **390 px**, and a narrow **320 px** viewport were exercised. Expanded evidence and follow-up conversation layouts were checked for overflow and browser errors.
- TypeScript, ESLint, and the Next.js production build passed.
- A separate test-runner isolation check passed with Gemini enabled and deliberately invalid credential configuration in the parent environment; the launched browser test server correctly disabled provider access without loading that configuration.
- The **99 protected model, API, pipeline, and dataset files remained unchanged**. Browser JavaScript was checked for credential/authentication/system-prompt markers.

Machine-readable output results are in `docs/qa/gemini-output-contract.json`, `docs/qa/gemini-output-browser.json`, `docs/qa/ai-output-integrity.json`, and `docs/qa/ai-browser-runner-isolation.json`. The existing integration report is `docs/qa/gemini-unit-verification.json`. The prior full-app regression and formula verification remain documented in `GEMINI_VERIFICATION.md`.

Representative screenshots are in `docs/screenshots/ai-output-*.png`. The selected assistant responses, partial-data evidence, and ITMG scenario brief are captured from the actual application in Chromium.

## Repeat locally

Install dependencies with `npm run setup`. Run `npm run test:ai` from the project root to regenerate the test fixtures from active server evidence and run both contract suites. Browser checks require Playwright's Chromium:

```bash
cd packages/web
npx playwright install chromium
npm run demo:build
npm run test:local -- gemini.spec.ts gemini-output.spec.ts
```

The browser runner disables the real Gemini provider for the server it launches, even when a local service account is configured; configured-provider cases explicitly intercept test responses. Stop a separately running app before these browser checks so Playwright launches its own test server. The suite does not incur Gemini generation calls or require adding a mock mode to the application. This test-server setting does not change normal `npm run dev` behavior.

## Evaluate actual Gemini responses locally

Follow `GEMINI_SETUP.md`, run `npm run dev` from the root, and select **Test connection**. Then ask the following questions through **Gemini analysis** or generate a brief with the stated Scenario Studio settings. An error is a failed connection or generation, not a successful analysis. Each successful analysis sends a real provider request unless a matching answer is cached.

| Question / action | What to inspect in the live response |
| --- | --- |
| `Compare BUMI and BYAN's strengths and risks.` | Direct comparison; costs match GALI; an operating mechanism and counterargument are explained; a valuation conclusion respects RBV limitations. |
| `Bandingkan kekuatan dan risiko BUMI dengan BYAN.` | The response remains in English and interprets the intended comparison. |
| Select ITMG, price -20%, China volume reduction 30%, discount rate 16%, variable-cost share 50%, license expiry on; generate the scenario brief. | Drivers match the displayed scenario; assumptions are identified; evidence links reopen ITMG and those settings. |
| Select BUMI, price -50%, China volume reduction 50%, discount rate 16%, variable-cost share 50%, license expiry on; generate the scenario brief. | The explanation distinguishes negative gross profit, gross loss, and floored RBV. It does not interpret a zero valuation as absence of operating risk. |
| `Can I compare PTBA and DSSA on cost and reserve value?` | Missing inputs remain unavailable; available metrics are distinguished from a complete comparison; next steps identify what needs verification. |
| `Can ADMR receive a complete score rank?` | Provisional eligibility and the missing contractor pillar are explained. Weight coverage is never described as investment success or statistical confidence. |
| Generate the dashboard AI brief. | The three stress tests remain separate; aggregation scope, ownership overlap, and model limits are acknowledged. |
| `What is BYAN's latest news and current share price?` | Current external facts are identified as outside the active dataset. No invented news, prices, source links, or browsing claims appear. |
| Click a suggested follow-up, expand evidence, then save the brief. | The latest answer is visible; the follow-up retains relevant context; citations resolve; the download preserves status, categories, and exact evidence values. |

A good live answer states the conclusion early, explains why the numbers matter, includes a material counterargument or limit, and proposes a concrete research step. It should avoid repeated sentences, duplicated units, raw JSON/Markdown, unsupported rankings, and invented facts. Exact wording will vary.

The automated checks verify layout and structural/numeric safeguards for the tested inputs. They do not prove that Gemini will choose the right qualitative explanation or cite the most relevant evidence. Live English consistency, analytical depth, factual interpretation, latency, IAM access, cloud quotas, and model availability remain to be evaluated with the user's service account.
