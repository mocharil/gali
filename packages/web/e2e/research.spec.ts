import { test, expect } from "@playwright/test";

test("Complete-score ranking is separated from provisional scores", async ({ page, request }) => {
  const response = await request.get("/api/v1/rankings?metric=ground_truth_score");
  expect(response.status()).toBe(200);
  const items = (await response.json()).items;
  const partial = items.filter((item: { ranking_status: string }) => item.ranking_status === "provisional");
  expect(partial.length).toBeGreaterThan(0);
  expect(partial.every((item: { rank: number | null }) => item.rank === null)).toBe(true);
  await page.goto("/dashboard");
  const ptba = page.getByTestId("score-row-PTBA");
  await ptba.scrollIntoViewIfNeeded();
  await expect(ptba).toContainText("Provisional");
  await expect(page.getByText("Provisional score · outside the complete ranking")).toBeVisible();
});

test("Landing leaders use complete scores after repeated desktop and mobile navigation", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const items = (await (await request.get("/api/v1/rankings?metric=ground_truth_score")).json()).items;
  const leaders = items.filter((item: { ranking_status: string }) => item.ranking_status === "complete").slice(0, 3);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const route of ["/issuer/BYAN", "/scenario?price=-0.2&china=0.3", "/map", "/compare"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByTestId("score-row-PTBA")).toBeAttached();
    await page.goto("/", { waitUntil: "networkidle" });
    const snapshot = page.getByRole("region", { name: "Fundamental snapshot", exact: true });
    await expect(snapshot.getByText("Loading issuer data...")).toHaveCount(0);
    await expect(snapshot.getByText("Complete · 100% weight")).toHaveCount(3);
    const symbols = await snapshot.locator('a[href^="/issuer/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")!.split("/").pop()));
    expect(symbols).toEqual(leaders.map((item: { symbol: string }) => item.symbol));
    await expect(snapshot.getByText("PTBA", { exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("Scenario drivers, sensitivity, selected issuer and saved brief stay consistent", async ({ page, request }) => {
  const params = { price_shock_pct: -.2, destination_shocks: { China: .3 } };
  const result = await (await request.post("/api/v1/scenario", { data: params })).json();
  const selected = result.impacts.find((row: { symbol: string }) => row.symbol === "BYAN");
  await page.goto("/scenario?price=-0.2&china=0.3&issuer=BYAN");
  const explanation = page.getByTestId("scenario-explanation");
  await expect(explanation).toBeVisible();
  await expect(page.getByLabel("Selected issuer")).toHaveValue("BYAN");
  await expect(explanation.getByTestId("active-sensitivity")).toContainText(`${selected.delta_rbv_pct.toFixed(1)}%`);
  await expect(explanation.getByRole("table", { name: "Contributions to RBV change" })).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save research brief" }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const brief = Buffer.concat(chunks).toString("utf8");
  expect(brief).toContain("GALI Research Brief / BYAN");
  expect(brief).toContain(`${selected.delta_rbv_pct.toFixed(2)}%`);
  expect(brief).toContain("China -30.00%");
  expect(brief).toContain("not free cash flow");
  await page.getByLabel("Selected issuer").selectOption("PTBA");
  await expect(explanation).toContainText("Analysis PTBA cannot be calculated");
  await expect(explanation.getByRole("table")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Selected issuer")).toHaveValue("PTBA");
});

test("Gross losses remain visible despite the zero RBV floor", async ({ page, request }) => {
  const result = await (await request.post("/api/v1/scenario", { data: { price_shock_pct: -.5 } })).json();
  const bumi = result.impacts.find((row: { symbol: string }) => row.symbol === "BUMI");
  expect(bumi.post_shock_gp_usd).toBeLessThan(0);
  expect(bumi.post_shock_rbv_usd).toBe(0);
  await page.goto("/scenario?price=-0.5&issuer=BUMI");
  await expect(page.getByTestId("gross-loss-warning")).toContainText("Modeled gross loss");
  await expect(page.getByTestId("impact-BUMI")).toContainText("Gross loss");
});

test("Issuer profile exposes model scope, weight sensitivity and working methodology anchors", async ({ page }) => {
  await page.goto("/issuer/BYAN");
  await page.getByRole("tab", { name: "Valuation", exact: true }).click();
  await expect(page.getByTestId("valuation-context")).toContainText("Model proxy");
  await page.getByRole("tab", { name: "Score & coverage", exact: true }).click();
  await expect(page.getByTestId("score-diagnostics")).toContainText("11 configurations");
  await page.getByTestId("score-diagnostics").getByText("Explore the five pillars' weights and contributions").click();
  await expect(page.getByRole("table", { name: "Score component contributions" })).toBeVisible();
  await page.getByRole("tab", { name: "Valuation", exact: true }).click();
  await page.getByTestId("valuation-context").getByRole("link", { name: /Review formulas/ }).click();
  await expect(page.locator("#rbv")).toBeVisible();
  await page.goto("/issuer/PTBA");
  await page.getByRole("tab", { name: "Score & coverage", exact: true }).click();
  await expect(page.getByTestId("score-diagnostics")).toContainText("Not ranked");
});
