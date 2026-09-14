import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import semver from "semver";

const destination = resolve("outputs/technical-confidence");
mkdirSync(destination, { recursive: true });
const policy = JSON.parse(readFileSync("security-exceptions.json", "utf8"));
const failures = [], accepted = [], seen = new Set();
const today = new Date().toISOString().slice(0, 10);
function localPath(path) {
  const absolute = resolve(path), rel = relative(process.cwd(), absolute);
  if (isAbsolute(rel) || rel.startsWith("..") || !path.startsWith("node_modules/")) throw new Error(`Unsafe exception path: ${path}`);
  return absolute;
}
function audit(extra, name) {
  const run = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json", ...extra], { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 16 * 1024 * 1024 });
  if (run.error || ![0, 1].includes(run.status)) throw new Error(run.error?.message || run.stderr || "npm audit failed to execute");
  const report = JSON.parse(run.stdout);
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities || !report.metadata?.vulnerabilities) throw new Error(`Invalid audit response: ${JSON.stringify(report.error ?? {})}`);
  writeFileSync(resolve(destination, name), JSON.stringify(report, null, 2));
  return report;
}
const report = audit([], "security-audit.json");
const production = audit(["--omit=dev"], "security-production-audit.json");
if (production.metadata.vulnerabilities.total !== 0) failures.push("Production dependency audit contains vulnerabilities; no production exceptions are allowed.");
for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
  if (!Array.isArray(vulnerability.via) || !vulnerability.via.length) { failures.push(`${name}: missing advisory chain`); continue; }
  for (const via of vulnerability.via) {
    if (typeof via === "string") {
      if (!report.vulnerabilities[via]) failures.push(`${name}: unresolved transitive advisory ${via}`);
      continue;
    }
    const advisory = via.url?.match(/GHSA-[a-z0-9-]+$/)?.[0];
    let affected = 0;
    for (const path of vulnerability.nodes) {
      const installed = JSON.parse(readFileSync(resolve(localPath(path), "package.json"), "utf8"));
      if (!semver.satisfies(installed.version, via.range, { includePrerelease: true })) continue;
      affected++;
      const exception = policy.exceptions.find(entry => entry.advisory === advisory && entry.path === path && entry.version === installed.version);
      if (!exception || exception.expires < today || !exception.reason || !exception.owner || ["high", "critical"].includes(via.severity)) {
        failures.push(`${name}@${installed.version} ${advisory ?? via.url}: no valid reviewed exception`); continue;
      }
      const digest = createHash("sha256").update(readFileSync(localPath(exception.evidence.path))).digest("hex");
      if (digest !== exception.evidence.sha256) { failures.push(`${advisory}: reviewed caller changed; re-audit required`); continue; }
      const identity = `${advisory}:${path}`;
      if (!seen.has(identity)) { seen.add(identity); accepted.push({ advisory, path, version: installed.version, severity: via.severity, expires: exception.expires, reason: exception.reason }); }
    }
    if (!affected) failures.push(`${name}: advisory ${advisory} matched no installed package; audit schema needs review`);
  }
}
const summary = { checkedAt: new Date().toISOString(), production: production.metadata.vulnerabilities, allDependencies: report.metadata.vulnerabilities, acceptedTemporaryExceptions: accepted, failures, passed: failures.length === 0 };
writeFileSync(resolve(destination, "security-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
