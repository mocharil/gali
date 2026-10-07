# Loading feedback: version 0.5.2

GALI now acknowledges navigation and pending work in the same amber, cyan, navy, and white visual language as the rest of the interface. All new user-facing labels are in English.

| Action | Feedback while work is pending |
| --- | --- |
| Navigation through the sidebar, cards, mobile menu, evidence links, or search | Amber progress bar and destination label; sidebar links also display a spinner. |
| Initial dashboard, issuer, coverage, cost curve, or valuation data | Named loading panel with skeleton cards and chart/table placeholders. |
| Compare issuer selection | Comparison controls stay available; the results panel names both issuers until their data is ready. |
| Scenario assumptions and research matrix | Calculation message and skeleton results; scenario CSV export is disabled while results are stale. |
| Retry a failed data request | Busy retry button and global data activity until the request completes. |
| Copy links or coordinates | Busy, disabled button until the clipboard promise settles; existing success/failure messages remain available. |
| CSV or research-brief export | Preparation label, spinner, and duplicate-click protection while the file is generated. |
| Print an issuer page | Preparation feedback before calling the browser print dialog. |
| Gemini analysis or connection check | Local feedback and global activity; Stop and Close cancel the analysis and clear its indicator. |
| Geographic map initialization or online street detail | Map-specific progress message; unavailable or timed-out rendering returns to bundled geography. |

The global provider survives page and panel changes. String-based internal links start their router transition there, so closing a mobile menu or assistant cannot remove the loading indicator. Next Link still renders the anchor, handles prefetch, and filters modified, external, and download clicks. Query fetching is tracked through the query client, including background refreshes. Concurrent actions have separate cleanup functions so completing one action cannot hide another pending operation.

Busy buttons expose `aria-busy`, reject duplicate submissions, and return to an enabled state after success or failure. Status messages use polite live regions. Motion is reduced when the operating system requests it. Immediate operations, such as expanding a menu, sorting loaded rows, or opening a help tooltip, keep their immediate visual response.

No artificial wait or percentage is added to navigation and network work. File preparation yields one animation frame before serialization so its loading state can paint. This acknowledges generation of the file; it does not track how long a person keeps a print dialog open or whether they save a downloaded file. Map initialization has a 10-second deadline; the initial street-tile request has a 15-second deadline, followed by a geographic fallback and explanatory message.

## Verification

`packages/web/e2e/loading.spec.ts` exercises delayed route responses and data requests, overlapping issuer requests, rapid menu changes, browser history, modified clicks, a menu and assistant closing during navigation, scenario calculations, retry recovery, clipboard promises, export failure, print preparation, Gemini cancellation, unavailable street tiles, and mobile reduced-motion rendering. Held data responses continue to the real local API after release. AI browser responses are isolated fixtures; the test server disables live Gemini calls.

The machine-readable results are in `docs/qa/loading-browser-regression.json`. Actual desktop and mobile screenshots are in `docs/screenshots/loading-*.png`. Dataset and calculation-source hashes are checked separately in `docs/qa/loading-integrity.json`.

Verified on October 6, 2026: all 19 loading cases and 55 existing browser regression cases passed on the current application build. The first full run exposed an assertion that expected an upstream error detail rather than GALI's existing normalized error text; correcting that test expectation and rerunning the 19 loading cases produced zero failures. TypeScript, ESLint, the production build, and 39 AI contract/output checks passed. All 99 protected data and calculation source files retain their recorded hashes, and the production client bundle contains none of the checked server credential or authentication markers.

From the project root:

```bash
npm run setup
npm run build
npx --prefix packages/web playwright install chromium
npm run test:loading
```

The targeted command starts a local production server automatically. `npm run test:local` runs the complete local browser suite. `PLAYWRIGHT_EXTERNAL_SERVERS=1` uses an already-running server, and `PLAYWRIGHT_USE_DEV=1` selects development mode instead. Type checking and linting can be run from `packages/web` with `npm run typecheck` and `npm run lint`.

Implementation references: [Next Link](https://nextjs.org/docs/15/app/api-reference/components/link), [React useTransition](https://react.dev/reference/react/useTransition), and [TanStack useIsFetching](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useIsFetching).
