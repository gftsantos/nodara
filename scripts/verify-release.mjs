import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve("outputs/technical-confidence"); mkdirSync(output, { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const stages = [
  ["security", process.execPath, ["scripts/security-gate.mjs"]],
  ["package-builds", npm, ["run", "build:lib"]],
  ["lint", npm, ["run", "lint"]],
  ["package-types", npm, ["run", "typecheck", "--workspaces", "--if-present"]],
  ["portal-types", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.portal.json"]],
  ["audit-types", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.audit.json"]],
  ["unit-and-generator", process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "--reporter=default", "--reporter=json", `--outputFile=${resolve(output, "unit-results.json")}`]],
  ["tarballs", process.execPath, ["scripts/package-downloads.mjs"]],
  ["contracts", process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.audit.config.ts"]],
  ["site-build", npm, ["run", "build:site"]],
  ["rendered-html", process.execPath, ["--test", "tests/rendered-html.test.mjs"]],
  ["isolated-consumers-build", process.execPath, ["scripts/build-audit-consumers.mjs"]],
  ["isolated-consumers-browser", process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.runtime-audit.config.ts"]],
  ["portal-browser", process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.config.ts"]],
  ["cross-browser-audit", process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.audit.config.ts"]],
  ["development-preview-isolation", process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.preview.config.ts"]],
];
const results = []; const startedAt = new Date().toISOString();
for (const [name, executable, args] of stages) {
  console.log(`\n[release gate] ${name}`); const started = performance.now();
  const result = spawnSync(executable, args, { stdio: "inherit", shell: executable === npm && process.platform === "win32", env: { ...process.env, NODARA_E2E_PORT: "4173" } });
  results.push({ name, status: result.status, signal: result.signal, durationMs: Math.round(performance.now() - started), ...(result.error ? { error: result.error.message } : {}) });
  const passed = results.length === stages.length && results.every(entry => entry.status === 0);
  writeFileSync(resolve(output, "release-gate.json"), JSON.stringify({ startedAt, completedAt: new Date().toISOString(), node: process.version, platform: process.platform, plannedStages: stages.length, passed, results }, null, 2));
  if (result.status !== 0) { process.exitCode = 1; break; }
}
