import { test, expect, type Page } from "@playwright/test";

const picker = (page: Page, index = 0) => page.getByTestId("issuer-picker").nth(index);

test("Methodology example issuer is labelled and works with mouse and keyboard", async ({ page }) => {
  await page.goto("/methodology");
  const first = picker(page);
  await expect(first).toContainText("Example issuer");
  await expect(first).toHaveAttribute("data-symbol", "BYAN");
  await expect(first.getByRole("combobox")).toContainText("Change");

  const combo = first.getByRole("combobox");
  const options = page.getByRole("option");
  await combo.click();
  await expect(options).toHaveCount(9);
  // Opening highlights the current choice, not the first row (the page must not scroll the highlight away).
  const selectedId = await page.locator('[role="option"][aria-selected="true"]').getAttribute("id");
  await expect(combo).toHaveAttribute("aria-activedescendant", selectedId!);

  await page.keyboard.press("End");
  await expect(combo).toHaveAttribute("aria-activedescendant", (await options.last().getAttribute("id"))!);
  await page.keyboard.press("Home");
  await expect(combo).toHaveAttribute("aria-activedescendant", (await options.first().getAttribute("id"))!);
  const firstSymbol = (await options.first().innerText()).split("\n")[0];
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("data-symbol", firstSymbol);
  await expect(page.getByRole("listbox")).toHaveCount(0);

  await combo.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await combo.click();
  await options.filter({ hasText: "DSSA" }).click();
  await expect(first).toHaveAttribute("data-symbol", "DSSA");
});

test("Compare shows logos, labels each side and blocks choosing the same issuer twice", async ({ page }) => {
  await page.goto("/compare?a=ADRO&b=BYAN");
  await expect(picker(page, 0)).toContainText("Issuer A");
  await expect(picker(page, 1)).toContainText("Issuer B");
  await expect(picker(page, 0).locator("img")).toBeVisible();

  await picker(page, 0).getByRole("combobox").click();
  const taken = page.getByRole("option").filter({ hasText: "BYAN" });
  await expect(taken).toHaveAttribute("aria-disabled", "true");
  await expect(taken).toContainText("Selected as Issuer B");
  await taken.click({ force: true });
  await expect(picker(page, 0)).toHaveAttribute("data-symbol", "ADRO");

  await page.getByRole("option").filter({ hasText: "ITMG" }).click();
  await expect(picker(page, 0)).toHaveAttribute("data-symbol", "ITMG");
  await expect(picker(page, 1)).toHaveAttribute("data-symbol", "BYAN");
  await expect(page).toHaveURL(/a=ITMG&b=BYAN/);
});
