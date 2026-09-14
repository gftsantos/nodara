import type { VisualCatalogItem, VisualFamily, VisualTheme } from "@nodara/core";
import type { CatalogData } from "./catalog-data";

export type IntegrationFramework = "react" | "vue" | "angular" | "javascript" | "web-components";
export const integrationFrameworks: Record<IntegrationFramework, string> = { react: "React", vue: "Vue", angular: "Angular", javascript: "JavaScript", "web-components": "Web Components" };
export interface IntegrationFile { name: string; code: string }
export interface IntegrationSettings { theme: VisualTheme; interactive: boolean; height: number }
const contracts: Record<VisualFamily, { component: string; tag: string; prop: string; dataType: string; event: string; change?: string }> = {
  gantt: { component: "Gantt", tag: "gantt", prop: "data", dataType: "GanttTask[]", event: "task:select", change: "task:change" },
  charts: { component: "Chart", tag: "chart", prop: "series", dataType: "ChartSeries[]", event: "point:select" },
  topology: { component: "Topology", tag: "topology", prop: "data", dataType: "TopologyData", event: "node:select" },
  calendar: { component: "Calendar", tag: "calendar", prop: "events", dataType: "CalendarEvent[]", event: "event:select", change: "event:change" },
  maps: { component: "GeoMap", tag: "geo-map", prop: "data", dataType: "GeoMapData", event: "point:select" },
  diagrams: { component: "Diagram", tag: "diagram", prop: "data", dataType: "DiagramData", event: "node:select" },
};

