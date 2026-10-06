import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/web/package.json'));
const sharp = require('sharp');
const source = path.join(root, 'assets/illustrations');
const output = path.join(root, 'packages/web/public/visuals');
await fs.mkdir(output, { recursive: true });
const records = [];
for (const name of (await fs.readdir(source)).filter((name) => name.endsWith('.png')).sort()) {
  const input = path.join(source, name);
  const destination = path.join(output, name.replace('.png', '.webp'));
  const metadata = await sharp(input).metadata();
  await sharp(input).resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 100, effort: 6 }).toFile(destination);
  const rendered = await sharp(destination).metadata();
  records.push({ name: name.replace('.png', ''), source: `assets/illustrations/${name}`,
    asset: `packages/web/public/visuals/${path.basename(destination)}`,
    sourceWidth: metadata.width, sourceHeight: metadata.height,
    width: rendered.width, height: rendered.height, hasAlpha: rendered.hasAlpha,
    sourceBytes: (await fs.stat(input)).size, assetBytes: (await fs.stat(destination)).size });
}
await fs.writeFile(path.join(root, 'docs/visual-assets/manifest.json'), JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify({ assets: records.length, bytes: records.reduce((sum, record) => sum + record.assetBytes, 0), allTransparent: records.every((record) => record.hasAlpha) }));
