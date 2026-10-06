import { test, expect, type Page } from "@playwright/test";
import fixture from "./fixtures/gemini-answer.json";

const configured = { state: "configured", message: "Credentials are configured. Test the connection or run an analysis to verify access.", model: "gemini-3.8-flash", location: "global", last_verified_at: null };
async function setup(page: Page) {
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: configured }));
}
async function open(page: Page) {
  await page.keyboard.press("Control+j");
  const dialog = page.getByRole("dialog", { name: "GALI Data Assistant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("AI endpoints: missing credentials, origin check, bounded input, and no fabricated success", async ({ request }) => {
  const status = await (await request.get("/api/ai/status")).json();
  expect(status.state).toBe("not_configured"); expect(status.last_verified_at).toBeNull();
  expect(JSON.stringify(status)).not.toMatch(/private_key|client_email|access_token/);
  const denied = await request.post("/api/ai/analyze", { headers: { Origin: "https://other.invalid" }, data: { mode: "chat", question: "Explain BUMI" } });
  expect(denied.status()).toBe(403);
  const injected = await request.post("/api/ai/analyze", { data: { mode: "chat", question: "Explain BUMI", issuers: [{ fake: 999 }] } });
  expect(injected.status()).toBe(422);
  const missing = await request.post("/api/ai/analyze", { data: { mode: "chat", question: "Explain BUMI" } });
  expect(missing.status()).toBe(503); expect((await missing.json()).code).toBe("AI_NOT_CONFIGURED");
  const check = await request.post("/api/ai/check"); expect(check.status()).toBe(503);
});

test("Without credentials: data analysis works and Gemini setup is explicit", async ({ page }) => {
  await page.goto("/dashboard");
  const dialog = await open(page);
  await expect(dialog.getByRole("button", { name: "Data analysis", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByLabel("Analysis question").fill("Compare BUMI and BYAN");
  await dialog.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(dialog).toContainText("Comparison BUMI and BYAN");
  await dialog.getByRole("button", { name: "Gemini analysis", exact: true }).click();
  await expect(dialog).toContainText("Setup required");
  await expect(dialog.getByRole("button", { name: "Ask Gemini", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Use data analysis" }).click();
  await expect(dialog).toContainText("Comparison BUMI and BYAN");
});

test("Configured Gemini: connection test, source-linked answers, follow-ups and Markdown export", async ({ page }) => {
  await setup(page);
  let posted: Record<string, unknown>[] = [];
  await page.route("**/api/ai/check", (route) => route.fulfill({ json: { ...configured, state: "verified", last_verified_at: "2026-10-06T01:00:00.000Z" } }));
  await page.route("**/api/ai/analyze", (route) => { posted = [...posted, route.request().postDataJSON()]; return route.fulfill({ json: { ...fixture, request_id: `fixture-${posted.length}` } }); });
  await page.goto("/dashboard");
  const dialog = await open(page);
  await expect(dialog.getByRole("button", { name: "Gemini analysis", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Test connection", exact: true }).click();
  await expect(dialog).toContainText("Access verified");
  await dialog.getByLabel("Analysis question").fill("Compare BUMI and BYAN's strengths and risks");
  await dialog.getByRole("button", { name: "Ask Gemini", exact: true }).click();
  const answer = dialog.getByTestId("ai-answer").last(); await expect(answer).toContainText(fixture.summary.text);
  expect(posted[0].mode).toBe("chat"); expect(posted[0].issuers).toBeUndefined(); expect(posted[0].context).toBeUndefined();
  await answer.getByText(/^View evidence/).click();
  const cost = fixture.evidence.find((item) => item.id === "BYAN.cash_cost_per_ton_usd")!;
  await expect(answer).toContainText(cost.value);
  const download = page.waitForEvent("download"); await answer.getByRole("button", { name: "Save AI brief", exact: true }).click();
  const exported = await download; const stream = await exported.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const markdown = Buffer.concat(chunks).toString("utf8"); expect(markdown).toContain("## Evidence"); expect(markdown).toContain(cost.value); expect(markdown).toContain("Dataset source: synthetic");
  await answer.getByRole("button", { name: fixture.follow_up_questions[0], exact: true }).click();
  await expect.poll(() => posted.length).toBe(2); expect((posted[1].history as unknown[])).toHaveLength(2);
  await dialog.getByTestId("ai-answer").last().getByRole("link", { name: "BUMI · Reserve life", exact: true }).first().click();
  await expect(page).toHaveURL(/\/issuer\/BUMI/); await expect(dialog).toBeHidden();
});

test("Gemini errors remain errors and a manual retry can succeed", async ({ page }) => {
  await setup(page); let count = 0;
  await page.route("**/api/ai/analyze", (route) => ++count === 1
    ? route.fulfill({ status: 429, json: { detail: "Gemini is at its request limit. Wait a moment and try again.", code: "AI_QUOTA" } })
    : route.fulfill({ json: fixture }));
  await page.goto("/dashboard"); const dialog = await open(page);
  await dialog.getByLabel("Analysis question").fill("What risks should I investigate?");
  await dialog.getByRole("button", { name: "Ask Gemini", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("request limit"); await expect(dialog.getByTestId("ai-answer")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Try again", exact: true }).click(); await expect(dialog.getByTestId("ai-answer")).toHaveCount(1);
});

test("Stop and close cancel pending answers without late UI updates", async ({ page }) => {
  await setup(page); let release: (() => void) | undefined;
  await page.route("**/api/ai/analyze", async (route) => {
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: fixture }).catch(() => undefined);
  });
  await page.goto("/dashboard"); const dialog = await open(page);
  await dialog.getByLabel("Analysis question").fill("Explain BUMI"); await dialog.getByRole("button", { name: "Ask Gemini", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Stop analysis", exact: true })).toBeVisible();
  await expect.poll(() => Boolean(release)).toBe(true); await dialog.getByRole("button", { name: "Stop analysis", exact: true }).click(); release!();
  await expect(dialog.getByRole("button", { name: "Ask Gemini", exact: true })).toBeEnabled(); await expect(dialog.getByTestId("ai-answer")).toHaveCount(0);
  release = undefined; await dialog.getByRole("button", { name: "Ask Gemini", exact: true }).click(); await expect.poll(() => Boolean(release)).toBe(true);
  await page.keyboard.press("Escape"); release!(); await expect(dialog).toBeHidden();
  await open(page); await expect(dialog.getByTestId("ai-answer")).toHaveCount(0);
});

test("Dashboard AI brief is requested explicitly and includes a balanced evidence view", async ({ page }) => {
  await setup(page); let calls = 0, body: Record<string, unknown> | undefined;
  await page.route("**/api/ai/analyze", (route) => { calls++; body = route.request().postDataJSON(); return route.fulfill({ json: fixture }); });
  await page.goto("/dashboard"); const panel = page.getByTestId("gemini-research");
  await expect(panel.getByRole("button", { name: "Generate AI brief", exact: true })).toBeEnabled(); expect(calls).toBe(0);
  await panel.getByRole("button", { name: "Generate AI brief", exact: true }).click(); await expect(panel.getByTestId("ai-answer")).toBeVisible();
  expect(body?.mode).toBe("brief"); expect(body?.scenario).toBeUndefined();
  for (const label of ["Finding", "Risk to investigate", "Analytical limit", "Next research step"]) await expect(panel.getByText(label, { exact: true })).toBeVisible();
  await page.screenshot({ path: "../../docs/screenshots/gemini-dashboard-fixture-desktop.png", fullPage: true });
});

test("Scenario AI uses the selected issuer and active parameters; switching clears prior answers", async ({ page }) => {
  await setup(page); const posted: Record<string, unknown>[] = [];
  await page.route("**/api/ai/analyze", (route) => { posted.push(route.request().postDataJSON()); return route.fulfill({ json: fixture }); });
  await page.goto("/scenario?price=-0.2&china=0.3&rate=0.16&variable=0.5&cliff=1&issuer=BUMI");
  const panel = page.getByTestId("gemini-research"); await panel.getByRole("button", { name: "Generate AI brief", exact: true }).click(); await expect(panel.getByTestId("ai-answer")).toBeVisible();
  expect(posted[0].symbols).toEqual(["BUMI"]); expect(posted[0].scenario).toMatchObject({ price_shock_pct: -.2, destination_shocks: { China: .3 }, discount_rate: .16, variable_cost_share: .5, license_cliff_expiry_shock: true });
  await page.getByLabel("Selected issuer", { exact: true }).selectOption("PTBA"); await expect(panel.getByTestId("ai-answer")).toHaveCount(0);
  await panel.getByRole("button", { name: "Generate AI brief", exact: true }).click(); await expect(panel.getByTestId("ai-answer")).toBeVisible(); expect(posted[1].symbols).toEqual(["PTBA"]);
  await page.getByRole("button", { name: "Reset", exact: true }).click(); await expect(panel.getByTestId("ai-answer")).toHaveCount(0);
  const dialog = await open(page); await expect(dialog).toContainText("Scenario Studio parameters attached");
  await dialog.getByLabel("Analysis question").fill("Explain the active scenario"); await dialog.getByRole("button", { name: "Ask Gemini", exact: true }).click(); await expect(dialog.getByTestId("ai-answer")).toBeVisible();
  expect(posted[2].mode).toBe("chat"); expect(posted[2].symbols).toEqual(["PTBA"]); expect(posted[2].scenario).toMatchObject({ price_shock_pct: 0, discount_rate: .12, variable_cost_share: .65, license_cliff_expiry_shock: false, destination_shocks: {} });
});

for (const width of [1440, 390]) {
  test(`Gemini answer and evidence are responsive at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 }); await setup(page);
    await page.route("**/api/ai/analyze", (route) => route.fulfill({ json: fixture })); await page.goto("/dashboard");
    const dialog = await open(page); await dialog.getByLabel("Analysis question").fill("Compare BUMI and BYAN");
    await dialog.getByRole("button", { name: width === 390 ? "Ask" : "Ask Gemini", exact: true }).click();
    await expect(dialog.getByTestId("ai-answer")).toBeVisible();
    const dimensions = await dialog.evaluate((element) => ({ width: element.scrollWidth, client: element.clientWidth, document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.client + 1); expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.screenshot({ path: `../../docs/screenshots/gemini-assistant-fixture-${width === 390 ? "mobile" : "desktop"}.png` });
    await dialog.getByText(/^View evidence/).click(); await expect(dialog.getByRole("link", { name: "BYAN · Cash cost", exact: true }).last()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