// Escaping keeps edited labels safe inside Vue SFCs and HTML script blocks.
export function serializeCode(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function previewOptions(item: VisualCatalogItem, settings: IntegrationSettings): Record<string, unknown> {
  return {
    ...item.options, theme: settings.theme, locale: "pt-PT", interactive: settings.interactive,
    ...(item.family === "gantt" ? { start: "2026-01-01", end: "2026-04-30" } : {}),
    ...(item.family === "charts" ? { showTooltip: true } : {}),
    ...(item.family === "calendar" ? { date: "2026-08-20", resources: [{ id: "product", label: "Produto", color: "#7884ff" }, { id: "studio", label: "Studio", color: "#52d6c7" }, { id: "platform", label: "Platform", color: "#ff7657" }] } : {}),
  };
}

export function integrationFiles(item: VisualCatalogItem, data: CatalogData, settings: IntegrationSettings, framework: IntegrationFramework): IntegrationFile[] {
  const { component, tag, prop, dataType, event, change } = contracts[item.family];
  const optionsType = `${component}Options`;
  const typedImport = `import type { ${dataType.replace("[]", "")}, ${optionsType} } from "@nodara/core";`;
  const declarations = `const initialData: ${dataType} = ${serializeCode(data)};\nconst options: Omit<${optionsType}, "${prop}"> = ${serializeCode(previewOptions(item, settings))};`;
  const callback = (name: string) => `on${name.split(":").map(part => part[0]!.toUpperCase() + part.slice(1)).join("")}`;
  const height = Math.max(260, Math.min(900, Math.round(settings.height)));
  const css = 'import "@nodara/core/styles.css";';
  if (framework === "react") return [{ name: "NodaraExample.tsx", code: `"use client";\nimport { useState } from "react";\nimport { ${component} } from "@nodara/react";\n${typedImport}\n${css}\n\n${declarations}\n\nexport default function NodaraExample() {\n  const [data${change ? ", setData" : ""}] = useState<${dataType}>(initialData);\n  const [lastEvent, setLastEvent] = useState("Interage com a visualização.");\n  return (\n    <section>\n      <${component} ${prop}={data} {...options} style={{ height: ${height} }}\n        ${callback(event)}={(event) => setLastEvent(JSON.stringify(event))}${change ? `\n        ${callback(change)}={(event) => {\n          setData(current => ${item.family === "gantt" ? "current.map(task => task.id === event.task.id ? event.task : task)" : "replaceCalendarEvent(current, event.previousEvent.id, event.event)"});\n          setLastEvent(JSON.stringify(event));\n        }}` : ""}\n      />\n      <pre aria-live="polite" style={{ whiteSpace: "pre-wrap" }}>{lastEvent}</pre>\n    </section>\n  );\n}\n`.replace(typedImport, `${typedImport}${item.family === "calendar" ? '\nimport { replaceCalendarEvent } from "@nodara/core";' : ""}`) }];
  if (framework === "vue") return [{ name: "NodaraExample.vue", code: `<script setup lang="ts">\nimport { ref } from "vue";\nimport { Nodara${component} } from "@nodara/vue";\n${typedImport}\n${item.family === "calendar" ? 'import { replaceCalendarEvent } from "@nodara/core";\n' : ""}${css}\n\n${declarations}\nconst data = ref<${dataType}>(initialData);\nconst lastEvent = ref("Interage com a visualização.");\nfunction inspect(event: unknown) { lastEvent.value = JSON.stringify(event); }\n${change ? `function save(event: Parameters<NonNullable<${optionsType}["${callback(change)}"]>>[0]) {\n  data.value = ${item.family === "gantt" ? "data.value.map(task => task.id === event.task.id ? event.task : task)" : "replaceCalendarEvent(data.value, event.previousEvent.id, event.event)"};\n  inspect(event);\n}\n` : ""}</script>\n\n<template>\n  <section>\n    <Nodara${component} :${prop}="data" :options="options" style="height: ${height}px"\n      @${event.replace(":", "-")}="inspect"${change ? ` @${change.replace(":", "-")}="save"` : ""} />\n    <pre aria-live="polite" style="white-space: pre-wrap">{{ lastEvent }}</pre>\n  </section>\n</template>\n` }];
  if (framework === "angular") return [
    { name: "nodara-example.component.ts", code: `import { Component } from "@angular/core";\nimport { Nodara${component}Component } from "@nodara/angular";\n${typedImport}\n${item.family === "calendar" ? 'import { replaceCalendarEvent } from "@nodara/core";\n' : ""}\n${declarations}\n\n@Component({\n  selector: "app-nodara-example", standalone: true,\n  imports: [Nodara${component}Component],\n  template: \`\n    <nd-${tag} [${prop}]="data" [options]="options" style="display: block; height: ${height}px"\n      (${event.replace(/:([a-z])/g, (_, letter: string) => letter.toUpperCase())})="inspect($event)"${change ? ` (${change.replace(/:([a-z])/g, (_, letter: string) => letter.toUpperCase())})="save($event)"` : ""} />\n    <pre aria-live="polite" style="white-space: pre-wrap">{{ lastEvent }}</pre>\n  \`,\n})\nexport class NodaraExampleComponent {\n  data = initialData;\n  options = options;\n  lastEvent = "Interage com a visualização.";\n  inspect(event: unknown) { this.lastEvent = JSON.stringify(event); }\n${change ? `  save(event: Parameters<NonNullable<${optionsType}["${callback(change)}"]>>[0]) {\n    this.data = ${item.family === "gantt" ? "this.data.map(task => task.id === event.task.id ? event.task : task)" : "replaceCalendarEvent(this.data, event.previousEvent.id, event.event)"};\n    this.inspect(event);\n  }\n` : ""}\n}\n` },
    { name: "styles.css", code: '@import "@nodara/core/styles.css";\n' },
  ];
  const plainDeclarations = `const data = ${serializeCode(data)};\nconst options = ${serializeCode(previewOptions(item, settings))};`;
  const index = { name: "index.html", code: `<!doctype html>\n<html lang="pt">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nodara · ${component}</title></head>\n<body>\n  <div id="app"></div>\n  <pre id="events" aria-live="polite" style="white-space: pre-wrap"></pre>\n  <script type="module" src="/main.js"></script>\n</body>\n</html>\n` };
  if (framework === "web-components") return [
    { name: "main.js", code: `import { defineNodaraElements } from "@nodara/web-components";\n${css}\n\n${plainDeclarations}\ndefineNodaraElements();\nconst element = document.createElement("nd-${tag}");\nelement.style.height = "${height}px";\nelement.options = options;\nelement.data = data;\nconst inspect = (event) => { document.getElementById("events").textContent = JSON.stringify(event.detail, null, 2); };\nelement.addEventListener("nodara:${event.replace(":", "-")}", inspect);\n${change ? `element.addEventListener("nodara:${change.replace(":", "-")}", inspect);\n` : ""}document.getElementById("app").append(element);\n// Remove the element when leaving the view; disconnectedCallback destroys its controller.\nif (import.meta.hot) import.meta.hot.dispose(() => element.remove());\n` }, index,
  ];
  return [
    { name: "main.js", code: `import { create${component} } from "@nodara/core";\n${css}\n\n${plainDeclarations}\nconst host = document.getElementById("app");\nhost.style.height = "${height}px";\nconst controller = create${component}(host, { ...options, ${prop}: data });\nconst inspect = (event) => { document.getElementById("events").textContent = JSON.stringify(event, null, 2); };\ncontroller.on("${event}", inspect);\n${change ? `controller.on("${change}", inspect);\n` : ""}// Live updates: controller.update(nextData); controller.setOptions({ theme: "light" });\n// Call controller.destroy() when leaving this view.\nif (import.meta.hot) import.meta.hot.dispose(() => controller.destroy());\n` }, index,
  ];
}

export function integrationPackages(framework: IntegrationFramework): string[] {
  const packages = ["core", ...(framework === "javascript" ? [] : [framework])];
  return packages.map(name => `nodara-${name}-0.1.0-alpha.1.tgz`);
}
