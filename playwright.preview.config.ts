import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/audit",
  testMatch: "preview-isolation.spec.ts",
  retries: 0,
  workers: 1,
  timeout: 45_000,
  outputDir: "./outputs/technical-confidence/preview-artifacts",
  reporter: [["list"], ["json", { outputFile: "./outputs/technical-confidence/preview-results.json" }]],
  use: { baseURL: "http://127.0.0.1:4174", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/vinext/dist/cli.js dev --hostname 127.0.0.1 --port 4174", url: "http://127.0.0.1:4174", reuseExistingServer: false, timeout: 180_000 },
  projects: [{ name: "dev-preview-chromium", use: { ...devices["Desktop Chrome"] } }],
});
