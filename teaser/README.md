# GALI teaser: "Dig deeper than the ticker"

A 60-second, 16:9 motion-graphics teaser for GALI, aimed at investors and analysts who value
Indonesian coal issuers listed on the IDX.

- **Player:** `GALI-Teaser.html`, a single self-contained file that plays offline. Fonts, logo,
  music, data and map geometry are all embedded.
- **Video:** `GALI-Teaser-60s.mp4`, 1920 × 1080, 30 fps, H.264 + AAC stereo, 60.0 s.

## Preview

Open `GALI-Teaser.html` in Chrome or Edge and press **Play**.

- **Seek:** drag the slider, or press ← / → to move ±1 s.
- **Play / pause:** press Space.
- **Start at a time:** append `?t=` to the URL, e.g. `GALI-Teaser.html?t=30`.
- **Presenting:** use **Fullscreen**.

## Story (cuts at 0 · 8 · 18 · 30 · 45 · 55 s)

| Time | Chapter | What the viewer learns |
| --- | --- | --- |
| 0:00–0:08 | The question | `ADRO` is "four letters and a price". The camera dives underground into four strata: reserves, licenses, margins, exports. |
| 0:08–0:18 | Who it's for · the problem | Built for investors and analysts. The strata morph into the four questions every coal investor asks, then the cards drift apart to show that the answers sit in disconnected sources. |
| 0:18–0:30 | Meet GALI | The cards collapse into the GALI logo. A Natural Earth map shows 52 GPS-tagged sites for 9 issuers, then zooms into Kalimantan and traces ADRO → operating companies (with effective ownership) → mine sites. |
| 0:30–0:45 | The answers | Q1: reserve clock, 16.2 yrs vs 4.2 market-implied. Q2: GEMS license cliff, 100% of licensed area expiring ≤3 yrs. Q3: national cash-cost curve with ADRO's 41% price cushion. Q4: export arcs to Japan, China and the Philippines. |
| 0:45–0:55 | Scenario Studio | Coal price −20% plus China demand −30%. Reserve-backed value (RBV) moves and the ranking re-sorts: ADRO $10.48B → $7.58B (−27.7%) and AADI rises to #1. |
| 0:55–1:00 | Close | GALI · "Dig deeper than the ticker." · gali-web.vercel.app · disclaimer. |

## Where the content comes from

- **Numbers:** `data/film-data.json`, a snapshot of the live GALI API (`/v1/issuers`,
  `/v1/issuers/{symbol}`, `/v1/issuers/ADRO/graph`, `/v1/cost-curve`, `/v1/sites`,
  `/v1/coverage` and `POST /v1/scenario`), as of 2 Oct 2026, run `ac225487`. Nothing in the
  film is hard-coded. Every figure, label, ranking and site position is computed from this file.
- **Map:** `data/geo.json`, Natural Earth country outlines (public domain, via `world-atlas@2`)
  in Web Mercator. Indonesia and its neighbours use 1:10m detail; the rest of Asia uses 1:50m.
  Mine markers use the coordinates returned by `/v1/sites`.
- **Export arcs:** these show each issuer's top destination and its share, which is what the app
  exposes. They are not full shipping routes.
- **Rights:** the music is original (`tools/compose_audio.py`). Fonts are Inter and JetBrains Mono
  (SIL OFL, see `licenses/`). The logo is the GALI project asset.

## Edit

| What | Where |
| --- | --- |
| Timeline, copy, layout, animation | `src/film.js`. `CUTS`, `QUESTIONS` and one function per scene. `renderFrame(t)` is deterministic. |
| Player UI | `src/player.html` |
| Music | `tools/compose_audio.py`. Keep its `CUTS` in sync with `film.js`. |

After editing, rebuild with `npm run build`.

## Commands

Prerequisites: Node 20+, FFmpeg on PATH, and Python 3 for the data and music steps.

```bash
npm install
npx playwright install chromium

npm run build    # assemble GALI-Teaser.html from src/ + assets/ + data/
npm run qa       # render every 0.2 s headlessly: page errors, text overflow/off-screen,
                 # overlapping text; key frames → qa/frames, report → qa/qa-report.json
npm run render   # export GALI-Teaser-60s.mp4 (≈6 min; frame-exact, independent of machine speed)
npm run data     # refresh data/*.json from the live API (needs network)
npm run music    # regenerate assets/GALI-Score.mp3 (needs numpy + scipy)
```

## QA status

The last `npm run qa` gave 0 page errors and 0 text overflow or off-screen warnings across
300 samples. It reports 5 overlaps, all of them intended:

- The four overlaps at 50 s are rows sliding past each other while the ranking re-sorts.
- The one at 16.8 s is a false positive caused by rotated cards.

`qa/contact-sheet.png` shows the encoded MP4 every 3 s. The audio integrates at about −18 LUFS,
with true peak around −3 dBFS.

> GALI is an analytics tool on public data. It is not investment advice.
