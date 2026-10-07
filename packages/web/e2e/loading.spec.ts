import { test, expect, type Page, type Route } from "@playwright/test";
import aiFixture from "./fixtures/gemini-answer.json";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
async function settle(page: Page) { await expect(page.getByTestId("app-activity")).toBeHidden({ timeout: 15_000 }); }
async function continueSafely(route: Route) { await route.continue().catch(() => undefined); }

for (const [path, endpoint, label] of [
  ["/coverage", "**/api/v1/coverage", "Loading data coverage…"],
  ["/cost-curve", "**/api/v1/cost-curve?**", "Loading the cost curve…"],
  ["/issuer/BUMI", "**/api/v1/issuers/BUMI", "Loading BUMI profile…"],
]) {
  test(`Slow data: ${path} provides feedback until the response arrives`, async ({ page }) => {
    const held = gate(); await page.route(endpoint, async (route) => { await held.promise; await continueSafely(route); });
    await page.goto(path); await expect(page.getByTestId("loading-state")).toContainText(label);
    await expect(page.getByTestId("app-activity")).toContainText("Loading analysis data…");
    if (path === "/coverage") await page.screenshot({ path: "../../docs/screenshots/loading-data-desktop.png" });
    held.release(); await expect(page.getByTestId("loading-state")).toBeHidden(); await settle(page);
  });
}

test("Sidebar navigation responds before a delayed route arrives", async ({ page }) => {
  const held = gate();
  await page.route(/\/compare\?_rsc=/, async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/methodology"); await settle(page);
  const link = page.getByRole("navigation", { name: "GALI research", exact: true }).getByRole("link", { name: "Compare issuers", exact: true });
  await link.click(); await expect(page.getByTestId("app-activity")).toContainText("Opening Compare issuers…");
  await expect(link.getByTestId("link-pending")).toBeVisible();
  await page.screenshot({ path: "../../docs/screenshots/loading-navigation-desktop.png" });
  held.release(); await expect(page).toHaveURL(/\/compare/); await settle(page); await expect(page.getByTestId("link-pending")).toHaveCount(0);
});

test("Search navigation retains feedback after the palette closes", async ({ page }) => {
  const held = gate(); await page.route(/\/cost-curve\?_rsc=/, async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/methodology"); await settle(page); await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search issuers and features" });
  await dialog.getByRole("textbox").fill("Cost curve"); await dialog.getByRole("button", { name: /Cost curve/ }).click();
  await expect(dialog).toBeHidden(); await expect(page.getByTestId("app-activity")).toContainText("Opening Cost curve…");
  held.release(); await expect(page).toHaveURL(/\/cost-curve/); await settle(page);
});

test("Mobile landing navigation retains feedback after its menu unmounts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const held = gate(); await page.route(/\/compare\?_rsc=/, async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/"); await settle(page); await page.getByRole("button", { name: "Menu", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
  await nav.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(nav).toBeHidden(); await expect(page.getByTestId("app-activity")).toContainText("Opening Compare issuers…");
  held.release(); await expect(page).toHaveURL(/\/compare/); await settle(page);
});

test("Assistant evidence links retain feedback after the assistant closes", async ({ page }) => {
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: { state: "configured", model: "gemini-3.8-flash", location: "global", message: "Test credentials configured", last_verified_at: null } }));
  await page.route("**/api/ai/analyze", (route) => route.fulfill({ json: aiFixture }));
  const held = gate(); await page.route(/\/issuer\/BUMI\?_rsc=/, async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/dashboard"); await settle(page); await page.keyboard.press("Control+j");
  const dialog = page.getByRole("dialog", { name: "GALI Data Assistant" });
  await dialog.getByLabel("Analysis question").fill("Explain BUMI"); await dialog.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(dialog.getByTestId("ai-answer")).toBeVisible(); await settle(page);
  await dialog.getByTestId("ai-answer").locator('a[href="/issuer/BUMI"]').first().click();
  await expect(dialog).toBeHidden(); await expect(page.getByTestId("app-activity")).toContainText("Opening BUMI profile…");
  held.release(); await expect(page).toHaveURL(/\/issuer\/BUMI/); await settle(page);
});

