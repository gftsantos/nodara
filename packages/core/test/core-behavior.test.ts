import { describe, expect, it, vi } from "vitest";
import {
  DAY,
  buildChartData,
  chartDomain,
  contrastRatio,
  createCalendar,
  createChart,
  createDiagram,
  createGantt,
  createGeoMap,
  createTopology,
  defaultDarkTokens,
  defaultLightTokens,
  hexToRgb,
  isInteractionEnabled,
  readableTextColor,
  relativeLuminance,
  renderWebGLPoints,
  resolveRenderMode,
  visualCatalog,
  visualCatalogCounts,
} from "../src/index";
import { createController } from "../src/controller";
import type { BaseOptions, ChartType, DiagramType, GanttTask, NodaraPlugin } from "../src/index";
import { createCanvas2DContext } from "./setup";

function host(width = 900, height = 500): HTMLDivElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: height, configurable: true });
  document.body.append(element);
  return element;
}

const tasks: GanttTask[] = [
  { id: "a", label: "Alpha", start: "2026-01-01", end: "2026-01-05", progress: 50 },
  { id: "b", label: "Beta", start: "2026-01-06", end: "2026-01-10", dependencies: ["a"] },
];

describe("color, render mode and chart model", () => {
  it("[I085] parses six-digit hex colors", () => expect(hexToRgb("#ff7657")).toEqual({ r: 255, g: 118, b: 87 }));
  it("[I086] expands three-digit hex colors", () => expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 }));
  it("[I087] rejects invalid hex colors", () => expect(hexToRgb("yellow")).toBeUndefined());
  it("[I088] computes black luminance", () => expect(relativeLuminance("#000000")).toBe(0));
  it("[I089] computes WCAG black/white contrast", () => expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21));
  it("[I090] selects readable dark text on fluorescent yellow", () => expect(readableTextColor("#c8fa63")).toBe("#111111"));
  it("[I091] keeps light theme primary text contrast", () => expect(contrastRatio(defaultLightTokens.foreground, defaultLightTokens.background)).toBeGreaterThan(7));
  it("[I092] keeps dark theme primary text contrast", () => expect(contrastRatio(defaultDarkTokens.foreground, defaultDarkTokens.background)).toBeGreaterThan(7));
  it("[I093] honors explicit canvas mode", () => expect(resolveRenderMode("canvas", 1)).toBe("canvas"));
  it("[I094] falls back from unavailable WebGL", () => expect(resolveRenderMode("webgl", 1, {}, false)).toBe("canvas"));
  it("[I095] chooses DOM under thresholds", () => expect(resolveRenderMode("auto", 5, {}, false)).toBe("dom"));
  it("[I096] chooses canvas for medium datasets", () => expect(resolveRenderMode("auto", 800, {}, false)).toBe("canvas"));
  it("[I097] chooses WebGL for large supported datasets", () => expect(resolveRenderMode("auto", 6_000, {}, true)).toBe("webgl"));
  it("[I098] disables all interactions with false", () => expect(isInteractionEnabled(false, "pointer")).toBe(false));
  it("[I099] disables a single interaction capability", () => expect(isInteractionEnabled({ zoom: false }, "zoom")).toBe(false));
  it("[I100] enables unspecified interaction capabilities", () => expect(isInteractionEnabled({ zoom: false }, "keyboard")).toBe(true));
  it("[I101] builds independent chart values", () => expect(buildChartData([{ id: "a", label: "A", data: [{ x: 0, y: 2 }] }], false)[0]).toMatchObject({ value: 2, baseline: 0 }));
  it("[I102] builds positive stacked chart values", () => { const data = buildChartData([{ id: "a", label: "A", data: [{ x: 0, y: 2 }] }, { id: "b", label: "B", data: [{ x: 0, y: 3 }] }], true); expect(data[1]).toMatchObject({ value: 5, baseline: 2 }); });
  it("[I103] builds negative stacked chart values", () => { const data = buildChartData([{ id: "a", label: "A", data: [{ x: 0, y: -2 }] }, { id: "b", label: "B", data: [{ x: 0, y: -3 }] }], true); expect(data[1]).toMatchObject({ value: -5, baseline: -2 }); });
  it("[I104] calculates a mixed chart domain", () => expect(chartDomain([{ series: { id: "a", label: "A", data: [] }, seriesIndex: 0, pointIndex: 0, value: 7, baseline: -2 }])).toEqual({ minimum: -2, maximum: 7, range: 9 }));
});

