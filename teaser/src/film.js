/* GALI teaser — 60 s deterministic motion graphics.
 * renderFrame(t) draws any instant of the film; nothing depends on wall-clock time.
 * Every number comes from window.GALI_DATA (data/film-data.json, a snapshot of the
 * GALI API) and every coastline from window.GALI_GEO (Natural Earth, data/geo.json). */
'use strict';
(() => {
const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 1920, H = 1080, FPS = 30, DURATION = 60;
const CUTS = [0, 8, 18, 30, 45, 55, 60];
const CHAPTERS = ['THE QUESTION', 'WHO IT’S FOR', 'MEET GALI', 'THE ANSWERS', 'SCENARIO STUDIO', ''];
const D = window.GALI_DATA, GEO = window.GALI_GEO;
const C = {
  bg: '#060911', panel: '#0b1220', panel2: '#101a2b', line: '#1e293b', line2: '#2b3a52',
  white: '#f1f5f9', text: '#cbd5e1', muted: '#94a3b8', dim: '#64748b',
  gold: '#fbbf24', amber: '#f59e0b', cyan: '#22d3ee', emerald: '#34d399', rose: '#fb7185', indigo: '#818cf8', sky: '#93c5fd',
};
const ISSUER_COLOR = { ADRO: C.gold, BYAN: C.cyan, ITMG: C.emerald, BUMI: C.indigo, DSSA: C.rose, PTBA: C.sky };
const SANS = 'Inter, Arial, sans-serif', MONO = '"JetBrains Mono", Consolas, monospace';

// ── Data ─────────────────────────────────────────────────────────────────────
const issuer = s => D.issuers.find(i => i.symbol === s);
const ADRO = issuer('ADRO'), GEMS = issuer('GEMS'), ITMG = issuer('ITMG'), BYAN = issuer('BYAN');
const asOf = new Date(D.as_of + 'T00:00:00Z');
const NOW_YEAR = asOf.getUTCFullYear() + (asOf - Date.UTC(asOf.getUTCFullYear(), 0, 1)) / 31536e6;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const AS_OF_LABEL = `${String(asOf.getUTCDate()).padStart(2, '0')} ${MONTHS[asOf.getUTCMonth()]} ${asOf.getUTCFullYear()}`;
const BENCH = D.cost_curve.benchmark_price_usd;
const CUSHION = 1 - ADRO.breakeven_benchmark_price_usd / BENCH;
const QUESTIONS = [
  { key: 'RESERVES', color: C.cyan, q: 'How long can reserves sustain production?', source: 'Production & reserve reports' },
  { key: 'LICENSES', color: C.rose, q: 'When do mining licenses expire?', source: 'MEMR license registry' },
  { key: 'MARGINS', color: C.gold, q: 'Can margins survive a coal price drop?', source: 'Financial statements' },
  { key: 'EXPORTS', color: C.indigo, q: 'What if a key export market pulls back?', source: 'Sales-destination records' },
];
const adroSites = D.sites.filter(s => s.issuer === 'ADRO');
const adroCompanies = new Set(adroSites.map(s => s.company)).size;
const siteCount = sym => D.sites.filter(s => s.issuer === sym).length;
const pct1 = v => `${v.toFixed(1)}%`;
const usdB = v => `$${(v / 1e9).toFixed(2)}B`;
const SCN = (() => {
  const a = D.scenarios['price_-20'], b = D.scenarios['price_-20_china_-30'];
  return a.map(r => {
    const x = b.find(y => y.symbol === r.symbol);
    return { sym: r.symbol, base: r.baseline_rbv_usd, p20: r.post_shock_rbv_usd, both: x.post_shock_rbv_usd, r0: r.baseline_rank, r1: x.post_shock_rank };
  }).sort((p, q) => p.r0 - q.r0);
})();
const COST = [...D.cost_curve.points].sort((a, b) => a.cash_cost_per_ton_usd - b.cash_cost_per_ton_usd);

// ── Math & easing ────────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const out3 = t => 1 - Math.pow(1 - clamp(t), 3);
const out5 = t => 1 - Math.pow(1 - clamp(t), 5);
const inOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const outBack = t => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const at = (T, start, dur = .7, fn = out3) => fn(clamp((T - start) / dur));
const win = (T, a, b, fi = .45, fo = .45) => Math.min(inv(a, a + fi, T), 1 - inv(b - fo, b, T));
const fract = x => x - Math.floor(x);
const rand = n => fract(Math.sin(n * 127.13 + 91.7) * 43758.5453);
const rgba = (hex, a) => { const h = hex.slice(1); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${clamp(a)})`; };

// ── QA registry: every text box drawn in a frame, plus overflow warnings ──────
let qaBoxes = [], qaWarnings = [];
function register(str, x0, y0, x1, y1, max, w) {
  const m = ctx.getTransform(), a = ctx.globalAlpha;
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const box = { str, a, x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
  if (a > .05) qaBoxes.push(box);
  if (max && w > max + 1) qaWarnings.push({ type: 'overflow', str, width: Math.round(w), max });
  if (a > .3 && (box.x0 < 36 || box.x1 > W - 36 || box.y0 < 24 || box.y1 > H - 16)) qaWarnings.push({ type: 'offscreen', str, box: [box.x0, box.y0, box.x1, box.y1].map(Math.round) });
}

// ── Drawing primitives ───────────────────────────────────────────────────────
function font(size, weight, mono) { return `${weight} ${size}px ${mono ? MONO : SANS}`; }
function txt(str, x, y, o = {}) {
  const size = o.size || 28, weight = o.weight || 400;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = font(size, weight, o.mono);
  ctx.letterSpacing = `${o.ls || 0}px`;
  ctx.fillStyle = o.color || C.white;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 30; }
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  const left = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  register(str, left, y - size * .76, left + w, y + size * .22, o.max, w);
  ctx.restore();
  return w;
}
function measure(str, size, weight = 400, mono = false, ls = 0) {
  ctx.save(); ctx.font = font(size, weight, mono); ctx.letterSpacing = `${ls}px`;
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
function wrap(str, max, size, weight = 400) {
  const words = str.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, size, weight) > max) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(str, x, y, max, o = {}) {
  const lh = o.lh || (o.size || 28) * 1.3;
  wrap(str, max, o.size || 28, o.weight || 400).forEach((l, i) => txt(l, x, y + i * lh, { ...o, max }));
}
// Headline line that rises into place.
function rise(str, x, y, T, start, o = {}) {
  const p = at(T, start, o.dur || .8, out5);
  if (p <= 0) return;
  ctx.save();
  ctx.translate(0, (1 - p) * (o.size || 80) * .45);
  txt(str, x, y, { ...o, alpha: (o.alpha ?? 1) * p });
  ctx.restore();
}
function rr(x, y, w, h, r, fill, stroke, lw = 1.5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function seg(x1, y1, x2, y2, color, w = 1, dash) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function dot(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function glow(x, y, r, color, a = .16) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function chip(str, x, y, color, o = {}) {
  const size = o.size || 17, ls = o.ls ?? 2, padX = o.padX || 16, h = o.h || size + 20;
  const w = measure(str, size, 700, o.mono, ls) + padX * 2 - ls;
  const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  rr(left, y, w, h, h / 2, rgba(color, o.fillA ?? .10), rgba(color, o.strokeA ?? .38), 1.2);
  txt(str, left + padX, y + h / 2 + size * .36, { size, weight: 700, color, ls, mono: o.mono });
  ctx.restore();
  return w;
}
function label(str, x, y, color = C.gold, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  seg(x, y - 6, x + 30, y - 6, color, 2);
  txt(str, x + 44, y, { size: 18, weight: 700, color, ls: 3.2 });
  ctx.restore();
}
const logo = new Image();
logo.src = window.GALI_LOGO;
function drawLogo(cx, cy, h, alpha = 1) {
  if (!logo.complete || alpha <= 0) return;
  const w = h * 420 / 509;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h); ctx.restore();
}
function curve(points, color, width, progress = 1) {
  const n = points.length - 1, f = clamp(progress) * n, whole = Math.floor(f);
  if (n < 1 || progress <= 0) return;
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i <= whole; i++) ctx.lineTo(...points[i]);
  if (whole < n) { const a = points[whole], b = points[whole + 1]; ctx.lineTo(lerp(a[0], b[0], f - whole), lerp(a[1], b[1], f - whole)); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function bez(p0, c, p1, u) {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]];
}
function pointer(x, y, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(20, 33); ctx.lineTo(14, 21); ctx.lineTo(24, 21); ctx.closePath();
  ctx.fillStyle = C.white; ctx.fill(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}

// ── Background & chrome ──────────────────────────────────────────────────────
function background(T) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  glow(1500 + Math.sin(T * .13) * 120, 260, 820, C.cyan, .05);
  glow(260 + Math.cos(T * .11) * 80, 900, 760, C.amber, .055);
  ctx.fillStyle = 'rgba(148,163,184,.055)';
  for (let y = 36; y < H; y += 48) for (let x = 36; x < W; x += 48) ctx.fillRect(x, y, 1.6, 1.6);
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function chrome(T, scene) {
  const a = win(T, .8, 55.2, .6, .5);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  drawLogo(112, 62, 38);
  txt('GALI', 140, 74, { size: 26, weight: 800, ls: 1.5 });
  seg(222, 50, 222, 78, C.line2, 1.5);
  txt(CHAPTERS[scene], 240, 72, { size: 16, weight: 600, color: C.muted, ls: 3 });
  txt(`DATA: SECTORS API · AS OF ${AS_OF_LABEL}`, 1824, 72, { size: 15, weight: 600, color: C.dim, ls: 2.4, align: 'right' });
  const x0 = 96, x1 = 1824, y = 1040, span = x1 - x0;
  for (let i = 0; i < CUTS.length - 1; i++) {
    const a1 = x0 + span * CUTS[i] / DURATION + (i ? 4 : 0), b1 = x0 + span * CUTS[i + 1] / DURATION - 4;
    rr(a1, y, b1 - a1, 3, 1.5, 'rgba(43,58,82,.8)');
    const fill = clamp((T - CUTS[i]) / (CUTS[i + 1] - CUTS[i]));
    if (fill > 0) rr(a1, y, (b1 - a1) * fill, 3, 1.5, i === scene ? C.gold : rgba(C.gold, .55));
  }
  ctx.restore();
}

// ── Map: Natural Earth outlines in Web Mercator (1 world unit = 1° longitude) ──
const merc = (lon, lat) => [lon, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI];
const land = { indo: new Path2D(), kal: new Path2D(), other: new Path2D() };
for (const c of GEO.countries) {
  c.rings.forEach((r, k) => {
    const target = c.id === '360' ? (c.kal[k] ? land.kal : land.indo) : land.other;
    target.moveTo(r[0] / 100, r[1] / 100);
    for (let i = 2; i < r.length; i += 2) target.lineTo(r[i] / 100, r[i + 1] / 100);
    target.closePath();
  });
}
const VIEW = {
  indo: { c: merc(117.6, -2.3), z: 29.5, ox: 1150, oy: 590 },
  kal: { c: merc(115.3, -1.45), z: 150, ox: 1270, oy: 575 },
  asia: { c: merc(121, 13.5), z: 15.5, ox: 1240, oy: 610 },
};
function blendView(a, b, t) {
  const e = inOut(t);
  return { c: [lerp(a.c[0], b.c[0], e), lerp(a.c[1], b.c[1], e)], z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)), ox: lerp(a.ox, b.ox, e), oy: lerp(a.oy, b.oy, e) };
}
function camera(T) {
  if (T < 24) { const v = VIEW.indo; return { ...v, z: v.z * (1 + (T - 21) * .006) }; }
  if (T < 26.6) return blendView({ ...VIEW.indo, z: VIEW.indo.z * 1.018 }, VIEW.kal, (T - 24) / 2.6);
  if (T < 41.3) { const v = VIEW.kal; return { ...v, z: v.z * (1 + (T - 26.6) * .0035) }; }
  if (T < 42.9) return blendView({ ...VIEW.kal, z: VIEW.kal.z * (1 + 14.7 * .0035) }, VIEW.asia, (T - 41.3) / 1.6);
  return { ...VIEW.asia, z: VIEW.asia.z * (1 + (T - 42.9) * .006) };
}
const toScreen = (cam, lon, lat) => { const [x, y] = merc(lon, lat); return [cam.ox + (x - cam.c[0]) * cam.z, cam.oy + (y - cam.c[1]) * cam.z]; };

function drawLand(cam, T, kalGlow) {
  ctx.save();
  ctx.setTransform(cam.z, 0, 0, cam.z, cam.ox - cam.c[0] * cam.z, cam.oy - cam.c[1] * cam.z);
  const lw = 1.1 / cam.z;
  // graticule every 5°
  ctx.strokeStyle = 'rgba(148,163,184,.07)'; ctx.lineWidth = lw;
  ctx.beginPath();
  for (let lon = 60; lon <= 160; lon += 5) { ctx.moveTo(lon, -60); ctx.lineTo(lon, 30); }
  for (let lat = -25; lat <= 55; lat += 5) { const y = merc(0, lat)[1]; ctx.moveTo(55, y); ctx.lineTo(165, y); }
  ctx.stroke();
  ctx.fillStyle = '#111a28'; ctx.fill(land.other);
  ctx.strokeStyle = 'rgba(148,163,184,.28)'; ctx.lineWidth = lw; ctx.stroke(land.other);
  ctx.fillStyle = '#17263a'; ctx.fill(land.indo); ctx.fill(land.kal);
  if (kalGlow > 0) { ctx.fillStyle = rgba(C.gold, .10 * kalGlow); ctx.fill(land.kal); }
  ctx.strokeStyle = 'rgba(103,232,249,.42)'; ctx.lineWidth = 1.3 / cam.z; ctx.stroke(land.indo);
  ctx.strokeStyle = kalGlow > 0 ? rgba(C.gold, .35 + .4 * kalGlow) : 'rgba(103,232,249,.42)'; ctx.lineWidth = (1.3 + kalGlow) / cam.z; ctx.stroke(land.kal);
  ctx.restore();
}
function mapLabel(cam, str, lon, lat, alpha, o = {}) {
  if (alpha <= 0) return;
  const [x, y] = toScreen(cam, lon, lat);
  txt(str, x, y, { size: o.size || 16, weight: 600, color: o.color || 'rgba(148,163,184,.85)', ls: o.ls ?? 3.5, align: o.align || 'center', alpha });
}

function mapLayer(T) {
  const a = win(T, 21.0, 45.6, .9, .7);
  if (a <= 0) return;
  const cam = camera(T);
  // Map recedes while the analysis panels hold the foreground.
  const dimQ = T >= 29.6 && T < 41.6 ? lerp(1, T >= 37.3 ? .35 : .62, inv(29.6, 30.3, T) * (1 - inv(41.0, 41.6, T))) : 1;
  ctx.save(); ctx.globalAlpha = a * dimQ;
  const kalGlow = inv(24.4, 26.2, T) * (1 - inv(41.3, 42.4, T));
  drawLand(cam, T, kalGlow);
  // Region labels
  const indoL = win(T, 21.6, 24.6, .6, .6);
  mapLabel(cam, 'SUMATRA', 100.6, 0.6, indoL);
  mapLabel(cam, 'KALIMANTAN', 113.6, 1.1, indoL * .9);
  mapLabel(cam, 'JAVA', 110.2, -9.0, indoL);
  mapLabel(cam, 'SULAWESI', 121.5, -4.2, indoL, { align: 'left' });
  mapLabel(cam, 'PAPUA', 138.2, -5.6, indoL);
  const kalL = win(T, 26.0, 41.4, .8, .5);
  mapLabel(cam, 'CENTRAL KALIMANTAN', 113.15, -1.25, kalL * .8, { size: 15 });
  mapLabel(cam, 'SOUTH KALIMANTAN', 116.1, -3.95, kalL * .8, { size: 15 });
  mapLabel(cam, 'EAST KALIMANTAN', 116.9, 1.25, kalL * .8, { size: 15 });
  mapLabel(cam, 'JAVA SEA', 113.4, -4.25, kalL * .55, { size: 15, color: 'rgba(103,232,249,.7)' });
  const asiaL = win(T, 42.8, 45.3, .5, .5);
  mapLabel(cam, 'CHINA', 108, 31, asiaL);
  mapLabel(cam, 'JAPAN', 134.2, 39.4, asiaL);
  mapLabel(cam, 'PHILIPPINES', 125.6, 11.6, asiaL, { align: 'left' });
  mapLabel(cam, 'INDONESIA', 120.8, -6.6, asiaL);

  // Mine sites from the GALI sites endpoint, popping in west → east.
  for (const s of D.sites) {
    const appear = 21.5 + (s.lon - 97) / 27 * 1.7 + rand(s.lon * 7) * .15;
    const p = at(T, appear, .5, outBack);
    if (p <= 0) continue;
    const [x, y] = toScreen(cam, s.lon, s.lat);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const isAdro = s.issuer === 'ADRO';
    const exportOrigin = T > 41.5 && (s.issuer === 'ADRO' || s.issuer === 'ITMG' || s.issuer === 'BYAN');
    const focus = T < 24.4 ? 1 : exportOrigin ? 1 : lerp(1, isAdro ? 1 : .28, inv(24.4, 25.4, T));
    const col = ISSUER_COLOR[s.issuer] || C.white;
    const r = (T > 24.4 && isAdro && T < 41.5 ? 6.5 : 5) * p;
    ctx.save(); ctx.globalAlpha *= focus;
    if (isAdro && T > 25 && T < 41.5) {
      const ring = fract(T * .6 + rand(s.lat) );
      ctx.strokeStyle = rgba(C.gold, (1 - ring) * .55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 7 + ring * 22, 0, Math.PI * 2); ctx.stroke();
    }
    dot(x, y, r + 3, rgba(col, .22)); dot(x, y, r, col);
    ctx.restore();
  }
  ctx.restore();
}

// ── Scene 1 · The question (0–8) ─────────────────────────────────────────────
const SLAB = i => ({ x: 96, y: 498 + i * 128, w: 1728, h: 114, r: 16 });
function strataTexture(x, y, w, h, i, T) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.clip();
  for (let k = 0; k < 7; k++) {
    const yy = y + 12 + k * 16;
    ctx.beginPath();
    for (let xx = x; xx <= x + w; xx += 24) ctx.lineTo(xx, yy + Math.sin(xx * .006 + k * 1.7 + i * 2) * 5);
    ctx.strokeStyle = 'rgba(148,163,184,.06)'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (let k = 0; k < 40; k++) dot(x + rand(k + i * 50) * w, y + rand(k * 3 + i) * h, 1 + rand(k) * 1.6, rgba(i === 1 ? C.gold : C.muted, .12 + rand(k + 9) * .2));
  ctx.restore();
}
function sceneHook(T) {
  if (T > 8.95) return;
  const dive = inOut((T - 4.0) / 1.4);
  // Market screen layer, pushed up by the dive.
  ctx.save(); ctx.translate(0, -dive * 760); ctx.globalAlpha = clamp(1 - dive * 1.6);
  const typed = Math.floor(clamp((T - .45) / .5) * 4);
  const word = 'ADRO'.slice(0, typed);
  const aTop = at(T, .3, .7);
  txt(`IDX · ${ADRO.name.toUpperCase()}`, 960, 330, { size: 20, weight: 600, color: C.muted, ls: 5, align: 'center', alpha: aTop });
  const wWord = measure('ADRO', 300, 700, true);
  txt(word, 960 - wWord / 2, 590, { size: 300, weight: 700, mono: true, color: C.white, glow: rgba(C.gold, .35), glowBlur: 50 });
  if (fract(T * 1.8) < .55 || T < 1) rr(960 - wWord / 2 + measure(word, 300, 700, true) + 12, 380, 22, 220, 4, C.gold);
  rise('To the market, it’s four letters and a price.', 960, 720, T, 1.6, { size: 44, weight: 500, color: C.text, align: 'center', max: 1500 });
  // Ticker tape: real tickers and market caps from the GALI universe.
  const tape = D.issuers.filter(i => i.market_cap_idr).map(i => `${i.symbol}   IDR ${(i.market_cap_idr / 1e12).toFixed(1)}T`);
  const aTape = at(T, .2, .8);
  ctx.save(); ctx.globalAlpha *= aTape;
  rr(0, 812, W, 64, 0, 'rgba(11,18,32,.9)'); seg(0, 812, W, 812, C.line2); seg(0, 876, W, 876, C.line2);
  const item = 300, total = tape.length * item, off = (T * 70) % total;
  for (let k = -1; k < Math.ceil(W / item) + 2; k++) {
    const idx = ((k % tape.length) + tape.length) % tape.length, x = k * item - off;
    const isA = tape[idx].startsWith('ADRO');
    ctx.save(); ctx.font = font(22, 700, true); ctx.fillStyle = isA ? C.gold : C.muted; ctx.fillText(tape[idx], x, 852); ctx.restore();
    dot(x + item - 26, 845, 3, C.line2);
  }
  ctx.restore();
  ctx.restore();

  // The ground below the ticker: four strata = the four things price hides.
  for (let i = 0; i < 4; i++) {
    const p = at(T, 4.35 + i * .14, .9, out5);
    if (p <= 0 || T >= 8) continue;
    const s = SLAB(i), y = s.y + (1 - p) * 420;
    const fills = ['#141c29', '#0d1118', '#161d2a', '#111722'];
    rr(s.x, y, s.w, s.h, s.r, fills[i], rgba(QUESTIONS[i].color, .22));
    strataTexture(s.x, y, s.w, s.h, i, T);
    const la = at(T, 5.6 + i * .18, .6);
    txt(`0${i + 1}`, s.x + 34, y + 66, { size: 22, weight: 700, mono: true, color: QUESTIONS[i].color, alpha: la });
    txt(QUESTIONS[i].key, s.x + 96, y + 66, { size: 26, weight: 800, color: C.white, ls: 5, alpha: la });
    txt('?', s.x + s.w - 44, y + 72, { size: 44, weight: 800, color: QUESTIONS[i].color, alpha: la * .8, align: 'right' });
  }
  if (T > 4.6 && T < 8) {
    rise('What’s underneath?', 96, 300, T, 4.85, { size: 112, weight: 800, max: 1500 });
    rise('Four things the share price alone won’t tell you.', 100, 392, T, 5.4, { size: 34, weight: 400, color: C.muted, max: 1500 });
  }
}

// ── Scene 2 · Who it's for & the problem (8–18) ──────────────────────────────
const CARD = i => ({ x: 900 + (i % 2) * 468, y: 250 + Math.floor(i / 2) * 292, w: 444, h: 268, r: 20 });
function cardState(i, T) {
  const m = at(T, 8, .95, inOut), a = SLAB(i), b = CARD(i);
  let x = lerp(a.x, b.x, m), y = lerp(a.y, b.y, m), w = lerp(a.w, b.w, m), h = lerp(a.h, b.h, m), rot = 0, sc = 1;
  // From 13 s the cards drift apart: the data doesn't connect.
  const d = at(T, 13.0, 4.6, inOut);
  const dir = [[-1, -1], [1, -1], [-1, 1], [1, 1]][i];
  x += dir[0] * 46 * d; y += dir[1] * 34 * d; rot = (i % 3 - 1 + (i === 3 ? .7 : 0)) * .045 * d; sc = 1 - .07 * d;
  return { x, y, w, h, rot, sc, morph: m, drift: d };
}
function questionCard(i, T, fade = 1) {
  const s = cardState(i, T), q = QUESTIONS[i];
  ctx.save();
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2); ctx.rotate(s.rot); ctx.scale(s.sc, s.sc); ctx.translate(-s.w / 2, -s.h / 2);
  ctx.globalAlpha *= fade;
  rr(0, 0, s.w, s.h, 20, lerp(0, 1, s.morph) > .5 ? C.panel : '#111722', rgba(q.color, .28 + .2 * (1 - s.drift)));
  if (s.morph > .9) {
    const ta = at(T, 8.85 + i * .55, .7);
    rr(0, 0, s.w, 5, 2, rgba(q.color, .9 * ta));
    txt(`Q${i + 1}`, 30, 58, { size: 22, weight: 700, mono: true, color: q.color, alpha: ta });
    txt(q.key, 82, 58, { size: 18, weight: 700, color: q.color, ls: 3.5, alpha: ta });
    ctx.save(); ctx.translate(0, (1 - ta) * 18);
    para(q.q, 30, 122, s.w - 60, { size: 34, weight: 700, color: C.white, lh: 44, alpha: ta });
    ctx.restore();
    // Problem phase: each answer hides in a different source.
    const sa = at(T, 13.7 + i * .3, .6);
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha *= sa;
      seg(30, s.h - 66, s.w - 30, s.h - 66, C.line2);
      txt('SOURCE', 30, s.h - 30, { size: 14, weight: 700, color: C.dim, ls: 2.5 });
      txt(q.source, 122, s.h - 30, { size: 20, weight: 600, color: C.text, max: s.w - 150 });
      ctx.restore();
    }
  }
  ctx.restore();
}
function sceneProblem(T) {
  if (T < 8 || T > 18.95) return;
  const exit = T > 18 ? at(T, 18, .8) : 0;
  // Broken links between the four sources.
  if (T > 14.4 && T < 18.3) {
    const a = at(T, 14.4, .8) * (1 - exit);
    const centers = [0, 1, 2, 3].map(i => { const s = cardState(i, T); return [s.x + s.w / 2, s.y + s.h / 2]; });
    [[0, 1], [2, 3], [0, 2], [1, 3]].forEach(([p, q], k) => {
      const A = centers[p], B = centers[q], flick = .55 + .45 * Math.sin(T * 9 + k * 2);
      ctx.save(); ctx.globalAlpha = a * flick;
      seg(A[0], A[1], B[0], B[1], rgba(C.rose, .55), 2, [10, 12]);
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      dot(mx, my, 15, C.bg); ctx.strokeStyle = C.rose; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx - 6, my - 6); ctx.lineTo(mx + 6, my + 6); ctx.moveTo(mx + 6, my - 6); ctx.lineTo(mx - 6, my + 6); ctx.stroke();
      ctx.restore();
    });
  }
  if (T < 18) for (let i = 0; i < 4; i++) questionCard(i, T, 1);

  // Left column: audience, then the problem.
  const A1 = win(T, 8.5, 13.25, .3, .45);
  if (A1 > 0) {
    ctx.save(); ctx.globalAlpha = A1;
    label('BUILT FOR INVESTORS & ANALYSTS', 96, 252, C.gold, at(T, 8.55, .5));
    rise('Four questions', 96, 366, T, 8.8, { size: 76, weight: 800, max: 770 });
    rise('every coal', 96, 452, T, 8.95, { size: 76, weight: 800, max: 770 });
    rise('investor asks.', 96, 538, T, 9.1, { size: 76, weight: 800, color: C.gold, max: 770 });
    ctx.save(); ctx.globalAlpha *= at(T, 9.7, .7);
    para('Valuing an IDX-listed coal issuer means understanding the mines behind the ticker.', 100, 628, 700, { size: 30, color: C.muted, lh: 42 });
    ctx.restore();
    ctx.restore();
  }
  const A2 = win(T, 13.2, 18.2, .5, .5);
  if (A2 > 0) {
    ctx.save(); ctx.globalAlpha = A2;
    label('THE PROBLEM', 96, 252, C.rose);
    rise('The data exists.', 96, 366, T, 13.3, { size: 76, weight: 800, max: 770 });
    rise('It just doesn’t', 96, 452, T, 13.75, { size: 76, weight: 800, max: 770 });
    rise('connect.', 96, 538, T, 13.9, { size: 76, weight: 800, color: C.rose, max: 770 });
    ctx.save(); ctx.globalAlpha *= at(T, 14.6, .7);
    para('Reserves, licenses, costs and export buyers sit in separate filings, registries and datasets. Linking them by hand takes days.', 100, 628, 700, { size: 30, color: C.muted, lh: 42 });
    ctx.restore();
    ctx.restore();
  }
}

// ── Scene 3 · Meet GALI, then stock → company → mine (18–30) ─────────────────
function sceneBrand(T) {
  if (T < 17.95 || T > 22.2) return;
  const LX = 960, LY = 420;
  // The four scattered cards collapse into the logo.
  for (let i = 0; i < 4; i++) {
    const s = cardState(i, 18), p = at(T, 18 + i * .07, .75, t => t * t * t);
    if (p >= 1) continue;
    const cx = lerp(s.x + s.w / 2, LX, p), cy = lerp(s.y + s.h / 2, LY, p), k = lerp(1, .04, p);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rot * (1 - p)); ctx.scale(s.sc * k, s.sc * k);
    rr(-s.w / 2, -s.h / 2, s.w, s.h, 20, C.panel, rgba(QUESTIONS[i].color, .6), 2 / Math.max(k, .2));
    ctx.restore();
  }
  const out = at(T, 21.1, .9, inOut);
  const pop = at(T, 18.72, .9, outBack);
  if (pop <= 0) return;
  ctx.save(); ctx.globalAlpha = 1 - out;
  ctx.translate(0, -out * 60);
  const flash = Math.max(0, 1 - Math.abs(T - 18.8) / .35);
  glow(LX, LY, 520, C.gold, .16 + .25 * flash);
  for (let k = 0; k < 2; k++) {
    ctx.save(); ctx.translate(LX, LY + 30); ctx.rotate(T * (k ? -.12 : .16)); ctx.scale(1, .36);
    ctx.strokeStyle = rgba(k ? C.cyan : C.gold, .22 * pop); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 380 + k * 120, 0, Math.PI * 2); ctx.stroke();
    for (let j = 0; j < 3; j++) { const a = T * .7 * (k ? -1 : 1) + j * 2.094; dot(Math.cos(a) * (380 + k * 120), Math.sin(a) * (380 + k * 120), 6, k ? C.cyan : C.gold); }
    ctx.restore();
  }
  drawLogo(LX, LY, 230 * lerp(.55, 1, pop), clamp(pop * 1.4));
  rise('GALI', LX, 700, T, 19.0, { size: 170, weight: 900, align: 'center', ls: 6 });
  rise('Ground-truth analytics for listed issuers.', LX, 778, T, 19.45, { size: 36, weight: 500, color: C.gold, align: 'center', max: 1500 });
  const c = at(T, 20.0, .7);
  if (c > 0) {
    ctx.save(); ctx.globalAlpha *= c; ctx.translate(0, (1 - c) * 16);
    const items = [['STOCK', C.gold], ['COMPANY', C.cyan], ['MINE', C.emerald]];
    const widths = items.map(([s]) => measure(s, 18, 700, false, 3) + 32 - 3);
    const gap = 70, total = widths.reduce((a, b) => a + b, 0) + gap * 2;
    let x = LX - total / 2;
    items.forEach(([s, col], k) => {
      chip(s, x, 832, col, { size: 18, ls: 3 });
      if (k < 2) txt('→', x + widths[k] + gap / 2, 860, { size: 28, weight: 700, color: C.muted, align: 'center' });
      x += widths[k] + gap;
    });
    ctx.restore();
  }
  ctx.restore();
}
const CHAIN = [
  { company: 'PT Adaro Indonesia', slug: 'pt-adaro-indonesia', sites: ['Tutupan Utara', 'Tutupan Selatan', 'Wara I', 'Wara II', 'Paringin Utara'] },
  { company: 'PT Lahai Coal', slug: 'pt-lahai-coal', sites: ['Haju Block'] },
  { company: 'PT Juloi Coal', slug: 'pt-juloi-coal', sites: ['Batubara Bumbun'] },
].map(c => ({ ...c, own: (D.adro_companies.find(x => x.slug === c.slug) || {}).effective_ownership || '' }));
function leftShade(a) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 1040, 0);
  g.addColorStop(0, rgba(C.bg, .96 * a)); g.addColorStop(.62, rgba(C.bg, .82 * a)); g.addColorStop(1, rgba(C.bg, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1040, H);
}
function sceneLink(T) {
  if (T < 21.2 || T > 30.6) return;
  leftShade(win(T, 21.4, 30.4, .8, .6));
  // Part A: the national picture.
  const A = win(T, 21.7, 24.4, .6, .45);
  if (A > 0) {
    ctx.save(); ctx.globalAlpha = A;
    label('NATIONAL MINE MAP', 96, 250, C.cyan);
    const n1 = Math.round(D.sites.length * at(T, 21.9, 1.3));
    txt(String(n1), 96, 410, { size: 150, weight: 700, mono: true, color: C.gold });
    txt('GPS-tagged mine sites', 100, 462, { size: 32, weight: 600, color: C.white, alpha: at(T, 22.1, .6) });
    txt(String(D.issuers.length), 96, 640, { size: 150, weight: 700, mono: true, color: C.cyan, alpha: at(T, 22.4, .6) });
    txt('IDX coal issuers, mapped', 100, 692, { size: 32, weight: 600, color: C.white, alpha: at(T, 22.6, .6) });
    txt('Coordinates from the GALI sites dataset', 100, 780, { size: 22, color: C.muted, alpha: at(T, 22.9, .6) });
    ctx.restore();
    // Legend
    ctx.save(); ctx.globalAlpha = A * at(T, 22.6, .6);
    const syms = Object.keys(ISSUER_COLOR).filter(s => siteCount(s) > 0).sort((a, b) => siteCount(b) - siteCount(a));
    const items = syms.map(s => [s, measure(`${s} ${siteCount(s)}`, 16, 700, true) + 46]);
    const lw = items.reduce((a, [, w]) => a + w, 0) + 30;
    rr(1824 - lw, 868, lw, 84, 14, 'rgba(11,18,32,.88)', C.line2);
    txt('SITES BY ISSUER', 1824 - lw + 22, 898, { size: 13, weight: 700, color: C.muted, ls: 2.5 });
    let lx = 1824 - lw + 22;
    items.forEach(([s, w]) => {
      dot(lx + 6, 926, 6, ISSUER_COLOR[s]);
      txt(`${s} ${siteCount(s)}`, lx + 18, 933, { size: 16, weight: 700, mono: true, color: C.text });
      lx += w;
    });
    ctx.restore();
  }
  // Part B: one ticker traced to its mines.
  const B = win(T, 24.2, 30.4, .6, .55);
  if (B <= 0) return;
  ctx.save(); ctx.globalAlpha = B;
  label('STOCK → COMPANY → MINE', 96, 250, C.gold);
  rise('From ticker', 96, 352, T, 24.3, { size: 72, weight: 800, max: 780 });
  rise('to the ground.', 96, 432, T, 24.45, { size: 72, weight: 800, color: C.gold, max: 780 });
  // Ticker node
  const n0 = at(T, 24.9, .6);
  ctx.save(); ctx.globalAlpha *= n0;
  rr(96, 486, 560, 76, 14, 'rgba(251,191,36,.08)', rgba(C.gold, .55));
  txt('ADRO', 122, 536, { size: 34, weight: 700, mono: true, color: C.gold });
  txt(ADRO.name, 240, 534, { size: 21, weight: 600, color: C.text, max: 400 });
  ctx.restore();
  const cam = camera(T);
  CHAIN.forEach((c, k) => {
    const y = 600 + k * 92, p = at(T, 25.4 + k * .3, .6);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    // elbow from ticker to company
    ctx.strokeStyle = rgba(C.gold, .5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(126, 562); ctx.lineTo(126, y + 34); ctx.lineTo(150, y + 34); ctx.stroke();
    rr(150, y, 506, 68, 12, 'rgba(16,26,43,.94)', rgba(C.cyan, .45));
    txt(c.company, 174, y + 42, { size: 23, weight: 700, color: C.white, max: 330 });
    txt(c.own, 632, y + 42, { size: 21, weight: 700, mono: true, color: C.cyan, align: 'right' });
    ctx.restore();
    // company → mine sites on the real map
    const lp = at(T, 26.6 + k * .35, .9, inOut);
    if (lp > 0) {
      const sites = adroSites.filter(s => c.sites.includes(s.name));
      sites.forEach((s, j) => {
        const [sx, sy] = toScreen(cam, s.lon, s.lat), x0 = 656, y0 = y + 34;
        const cp = [lerp(x0, sx, .55), y0 - 30 + j * 4];
        const pts = []; for (let u = 0; u <= 1.0001; u += 1 / 40) pts.push(bez([x0, y0], cp, [sx, sy], u));
        ctx.save(); ctx.globalAlpha *= .85;
        curve(pts, rgba(C.gold, .55), 1.6, lp);
        ctx.restore();
      });
    }
  });
  // Site labels on the map
  const la = at(T, 27.6, .6) * (1 - inv(29.9, 30.4, T));
  if (la > 0) {
    const tag = (str, lon, lat, dx, dy) => {
      const [x, y] = toScreen(cam, lon, lat);
      ctx.save(); ctx.globalAlpha *= la;
      seg(x, y, x + dx * .7, y + dy * .7, rgba(C.gold, .6), 1.2);
      chip(str, x + dx, y + dy - 18, C.gold, { size: 15, ls: 1, padX: 12, h: 34, fillA: .16, align: dx < 0 ? 'right' : 'left' });
      ctx.restore();
    };
    tag('TUTUPAN · WARA · PARINGIN', 115.52, -2.2, 70, -10);
    tag('HAJU BLOCK', 114.84, -0.31, 60, -24);
    tag('BUMBUN', 115.12, -3.14, 60, 20);
  }
  const f = at(T, 28.3, .6);
  if (f > 0) {
    ctx.save(); ctx.globalAlpha *= f;
    txt(`${adroSites.length} GPS-tagged sites · ${adroCompanies} operating companies`, 100, 930, { size: 26, weight: 600, color: C.white, max: 800 });
    txt('Effective ownership traced through the ownership graph', 100, 970, { size: 20, color: C.dim, max: 800 });
    ctx.restore();
  }
  ctx.restore();
}

// ── Scene 4 · The answers (30–45) ────────────────────────────────────────────
const QT = [30, 33.75, 37.5, 41.25, 45];
function qHeader(i, T, a) {
  const q = QUESTIONS[i];
  ctx.save(); ctx.globalAlpha *= a;
  const w = chip(`Q${i + 1} · ${q.key}`, 96, 196, q.color, { size: 17, ls: 3 });
  txt(`${i + 1} / 4`, 96 + w + 18, 221, { size: 16, weight: 600, mono: true, color: C.dim });
  para(q.q, 96, 296, 780, { size: 46, weight: 800, lh: 56 });
  ctx.restore();
}
function bigNumber(str, x, y, color, a, size = 150) {
  ctx.save(); ctx.globalAlpha *= a;
  txt(str, x, y, { size, weight: 900, color, glow: rgba(color, .35), glowBlur: 40 });
  ctx.restore();
}
function sceneAnswers(T) {
  if (T < 29.6 || T > 45.6) return;
  leftShade(win(T, 29.7, 45.3, .6, .5));
  // Q1 · reserves
  let a = win(T, QT[0] + .1, QT[1] + .15, .5, .4);
  if (a > 0) {
    qHeader(0, T, a);
    ctx.save(); ctx.globalAlpha = a;
    const v = ADRO.rli_years * at(T, 30.5, 1.2, out5);
    bigNumber(`${v.toFixed(1)} yrs`, 96, 532, C.cyan, at(T, 30.45, .5));
    txt('ADRO reserve life at current production', 100, 586, { size: 28, weight: 500, color: C.text, alpha: at(T, 30.7, .6), max: 780 });
    // Reserve clock: proven reserves drain year by year.
    const x0 = 100, x1 = 860, y = 690, y0 = 2026, y1 = 2046, X = yr => lerp(x0, x1, (yr - y0) / (y1 - y0));
    const depl = NOW_YEAR + ADRO.rli_years, implied = NOW_YEAR + ADRO.implied_life_years;
    const ax = at(T, 30.6, .6);
    ctx.save(); ctx.globalAlpha *= ax;
    seg(x0, y + 66, x1, y + 66, C.line2, 1.5);
    for (let yr = 2026; yr <= 2046; yr += 5) { seg(X(yr), y + 62, X(yr), y + 72, C.dim, 1.5); txt(String(yr), X(yr), y + 100, { size: 18, weight: 600, mono: true, color: C.dim, align: 'center' }); }
    const full = X(depl) - X(NOW_YEAR);
    rr(X(NOW_YEAR), y, full, 46, 8, 'rgba(34,211,238,.10)', rgba(C.cyan, .45));
    const head = lerp(NOW_YEAR, depl, at(T, 31.0, 1.8, inOut));
    // Remaining reserves = everything right of the play-head.
    rr(X(head), y, Math.max(0, X(depl) - X(head)), 46, 8, rgba(C.cyan, .75));
    seg(X(head), y - 14, X(head), y + 60, C.white, 2);
    txt(String(Math.round(head)), X(head), y - 22, { size: 18, weight: 700, mono: true, color: C.white, align: 'center' });
    const dl = at(T, 32.7, .5);
    txt(`Depleted ≈ ${Math.round(depl)}`, X(depl) + 12, y + 31, { size: 18, weight: 700, color: C.cyan, alpha: dl });
    ctx.restore();
    const im = at(T, 32.1, .6);
    if (im > 0 && ADRO.implied_life_years != null) {
      ctx.save(); ctx.globalAlpha *= im;
      seg(X(implied), y - 40, X(implied), y + 60, C.gold, 2, [6, 6]);
      txt(`Market-implied life: ${ADRO.implied_life_years.toFixed(1)} yrs`, X(implied) + 10, y - 28, { size: 20, weight: 700, color: C.gold });
      ctx.restore();
    }
    ctx.restore();
  }
  // Q2 · licenses
  a = win(T, QT[1] + .1, QT[2] + .15, .45, .4);
  if (a > 0) {
    qHeader(1, T, a);
    ctx.save(); ctx.globalAlpha = a;
    bigNumber(`${Math.round(GEMS.license_cliff_3y * at(T, 34.2, .9, out5))}%`, 96, 532, C.rose, at(T, 34.15, .5));
    txt('of GEMS’ licensed area expires within 3 years', 100, 586, { size: 28, weight: 500, color: C.text, alpha: at(T, 34.4, .6), max: 780 });
    const rows = [[GEMS, 'GEMS'], [ADRO, 'ADRO']];
    const sweep = at(T, 34.7, 1.5, inOut);
    const cliffX = 760;
    ctx.save(); ctx.globalAlpha *= at(T, 34.4, .5);
    txt('NOW', 200, 672, { size: 15, weight: 700, color: C.dim, ls: 2 });
    txt('3-YEAR HORIZON', cliffX, 672, { size: 15, weight: 700, color: C.rose, ls: 2, align: 'right' });
    seg(cliffX, 680, cliffX, 852, rgba(C.rose, .8), 2, [5, 5]);
    seg(200, 686, lerp(200, cliffX, sweep), 686, C.rose, 3);
    rows.forEach(([iss, sym], r) => {
      const y = 712 + r * 76, share = (iss.license_cliff_3y || 0) / 100;
      txt(sym, 100, y + 32, { size: 24, weight: 700, mono: true, color: ISSUER_COLOR[sym] || C.white });
      // 20 blocks of licensed area; expiring blocks fall off the cliff after the sweep.
      for (let b = 0; b < 20; b++) {
        const expiring = b < Math.round(share * 20);
        const bx = 200 + b * 28, fall = expiring ? at(T, 36.2 + b * .025, .6, t => t * t) : 0;
        if (fall > 0) rr(bx, y + 8, 24, 36, 4, null, rgba(C.rose, .45 * fall), 1.2);
        ctx.save(); ctx.globalAlpha *= Math.pow(1 - fall, 1.5);
        rr(bx, y + 8 + fall * 52, 24, 36, 4, expiring ? rgba(C.rose, .85) : rgba(C.emerald, .7));
        ctx.restore();
      }
      txt(`${Math.round(share * 100)}%`, 860, y + 34, { size: 28, weight: 800, mono: true, color: share > 0 ? C.rose : C.emerald, align: 'right' });
    });
    txt('Share of licensed area expiring ≤ 3 yrs', 200, 880, { size: 18, color: C.dim });
    ctx.restore();
    ctx.restore();
  }
  // Q3 · margins (real national cost curve)
  a = win(T, QT[2] + .1, QT[3] + .15, .45, .4);
  if (a > 0) {
    qHeader(2, T, a);
    ctx.save(); ctx.globalAlpha = a;
    bigNumber(`${Math.round(CUSHION * 100 * at(T, 37.95, .9, out5))}%`, 96, 532, C.gold, at(T, 37.9, .5));
    para(`ADRO’s price cushion: cash break-even at $${ADRO.breakeven_benchmark_price_usd.toFixed(0)}/t vs a $${BENCH.toFixed(0)}/t benchmark`, 100, 586, 760, { size: 28, weight: 500, color: C.text, lh: 38, alpha: at(T, 38.15, .6) });
    // Chart panel
    const px = 960, py = 196, pw = 864, ph = 720;
    const ca = at(T, 37.7, .7);
    ctx.save(); ctx.globalAlpha *= ca; ctx.translate(0, (1 - ca) * 30);
    rr(px, py, pw, ph, 20, 'rgba(11,18,32,.94)', C.line2);
    txt('NATIONAL CASH COST CURVE · COAL', px + 32, py + 50, { size: 16, weight: 700, color: C.muted, ls: 2.5 });
    const gx0 = px + 92, gx1 = px + pw - 40, gy0 = py + 110, gy1 = py + ph - 90;
    const maxX = COST[COST.length - 1].cumulative_volume_mt, maxY = 120;
    const X = v => lerp(gx0, gx1, v / maxX), Y = v => lerp(gy1, gy0, v / maxY);
    for (let v = 0; v <= 120; v += 30) { seg(gx0, Y(v), gx1, Y(v), 'rgba(43,58,82,.6)', 1); txt(`$${v}`, gx0 - 14, Y(v) + 6, { size: 16, mono: true, weight: 500, color: C.dim, align: 'right' }); }
    txt('Cumulative annual output (Mt) →', gx1, gy1 + 44, { size: 16, weight: 600, color: C.dim, align: 'right' });
    txt('Cash cost $/t', gx0, gy0 - 22, { size: 16, weight: 600, color: C.dim });
    const drop = at(T, 39.3, 1.0, inOut), bench = BENCH * (1 - .2 * drop);
    COST.forEach((p, k) => {
      const grow = at(T, 37.9 + k * .08, .6, out5);
      const x = X(p.cumulative_volume_mt - p.annual_volume_mt), w = X(p.cumulative_volume_mt) - x, top = Y(p.cash_cost_per_ton_usd * grow);
      const under = p.cash_cost_per_ton_usd > bench && drop > 0;
      const col = under ? C.rose : p.symbol === 'ADRO' ? C.gold : '#475569';
      rr(x + 1.5, top, w - 3, gy1 - top, 3, rgba(col, p.symbol === 'ADRO' || under ? .85 : .55));
      if (w > 38) txt(p.symbol, x + w / 2, top - 12, { size: 15, weight: 700, mono: true, color: under ? C.rose : p.symbol === 'ADRO' ? C.gold : C.muted, align: 'center', alpha: grow });
      else txt(`${p.symbol} $${p.cash_cost_per_ton_usd.toFixed(0)}`, x + w - 4, top - 12, { size: 15, weight: 700, mono: true, color: under ? C.rose : C.muted, align: 'right', alpha: grow });
    });
    // ADRO break-even and the cushion band
    const be = Y(ADRO.breakeven_benchmark_price_usd), cb = at(T, 38.6, .6);
    ctx.save(); ctx.globalAlpha *= cb;
    ctx.fillStyle = rgba(C.gold, .08); ctx.fillRect(gx0, Y(bench), gx1 - gx0, be - Y(bench));
    seg(gx0, be, gx1, be, rgba(C.gold, .9), 2, [3, 6]);
    txt(`ADRO break-even $${ADRO.breakeven_benchmark_price_usd.toFixed(0)}`, gx0 + 12, be + 26, { size: 16, weight: 700, color: C.gold });
    ctx.restore();
    seg(gx0, Y(bench), gx1, Y(bench), C.amber, 3);
    txt(`Benchmark $${bench.toFixed(0)}/t${drop > .98 ? '  (−20%)' : ''}`, gx0 + 12, Y(bench) - 12, { size: 17, weight: 800, color: C.amber });
    const note = at(T, 40.2, .5);
    const under = COST.filter(p => p.cash_cost_per_ton_usd > BENCH * .8).map(p => p.symbol);
    if (note > 0 && under.length) chip(`AT −20%: ${under.join(', ')} CASH COST TOPS THE BENCHMARK`, px + 32, py + ph - 58, C.rose, { size: 14, ls: 1.2, alpha: note });
    ctx.restore();
    ctx.restore();
  }
  // Q4 · exports (map zooms out to Asia)
  a = win(T, QT[3] + .1, 45.2, .45, .4);
  if (a > 0) {
    qHeader(3, T, a);
    ctx.save(); ctx.globalAlpha = a;
    bigNumber(`${(ADRO.top_destination_pct * at(T, 41.75, .9, out5)).toFixed(1)}%`, 96, 532, C.indigo, at(T, 41.7, .5));
    txt(`of ADRO’s sales volume ships to ${ADRO.top_destination}`, 100, 586, { size: 28, weight: 500, color: C.text, alpha: at(T, 41.95, .6), max: 780 });
    const flows = [[ADRO, 139.3, 35.6], [ITMG, 113.3, 23.1], [BYAN, 121.0, 14.6]];
    const cam = camera(T);
    flows.forEach(([iss, lon, lat], k) => {
      const origin = D.sites.filter(s => s.issuer === iss.symbol && s.lon > 108 && s.lon < 120);
      const olon = origin.reduce((s, x) => s + x.lon, 0) / origin.length, olat = origin.reduce((s, x) => s + x.lat, 0) / origin.length;
      const p0 = toScreen(cam, olon, olat), p1 = toScreen(cam, lon, lat);
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
      const c = [(p0[0] + p1[0]) / 2 + dy / len * 110 * (k === 1 ? -1 : 1), (p0[1] + p1[1]) / 2 - dx / len * 110 * (k === 1 ? -1 : 1)];
      const pts = []; for (let u = 0; u <= 1.0001; u += 1 / 60) pts.push(bez(p0, c, p1, u));
      const col = ISSUER_COLOR[iss.symbol];
      const china = iss === ITMG && T > 44.1 ? at(T, 44.1, .4) : 0;
      const draw = at(T, 42.6 + k * .25, 1.0, inOut);
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      curve(pts, rgba(china ? C.rose : col, .9), 1.5 + iss.top_destination_pct * .09, draw);
      ctx.restore();
      if (draw >= 1) for (let j = 0; j < 4; j++) { const u = fract(T * .45 + j / 4 + k * .13); dot(...bez(p0, c, p1, u), 3.5, C.white); }
      const la = at(T, 43.4 + k * .25, .5);
      if (la > 0) {
        dot(p1[0], p1[1], 6, col);
        const right = k !== 1;
        chip(`${iss.symbol} → ${iss.top_destination.toUpperCase()} ${pct1(iss.top_destination_pct)}`, p1[0] + (right ? 16 : -16), p1[1] - 18, china ? C.rose : col, { size: 15, ls: 1, padX: 12, h: 36, fillA: .2, align: right ? 'left' : 'right', alpha: la });
      }
    });
    const w = at(T, 44.15, .5);
    if (w > 0) chip('WHAT IF CHINA DEMAND FALLS 30%?', 100, 650, C.rose, { size: 18, ls: 2, alpha: w });
    ctx.restore();
  }
}

// ── Scene 5 · Scenario Studio (45–55), live results from POST /v1/scenario ──
// Centre-zero slider spanning −50% … +50%, like the app's shock controls.
function slider(x, y, w, labelStr, valuePct, color, a) {
  ctx.save(); ctx.globalAlpha *= a;
  txt(labelStr, x, y, { size: 21, weight: 700, color: C.text });
  const shown = Math.round(valuePct);
  txt(shown ? `${shown < 0 ? '−' : '+'}${Math.abs(shown)}%` : '0%', x + w, y, { size: 24, weight: 800, mono: true, color: shown ? color : C.dim, align: 'right' });
  const ty = y + 30, mid = x + w / 2, kx = mid + valuePct / 50 * w / 2;
  rr(x, ty, w, 8, 4, '#1f2a3d');
  seg(mid, ty - 6, mid, ty + 14, C.dim, 2);
  rr(Math.min(kx, mid), ty, Math.abs(kx - mid), 8, 4, color);
  txt('−50%', x, ty + 40, { size: 14, weight: 600, mono: true, color: C.dim });
  txt('0', mid, ty + 40, { size: 14, weight: 600, mono: true, color: C.dim, align: 'center' });
  txt('+50%', x + w, ty + 40, { size: 14, weight: 600, mono: true, color: C.dim, align: 'right' });
  dot(kx, ty + 4, 13, C.panel); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(kx, ty + 4, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  return [kx, ty + 4];
}
function sceneScenario(T) {
  if (T < 45.2 || T > 55.1) return;
  const a = win(T, 45.25, 55.05, .4, .5);
  ctx.save(); ctx.globalAlpha = a;
  label('SCENARIO STUDIO', 96, 196, C.indigo);
  rise('Move a slider.', 96, 300, T, 45.3, { size: 58, weight: 800, max: 560 });
  rise('Watch value move.', 96, 370, T, 45.45, { size: 58, weight: 800, color: C.gold, max: 560 });
  const s1 = at(T, 46.1, 1.3, inOut), s2 = at(T, 48.0, 1.3, inOut);
  const ca = at(T, 45.55, .6);
  rr(96, 430, 560, 300, 18, 'rgba(11,18,32,.92)', C.line2);
  const k1 = slider(128, 482, 496, 'Coal benchmark price', -20 * s1, C.gold, ca);
  const k2 = slider(128, 592, 496, 'China export demand', -30 * s2, C.rose, ca);
  ctx.save(); ctx.globalAlpha *= ca;
  txt('Discount rate 12% · variable cost share 65%', 128, 708, { size: 18, color: C.muted });
  ctx.restore();
  // Pointer drives the sliders.
  let cx = 700, cy = 560;
  if (T < 46.1) { const m = at(T, 45.5, .6, inOut); cx = lerp(700, k1[0], m); cy = lerp(560, k1[1], m); }
  else if (T < 47.5) { [cx, cy] = k1; }
  else if (T < 48.0) { const m = at(T, 47.5, .5, inOut); cx = lerp(k1[0], k2[0], m); cy = lerp(k1[1], k2[1], m); }
  else [cx, cy] = k2;
  pointer(cx + 4, cy + 4, at(T, 45.5, .3) * (1 - inv(49.6, 50.0, T)));
  // Ranking panel
  const px = 712, py = 160, pw = 1112, ph = 790;
  const pa = at(T, 45.4, .7);
  ctx.save(); ctx.globalAlpha *= pa; ctx.translate(0, (1 - pa) * 40);
  rr(px, py, pw, ph, 22, 'rgba(11,18,32,.94)', rgba(C.indigo, .35));
  txt('RESERVE-BACKED VALUE BY ISSUER', px + 36, py + 54, { size: 17, weight: 700, color: C.muted, ls: 2.5 });
  txt(`${SCN.length} issuers with complete data`, px + pw - 36, py + 54, { size: 17, weight: 500, color: C.dim, align: 'right' });
  const legY = py + 92;
  rr(px + 36, legY - 12, 26, 12, 3, null, rgba(C.white, .45), 1.5); txt('Baseline', px + 72, legY, { size: 16, color: C.muted });
  rr(px + 180, legY - 12, 26, 12, 3, C.gold); txt('Scenario', px + 216, legY, { size: 16, color: C.muted });
  const maxV = Math.max(...SCN.map(r => r.base));
  const bx0 = px + 250, bw = 580, rank = at(T, 49.5, 1.0, inOut);
  // Rows that drop are drawn first so rising rows slide over them as solid cards.
  // ADRO is the story's hero, so it always rides on top.
  [...SCN].sort((p, q) => (p.sym === 'ADRO') - (q.sym === 'ADRO') || (q.r1 - q.r0) - (p.r1 - p.r0)).forEach(r => {
    const v = lerp(lerp(r.base, r.p20, s1), r.both, s2);
    const slot = lerp(r.r0, r.r1, rank), y = py + 120 + (slot - 1) * 88;
    const hi = r.sym === 'ADRO' && T > 49.3;
    const moving = r.r0 !== r.r1 && rank > 0 && rank < 1;
    const shift = Math.sign(r.r0 - r.r1) * 30 * Math.sin(Math.PI * rank);
    ctx.save(); ctx.translate(shift, 0);
    rr(px + 24, y, pw - 48, 72, 12, hi ? '#1a1a17' : '#101a2b', hi ? rgba(C.gold, .75 * at(T, 49.3, .4)) : moving ? rgba(C.white, .18) : null);
    const shownRank = Math.round(slot);
    txt(`#${shownRank}`, px + 56, y + 46, { size: 22, weight: 700, mono: true, color: C.dim });
    txt(r.sym, px + 110, y + 46, { size: 26, weight: 800, mono: true, color: ISSUER_COLOR[r.sym] || C.white });
    rr(bx0, y + 22, bw * r.base / maxV, 28, 6, null, rgba(C.white, .35), 1.5);
    rr(bx0, y + 22, bw * v / maxV, 28, 6, rgba(r.sym === 'ADRO' ? C.gold : '#94a3b8', r.sym === 'ADRO' ? .95 : .6));
    txt(usdB(v), px + pw - 170, y + 46, { size: 22, weight: 700, mono: true, color: C.white, align: 'right' });
    const d = (v / r.base - 1) * 100;
    txt(d < -.05 ? `−${Math.abs(d).toFixed(1)}%` : '0.0%', px + pw - 44, y + 46, { size: 22, weight: 700, mono: true, color: d < -.05 ? C.rose : C.dim, align: 'right' });
    const move = r.r0 - r.r1;
    if (move !== 0) {
      const ma = at(T, 50.5, .5);
      txt(move > 0 ? `▲${move}` : `▼${-move}`, px + 122 + measure(r.sym, 26, 800, true), y + 44, { size: 16, weight: 800, mono: true, color: move > 0 ? C.emerald : C.rose, alpha: ma });
    }
    ctx.restore();
  });
  ctx.restore();
  // Read-out
  const adro = SCN.find(r => r.sym === 'ADRO'), top = SCN.find(r => r.r1 === 1);
  const ra = at(T, 50.8, .6);
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha *= ra; ctx.translate(0, (1 - ra) * 16);
    rr(96, 760, 560, 186, 18, 'rgba(251,191,36,.07)', rgba(C.gold, .5));
    txt('ADRO', 128, 812, { size: 24, weight: 800, mono: true, color: C.gold });
    txt(`${usdB(adro.base)} → ${usdB(adro.both)}`, 228, 812, { size: 26, weight: 700, mono: true, color: C.white });
    txt(`−${Math.abs((adro.both / adro.base - 1) * 100).toFixed(1)}% reserve-backed value`, 128, 856, { size: 22, weight: 600, color: C.rose });
    txt(`${top.sym} rises to #1 — no China exposure in its sales data`, 128, 902, { size: 19, color: C.text, max: 500 });
    ctx.restore();
  }
  ctx.restore();
}

