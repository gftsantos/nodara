import { defineConfig, devices } from "@playwright/test";

// Explicit opt-in for a developer's already-running preview. CI starts and owns
// its own server by default; never disable Vinext's workspace lock.
const existingPreview = process.env.NODARA_PREVIEW_URL;
const previewURL = existingPreview ?? "http://127.0.0.1:4174";
if (existingPreview) {
  const url = new URL(existingPreview);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("NODARA_PREVIEW_URL must be the local project preview origin.");
}

export default defineConfig({
  testDir: "./tests/audit",
  testMatch: "preview-isolation.spec.ts",
  retries: 0,
  workers: 1,
  timeout: 45_000,
  outputDir: "./outputs/technical-confidence/preview-artifacts",
  reporter: [["list"], ["json", { outputFile: "./outputs/technical-confidence/preview-results.json" }]],
  use: { baseURL: previewURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: existingPreview ? undefined : { command: "node node_modules/vinext/dist/cli.js dev --hostname 127.0.0.1 --port 4174", url: previewURL, reuseExistingServer: false, timeout: 180_000 },
  projects: [{ name: "dev-preview-chromium", use: { ...devices["Desktop Chrome"] } }],
});
