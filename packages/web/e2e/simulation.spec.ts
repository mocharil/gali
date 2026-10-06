import { test, expect } from "@playwright/test";

test("Bundled dataset: source, all endpoints, validation, depth and offline map", async ({ page, request }) => {
  const mode = await request.get("/api/dataset");
  test.skip(mode.status() !== 200 || (await mode.json()).mode !== "simulation", "Explicit simulation mode only");
  for (const route of ["/health", "/ready", "/api/v1/issuers", "/api/v1/sites", "/api/v1/cost-curve", "/api/v1/coverage", "/api/v1/flow-overlay", "/api/v1/rankings", "/api/v1/issuers/ADRO/graph"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()["x-gali-data-source"], route).toBe("synthetic");
  }
  expect((await request.get("/api/v1/rankings?metric=invalid")).status()).toBe(422);
  expect((await request.post("/api/v1/scenario", { data: { discount_rate: 0 } })).status()).toBe(422);
  expect((await request.post("/api/v1/scenario", { data: "invalid json", headers: { "Content-Type": "application/json" } })).status()).toBe(422);
  const sites = await (await request.get("/api/v1/sites")).json();
  expect(sites.features).toHaveLength(36);
  const external: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (["http:", "https:"].includes(url.protocol) && !url.hostname.match(/^(localhost|127\.0\.0\.1)$/)) external.push(req.url());
  });
  await page.goto("/dashboard");
  await expect(page.getByTestId("dataset-origin")).toContainText("Simulation dataset");
  const price = await (await request.post("/api/v1/scenario", { data: { price_shock_pct: -.2 } })).json();
  const bumi = price.impacts.find((item: { symbol: string }) => item.symbol === "BUMI");
  await page.getByText("See the impact on each issuer", { exact: true }).click();
  await expect(page.getByTestId("resilience-BUMI")).toContainText(`${bumi.delta_rbv_pct.toFixed(1)}%`);
  await expect(page.getByTestId("resilience-PTBA")).toContainText("—");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export analysis", exact: true }).click();
  const exported = await download;
  const stream = await exported.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"Dataset Source","Dataset As Of"');
  expect(csv).toContain('"synthetic","2026-09-30"');
  await page.goto("/issuer/BYAN");
  await page.getByRole("tab", { name: "Operations", exact: true }).click();
  await expect(page.getByTestId("issuer-economics")).toContainText("Gross profit sensitivity");
  await page.getByText(/Explore .* licenses/).click();
  await expect(page.getByTestId("issuer-economics")).toContainText("SIM-BYAN");
  await page.goto("/map");
  await expect(page.getByTestId("offline-map")).toBeVisible();
  await expect.poll(async () => page.getByTestId("map-cluster").evaluateAll((clusters) => clusters.reduce((sum, cluster) => sum + Number(cluster.getAttribute("data-count")), 0))).toBe(sites.features.length);
  await page.getByLabel("Search sites, provinces, or issuers").fill("AADI");
  await page.getByRole("button", { name: "Focus on Kalimantan", exact: true }).click();
  await expect(page.getByTestId("offline-map").getByRole("button", { name: /^Select / })).toHaveCount(4);
  await page.getByTestId("offline-map").getByRole("button", { name: /^Select / }).first().click();
  await expect(page.getByLabel("Selected site details")).toContainText("AADI");
  expect(external).toEqual([]);
});

test("Advanced scenario assumptions change outputs and persist across refresh", async ({ page, request }) => {
  await page.goto("/scenario?price=-0.2&china=0.3&rate=0.16&variable=0.8");
  await expect(page.getByLabel("Discount rate", { exact: false })).toHaveValue("0.16");
  await expect(page.getByLabel("Variable-cost share", { exact: false })).toHaveValue("0.8");
  const expected = await (await request.post("/api/v1/scenario", { data: { price_shock_pct: -.2, destination_shocks: { China: .3 }, discount_rate: .16, variable_cost_share: .8 } })).json();
  const byan = expected.impacts.find((item: { symbol: string }) => item.symbol === "BYAN");
  await expect(page.getByTestId("impact-BYAN")).toContainText(`${byan.delta_rbv_pct.toFixed(2)}%`);
  await page.getByLabel("Discount rate", { exact: false }).fill("0.17");
  await expect(page).toHaveURL(/rate=0.17/);
  await page.reload();
  await expect(page.getByLabel("Discount rate", { exact: false })).toHaveValue("0.17");
  const next = await (await request.post("/api/v1/scenario", { data: { price_shock_pct: -.2, destination_shocks: { China: .3 }, discount_rate: .17, variable_cost_share: .8 } })).json();
  await expect(page.getByTestId("impact-BYAN")).toContainText(`${next.impacts.find((item: { symbol: string }) => item.symbol === "BYAN").delta_rbv_pct.toFixed(2)}%`);
});
