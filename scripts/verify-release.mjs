import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const output = resolve("outputs/technical-confidence"); mkdirSync(output, { recursive: true });
const revision = spawnSync("git", ["rev-parse", "--verify", "HEAD"], { encoding: "utf8" });
const changes = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (revision.status !== 0 || changes.status !== 0) throw new Error("Cannot identify the tested source revision.");
const source = { head: revision.stdout.trim(), dirty: Boolean(changes.stdout.trim()), workflowCommit: process.env.GITHUB_SHA ?? null, lockSha256: createHash("sha256").update(readFileSync("package-lock.json")).digest("hex") };
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const stages = [
  ["security", process.execPath, ["scripts/security-gate.mjs"]],
  ["package-builds", npm, ["run", "build:lib"]],
  ["public-api-surface", process.execPath, ["scripts/check-api-surface.mjs"]],
  ["lint", npm, ["run", "lint"]],
  ["package-types", npm, ["run", "typecheck", "--workspaces", "--if-present"]],
  ["portal-types", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.portal.json"]],
  ["audit-types", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.audit.json"]],
  ["unit-and-generator", process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "--reporter=default", "--reporter=json", `--outputFile=${resolve(output, "unit-results.json")}`]],
  ["tarballs", process.execPath, ["scripts/package-downloads.mjs"]],
  ["contracts", process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.audit.config.ts"]],
  ["site-build", npm, ["run", "build:site"]],
  ["security-artifacts", process.execPath, ["scripts/security-artifacts.mjs"]],
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
  writeFileSync(resolve(output, "release-gate.json"), JSON.stringify({ startedAt, completedAt: new Date().toISOString(), source, node: process.version, platform: process.platform, plannedStages: stages.length, passed, results }, null, 2));
  if (result.status !== 0) { process.exitCode = 1; break; }
}