// ── Scene 6 · Close (55–60) ──────────────────────────────────────────────────
function sceneClose(T) {
  if (T < 55.1) return;
  const p = at(T, 55.15, 1.0, outBack);
  glow(960, 420, 700, C.gold, .14 * clamp(p));
  drawLogo(960, 300, 190 * lerp(.6, 1, clamp(p)), clamp(p * 1.3));
  rise('GALI', 960, 548, T, 55.45, { size: 140, weight: 900, align: 'center', ls: 6 });
  rise('Dig deeper than the ticker.', 960, 650, T, 55.85, { size: 64, weight: 800, color: C.gold, align: 'center', max: 1600 });
  rise('Reserves · Licenses · Costs · Exports — connected for every IDX coal issuer.', 960, 724, T, 56.3, { size: 30, weight: 500, color: C.text, align: 'center', max: 1600 });
  const c = at(T, 56.8, .6);
  if (c > 0) {
    ctx.save(); ctx.globalAlpha = c;
    txt('TRY THE LIVE APP', 960, 790, { size: 15, weight: 700, color: C.muted, ls: 3.5, align: 'center' });
    rr(960 - 230, 808, 460, 64, 32, 'rgba(251,191,36,.12)', rgba(C.gold, .7));
    txt('gali-web.vercel.app', 960, 851, { size: 28, weight: 700, mono: true, color: C.gold, align: 'center' });
    ctx.restore();
  }
  txt('Analytics on public data via Sectors API. Not investment advice.', 960, 930, { size: 19, color: C.dim, align: 'center', alpha: at(T, 57.4, .6) });
  txt('SECTORS HACKATHON 2026 · MARKET INTELLIGENCE', 960, 968, { size: 15, weight: 700, color: C.dim, ls: 3, align: 'center', alpha: at(T, 57.6, .6) });
}

