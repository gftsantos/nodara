import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const credentials = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ["AWS access key", /\bAKIA[A-Z0-9]{16}\b/],
  ["credential in URL", /https?:\/\/[^\s/@:]+:[^\s/@]+@/],
];
for (const path of tracked) {
  if (/(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars|id_rsa|id_ed25519)$/.test(path)) failures.push(`${path}: credential filename must not be tracked`);
  if (statSync(path).size > 5_000_000 || /\.(?:png|jpe?g|webp|woff2?|ico|pdf|tgz)$/i.test(path)) continue;
  const text = readFileSync(path, "utf8");
  for (const [kind, pattern] of credentials) if (pattern.test(text)) failures.push(`${path}: possible ${kind} (value redacted)`);
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const assets = files("dist/client");
for (const path of assets) {
  const normalized = path.replaceAll("\\", "/");
  if (/\.(?:map|log|pem|key|sqlite|db)$/i.test(path) || /\/(?:\.env[^/]*|\.dev\.vars|\.git|node_modules|outputs|src)(?:\/|$)/i.test(normalized)) failures.push(`${path}: internal artifact in web assets`);
  if (/\.(?:js|css)$/.test(path) && /sourceMappingURL\s*=/.test(readFileSync(path, "utf8"))) failures.push(`${path}: source map reference in web assets`);
}
const summary = { checkedAt: new Date().toISOString(), sourceFiles: tracked.length, webAssets: assets.length, failures, passed: failures.length === 0, limits: "Pattern-based current-tree scan, not a secret-history audit. Library tarballs intentionally include MIT source maps for authorized developers; browser assets must not. Hosting logs, variables and platform sessions are outside this check." };
mkdirSync("outputs/technical-confidence", { recursive: true });
writeFileSync("outputs/technical-confidence/security-artifacts.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
