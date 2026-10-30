// Tests the actual static production demo at the same subpath GitHub Pages will use.
import { defineConfig, devices } from "@playwright/test";
const baseURL =
  process.env.TEST_DEMO_URL || "http://127.0.0.1:4173/shipyard-devsecops/";
export default defineConfig({
  testDir: "./tests/demo",
  use: { baseURL, trace: "off" },
  reporter: "list",
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.TEST_DEMO_URL
    ? undefined
    : {
        command: "npm run preview:demo",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
