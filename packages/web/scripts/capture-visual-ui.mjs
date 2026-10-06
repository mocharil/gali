import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = process.env.GALI_VISUAL_QA_OUTPUT;
if (!output) throw new Error('Set GALI_VISUAL_QA_OUTPUT to a screenshot directory.');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let errors = [], failures = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400 && !response.url().includes('favicon')) failures.push({ url: response.url(), status: response.status() }); });
  for (const feature of [
    ['landing', '/'], ['dashboard', '/dashboard'], ['issuer', '/issuer/BYAN'], ['compare', '/compare'],
    ['map', '/map'], ['scenario', '/scenario?price=-0.2&china=0.3'], ['cost-curve', '/cost-curve'],
    ['valuation', '/divergence'], ['coverage', '/coverage'], ['methodology', '/methodology'], ['assistant', '/dashboard'],
  ]) {
    errors = []; failures = [];
    const [name, route] = feature;
    await page.goto('http://127.0.0.1:3000' + route, { waitUntil: 'networkidle' });
    if (name === 'map') {
      await page.getByLabel('Mining site list').getByRole('button').first().click();
      await page.getByLabel('Selected site details').waitFor();
      await page.getByTestId('offline-map').getByRole('button', { name: /^Select / }).first().waitFor({ state: 'visible' });
    }
    if (name === 'assistant') {
      await page.keyboard.press('Control+j');
      await page.getByRole('dialog', { name: 'GALI Data Assistant' }).waitFor();
    }
    const images = page.locator('[data-visual-asset] img');
    for (const image of await images.all()) await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-visual-asset] img')).every((image) => image.complete && image.naturalWidth > 0));
    await page.evaluate(() => window.scrollTo(0, 0));
    if (name === 'assistant') await page.getByRole('dialog').evaluate((dialog) => dialog.scrollTop = 0);
    await page.mouse.move(0, 0);
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth,
      images: Array.from(document.querySelectorAll('[data-visual-asset]')).map((element) => {
        const image = element.querySelector('img');
        return { name: element.getAttribute('data-visual-asset'), loaded: image.complete && image.naturalWidth > 0, width: image.clientWidth, height: image.clientHeight };
      }),
      overflowing: Array.from(document.querySelectorAll('main *')).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1) && getComputedStyle(element).position !== 'absolute';
      }).slice(0, 15).map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 80) })),
    }));
    await page.screenshot({ path: path.join(output, `${viewport.name}-${name}.png`), fullPage: true });
    if (name === 'dashboard') await page.screenshot({ path: path.join(output, `${viewport.name}-dashboard-viewport.png`), fullPage: false });
    report.push({ feature: name, viewport: viewport.name, ...metrics, errors: [...errors], failures: [...failures] });
    console.log(JSON.stringify({ feature: name, viewport: viewport.name, overflow: metrics.documentWidth > metrics.viewport, assets: metrics.images.length, errors, failures }));
  }
  await context.close();
}
await browser.close();
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
