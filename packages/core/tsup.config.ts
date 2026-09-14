import { defineConfig } from "tsup";

// Keep the distributed browser ESM and CJS self-contained; include notices in the tarball.
export default defineConfig({ noExternal: [/^d3-/] });
