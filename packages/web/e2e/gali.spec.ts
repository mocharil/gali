import { test, expect } from "@playwright/test";

// API-derived assertions, never stale hardcoded production scores or credit totals.
test("Landing → dashboard → issuer → evidence; assistant and search use API facts", async ({ page, request }) => {
  const issuers = await (await request.get("/api/v1/issuers")).json();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See the business");
  await page.getByRole("link", { name: /Start analysis/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const issuer of issuers) await expect(page.locator("main").getByRole("link", { name: new RegExp(issuer.symbol) }).first()).toBeVisible();
  await page.locator("main").getByRole("link", { name: /ADRO/ }).first().click();
  await expect(page.getByRole("heading", { name: "ADRO", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Evidence.*Provenance/ }).click();
  const evidence = page.getByRole("dialog", { name: /Evidence/ });
  await expect(evidence.getByText("Calculation context", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(evidence).toBeHidden();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search issuers and features" });
  await expect(search).toBeVisible();
  await search.getByRole("textbox").fill("BYAN");
  const byan = issuers.find((issuer: { symbol: string }) => issuer.symbol === "BYAN");
  await expect(search.getByText(`Score: ${byan.ground_truth_score.toFixed(1)}`)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+j");
  const assistant = page.getByRole("dialog");
  await expect(assistant).toContainText("Rule-based");
  await assistant.getByRole("textbox").fill("compare ADRO and BYAN");
  await assistant.getByRole("button", { name: /Analyze/ }).click();
  await expect(assistant).toContainText("ADRO");
  await expect(assistant).toContainText("BYAN");
  await page.keyboard.press("Escape");
});

test("Scenario zero baseline, percent scale, CSV, presets and refresh persistence", async ({ page, request }) => {
  await page.goto("/scenario");
  const row = page.getByTestId("impact-ADRO");
  await expect(row).toContainText("0.00%");
  await expect(page.getByTestId("impact-PTBA")).toContainText("—");
  await page.getByRole("button", { name: "Price −25%", exact: true }).click();
  const shock = await (await request.post("/api/v1/scenario", { data: { price_shock_pct: -0.25 } })).json();
  const adro = shock.impacts.find((item: { symbol: string }) => item.symbol === "ADRO");
  await expect(row).toContainText(`${adro.delta_rbv_pct.toFixed(2)}%`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const exported = await download;
  const stream = await exported.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain(`"${adro.delta_rbv_pct}"`);
  await expect(page).toHaveURL(/price=-0.25/);
  await page.reload();
  await expect(page.getByLabel("Commodity price change")).toHaveValue("-0.25");
  await expect(row).toContainText(`${adro.delta_rbv_pct.toFixed(2)}%`);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(row).toContainText("0.00%");
  await page.getByRole("button", { name: "No license renewal", exact: true }).click();
  const expiry = await (await request.post("/api/v1/scenario", { data: { license_cliff_expiry_shock: true } })).json();
  const gems = expiry.impacts.find((item: { symbol: string }) => item.symbol === "GEMS");
  await expect(page.getByTestId("impact-GEMS")).toContainText(`${gems.delta_rbv_pct.toFixed(2)}%`);
});

test("Compare correct pillars, distinct pair, shared URL and partial data", async ({ page }) => {
  await page.goto("/compare?a=ADRO&b=BYAN");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main .recharts-radar")).toHaveCount(2);
  await page.getByLabel("Issuer B", { exact: true }).selectOption("PTBA");
  await expect(page.locator("main")).toContainText("Available pillars");
  await expect(page.locator("main .recharts-radar")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Issuer B", { exact: true })).toHaveValue("PTBA");
  await page.goto("/compare?a=BYAN&b=BYAN");
  await expect(page.getByLabel("Issuer A", { exact: true })).toHaveValue("BYAN");
  await expect(page.getByLabel("Issuer B", { exact: true })).toHaveValue("ADRO");
});

test("Cost curve tooltip, map location → issuer, coverage and divergence", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cost-curve");
  await expect(page.locator("main .recharts-area")).toBeVisible();
  const chart = page.locator("main .recharts-wrapper");
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.5);
  await expect(page.locator("main .recharts-tooltip-wrapper")).toContainText("Volume:");
  const sites = await (await request.get("/api/v1/sites")).json();
  const site = sites.features.find((item: { properties: { issuer_symbol: string } }) => item.properties.issuer_symbol === "AADI");
  await page.goto("/map");
  await page.getByLabel("Mining site list").getByRole("button", { name: new RegExp(site.properties.name.replace(/^Blok /, "Block ")) }).click();
  await expect(page.getByLabel("Selected site details")).toContainText(site.geometry.coordinates[0].toFixed(6));
  await page.getByRole("link", { name: "Profile AADI →", exact: true }).click();
  await expect(page).toHaveURL(/\/issuer\/AADI/);
  await page.goto("/coverage");
  const coverage = await (await request.get("/api/v1/coverage")).json();
  await expect(page.locator("main")).toContainText(`${coverage.metrics[0].numerator} / ${coverage.metrics[0].denominator}`);
  await page.goto("/divergence");
  await expect(page.locator("main")).toContainText("ADRO");
  expect(errors).toEqual([]);
});

test("Failure and empty states: API 503, scenario error, empty dataset, missing issuer", async ({ page }) => {
  await page.route("**/api/v1/issuers", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{}' }));
  await page.goto("/dashboard");
  await expect(page.locator("main").getByText("Data could not be loaded", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("main").getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute("**/api/v1/issuers");
  await page.route("**/api/v1/issuers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '[]' }));
  await page.reload();
  await expect(page.locator("main")).toContainText("No data");
  await page.unroute("**/api/v1/issuers");
  await page.route("**/api/v1/scenario", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{}' }));
  await page.goto("/scenario");
  await expect(page.locator("main")).toContainText("Data could not be loaded");
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
  await page.unroute("**/api/v1/scenario");
  await page.goto("/issuer/UNKNOWN");
  await expect(page.locator("main")).toContainText("The requested data is unavailable");
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`Responsive navigation and all routes at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
    for (const route of ["/", "/dashboard", "/issuer/ADRO", "/issuer/PTBA", "/compare", "/scenario", "/cost-curve", "/map", "/divergence", "/coverage", "/methodology"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForTimeout(450);
      const widths = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(widths.actual, `Overflow at ${route}`).toBeLessThanOrEqual(widths.viewport + 1);
      if (["/", "/dashboard", "/scenario", "/compare", "/map"].includes(route)) await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "") || "landing"}.png`), fullPage: true });
    }
    if (viewport.width < 1024) {
      await page.getByRole("button", { name: /Open navigation menu/ }).click();
      await expect(page.getByRole("link", { name: /Scenario Studio/ }).first()).toBeVisible();
      await page.getByRole("link", { name: /Scenario Studio/ }).first().click();
      await expect(page).toHaveURL(/\/scenario/);
    } else {
      await page.getByRole("button", { name: "Collapse or expand navigation" }).click();
      await page.reload();
      expect(await page.evaluate(() => localStorage.getItem("gali_sidebar_collapsed"))).toBe("true");
    }
    await page.keyboard.press("Control+j");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("assistant.png") });
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });
}
