import { test, expect, type Page } from "@playwright/test";

const INDONESIAN_COPY = /\b(?:emiten|cadangan|izin|biaya|skor|tahun|harga|ringkasan|metodologi|cakupan|bobot|asumsi|asisten|belum|diperbarui|telusuri|pilih|tutup|buka|simpan|perhitungan|portofolio|blok|koridor|utama|parsial|sementara|lengkap|pendapatan|kotor|hingga|dalam|sebesar|dan|yang|tetap|metrik|tujuan|penjualan|ketahanan|riset|provinsi|mencakup)\b/i;

async function expectEnglish(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const copy = await page.locator("body").innerText();
  const labels = await page.locator("[aria-label], [placeholder], [title]").evaluateAll((elements) => elements.flatMap((element) => ["aria-label", "placeholder", "title"].map((attribute) => element.getAttribute(attribute) ?? "")).join("\n"));
  expect(copy, `Visible copy at ${page.url()}`).not.toMatch(INDONESIAN_COPY);
  expect(labels, `Accessible labels at ${page.url()}`).not.toMatch(INDONESIAN_COPY);
}

test("All research pages, profile tabs, evidence and search use English", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/dashboard", "/issuer/BYAN", "/issuer/PTBA", "/issuer/DSSA", "/issuer/ADMR", "/compare", "/scenario", "/cost-curve", "/map", "/divergence", "/coverage", "/methodology"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectEnglish(page);
  }
  await page.goto("/issuer/BYAN", { waitUntil: "networkidle" });
  for (const name of ["Overview", "Valuation", "Operations", "Score & coverage"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expectEnglish(page);
  }
  await page.getByRole("button", { name: /Evidence.*Provenance/ }).click();
  const evidence = page.getByRole("dialog", { name: /Evidence/ });
  await expect(evidence).toContainText("Low costs with a market capitalization premium");
  await expectEnglish(page);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search issuers and features" });
  await search.getByRole("textbox").fill("coal portfolio");
  await expect(search.getByText("BYAN · Coal portfolio", { exact: true })).toBeVisible();
  await expectEnglish(page);
});

test("English assistant prompts and downloaded research remain in English", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.keyboard.press("Control+j");
  const assistant = page.getByRole("dialog", { name: "GALI Data Assistant" });
  for (const [prompt, headline] of [
    ["Compare BUMI and BYAN", "Comparison BUMI and BYAN"],
    ["Longest reserve life", "Reserve life at the production rate"],
    ["Export market concentration", "Largest sales destination concentration"],
  ]) {
    await assistant.getByRole("button", { name: prompt, exact: true }).click();
    await expect(assistant.getByRole("heading", { name: headline, exact: true })).toBeVisible();
    await expectEnglish(page);
  }
  await assistant.getByRole("textbox").fill("Write me a poem");
  await assistant.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(assistant).toContainText("Question not supported");
  await expectEnglish(page);
  await page.keyboard.press("Escape");
  await page.goto("/scenario?price=-0.5&issuer=BUMI", { waitUntil: "networkidle" });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save research brief", exact: true }).click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const brief = Buffer.concat(chunks).toString("utf8");
  expect(brief).toContain("## Tested assumptions");
  expect(brief).toContain("Gross loss:");
  expect(brief).not.toMatch(INDONESIAN_COPY);
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.getByText("Valuation & risk matrix", { exact: true }).click();
  const csvDownloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const csvStream = await (await csvDownloading).createReadStream();
  const csvChunks: Buffer[] = [];
  for await (const chunk of csvStream!) csvChunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(csvChunks).toString("utf8");
  expect(csv).toContain('"Complete"');
  expect(csv).toContain('"Partial"');
  expect(csv).toContain('"AADI · Coal portfolio"');
  expect(csv).not.toMatch(INDONESIAN_COPY);
  expect(csv).not.toMatch(/LENGKAP|PARSIAL/);
});

test("Map labels load consistently across repeat navigation and viewport changes", async ({ page, request }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const count = (await (await request.get("/api/v1/sites")).json()).features.length;
  for (const width of [1440, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.getByText("Mining site distribution", { exact: true }).click();
    await expect(page.getByLabel("Mining site list").getByRole("button")).toHaveCount(4);
    await page.getByRole("link", { name: "Open the full map →", exact: true }).first().click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(page.getByLabel("Mining site list").getByRole("button")).toHaveCount(count);
    await expectEnglish(page);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("Mining site list").getByRole("button")).toHaveCount(count);
  }
  expect(errors).toEqual([]);
});
