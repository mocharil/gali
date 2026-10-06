# GALI 0.4.2: English interface

GALI uses English throughout its research workflow while retaining its navy, amber, and cyan palette and local Plus Jakarta Sans typography.

| Surface | Consistent English behavior |
|---|---|
| Navigation | Sidebar, header, landing navigation, feature search, and footer use English page names and descriptions. |
| Dashboard | Summary cards, research filters, complete/provisional score labels, resilience findings, and disclosures use the same metric terminology. |
| Issuer profiles | Overview, Valuation, Operations, and Score & coverage tabs; English metric help, findings, license tables, and model explanations. |
| Map | English site and province captions, combined filters, selection details, accessible marker labels, coordinate actions, and empty states. |
| Data Assistant | English example questions and deterministic answers, including reserve-life, cost, license, valuation, and destination intents. Unsupported questions receive an English explanation. |
| Evidence and coverage | English source descriptions, archetypes, missing-data explanations, coverage entries, and quality labels. |
| Exports | English research briefs, CSV headings, quality labels, company captions, and assumption descriptions. |
| Locale | Document language `en`, metadata locale `en_US`, and explicit `en-US` date/number formatting. |

Human-readable dataset labels are translated on a presentation copy in `packages/web/lib/presentation.ts`. Original source files, identifiers, upstream quality enums, numerical values, booleans, and missing values retain their values. Calculations continue to use the existing engine and data contracts. Legal company names are preserved.

The map retains the server loading state until its component finishes hydration, using the same shared hydration guard as the issuer universe. This prevents a fast local dataset response from changing the initial rendered map before hydration completes.

## Verification

Production build, TypeScript, ESLint, research tests, browser flows, English copy checks, and visual checks are recorded in `english-qa-summary.json`. The browser suite covers navigation, all research pages, four responsive viewport sizes, profile tabs and help, assistant routing, evidence, error/empty states, CSV and research-brief downloads, map filters, and repeated map navigation.

`english-data-integrity.json` records the comparison against version 0.4.1. Protected data, core, and API files and the bundled frontend dataset remain byte-identical. The presentation test checks every numeric, boolean, and null value after translation and confirms that the source dataset is not mutated.

Screenshots are in `screenshots/`; visual measurements are in `english-visual-qa.json`. Checks use the local simulation dataset. Live Sectors integration and public deployment were not part of this update.

## Run locally

From the project root:

```bash
npm run local
```

Open http://localhost:3000. Windows users can run `START_GALI.cmd`. From `packages/web`, run `npm ci`, then `npm run local`.
