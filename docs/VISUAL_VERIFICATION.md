# Visual interface verification — 0.4.3

Verified on 6 October 2026 using a production build and the bundled dataset.

## Results

- Production build, TypeScript, and ESLint: passed.
- Browser suite: 26 passed; 0 failed, skipped, or flaky.
- Eleven features inspected at 1440×1000 and 390×844; all illustrated assets loaded, with no horizontal document overflow, failed responses, or JavaScript page errors in those captures.
- Existing responsive tests also cover 1440×900, 1280×800, 768×1024, and 390×844.
- Model checks: 15 Python-reference scenarios and 2,700 field comparisons passed; English research routing, ranking eligibility, traceability, and numeric/source integrity passed.
- Ninety-nine protected model, API, pipeline, and simulation files are byte-identical to version 0.4.2.
- Eleven PNG source illustrations and eleven optimized transparent WebP assets are included. WebP assets total 2,517,926 bytes.

## Meaningful interaction checks

Mine hotspots change their explanation; the license link opens the actual license scenario. Unit economics and valuation examples follow issuer selection, preserve missing inputs, and match the active API fields. Scenario outputs, exports, and refresh persistence remain covered by the existing suite.

The map renders in MapLibre, with a nonzero canvas, exact dataset-coordinate markers, counts derived from the filtered sites, working zoom/pan, and a national-view reset. The geographic SVG fallback is tested with WebGL disabled. Online tile failures return to bundled geography. Default local-map navigation makes no external HTTP requests; browser-local blob worker resources are not external requests.

Online OpenStreetMap tile requests are intercepted in automated tests. This verifies opt-in behavior and failure recovery; it does not constitute an end-to-end availability test of the public tile service. No public deployment or authenticated Sectors live-data integration was changed or tested in this release.

## Reproduce

```bash
npm run setup
npm --prefix packages/web run demo:build
npm --prefix packages/web run typecheck
npm --prefix packages/web run lint
npm run test:analysis
npm --prefix packages/web exec playwright install chromium
npm run test:local
```

Structured results, the asset manifest, generation prompts, and protected-file hashes are in `docs/visual-assets/`.
