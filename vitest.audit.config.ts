import { defineConfig } from "vitest/config";

// A separate release audit: failing requirements remain failures, not expected passes.
export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/audit/*.audit.ts"],
    setupFiles: ["./packages/core/test/setup.ts"],
    testTimeout: 15_000,
    reporters: ["default", "json"],
    outputFile: process.env.NODARA_AUDIT_OUTPUT ?? "./outputs/technical-confidence/core-results.json",
  },
});
