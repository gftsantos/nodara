import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts"],
    passWithNoTests: false,
    setupFiles: ["./packages/core/test/setup.ts"],
    testTimeout: 10_000,
  },
});
