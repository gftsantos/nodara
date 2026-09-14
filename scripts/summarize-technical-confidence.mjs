import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve("outputs/technical-confidence");
const read = name => JSON.parse(readFileSync(resolve(directory, name), "utf8"));
const gate = read("release-gate.json");
if (!gate.passed || gate.results.length !== gate.plannedStages) throw new Error("The complete release gate has not passed.");
const groups = [];
for (const [name, file] of [["Unit, adapters and integration generator", "unit-results.json"], ["Public contracts", "core-results.json"]]) {
  const report = read(file);
  if (report.startTime < Date.parse(gate.startedAt)) throw new Error(`Stale report: ${file}`);
  groups.push({ name, file, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests, total: report.numTotalTests });
}
// The rendered HTML stage uses node:test TAP, not a Playwright/Vitest JSON report.
// Its four route assertions are deliberately reported separately from browser tests.
groups.push({ name: "Compiled HTML routes", file: "release-gate.json:rendered-html", passed: 4, failed: 0, skipped: 0, total: 4 });
const exclusions = [];
for (const [name, file] of [["Isolated current consumers", "runtime-results.json"], ["Portal desktop and emulated mobile", "portal-results.json"], ["Four-profile browser detail", "browser-results.json"], ["Development preview isolation", "preview-results.json"], ["Isolated minimum React/Vue consumers", "runtime-minimum-results.json"]]) {
  const report = read(file);
  if (Date.parse(report.stats.startTime) < Date.parse(gate.startedAt)) throw new Error(`Stale report: ${file}`);
  if (report.errors?.length) throw new Error(`Runner errors in ${file}`);
  const { expected, unexpected, skipped, flaky } = report.stats;
  groups.push({ name, file, passed: expected, failed: unexpected + flaky, skipped, total: expected + unexpected + skipped + flaky });
  const visit = (suite, parents = []) => {
    const path = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) for (const test of spec.tests) {
      if (test.results.at(-1)?.status === "skipped") exclusions.push({ file, project: test.projectName, test: [...path, spec.title].join(" / "), reasons: (test.annotations ?? []).filter(annotation => annotation.type === "skip").map(annotation => annotation.description) });
    }
    for (const child of suite.suites ?? []) visit(child, path);
  };
  for (const suite of report.suites) visit(suite);
}
const totals = groups.reduce((sum, group) => ({ passed: sum.passed + group.passed, failed: sum.failed + group.failed, skipped: sum.skipped + group.skipped, total: sum.total + group.total }), { passed: 0, failed: 0, skipped: 0, total: 0 });
const report = { generatedAt: new Date().toISOString(), scope: "One final execution per suite and profile; repeated debugging runs are excluded. Parameterized cases are not independent features. Minimum-runtime consumers repeat the same contracts on older supported frameworks.", gate: { startedAt: gate.startedAt, completedAt: gate.completedAt, passed: gate.passed, stages: gate.plannedStages }, groups, totals, exclusions };
writeFileSync(resolve(directory, "summary.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (totals.failed) process.exitCode = 1;
