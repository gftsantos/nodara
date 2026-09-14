import { describe, expect, it } from "vitest";
import ts from "typescript";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { visualCatalog } from "../src/catalog";
import { sampleData, normalizeData } from "../../../app/catalog/catalog-data";
import { integrationFiles, integrationFrameworks, previewOptions, serializeCode, type IntegrationFramework } from "../../../app/catalog/integration";

const settings = { theme: "light" as const, interactive: true, height: 420 };
const frameworks = Object.keys(integrationFrameworks) as IntegrationFramework[];

describe("Complete copy-and-paste integrations", () => {
  it.each(visualCatalog)("generates and parses all five integrations for $id", item => {
    const data = normalizeData(item, JSON.stringify(sampleData(item)));
    for (const framework of frameworks) {
      const files = integrationFiles(item, data, settings, framework);
      expect(files[0]!.code).toContain("@nodara/");
      expect(files.map(file => file.code).join("\n")).toContain("@nodara/core/styles.css");
      expect(files[0]!.code).toContain('"theme": "light"');
      expect(files[0]!.code).toContain('"interactive": true');
      expect(files[0]!.code).toContain(item.name);
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
