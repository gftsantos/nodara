import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";

const directory = resolve("outputs/audit-2026-09-14");
const browser = JSON.parse(readFileSync(resolve(directory, "browser-results.json"), "utf8"));
const core = JSON.parse(readFileSync(resolve(directory, "core-results.json"), "utf8"));
const cases = [];
const axe = [];
function visit(suite, titles = []) {
  const path = [...titles, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results.at(-1);
      cases.push({ title: [...path, spec.title].join(" > "), project: test.projectName, status: result?.status, duration: result?.duration, error: result?.error?.message ? stripVTControlCharacters(result.error.message).slice(0, 1600) : undefined });
      for (const attachment of result?.attachments ?? []) {
        if (attachment.name === "axe.json" && (attachment.path || attachment.body)) {
          const report = JSON.parse(attachment.path ? readFileSync(attachment.path, "utf8") : Buffer.from(attachment.body, "base64").toString("utf8"));
          axe.push({ title: spec.title, project: test.projectName, version: report.testEngine.version, violations: report.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, helpUrl: v.helpUrl, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
        }
      }
    }
  }
  for (const child of suite.suites ?? []) visit(child, path);
}
browser.suites.forEach(suite => visit(suite));
function countProfiles(items) {
  const profiles = {};
  for (const item of items) {
    const profile = profiles[item.project] ??= {};
    profile[item.status] = (profile[item.status] ?? 0) + 1;
  }
  return profiles;
}
const initialRun = { total: cases.length, profiles: countProfiles(cases) };
const recheckPath = resolve(directory, "recheck-results.json");
if (!process.argv.includes("--initial-only") && existsSync(recheckPath)) JSON.parse(readFileSync(recheckPath, "utf8")).suites.forEach(suite => visit(suite));
const latest = new Map(cases.map(item => [`${item.project}:${item.title}`, item]));
cases.splice(0, cases.length, ...latest.values());
const profiles = countProfiles(cases);
const runtimePath = resolve(directory, "runtime-results.json");
const summary = {
  generatedAt: new Date().toISOString(),
  core: { total: core.numTotalTests, passed: core.numPassedTests, failed: core.numFailedTests, pending: core.numPendingTests },
  browser: { total: cases.length, profiles, failures: cases.filter(item => !["passed", "skipped"].includes(item.status)) },
  initialBrowserRun: initialRun,
  runtime: existsSync(runtimePath) ? JSON.parse(readFileSync(runtimePath, "utf8")).stats : undefined,
  notes: ["The recheck supersedes same-title/profile cases. Original reports are retained. A date-format mismatch in the first Gantt resize assertion was a harness error; the corrected test compares timestamps. Supplemental cases add homepage recurrence persistence and modal focus restoration."],
  axe,
};
writeFileSync(resolve(directory, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ core: summary.core, profiles, uniqueFailingRequirements: new Set(summary.browser.failures.map(item => item.title)).size, axeViolations: axe.filter(item => item.violations.length).map(item => ({ title: item.title, project: item.project, violations: item.violations.map(v => ({ id: v.id, count: v.nodes.length })) })) }, null, 2));