// ── Frame ────────────────────────────────────────────────────────────────────
function sceneIndex(T) { for (let i = CUTS.length - 2; i >= 0; i--) if (T >= CUTS[i]) return i; return 0; }
function render(time) {
  const T = clamp(Number(time) || 0, 0, DURATION - 1e-6);
  qaBoxes = []; qaWarnings = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  background(T);
  mapLayer(T);
  sceneHook(T);
  sceneProblem(T);
  sceneBrand(T);
  sceneLink(T);
  sceneAnswers(T);
  sceneScenario(T);
  sceneClose(T);
  vignette();
  const scene = sceneIndex(T);
  chrome(T, scene);
  // Open from black, close to a held lock-up.
  const fade = Math.max(1 - inv(0, .5, T), inv(59.4, 60, T) * .85);
  if (fade > 0) { ctx.fillStyle = rgba(C.bg, fade); ctx.fillRect(0, 0, W, H); }
  window.__scene = scene;
  return scene;
}
window.renderFrame = render;
window.filmInfo = { duration: DURATION, width: W, height: H, fps: FPS, cuts: CUTS };
window.__qa = () => ({ boxes: qaBoxes.map(b => ({ ...b })), warnings: qaWarnings.slice() });
window.__ready = Promise.all([
  document.fonts.load(`900 40px Inter`), document.fonts.load(`800 40px Inter`), document.fonts.load(`600 40px Inter`), document.fonts.load(`400 40px Inter`),
  document.fonts.load(`700 40px "JetBrains Mono"`), document.fonts.load(`500 40px "JetBrains Mono"`),
  logo.decode(),
]).then(() => { render(0); return true; });
})();