describe("controller lifecycle", () => {
  interface Options extends BaseOptions { suffix?: string }
  const make = (initial = [1], options: Options = {}) => createController(host(), initial, options, ({ container, data, options }) => { container.textContent = `${data.join(",")}${options.suffix ?? ""}`; }, { normalize: (data) => data.map((value) => Math.max(0, value)) });
  it("[I105] normalizes initial controller data", () => expect(make([-2]).getData()).toEqual([0]));
  it("[I106] normalizes every controller update", () => { const controller = make(); controller.update([-4]); expect(controller.getData()).toEqual([0]); });
  it("[I107] exposes current data defensively through API", () => expect(make([2]).getData()).toEqual([2]));
  it("[I108] updates controller options reactively", () => { const controller = make([2]); controller.setOptions({ suffix: "!" }); expect(controller.element.textContent).toBe("2!"); });
  it("[I109] exposes current options", () => { const controller = make([2], { suffix: "?" }); expect(controller.getOptions().suffix).toBe("?"); });
  it("[I110] emits data change after updates", () => { const controller = make(); const listener = vi.fn(); controller.on("data:change", listener); controller.update([3]); expect(listener).toHaveBeenCalledWith([3]); });
  it("[I111] emits options change", () => { const controller = make(); const listener = vi.fn(); controller.on("options:change", listener); controller.setOptions({ suffix: "!" }); expect(listener).toHaveBeenCalled(); });
  it("[I112] supports unsubscribing listeners", () => { const controller = make(); const listener = vi.fn(); const unsubscribe = controller.on("data:change", listener); unsubscribe(); controller.update([3]); expect(listener).not.toHaveBeenCalled(); });
  it("[I113] invokes plugin render hooks", () => { const before = vi.fn(); const after = vi.fn(); const plugin: NodaraPlugin = { name: "test", beforeRender: before, afterRender: after }; make([1], { plugins: [plugin] }); expect(before).toHaveBeenCalled(); expect(after).toHaveBeenCalled(); });
  it("[I114] invokes plugin data hooks", () => { const onDataChange = vi.fn(); const controller = make([1], { plugins: [{ name: "test", onDataChange }] }); controller.update([2]); expect(onDataChange).toHaveBeenCalled(); });
  it("[I115] invokes plugin option hooks", () => { const onOptionsChange = vi.fn(); const controller = make([1], { plugins: [{ name: "test", onOptionsChange }] }); controller.setOptions({ suffix: "!" }); expect(onOptionsChange).toHaveBeenCalled(); });
  it("[I116] invokes plugin destroy hooks", () => { const onDestroy = vi.fn(); const controller = make([1], { plugins: [{ name: "test", onDestroy }] }); controller.destroy(); expect(onDestroy).toHaveBeenCalled(); });
  it("[I117] clears rendered content on destroy", () => { const controller = make([1]); controller.destroy(); expect(controller.element.textContent).toBe(""); });
  it("[I118] routes rendering failures to onError", () => { const onError = vi.fn(); expect(() => createController(host(), [1], { onError }, () => { throw new Error("boom"); })).toThrow("boom"); expect(onError).toHaveBeenCalled(); });
});

