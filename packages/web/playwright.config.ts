import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./e2e", fullyParallel: false, retries: 0, workers: 1, timeout: 30_000,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVERS === "1" ? undefined : process.env.PLAYWRIGHT_DATA_MODE === "simulation" ? [
    { command: process.env.PLAYWRIGHT_USE_DEV === "1" ? "npm run local" : "npm run demo:start", url: "http://127.0.0.1:3000/api/ready", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ] : [
    { command: "python -m uvicorn gali_api.main:app --port 8000", cwd: path.resolve(__dirname, "../.."), url: "http://127.0.0.1:8000/health", reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: process.env.PLAYWRIGHT_USE_DEV === "1" ? "npm run dev" : "npm run start", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