test("A newer menu selection cancels the prior navigation indicator", async ({ page }) => {
  const held = gate(); await page.route(/\/compare\?_rsc=/, async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/coverage"); await settle(page);
  const nav = page.getByRole("navigation", { name: "GALI research", exact: true });
  await nav.getByRole("link", { name: "Compare issuers", exact: true }).click(); await expect(page.getByTestId("app-activity")).toBeVisible();
  await nav.getByRole("link", { name: "Methodology", exact: true }).click(); await expect(page).toHaveURL(/\/methodology/); await settle(page);
  held.release(); await expect(page).toHaveURL(/\/methodology/); await expect(page.getByTestId("link-pending")).toHaveCount(0);
});

test("Current-page, modified clicks, and browser back do not leave a navigation spinner behind", async ({ page }) => {
  await page.goto("/methodology"); await settle(page);
  const nav = page.getByRole("navigation", { name: "GALI research", exact: true });
  await nav.getByRole("link", { name: "Methodology", exact: true }).click(); await settle(page);
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      (window as unknown as { modifiedClick: unknown }).modifiedClick = { control: event.ctrlKey, intercepted: event.defaultPrevented };
      // Observe the app's handling before suppressing the browser's new-tab default.
      event.preventDefault();
    }, { once: true });
  });
  await nav.getByRole("link", { name: "Data coverage", exact: true }).click({ modifiers: ["Control"] });
  expect(await page.evaluate(() => (window as unknown as { modifiedClick: unknown }).modifiedClick)).toEqual({ control: true, intercepted: false });
  await expect(page).toHaveURL(/\/methodology/); await settle(page);
  await nav.getByRole("link", { name: "Data coverage", exact: true }).click(); await expect(page).toHaveURL(/\/coverage/); await settle(page);
  await page.goBack(); await expect(page).toHaveURL(/\/methodology/); await settle(page);
});

test("Comparison keeps its loader while either selected issuer is still loading", async ({ page }) => {
  await page.goto("/compare"); await settle(page);
  const a = gate(), b = gate();
  await page.route("**/api/v1/issuers/PTBA", async (route) => { await a.promise; await continueSafely(route); });
  await page.route("**/api/v1/issuers/ITMG", async (route) => { await b.promise; await continueSafely(route); });
  await page.getByRole("button", { name: "PTBA vs ITMG", exact: true }).click();
  await expect(page.getByTestId("loading-state")).toContainText("Loading PTBA and ITMG comparison…");
  a.release(); await expect(page.getByTestId("app-activity")).toBeVisible(); await expect(page.getByTestId("loading-state")).toBeVisible();
  b.release(); await expect(page.getByTestId("loading-state")).toBeHidden(); await settle(page);
});

test("Scenario changes calculate visibly and disable stale exports", async ({ page }) => {
  await page.goto("/scenario"); await settle(page);
  const held = gate(); await page.route("**/api/v1/scenario", async (route) => { await held.promise; await continueSafely(route); });
  await page.getByRole("button", { name: "Price −25%", exact: true }).click();
  await expect(page.getByTestId("loading-state")).toContainText("Calculating the latest scenario…");
  await expect(page.getByTestId("app-activity")).toContainText("Calculating the latest scenario…");
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
  held.release(); await expect(page.getByTestId("loading-state")).toBeHidden(); await settle(page);
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeEnabled();
});

test("Retry reports pending work and clears the indicator after recovery", async ({ page }) => {
  let requests = 0; const held = gate();
  await page.route("**/api/v1/coverage", async (route) => {
    if (++requests <= 2) return route.fulfill({ status: 503, json: { detail: "Test data temporarily unavailable." } });
    await held.promise; await continueSafely(route);
  });
  await page.goto("/coverage"); await expect(page.locator("main").getByRole("alert")).toContainText("Data could not be loaded"); await settle(page);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByTestId("app-activity")).toBeVisible(); await expect.poll(() => requests).toBe(3);
  held.release(); await expect(page.locator("main").getByRole("alert")).toBeHidden(); await settle(page); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Copy displays a busy button until the clipboard operation finishes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => new Promise<void>((resolve) => { (window as unknown as { releaseClipboard: () => void }).releaseClipboard = resolve; }) } });
  });
  await page.goto("/scenario"); await settle(page); await page.getByRole("button", { name: "Copy scenario", exact: true }).click();
  const busy = page.getByRole("button", { name: "Copying link…", exact: true }); await expect(busy).toBeDisabled(); await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("app-activity")).toContainText("Copying link…");
  await page.evaluate(() => (window as unknown as { releaseClipboard: () => void }).releaseClipboard());
  await expect(page.getByText("Scenario link copied.", { exact: true })).toBeVisible(); await settle(page); await expect(page.getByRole("button", { name: "Copy scenario", exact: true })).toBeEnabled();
});

