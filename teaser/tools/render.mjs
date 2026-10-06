// Render GALI-Teaser.html frame-by-frame (deterministic, 30 fps) and mux with the score.
// Requires: Node 20+, `npm install`, `npx playwright install chromium`, FFmpeg on PATH.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'GALI-Teaser-60s.mp4');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(pathToFileURL(path.join(root, 'GALI-Teaser.html')).href);
  await page.evaluate(() => window.__ready);
  const { duration, fps } = await page.evaluate(() => window.filmInfo);
  const encoder = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'warning',
    '-thread_queue_size', '64', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0',
    '-i', path.join(root, 'assets', 'GALI-Score.mp3'),
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(duration), '-movflags', '+faststart', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const exited = once(encoder, 'close');
  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    const jpeg = await page.evaluate(t => {
      window.renderFrame(t);
      return document.getElementById('film').toDataURL('image/jpeg', 0.95).split(',')[1];
    }, i / fps);
    if (!encoder.stdin.write(Buffer.from(jpeg, 'base64'))) await once(encoder.stdin, 'drain');
    if (i % (fps * 5) === 0) console.log(`${Math.round((i / total) * 100)}%  (${(i / fps).toFixed(0)} s)`);
  }
  encoder.stdin.end();
  const [code] = await exited;
  if (code !== 0 || errors.length) throw new Error(`Render failed: ffmpeg=${code}; page=${errors.join('; ')}`);
  console.log(`Done: ${path.relative(root, output)} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB)`);
} finally {
  await browser.close();
}
