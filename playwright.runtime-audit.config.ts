import { defineConfig, devices } from "@playwright/test";
const suffix = process.env.NODARA_CONSUMER_VARIANT === "minimum" ? "-minimum" : "";
export default defineConfig({
  testDir: "./tests/runtime-audit", fullyParallel: true, workers: 2, retries: 0,
  timeout: 45_000, expect: { timeout: 5_000 },
  outputDir: `./outputs/technical-confidence/runtime${suffix}-artifacts`,
  reporter: [["list"], ["json", { outputFile: `./outputs/technical-confidence/runtime${suffix}-results.json` }]],
  use: { ...devices["Desktop Chrome"], screenshot: "only-on-failure", trace: "retain-on-failure" },
});
