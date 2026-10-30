// Real-browser tests run against Compose; start it before npm run test:browser.
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:8080",
    // Traces can capture entered credentials; keep them off for token-based write tests.
    trace: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
