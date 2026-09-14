import { defineConfig, devices } from "@playwright/test";

const port = process.env.NODARA_E2E_PORT ?? "4173";
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/audit",
  testMatch: "*.spec.ts",
  testIgnore: "preview-isolation.spec.ts",
  fullyParallel: true,
  timeout: 45_000,
  expect: { timeout: 2_000 },
  retries: 0,
  // Serialize GPU-heavy browser profiles so they do not compete for the host's
  // rendering resources. All cases still execute; retries remain disabled.
  workers: 1,
  outputDir: "./outputs/technical-confidence/browser-artifacts",
  reporter: [["list"], ["json", { outputFile: process.env.NODARA_BROWSER_REPORT ?? "./outputs/technical-confidence/browser-results.json" }]],
  use: { baseURL: origin, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: `node node_modules/vinext/dist/cli.js start --hostname 127.0.0.1 --port ${port}`, url: origin, reuseExistingServer: false, timeout: 180_000 },
  projects: [
    { name: "audit-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "audit-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "audit-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "audit-mobile", use: { ...devices["Pixel 7"] } },
  ],
});