test("File export paints preparation feedback and returns to its enabled state", async ({ page }) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL;
    URL.createObjectURL = (blob) => {
      const pending = document.querySelector('button[aria-busy="true"]');
      (window as unknown as { exportFeedback: unknown }).exportFeedback = { button: pending?.textContent, global: Boolean(document.querySelector('[data-testid="app-activity"]')) };
      return create.call(URL, blob);
    };
  });
  await page.goto("/scenario"); await settle(page);
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export CSV", exact: true }).click(); await download;
  expect(await page.evaluate(() => (window as unknown as { exportFeedback: unknown }).exportFeedback)).toMatchObject({ button: "Preparing CSV…", global: true });
  await settle(page); await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeEnabled();
});

test("A failed file action clears loading and allows a retry", async ({ page }) => {
  await page.addInitScript(() => { URL.createObjectURL = () => { throw new Error("Test file preparation failure"); }; });
  await page.goto("/scenario"); await settle(page); await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("This action could not be completed"); await settle(page); await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeEnabled();
});

test("Print paints preparation feedback before opening the browser dialog", async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      (window as unknown as { printFeedback: unknown }).printFeedback = {
        button: document.querySelector('button[aria-busy="true"]')?.textContent,
        global: Boolean(document.querySelector('[data-testid="app-activity"]')),
      };
    };
  });
  await page.goto("/issuer/BUMI"); await settle(page); await page.getByRole("button", { name: "Print page", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { printFeedback: unknown }).printFeedback)).toEqual({ button: "Preparing print…", global: true });
  await settle(page); await expect(page.getByRole("button", { name: "Print page", exact: true })).toBeEnabled();
});

test("Gemini cancellation ends global and local loading together", async ({ page }) => {
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: { state: "configured", model: "gemini-3.8-flash", location: "global", message: "Test credentials configured", last_verified_at: null } }));
  const held = gate(); await page.route("**/api/ai/analyze", async (route) => { await held.promise; await route.fulfill({ json: aiFixture }).catch(() => undefined); });
  await page.goto("/dashboard"); await settle(page); await page.keyboard.press("Control+j");
  const dialog = page.getByRole("dialog", { name: "GALI Data Assistant" });
  await dialog.getByLabel("Analysis question").fill("Explain BUMI"); await dialog.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(page.getByTestId("app-activity")).toContainText("Preparing AI analysis…");
  await dialog.getByRole("button", { name: "Stop analysis", exact: true }).click(); await settle(page); held.release();
  await expect(dialog.getByTestId("ai-answer")).toHaveCount(0); await expect(dialog.getByRole("button", { name: "Ask AI", exact: true })).toBeEnabled();
});

test("Street tiles provide loading feedback and failures return to bundled geography", async ({ page }) => {
  const held = gate(); let requests = 0;
  await page.route("https://tile.openstreetmap.org/**", async (route) => { requests++; await held.promise; await route.fulfill({ status: 503, body: "Test tile unavailable" }).catch(() => undefined); });
  await page.goto("/map"); await settle(page); await page.getByRole("button", { name: "Street detail", exact: true }).click();
  await expect.poll(() => requests).toBeGreaterThan(0); await expect(page.getByTestId("app-activity")).toContainText("Loading street detail…");
  held.release(); await expect(page.getByTestId("geographic-map")).toHaveAttribute("data-basemap", "geographic", { timeout: 20_000 }); await settle(page);
});

test("Mobile loading remains within the viewport and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "reduce" });
  const held = gate(); await page.route("**/api/v1/coverage", async (route) => { await held.promise; await continueSafely(route); });
  await page.goto("/coverage"); await expect(page.getByTestId("app-activity")).toBeVisible(); await expect(page.getByTestId("loading-state")).toBeVisible();
  expect(await page.locator(".gali-loading-progress").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "../../docs/screenshots/loading-data-mobile.png" }); held.release(); await settle(page);
});
