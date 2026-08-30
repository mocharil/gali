import { test, expect } from "@playwright/test";

test.describe("GALI E2E Test Suite", () => {
  test("1. Home page renders headline stats and 9-issuer leaderboard", async ({ page }) => {
    await page.goto("/");

    // 1. Verify Header & Branding
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Gali lebih dalam/i })).toBeVisible();

    // 2. Verify 3 Big Headline Stats
    await expect(page.getByText("Reserve-Backed Value (7 emiten lengkap)")).toBeVisible();
    await expect(page.getByText("Rata-rata umur cadangan (RLI)")).toBeVisible();
    await expect(page.getByText("License cliff 3-thn tertinggi")).toBeVisible();

    // 3. Verify Leaderboard Issuers
    const symbols = ["ADRO", "BYAN", "BUMI", "GEMS", "AADI", "PTBA", "DSSA", "ITMG", "ADMR"];
    for (const sym of symbols) {
      await expect(page.locator("ol").getByText(sym)).toBeVisible();
    }
  });

  test("2. Click-through navigation from Home to Issuer Detail (/issuer/ADRO)", async ({ page }) => {
    await page.goto("/");

    // Click on ADRO link in the leaderboard
    const adroLink = page.locator("ol").getByRole("link", { name: /ADRO/ });
    await expect(adroLink).toBeVisible();
    await adroLink.click();
    await expect(page).toHaveURL(/\/issuer\/ADRO/);

    // Verify ADRO Detail content
    await expect(page.getByRole("heading", { name: "ADRO" })).toBeVisible();

    // Verify Reserve Life Index & Fundamental Metrics
    await expect(page.getByText("Reserve Life Index (aktual)")).toBeVisible();
    await expect(page.getByText(/16\.2 thn/)).toBeVisible();
    await expect(page.getByText("Reserve-Backed Value")).toBeVisible();

    // Open Evidence Drawer
    const evidenceBtn = page.getByRole("button", { name: /Evidence & Provenance/i });
    await expect(evidenceBtn).toBeVisible();
    await evidenceBtn.click();

    // Verify Drawer Opened with Provenance & Calculations
    await expect(page.getByRole("heading", { name: "Konteks perhitungan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Asumsi finansial" })).toBeVisible();
  });

  test("3. Scenario Studio zero-shock regression invariant (delta = 0.0%)", async ({ page }) => {
    await page.goto("/scenario");

    // Verify Scenario Studio headline
    await expect(page.getByRole("heading", { name: /Scenario Studio/i })).toBeVisible();

    // Trigger simulation
    const runBtn = page.getByRole("button", { name: "Jalankan Skenario" });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for simulation table to load
    await expect(page.getByText("ADRO").first()).toBeVisible();

    // CRITICAL REGRESSION INVARIANT: With 0% shock, all complete issuers must have 0.0% delta
    const adroCard = page.locator("div.glass-card", { hasText: "ADRO" }).first();
    await expect(adroCard).toBeVisible();
    await expect(adroCard.getByText("0.0%")).toBeVisible();

    // Now test interactive shock slider
    const priceSlider = page.locator('input[type="range"]').first();
    await priceSlider.fill("-0.2");
    await priceSlider.dispatchEvent("change");
    await runBtn.click();

    // Wait for live compute (delta should change to -20.0%)
    await expect(adroCard.getByText(/-20\.0%/)).toBeVisible();
  });

  test("4. Truth Audit & Coverage Page displays data coverage and credit ledger", async ({ page }) => {
    await page.goto("/coverage");

    // Verify page title
    await expect(page.getByRole("heading", { name: /Truth Audit/i })).toBeVisible();

    // Verify GPS Coverage (91.2% / 52 sites)
    await expect(page.getByText(/52 \/ 57/)).toBeVisible();
    await expect(page.getByText(/91\.2%/)).toBeVisible();

    // Verify Credit Ledger spend (404 credits)
    await expect(page.getByText(/404 \/ 1000 kredit terpakai/)).toBeVisible();

    // Verify Gate Decision (7 lengkap + 2 parsial)
    await expect(page.getByText(/9 emiten/i)).toBeVisible();
  });
});
