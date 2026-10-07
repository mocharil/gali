import { test, expect, type Page, type Locator } from "@playwright/test";
import scenarios from "./fixtures/gemini-output-scenarios.json";

const configured = { state: "configured", message: "Credentials are configured. Test the connection or run an analysis to verify access.", model: "gemini-3.8-flash", location: "global", last_verified_at: null };
async function setup(page: Page) {
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: configured }));
}
async function ask(page: Page, key: keyof typeof scenarios, width: number) {
  const item = scenarios[key];
  await page.route("**/api/ai/analyze", (route) => route.fulfill({ json: item.answer }));
  await page.goto("/dashboard"); await page.keyboard.press("Control+j");
  const dialog = page.getByRole("dialog", { name: "GALI Data Assistant" });
  await dialog.getByLabel("Analysis question").fill(item.question);
  await dialog.getByRole("button", { name: width < 640 ? "Ask" : "Ask AI", exact: true }).click();
  const answer = dialog.getByTestId("ai-answer").last(); await expect(answer).toBeVisible();
  return { item, dialog, answer };
}
async function hasNoOverflow(dialog: Locator) {
  const layout = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const outside = [...element.querySelectorAll('[data-testid="ai-answer"] :is(h3,h4,p,a,button), [data-testid="latest-ai-question"]')]
      .filter((item) => { const box = item.getBoundingClientRect(); return box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1); })
      .map((item) => item.textContent?.slice(0, 70));
    return { scroll: element.scrollWidth, client: element.clientWidth, page: document.documentElement.scrollWidth, viewport: window.innerWidth, outside };
  });
  expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1); expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.outside).toEqual([]);
}

for (const width of [1440, 390]) {
  for (const key of Object.keys(scenarios) as (keyof typeof scenarios)[]) {
    test(`AI output: ${key} at ${width}px`, async ({ page }) => {
      const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 }); await setup(page);
      const { item, dialog, answer } = await ask(page, key, width);
      await expect(answer).toContainText(item.answer.summary.text);
      await expect(answer.locator("section")).toHaveCount(item.answer.findings.length);
      expect(await answer.textContent()).not.toMatch(/\{\{|\}\}|```|\*\*/);
      if (key === "partial_data") await expect(answer).toContainText("Evidence is incomplete for this question.");
      if (key === "out_of_scope") await expect(answer).toContainText("This question extends beyond the available GALI evidence.");
      if (key === "gross_loss") {
        const gross = item.answer.evidence.find((entry) => entry.id.endsWith("post_shock_gp_usd"))!;
        await expect(answer).toContainText(gross.value); expect(gross.raw_value).toBeLessThan(0);
        await expect(answer).toContainText("USD 0.00");
      }
      await hasNoOverflow(dialog);
      if ((width === 390 && ["comparison", "partial_data", "gross_loss", "long_response"].includes(key)) || (width === 1440 && key === "dashboard_stress")) {
        await page.screenshot({ path: `../../docs/screenshots/ai-output-${key}-${width === 390 ? "mobile" : "desktop"}.png` });
      }
      await answer.getByText(/^View evidence/).click();
      await expect(answer.locator("details[open] a")).toHaveCount(item.answer.evidence.length);
      await hasNoOverflow(dialog); expect(errors).toEqual([]);
      if (width === 390 && key === "partial_data") {
        await answer.locator("details[open]").scrollIntoViewIfNeeded();
        await page.screenshot({ path: "../../docs/screenshots/ai-output-partial-evidence-mobile.png" });
      }
    });
  }
}

test("AI scenario source link preserves ITMG and the active parameters", async ({ page }) => {
  await setup(page);
  const { dialog, answer } = await ask(page, "active_itmg", 1440);
  await answer.getByRole("link", { name: "ITMG · Active scenario · RBV change", exact: true }).first().click();
  await expect(dialog).toBeHidden(); await expect(page.getByLabel("Selected issuer", { exact: true })).toHaveValue("ITMG");
  const url = new URL(page.url()); expect(url.searchParams.get("price")).toBe("-0.2"); expect(url.searchParams.get("china")).toBe("0.3"); expect(url.searchParams.get("rate")).toBe("0.16");
  const panel = page.getByTestId("gemini-research"); await panel.getByRole("button", { name: "Generate AI brief", exact: true }).click();
  await expect(panel.getByTestId("ai-answer")).toContainText(scenarios.active_itmg.answer.title);
  await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: "../../docs/screenshots/ai-output-itmg-scenario-desktop.png" });
});

test("At narrow mobile width, long answers wrap and follow-ups reveal the latest summary", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await setup(page);
  const { dialog, answer } = await ask(page, "long_response", 320); await hasNoOverflow(dialog);
  await answer.getByRole("button", { name: scenarios.long_response.answer.follow_up_questions[0], exact: true }).click();
  const latest = dialog.getByTestId("ai-answer").last();
  await expect(dialog.getByTestId("ai-answer")).toHaveCount(2);
  await expect.poll(() => latest.locator("h3").evaluate((element) => {
    const scroll = element.closest(".overflow-y-auto")!; const box = element.getBoundingClientRect(); const bounds = scroll.getBoundingClientRect();
    return { visible: box.top >= bounds.top - 1 && box.bottom <= bounds.bottom + 1, title_top: box.top, title_bottom: box.bottom, scroll_top: bounds.top, scroll_bottom: bounds.bottom, scroll_position: scroll.scrollTop };
  })).toMatchObject({ visible: true });
  await hasNoOverflow(dialog);
});

test("Unverified, truncated and unavailable provider outputs show readable errors with no answer", async ({ page }) => {
  await setup(page);
  let failure = { detail: "The AI service returned an answer that could not be verified against GALI evidence. Narrow the question and try again.", code: "AI_UNVERIFIED_ANSWER" };
  await page.route("**/api/ai/analyze", (route) => route.fulfill({ status: 502, json: failure }));
  await page.goto("/dashboard"); await page.keyboard.press("Control+j"); const dialog = page.getByRole("dialog", { name: "GALI Data Assistant" });
  await dialog.getByLabel("Analysis question").fill("Explain BUMI");
  for (const detail of [failure.detail, "Gemini stopped before completing the analysis. Narrow the question and try again.", "The AI service is temporarily unavailable. Try again shortly."]) {
    failure = { detail, code: "AI_OUTPUT_ERROR" }; await dialog.getByRole("button", { name: "Ask AI", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(detail); await expect(dialog.getByTestId("ai-answer")).toHaveCount(0); await expect(dialog.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
  }
});

test("Limited answers retain their status, categories, exact facts and references in downloads", async ({ page }) => {
  await setup(page); const { answer } = await ask(page, "partial_data", 1440);
  const download = page.waitForEvent("download"); await answer.getByRole("button", { name: "Save AI brief", exact: true }).click();
  const exported = await download; const stream = await exported.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const markdown = Buffer.concat(chunks).toString("utf8");
  expect(markdown).toContain("Response status: Insufficient data"); expect(markdown).toContain("Analytical limit"); expect(markdown).toContain("Unavailable"); expect(markdown).toContain("PTBA.rli_years"); expect(markdown).not.toContain("{{");
});