describe("real renderers and interactions", () => {
  it("[I119] renders an accessible gantt region", () => { const element = host(); createGantt(element, { data: tasks }); expect(element.getAttribute("role")).toBe("region"); expect(element.getAttribute("aria-label")).toBe("Gantt chart"); });
  it("[I120] makes gantt zoom change tick density", () => { const element = host(); const controller = createGantt(element, { data: tasks, zoom: "month" }); expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(12); controller.setOptions({ zoom: "day" }); expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(24); });
  it("[I121] renders visual gantt dependencies", () => { const element = host(); createGantt(element, { data: tasks }); expect(element.querySelector("path[data-from='a'][data-to='b']")).not.toBeNull(); });
  it("[I122] honors non-interactive gantt mode", () => { const element = host(); createGantt(element, { data: tasks, interactive: false }); expect(element.querySelector<HTMLButtonElement>(".nd-gantt__bar")?.tabIndex).toBe(-1); });
  it("[I123] selects gantt tasks with the keyboard", () => { const element = host(); const onTaskSelect = vi.fn(); createGantt(element, { data: tasks, onTaskSelect }); element.querySelector<HTMLButtonElement>(".nd-gantt__bar")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); expect(onTaskSelect).toHaveBeenCalledWith(expect.objectContaining({ source: "keyboard" })); });
  it("[I124] changes gantt tasks with arrow keys", () => { const element = host(); const onTaskChange = vi.fn(); const controller = createGantt(element, { data: tasks, onTaskChange }); element.querySelector<HTMLButtonElement>(".nd-gantt__bar")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); expect(onTaskChange).toHaveBeenCalledWith(expect.objectContaining({ change: "move", source: "keyboard" })); expect(controller.getData()[0]?.start).not.toBe(tasks[0]?.start); });
  it("[I125] validates gantt controller updates", () => { const controller = createGantt(host(), { data: tasks }); expect(() => controller.update([{ ...tasks[0]!, end: "2025-01-01" }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_RANGE" })); });
  it("[I126] renders stacked chart state", () => { const element = host(); createChart(element, { series: [{ id: "a", label: "A", data: [{ x: 1, y: 2 }] }], stacked: true }); expect(element.dataset.ndStacked).toBe("true"); });
  it("[I127] renders accessible chart point controls", () => { const element = host(); createChart(element, { series: [{ id: "a", label: "A", data: [{ x: "Jan", y: 2 }] }] }); expect(element.querySelector("table button")?.textContent).toContain("Jan"); });
  it("[I128] emits chart keyboard selection", () => { const element = host(); const onPointSelect = vi.fn(); createChart(element, { series: [{ id: "a", label: "A", data: [{ x: "Jan", y: 2 }] }], onPointSelect }); element.querySelector<HTMLButtonElement>("table button")!.click(); expect(onPointSelect).toHaveBeenCalledWith(expect.objectContaining({ source: "keyboard" })); });
  it("[I129] renders chart tooltips", () => { const element = host(); createChart(element, { series: [{ id: "a", label: "A", data: [{ x: "Jan", y: 2 }] }], showTooltip: true }); expect(element.querySelector(".nd-chart__tooltip")).not.toBeNull(); });
  it.each<ChartType>(["line", "area", "bar", "scatter", "bubble", "pie", "donut", "radar", "polar-area", "heatmap", "waterfall", "funnel", "gauge", "candlestick", "histogram", "boxplot", "error-bar", "range-area", "step-line", "spline", "lollipop", "bullet", "radial-bar", "ohlc", "violin", "contour"])("[collection] renders the %s chart geometry", (type) => {
    const element = host();
    createChart(element, { series: [{ id: "a", label: "A", data: [{ x: "Jan", y: 24, meta: { size: 12, min: 0, max: 100, open: 18, high: 28, low: 15, close: 24 } }, { x: "Fev", y: 36 }] }], type });
    expect(element.dataset.ndType).toBe(type);
    expect(element.dataset.ndRenderer).toBe("canvas");
    expect(element.querySelector("canvas")).not.toBeNull();
  });
  it("[collection] exposes exactly 100 documented visual recipes", () => {
    expect(visualCatalog).toHaveLength(100);
    expect(visualCatalogCounts).toEqual({ gantt: 12, charts: 32, topology: 12, calendar: 16, maps: 14, diagrams: 14 });
    expect(new Set(visualCatalog.map((item) => item.id)).size).toBe(100);
  });
  it("[I130] records topology layout and renderer", () => { const element = host(); createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, layout: "grid" }); expect(element.dataset.ndLayout).toBe("grid"); expect(element.dataset.ndRenderer).toBe("canvas"); });
  it("[I131] exposes topology nodes to keyboards", () => { const element = host(); const onNodeSelect = vi.fn(); createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, onNodeSelect }); element.querySelector<HTMLButtonElement>("ul button")!.click(); expect(onNodeSelect).toHaveBeenCalledWith(expect.objectContaining({ source: "keyboard" })); });
  it("[I181] scales topology nodes down before dense layouts overlap", () => { const context = createCanvas2DContext(); vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => type === "2d" ? context : null) as typeof HTMLCanvasElement.prototype.getContext); createTopology(host(1120, 420), { data: { nodes: Array.from({ length: 180 }, (_, index) => ({ id: String(index), label: `Node ${index}` })), edges: [] }, layout: "grid", renderer: "canvas" }); expect(context.arc).toHaveBeenCalled(); expect(context.arc.mock.calls[0]?.[2]).toBeLessThan(10); });
  it("[I132] renders expanded calendar recurrences", () => { const element = host(); createCalendar(element, { events: [{ id: "e", title: "Daily", start: "2026-08-17T10:00:00", durationMinutes: 30, recurrence: "FREQ=DAILY;COUNT=5" }], date: "2026-08-20", view: "workweek" }); expect(element.querySelectorAll(".nd-calendar__event")).toHaveLength(5); });
  it("[I133] renders workweek day count", () => { const element = host(); createCalendar(element, { events: [], date: "2026-08-20", view: "workweek" }); expect(element.querySelectorAll(".nd-calendar__day")).toHaveLength(5); });
  it("[I134] filters calendar resources", () => { const element = host(); createCalendar(element, { events: [{ id: "a", title: "A", start: "2026-08-17", resourceId: "a" }, { id: "b", title: "B", start: "2026-08-17", resourceId: "b" }], date: "2026-08-17", visibleResourceIds: ["a"] }); expect(element.querySelectorAll(".nd-calendar__event")).toHaveLength(1); });
  it("[I135] honors non-interactive calendar mode", () => { const element = host(); createCalendar(element, { events: [{ id: "a", title: "A", start: "2026-08-17" }], date: "2026-08-17", interactive: false }); expect(element.querySelector<HTMLButtonElement>(".nd-calendar__event")?.tabIndex).toBe(-1); });
  it("[I136] moves calendar events with keyboard", () => { const element = host(); const onEventChange = vi.fn(); createCalendar(element, { events: [{ id: "a", title: "A", start: "2026-08-17" }], date: "2026-08-17", onEventChange }); element.querySelector<HTMLButtonElement>(".nd-calendar__event")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); expect(onEventChange).toHaveBeenCalledWith(expect.objectContaining({ change: "move", source: "keyboard" })); });
  it("[I164] moves gantt tasks with pointer drag", () => { const element = host(); const onTaskChange = vi.fn(); createGantt(element, { data: tasks, start: "2026-01-01", end: "2026-02-01", onTaskChange }); const timeline = element.querySelector<HTMLElement>(".nd-gantt__timeline")!; vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, toJSON() {} }); const bar = element.querySelector<HTMLElement>(".nd-gantt__bar")!; bar.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, button: 0, bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { clientX: 140, bubbles: true })); expect(onTaskChange).toHaveBeenCalledWith(expect.objectContaining({ change: "move", source: "pointer" })); });
  it("[I165] resizes gantt tasks from pointer handles", () => { const element = host(); const onTaskChange = vi.fn(); createGantt(element, { data: tasks, start: "2026-01-01", end: "2026-02-01", onTaskChange }); const timeline = element.querySelector<HTMLElement>(".nd-gantt__timeline")!; vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, toJSON() {} }); const handle = element.querySelector<HTMLElement>(".nd-gantt__resize--end")!; handle.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, button: 0, bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { clientX: 140, bubbles: true })); expect(onTaskChange).toHaveBeenCalledWith(expect.objectContaining({ change: "resize-end", source: "pointer" })); });
  it("[I166] moves calendar events with pointer drag", () => { const element = host(); const onEventChange = vi.fn(); createCalendar(element, { events: [{ id: "a", title: "A", start: "2026-08-17" }], date: "2026-08-17", onEventChange }); const grid = element.querySelector<HTMLElement>(".nd-calendar__grid")!; vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 700, height: 400, right: 700, bottom: 400, toJSON() {} }); const event = element.querySelector<HTMLElement>(".nd-calendar__event")!; event.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, button: 0, bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { clientX: 200, bubbles: true })); expect(onEventChange).toHaveBeenCalledWith(expect.objectContaining({ change: "move", source: "pointer" })); });
  it("[I167] zooms topology with the wheel", () => { const element = host(); const onViewportChange = vi.fn(); createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, onViewportChange }); element.querySelector<HTMLCanvasElement>("canvas")!.dispatchEvent(new WheelEvent("wheel", { clientX: 10, clientY: 10, deltaY: -10, bubbles: true, cancelable: true })); expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: 1.1, source: "pointer" })); });
  it("[I168] pans topology with pointer movement", () => { const element = host(); const onViewportChange = vi.fn(); createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, onViewportChange }); const canvas = element.querySelector<HTMLCanvasElement>("canvas")!; canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0, clientY: 0, button: 0, bubbles: true })); document.dispatchEvent(new PointerEvent("pointermove", { clientX: 30, clientY: 20, bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { clientX: 30, clientY: 20, bubbles: true })); expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ x: 30, y: 20, source: "pointer" })); });
  it.each<DiagramType>(["sankey", "alluvial", "treemap", "sunburst", "icicle", "circle-pack", "tree", "radial-tree", "mindmap", "flowchart", "org-chart", "er", "state", "chord"])("[collection] renders the %s diagram", (type) => {
    const element = host();
    createDiagram(element, { type, data: { nodes: [{ id: "a", label: "A", value: 10 }, { id: "b", label: "B", value: 5 }], links: [{ from: "a", to: "b", value: 5 }] } });
    expect(element.dataset.ndType).toBe(type);
    expect(element.querySelector("canvas")).not.toBeNull();
  });
  it("[I209] exposes map points to the keyboard", () => { const element = host(); const onPointSelect = vi.fn(); createGeoMap(element, { data: { points: [{ id: "pt", label: "Lisboa", latitude: 38.72, longitude: -9.14 }] }, onPointSelect }); element.querySelector<HTMLButtonElement>("ul button")!.click(); expect(onPointSelect).toHaveBeenCalledWith(expect.objectContaining({ source: "keyboard" })); });
  it.each(["mercator", "equirectangular", "orthographic"] as const)("[collection] renders the %s geographic projection", (projection) => { const element = host(); createGeoMap(element, { projection, data: { points: [{ id: "pt", label: "Lisboa", latitude: 38.72, longitude: -9.14 }] } }); expect(element.dataset.ndProjection).toBe(projection); });
  it("[I210] zooms the geographic viewport", () => { const element = host(); const onViewportChange = vi.fn(); createGeoMap(element, { data: { points: [] }, onViewportChange }); element.querySelector<HTMLCanvasElement>("canvas")!.dispatchEvent(new WheelEvent("wheel", { deltaY: -10, bubbles: true, cancelable: true })); expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: 1.1 })); });
  it("[I211] renders the agenda calendar view", () => { const element = host(); createCalendar(element, { date: "2026-08-17", view: "agenda", events: [{ id: "a", title: "A", start: "2026-08-17" }] }); expect(element.querySelectorAll(".nd-calendar__agenda-event")).toHaveLength(1); });
  it("[I212] renders resource scheduler rows", () => { const element = host(); createCalendar(element, { date: "2026-08-17", view: "resource-week", resources: [{ id: "r", label: "Room" }], events: [{ id: "a", title: "A", resourceId: "r", start: "2026-08-17" }] }); expect(element.querySelectorAll(".nd-calendar__timeline-row")).toHaveLength(1); expect(element.querySelectorAll(".nd-calendar__timeline-event")).toHaveLength(1); });
  it("[I213] renders twelve months in the year planner", () => { const element = host(); createCalendar(element, { date: "2026-08-17", view: "year", events: [] }); expect(element.querySelectorAll(".nd-calendar__month-card")).toHaveLength(12); });
});

