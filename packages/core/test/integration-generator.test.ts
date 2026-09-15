import { describe, expect, it } from "vitest";
import ts from "typescript";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { visualCatalog } from "../src/catalog";
import { sampleData, normalizeData } from "../../../app/catalog/catalog-data";
import { integrationFiles, integrationFrameworks, previewOptions, serializeCode, type IntegrationFramework } from "../../../app/catalog/integration";
import { workingTimeExample } from "../../../app/operations/advanced-examples";
import { workingIntegrationExample } from "../../../app/operations/working-example";
import { workingDemo } from "../../../app/operations/working-demo";

const settings = { theme: "light" as const, interactive: true, height: 420 };
const frameworks = Object.keys(integrationFrameworks) as IntegrationFramework[];

describe("Complete copy-and-paste integrations", () => {
  it("typechecks the complete five-view working-plan integration as JS and TS", () => {
    const directory = resolve("work/integration-checks/working-plan"); mkdirSync(directory, { recursive: true });
    for (const extension of ["ts", "js"]) { const path = resolve(directory, `example.${extension}`); writeFileSync(path, workingIntegrationExample(workingDemo)); const program = ts.createProgram([path], { strict: true, noEmit: true, skipLibCheck: true, allowJs: true, checkJs: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler }); expect(ts.getPreEmitDiagnostics(program).map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n"))).toEqual([]); }
  }, 120000);
  it("typechecks the exact generated working-time example as JavaScript and TypeScript", () => {
    const directory = resolve("work/integration-checks/working-time"); mkdirSync(directory, { recursive: true });
    const code = workingTimeExample({ id: "office", timeZone: "Europe/Lisbon", disambiguation: "reject", week: [{ day: 1, periods: [{ start: "09:00", end: "17:00" }] }] }, { startDate: "2026-01-01", endDate: "2027-01-01" }, "2026-09-14T09:00", 3_600_000);
    for (const extension of ["ts", "js"]) {
      const path = resolve(directory, `example.${extension}`); writeFileSync(path, code);
      const program = ts.createProgram([path], { strict: true, noEmit: true, skipLibCheck: true, allowJs: true, checkJs: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
      expect(ts.getPreEmitDiagnostics(program).map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n"))).toEqual([]);
    }
  }, 120_000);
  it.each(visualCatalog)("generates and parses all five integrations for $id", item => {
    const data = normalizeData(item, JSON.stringify(sampleData(item)));
    for (const framework of frameworks) {
      const files = integrationFiles(item, data, settings, framework);
      expect(files[0]!.code).toContain("@nodara/");
      expect(files.map(file => file.code).join("\n")).toContain("@nodara/core/styles.css");
      expect(files[0]!.code).toContain('"theme": "light"');
      expect(files[0]!.code).toContain('"interactive": true');
      const first = Array.isArray(data) ? data[0] : "nodes" in data ? data.nodes[0] : data.points[0];
      if (first) expect(files[0]!.code).toContain(first.id);
      expect(files[0]!.code).not.toContain("inspect(point)");
      for (const file of files) {
        let code = file.code;
        if (file.name.endsWith(".vue")) {
          const { descriptor, errors } = parse(code);
          expect(errors).toEqual([]);
          const script = compileScript(descriptor, { id: item.id });
          expect(compileTemplate({ source: descriptor.template!.content, filename: file.name, id: item.id, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([]);
          code = script.content;
        }
        if (/\.(tsx?|js|vue)$/.test(file.name)) {
          const result = ts.transpileModule(code, { fileName: file.name.endsWith(".vue") ? "component.ts" : file.name, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, experimentalDecorators: true } });
          expect(result.diagnostics).toEqual([]);
        }
      }
    }
  });
  it("safely serializes edited code-like text and preserves its JSON value", () => {
    const value = { title: '</script><script>alert("x")</script>\u2028' };
    expect(serializeCode(value)).not.toContain("</script>"); expect(JSON.parse(serializeCode(value))).toEqual(value);
  });
  it("uses the same effective configuration for the preview and generated code", () => {
    const item = visualCatalog.find(item => item.id === "resource-week")!;
    const options = previewOptions(item, { ...settings, interactive: false });
    expect(options).toMatchObject({ date: "2026-08-20", interactive: false, view: "resource-week", locale: "pt-PT" });
    expect(options.resources).toHaveLength(3);
  });
  it("typechecks all 100 recipe React components and nested options against the built public packages", () => {
    const directory = resolve("work/integration-checks/react"); mkdirSync(directory, { recursive: true });
    const paths = visualCatalog.map(item => {
      const path = resolve(directory, `${item.id}.tsx`);
      writeFileSync(path, integrationFiles(item, sampleData(item), settings, "react")[0]!.code);
      return path;
    });
    const nestedPath = resolve(directory, "nested-topology-options.tsx");
    const nestedCode = integrationFiles({ family: "topology", options: { layout: "hierarchical", performance: { canvasThreshold: 80, webglThreshold: 150 } } }, { nodes: [{ id: "a", label: "Nested options" }], edges: [] }, settings, "react")[0]!.code;
    expect(nestedCode).toContain('"canvasThreshold": 80');
    writeFileSync(nestedPath, nestedCode); paths.push(nestedPath);
    const program = ts.createProgram(paths, { strict: true, noEmit: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
    const errors = ts.getPreEmitDiagnostics(program).map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    expect(errors).toEqual([]);
  }, 120_000);
  it("AOT-compiles all 100 generated Angular templates against the built package", () => {
    const directory = resolve("work/integration-checks/angular"); mkdirSync(directory, { recursive: true });
    visualCatalog.forEach(item => writeFileSync(resolve(directory, `${item.id}.ts`), integrationFiles(item, sampleData(item), settings, "angular")[0]!.code));
    writeFileSync(resolve(directory, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, target: "ES2022", module: "ESNext", moduleResolution: "bundler", experimentalDecorators: true }, angularCompilerOptions: { strictTemplates: true }, include: ["*.ts"] }));
    // A compiler failure/timeout must fail even when it emits no diagnostics.
    const output = execFileSync(process.execPath, [resolve("node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js"), "-p", resolve(directory, "tsconfig.json")], { encoding: "utf8", timeout: 100_000, stdio: "pipe" });
    expect(output).toBe("");
  }, 120_000);
});
