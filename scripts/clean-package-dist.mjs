import { existsSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Only generated output for this explicitly supported package may be removed.
if (process.argv[2] !== "angular") throw new Error("Expected the explicit package name angular.");
const workspace = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const packageRoot = realpathSync(join(workspace, "packages", "angular"));
if (packageRoot !== join(workspace, "packages", "angular")) throw new Error("Refusing a redirected package directory.");
const target = join(packageRoot, "dist");
if (existsSync(target)) {
  if (realpathSync(target) !== target || dirname(target) !== packageRoot) throw new Error("Refusing a dist directory outside the intended package.");
  rmSync(target, { recursive: true });
}
