// Timeline QA: renders the built player headlessly and checks every sampled frame for
// page errors, text overflow / off-screen text and overlapping text, then saves key frames.
// Usage: node tools/qa.mjs [--step 0.2] [--frames 2,5.5,12] [--sheet]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const step = parseFloat(arg('--step', '0.2'));
const defaultFrames = [1.5, 3.2, 6.6, 9.8, 12.4, 16.2, 19.9, 23.0, 26.0, 28.8, 32.6, 36.4, 40.4, 43.9, 47.2, 51.6, 54.2, 58.4];
const frames = (arg('--frames', '') || '').split(',').filter(Boolean).map(Number);
const keyFrames = frames.length ? frames : defaultFrames;
const outDir = path.join(root, 'qa');
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.join(root, 'GALI-Teaser.html')).href);
await page.evaluate(() => window.__ready);
const { duration } = await page.evaluate(() => window.filmInfo);

const warnings = new Map(), overlaps = new Map();
for (let t = 0; t <= duration - 0.01; t += step) {
  const r = await page.evaluate(time => { window.renderFrame(time); return window.__qa(); }, t);
  for (const w of r.warnings) {
    const key = `${w.type}: ${w.str}`;
    if (!warnings.has(key)) warnings.set(key, { ...w, first: +t.toFixed(2) });
  }
  const boxes = r.boxes.filter(b => b.a > 0.55 && b.str.trim());
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ix <= 2 || iy <= 2) continue;
    const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    if (ix * iy < small * 0.12) continue;
    const key = [a.str, b.str].sort().join('  ⟷  ');
    if (!overlaps.has(key)) overlaps.set(key, +t.toFixed(2));
  }
}
for (const t of keyFrames) {
  await page.evaluate(time => window.renderFrame(time), t);
  await page.locator('#film').screenshot({ path: path.join(outDir, 'frames', `t${String(t.toFixed(1)).padStart(4, '0')}.png`) });
}
await browser.close();

const report = {
  duration, step, samples: Math.ceil(duration / step), page_errors: errors,
  text_warnings: [...warnings.values()],
  text_overlaps: [...overlaps.entries()].map(([pair, first]) => ({ pair, first })),
  key_frames: keyFrames,
};
fs.writeFileSync(path.join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log(`Samples ${report.samples} | page errors ${errors.length} | text warnings ${report.text_warnings.length} | overlaps ${report.text_overlaps.length}`);
for (const w of report.text_warnings) console.log('  WARN', JSON.stringify(w));
for (const o of report.text_overlaps) console.log('  OVERLAP', o.first, o.pair);
for (const e of errors) console.log('  ERROR', e);
