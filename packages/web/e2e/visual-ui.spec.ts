import { test, expect } from "@playwright/test";

test("Mine hotspots explain each lens and open the actual license scenario", async ({ page, request }) => {
  await page.goto("/dashboard");
  const mine = page.getByRole("region", { name: "Explore the business beneath the mine" });
  await mine.getByRole("button", { name: "Operating economics", exact: true }).click();
  await expect(mine).toContainText("Every tonne has an operating cost.");
  await expect(mine.getByRole("link", { name: "Explore cost positions" })).toHaveAttribute("href", "/cost-curve");
  await mine.getByRole("button", { name: "License window", exact: true }).click();
  await expect(mine.getByRole("button", { name: "License window", exact: true })).toHaveAttribute("aria-pressed", "true");
  await mine.getByRole("link", { name: "Test a license assumption" }).click();
  await expect(page).toHaveURL(/cliff=1/);
  await expect(page.getByRole("checkbox", { name: /No renewal for licenses/ })).toBeChecked();
  const scenario = await (await request.post("/api/v1/scenario", { data: { license_cliff_expiry_shock: true } })).json();
  const gems = scenario.impacts.find((issuer: { symbol: string }) => issuer.symbol === "GEMS");
  await expect(page.getByTestId("impact-GEMS")).toContainText(gems.delta_rbv_pct.toFixed(2) + "%");
  await expect(page.getByLabel("Scenario driver assumptions")).toContainText("No renewal ≤3 years");
});

test("Illustrated unit economics and valuation keep issuer values and missing data", async ({ page, request }) => {
  const points = (await (await request.get("/api/v1/cost-curve")).json()).points;
  await page.goto("/cost-curve");
  const economics = page.getByRole("region", { name: "One-tonne unit economics" });
  for (const symbol of ["BYAN", "BUMI"]) {
    await page.getByLabel("Unit economics issuer").selectOption(symbol);
    const point = points.find((item: { symbol: string }) => item.symbol === symbol);
    for (const key of ["realized_price_per_ton_usd", "cash_cost_per_ton_usd", "unit_margin_usd"]) {
      await expect(economics).toContainText("$" + point[key].toFixed(2) + " / tonne");
    }
  }
  const issuers = await (await request.get("/api/v1/issuers")).json();
  await page.goto("/divergence");
  const valuation = page.getByRole("region", { name: "Market and reserve-value perspectives" });
  for (const symbol of ["AADI", "BYAN", "PTBA"]) {
    await page.getByLabel("Valuation example issuer").selectOption(symbol);
    const issuer = issuers.find((item: { symbol: string }) => item.symbol === symbol);
    if (issuer.rbv_gap_pct == null) {
      await expect(valuation).toContainText("Gap unavailable");
      await expect(valuation).toContainText("Unavailable");
    } else {
      await expect(valuation).toContainText((issuer.reserve_backed_value_usd / 1e9).toFixed(2) + "B");
      await expect(valuation).toContainText((issuer.market_cap_usd / 1e9).toFixed(2) + "B");
      await expect(valuation).toContainText(issuer.rbv_gap_pct.toFixed(1) + "% gap");
    }
  }
});

test("The geographic map uses exact dataset coordinates and supports zoom and pan", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sites = (await (await request.get("/api/v1/sites")).json()).features;
  await page.goto("/map");
  const map = page.getByTestId("geographic-map");
  await expect(map).toHaveAttribute("data-map-engine", "maplibre");
  await expect.poll(async () => map.locator("canvas").evaluate((canvas) => canvas.getBoundingClientRect().height)).toBeGreaterThan(300);
  await expect.poll(async () => page.getByTestId("map-cluster").evaluateAll((nodes) => nodes.reduce((sum, node) => sum + Number(node.getAttribute("data-count")), 0))).toBe(sites.length);
  await page.getByLabel("Issuer filter", { exact: true }).selectOption("AADI");
  await page.getByRole("button", { name: "Focus on Kalimantan", exact: true }).click();
  const markers = map.getByRole("button", { name: /^Select / });
  const expected = sites.filter((site: { properties: { issuer_symbols: string[] } }) => site.properties.issuer_symbols.includes("AADI"));
  await expect(markers).toHaveCount(expected.length);
  for (const site of expected) {
    const marker = map.locator(`[data-site="${site.properties.slug}"]`);
    await expect(marker).toHaveAttribute("data-longitude", String(site.geometry.coordinates[0]));
    await expect(marker).toHaveAttribute("data-latitude", String(site.geometry.coordinates[1]));
  }
  await map.scrollIntoViewIfNeeded();
  const first = markers.first();
  const beforeZoom = await first.boundingBox();
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect.poll(async () => (await first.boundingBox())?.x).not.toBe(beforeZoom?.x);
  await map.scrollIntoViewIfNeeded();
  const beforePan = await first.boundingBox();
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + box.height - 100);
  await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + box.height - 80, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await first.boundingBox())?.x).not.toBe(beforePan?.x);
  await page.getByLabel("Mining site list").getByRole("button").first().click();
  await expect(page.getByLabel("Selected site details")).toContainText(expected[0].geometry.coordinates[1].toFixed(6));
  await map.getByRole("button", { name: "All Indonesia", exact: true }).click();
  await expect(page.getByTestId("offline-map")).toHaveAttribute("data-region", "Indonesia");
  await expect.poll(async () => map.getByTestId("map-cluster").evaluateAll((nodes) => nodes.reduce((sum, node) => sum + Number(node.getAttribute("data-count")), 0))).toBe(expected.length);
});

test("A device without WebGL retains geographic boundaries, filters and map controls", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith("webgl") || type === "experimental-webgl") return null;
      return getContext.call(this, type as "2d", ...args as [CanvasRenderingContext2DSettings]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/map");
  const map = page.getByTestId("offline-map");
  const svg = map.getByRole("group", { name: "Geographic map of Indonesia with interactive mining sites" });
  await expect(svg).toBeVisible();
  await expect.poll(async () => svg.locator('path[fill-rule="evenodd"]').count()).toBe(13);
  const before = await svg.getAttribute("viewBox");
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(svg).not.toHaveAttribute("viewBox", before!);
  await page.getByLabel("Issuer filter", { exact: true }).selectOption("PTBA");
  await page.getByLabel("Mining site list").getByRole("button").first().click();
  await expect(page.getByLabel("Selected site details")).toContainText("PTBA");
  await expect(map.getByRole("button", { name: /^Select / })).toHaveCount(4);
});

test("Street detail is optional and a tile failure returns to bundled geography", async ({ page }) => {
  let tileRequests = 0;
  await page.route("https://tile.openstreetmap.org/**", (route) => { tileRequests++; return route.abort("internetdisconnected"); });
  await page.goto("/map");
  const map = page.getByTestId("geographic-map");
  await expect(map).toHaveAttribute("data-basemap", "geographic");
  await expect(page.getByRole("button", { name: "Street detail", exact: true })).toBeEnabled();
  expect(tileRequests).toBe(0);
  await page.getByRole("button", { name: "Street detail", exact: true }).click();
  await expect(map.getByRole("status")).toContainText("Street tiles are unavailable. Showing bundled geography.");
  await expect(map).toHaveAttribute("data-basemap", "geographic");
  expect(tileRequests).toBeGreaterThan(0);
  await page.getByLabel("Mining site list").getByRole("button").first().click();
  await expect(page.getByLabel("Selected site details")).toBeVisible();
});
