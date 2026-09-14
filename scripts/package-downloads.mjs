import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const destination = resolve("public/downloads");
mkdirSync(destination, { recursive: true });
const manifest = [];
for (const name of ["core", "react", "vue", "angular", "web-components"]) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", `./packages/${name}`, "--pack-destination", destination, "--json", "--ignore-scripts"], { encoding: "utf8", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(result.stderr || `Packaging ${name} failed`);
  const [entry] = JSON.parse(result.stdout);
  const bytes = readFileSync(resolve(destination, entry.filename));
  manifest.push({ name: entry.name, version: entry.version, filename: entry.filename, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
writeFileSync(resolve(destination, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Prepared ${manifest.length} installable package downloads.`);
