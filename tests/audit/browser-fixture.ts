import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AxeResults } from "axe-core";

const bundle = readFileSync(resolve("packages/core/dist/index.js"), "utf8");
const exports = "createGantt,createChart,createCalendar,createTopology,createGeoMap,createDiagram,visualCatalog,buildChartData,chartDomain,renderWebGLPoints";
export async function mount(page: Page, engine: string, options: Record<string, unknown> = {}) {
  await page.route("**/__nodara_audit__", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="en"><head><title>Nodara release audit</title></head><body style="margin:16px"><main><div id="host" style="width:min(900px,100%);height:420px"></div><button id="after">After widget</button></main></body></html>' }));
  await page.goto("/__nodara_audit__");
  await page.addStyleTag({ path: resolve("packages/core/src/styles.css") });
  await page.addScriptTag({ type: "module", content: `${bundle}\nwindow.__nodara = {${exports}};` });
  await page.waitForFunction(() => Boolean((window as AuditWindow).__nodara));
  await page.evaluate(({ engine, options }) => {
    const w = window as AuditWindow;
    w.__events = [];
    const callback = (event: unknown) => w.__events.push(event as AuditEvent);
    w.__controller = w.__nodara[engine](document.getElementById("host")!, {
      ...options, onPointSelect: callback, onTaskSelect: callback, onTaskChange: callback,
      onEventSelect: callback, onEventChange: callback, onNodeSelect: callback, onViewportChange: callback,
    });
  }, { engine, options });
  await expect(page.locator("#host.nd-root")).toBeVisible();
}

// The browser harness deliberately loads the public built ESM, not source aliases.
export type AuditWindow = typeof window & {
  __nodara: Record<string, (element: HTMLElement, options: Record<string, unknown>) => AuditWindow["__controller"]>;
  __controller: { getData(): unknown; getOptions(): Record<string, unknown>; update(data: unknown): void; setOptions(options: Record<string, unknown>): void; resize(): void; destroy(): void };
  __events: AuditEvent[];
  axe: { run(context: unknown, options: unknown): Promise<AxeResults> };
}
interface AuditEvent { point?: { x: unknown }; change?: string; x?: number; y?: number }
export const series = [{ id: "revenue", label: "Revenue", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 20 }, { x: "Mar", y: 30 }] }];
export const tasks = [{ id: "a", label: "Task Alpha", start: "2026-01-02", end: "2026-01-05" }, { id: "b", label: "Task Beta", start: "2026-01-02", end: "2026-01-06", dependencies: ["a"] }];
export const events = [{ id: "a", title: "Meeting Alpha", start: "2026-01-02T09:00:00", end: "2026-01-02T10:00:00" }];
export const topology = { nodes: [{ id: "a", label: "API", x: 140, y: 140 }, { id: "b", label: "Database", x: 260, y: 240 }], edges: [{ id: "ab", from: "a", to: "b" }] };
export const widgets: Array<[string, string, Record<string, unknown>]> = [
  ["gantt", "createGantt", { data: tasks, start: "2026-01-01", end: "2026-01-15" }],
  ["chart", "createChart", { series }],
  ["calendar", "createCalendar", { events, date: "2026-01-02", view: "day" }],
  ["topology", "createTopology", { data: topology, layout: "manual" }],
  ["map", "createGeoMap", { data: { points: [{ id: "a", label: "Lisbon", latitude: 38.7, longitude: -9.1 }] } }],
  ["diagram", "createDiagram", { data: { nodes: [{ id: "a", label: "Start" }, { id: "b", label: "End" }], links: [{ from: "a", to: "b", value: 10 }] } }],
];

export async function linePoint(page: Page, index = 1) {
  const rect = await page.locator("#host canvas").boundingBox();
  if (!rect) throw new Error("Missing chart canvas");
  const width = rect.width; const height = rect.height;
  return { x: rect.x + 52 + index / 2 * (width - 74), y: rect.y + 24 + (height - 62) * (1 - [10, 20, 30][index]! / 30) };
}
