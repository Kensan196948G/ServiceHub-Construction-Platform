import { defineConfig, devices } from "@playwright/test";

// Fullstack E2E config — runs against a live backend (docker-compose.test.yml).
// webServer is intentionally omitted: docker-compose manages all services.
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/fullstack",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ["github"],
        [
          "html",
          { outputFolder: "playwright-report-fullstack", open: "never" },
        ],
      ]
    : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // No MSW — real API; allow slightly longer timeouts for network round-trips
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-fullstack",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