describe("WebGL and large-volume primitives", () => {
  it("[I137] renders WebGL point buffers when supported", () => {
    const gl = {
      ARRAY_BUFFER: 1, STATIC_DRAW: 2, FLOAT: 3, VERTEX_SHADER: 4, FRAGMENT_SHADER: 5, COMPILE_STATUS: 6, LINK_STATUS: 7, COLOR_BUFFER_BIT: 8, POINTS: 9,
      attachShader: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(), clear: vi.fn(), clearColor: vi.fn(), compileShader: vi.fn(), createBuffer: vi.fn(() => ({})), createProgram: vi.fn(() => ({})), createShader: vi.fn(() => ({})), deleteBuffer: vi.fn(), deleteProgram: vi.fn(), deleteShader: vi.fn(), drawArrays: vi.fn(), enableVertexAttribArray: vi.fn(), getAttribLocation: vi.fn((_p, name) => name === "a_position" ? 0 : 1), getProgramParameter: vi.fn(() => true), getShaderParameter: vi.fn(() => true), getUniformLocation: vi.fn(() => ({})), linkProgram: vi.fn(), shaderSource: vi.fn(), uniform2f: vi.fn(), uniform4fv: vi.fn(), useProgram: vi.fn(), vertexAttribPointer: vi.fn(), viewport: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => type.startsWith("webgl") ? gl : null) as typeof HTMLCanvasElement.prototype.getContext);
    expect(renderWebGLPoints(document.createElement("canvas"), [{ x: 1, y: 2 }], 100, 100)).toBe(true);
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.POINTS, 0, 1);
  });
  it("[I138] normalizes ten thousand gantt tasks", () => { const large = Array.from({ length: 10_000 }, (_, index) => ({ id: String(index), label: `Task ${index}`, start: index * DAY, end: (index + 1) * DAY })); const start = performance.now(); const controller = createGantt(host(), { data: large, renderer: "canvas" }); expect(controller.getData()).toHaveLength(10_000); expect(performance.now() - start).toBeLessThan(3_000); });
  it("[I139] builds ten thousand chart points", () => { const series = [{ id: "a", label: "A", data: Array.from({ length: 10_000 }, (_, x) => ({ x, y: x % 100 })) }]; const start = performance.now(); expect(buildChartData(series)).toHaveLength(10_000); expect(performance.now() - start).toBeLessThan(1_000); });
  it("[I140] lays out ten thousand topology nodes", async () => { const { calculateTopologyLayout } = await import("../src/index"); const data = { nodes: Array.from({ length: 10_000 }, (_, index) => ({ id: String(index), label: String(index) })), edges: [] }; const start = performance.now(); const result = calculateTopologyLayout(data, "auto"); expect(result.size).toBe(10_000); expect(performance.now() - start).toBeLessThan(3_000); });
});
