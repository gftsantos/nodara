import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// An intentional API change requires reviewing this snapshot and migration notes.
// This detects declaration drift; consumer compilation still verifies usability.
const entries = { core: "packages/core/dist/index.d.ts", working: "packages/core/dist/working-time.d.ts", react: "packages/react/dist/index.d.ts", vue: "packages/vue/dist/index.d.ts", angular: "packages/angular/dist/index.d.ts", elements: "packages/web-components/dist/index.d.ts" };
const program = ts.createProgram(Object.values(entries), { skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
const checker = program.getTypeChecker(), printer = ts.createPrinter({ removeComments: true });
const surface = Object.fromEntries(Object.entries(entries).map(([name, path]) => {
  const source = program.getSourceFile(path); if (!source) throw new Error(`Missing built declaration ${path}`);
  const moduleSymbol = checker.getSymbolAtLocation(source); if (!moduleSymbol) throw new Error(`No declaration module ${path}`);
  const symbols = checker.getExportsOfModule(moduleSymbol).map(symbol => {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    return [symbol.name, (target.declarations ?? []).map(declaration => printer.printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile()).replace(/\s+/g, " ").trim()).sort()];
  }).sort(([a], [b]) => a.localeCompare(b));
  return [name, Object.fromEntries(symbols)];
}));
if (process.argv.includes("--inspect")) console.log(JSON.stringify(surface, null, 2));
else {
  const baseline = resolve("docs/public-api-candidate.json");
  if (!existsSync(baseline)) throw new Error("API baseline missing; review the declaration surface before adding it.");
  assert.deepEqual(surface, JSON.parse(readFileSync(baseline, "utf8")), "Public declaration surface changed; review compatibility and migration notes before updating the baseline.");
  console.log(`Public API candidate: ${Object.keys(surface).length} entries, ${Object.values(surface).reduce((sum, exports) => sum + Object.keys(exports).length, 0)} declaration exports match.`);
}
