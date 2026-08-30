import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd ../.. && .venv\\Scripts\\python -m uvicorn gali_api.main:app --port 8000",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "cmd /c pnpm start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
