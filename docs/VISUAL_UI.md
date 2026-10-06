# Visual interface — 0.4.3

The GALI interface uses eleven coordinated, transparent illustrations in its existing navy, amber, cyan, and white palette. Text, labels, metric values, charts, tables, and scenario results remain native application elements.

| Illustration | Where it appears | Interactive context |
| --- | --- | --- |
| Mine cutaway | Landing, dashboard, issuer overview, comparison | Reserve, cost, and license hotspots; issuer data |
| Reserve value | Dashboard and issuer metrics | The active dataset's reserve-backed-value proxy |
| Reserve clock | Reserve life cards and methodology | Remaining reserves divided by annual production |
| Coal tonne | Unit economics and price research | Issuer selector updates realized price, cash cost, and gross margin |
| License window | License metrics and research | Exposure remains a measured input; scenario link opens the license assumption |
| Export containers | Export research and operating context | Existing destination stress analysis |
| Scenario drivers | Scenario Studio | Native price, market-demand, and license controls continue to calculate results |
| Operating site | Map's selected-site detail and operations | An illustrative scene accompanies the selected site's actual dataset coordinates |
| Valuation lenses | Valuation page and issuer valuation | Issuer selector; common-currency market and model values; missing values retained |
| Data modules | Coverage and score diagnostics | Completeness and weighted score coverage stay distinct |
| Evidence desk | Data Assistant | Deterministic research answers and source references |

## Assets

Original transparent PNG files are in `assets/illustrations/`. The web interface serves optimized transparent WebP files from `packages/web/public/visuals/`. Prompts and dimensions are recorded in `docs/visual-assets/`.

To rebuild the web assets after replacing a PNG, first install web dependencies and then run from the project root:

```bash
npm run setup
node scripts/build-visual-assets.mjs
```

Illustrations are conceptual assets, not mine photographs or calibrated data charts. Numeric charts use the actual model outputs. Decorative illustrations are hidden from assistive technology; buttons, labels, data, and explanations remain accessible HTML. Reduced-motion settings are respected.

Verification results are recorded in `VISUAL_VERIFICATION.md`.

## Geographic map

The map is rendered interactively with MapLibre and actual Natural Earth country geometry. It supports zoom, pan, regional groups, filtering, site selection, and dataset-coordinate markers. The default basemap is bundled locally and requires no map token or network tile request. Optional **Street detail** loads OpenStreetMap viewport tiles when online and returns to bundled geography if tiles fail. A geographic SVG fallback uses the same source geometry when WebGL is unavailable. Source and license details are in `MAP_SOURCES.md`.

Selected-site artwork accompanies the map and never replaces its geography. The active endpoint supplies site positions; country borders do not represent mining-license boundaries. The bundled basemap provides regional context. Online street detail uses the selected tile provider; satellite imagery is not included.
