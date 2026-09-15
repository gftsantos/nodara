import { defineConfig } from "tsup";

// Main entry is self-contained. working-time resolves Temporal and the main
// entry externally, sharing NodaraError identity without loading Temporal in charts.
export default defineConfig({ noExternal: [/^d3-/], external: ["@nodara/core"], splitting: false });
