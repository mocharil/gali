// Assemble the self-contained, offline-playable GALI-Teaser.html from src/ + assets/ + data/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p));
const b64 = (p, mime) => `data:${mime};base64,${read(p).toString('base64')}`;
const json = p => JSON.stringify(JSON.parse(read(p).toString('utf8'))).replace(/<\//g, '<\\/');

const faces = [
  ['Inter', 400, 'inter-400'], ['Inter', 500, 'inter-500'], ['Inter', 600, 'inter-600'],
  ['Inter', 700, 'inter-700'], ['Inter', 800, 'inter-800'], ['Inter', 900, 'inter-900'],
  ['JetBrains Mono', 500, 'jbm-500'], ['JetBrains Mono', 700, 'jbm-700'],
].map(([family, weight, file]) =>
  `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:block;src:url(${b64(`assets/fonts/${file}.woff2`, 'font/woff2')}) format('woff2')}`,
).join('\n');

const parts = {
  '/*{{FONTS}}*/': faces,
  '{{AUDIO}}': b64('assets/GALI-Score.mp3', 'audio/mpeg'),
  '{{LOGO}}': b64('assets/gali-logo.png', 'image/png'),
  '{{DATA}}': json('data/film-data.json'),
  '{{GEO}}': json('data/geo.json'),
  '{{FILM}}': read('src/film.js').toString('utf8'),
};
let html = read('src/player.html').toString('utf8');
for (const [key, value] of Object.entries(parts)) {
  if (!html.includes(key)) throw new Error(`Template placeholder missing: ${key}`);
  html = html.split(key).join(value);
}
const out = path.join(root, 'GALI-Teaser.html');
fs.writeFileSync(out, html);
console.log(`Built ${path.relative(root, out)} (${(html.length / 1e6).toFixed(2)} MB)`);
