import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import {
  createCalendar, createChart, createDiagram, createGantt, createGeoMap, createTopology,
  normalizeCalendarEvents, normalizeChartSeries, normalizeDiagram, normalizeGanttTasks,
  normalizeGeoMap, normalizeTopology, buildChartData, type BaseOptions, type GanttTask,
} from "../../packages/core/src/index";
import { defineNodaraElements, type NodaraElement } from "../../packages/web-components/src/index";

const task: GanttTask = { id: "a", label: "A", start: "2026-01-01", end: "2026-01-03" };
function host() {
  const element = document.createElement("div");
  document.body.append(element);
  Object.defineProperties(element, { clientWidth: { value: 900 }, clientHeight: { value: 420 } });
  return element;
}
const factories = {
  gantt: (element: HTMLElement, options: BaseOptions = {}) => createGantt(element, { data: [task], ...options }),
  chart: (element: HTMLElement, options: BaseOptions = {}) => createChart(element, { series: [{ id: "a", label: "A", data: [{ x: "A", y: 10 }] }], ...options }),
  topology: (element: HTMLElement, options: BaseOptions = {}) => createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, ...options }),
  calendar: (element: HTMLElement, options: BaseOptions = {}) => createCalendar(element, { events: [{ id: "a", title: "A", start: "2026-01-01T09:00:00", end: "2026-01-01T10:00:00" }], date: "2026-01-01", ...options }),
  map: (element: HTMLElement, options: BaseOptions = {}) => createGeoMap(element, { data: { points: [{ id: "a", label: "A", latitude: 0, longitude: 0 }] }, ...options }),
  diagram: (element: HTMLElement, options: BaseOptions = {}) => createDiagram(element, { data: { nodes: [{ id: "a", label: "A" }], links: [] }, ...options }),
};

describe("Release contracts — every engine", () => {
  it("Web Component applies a type and its corresponding data atomically", () => { defineNodaraElements("atomic-state"); const element = document.createElement("atomic-state-chart") as NodaraElement; element.data = [{ id: "a", label: "A", data: [{ x: "a", y: 1 }, { x: "b", y: 2 }] }]; document.body.append(element); element.setState([{ id: "g", label: "Gauge", data: [{ x: "SLA", y: 87 }] }], { type: "gauge" }); expect(element.controller?.getOptions()).toMatchObject({ type: "gauge" }); expect(element.getAttribute("data-nd-type")).toBe("gauge"); element.remove(); });
  it("Web Component preserves an explicit same-value ARIA attribute", () => { defineNodaraElements("same-label"); const element = document.createElement("same-label-gantt") as NodaraElement; element.data = [task]; element.options = { ariaLabel: "First" }; document.body.append(element); element.setAttribute("aria-label", "First"); element.options = { ariaLabel: "Second" }; expect(element.getAttribute("aria-label")).toBe("First"); element.removeAttribute("aria-label"); expect(element.getAttribute("aria-label")).toBe("Second"); element.remove(); });
  it("Web Component destroys a controller disconnected during its initial render", () => { defineNodaraElements("unmount-now"); const element = document.createElement("unmount-now-gantt") as NodaraElement; const destroy = vi.fn(); const ready = vi.fn(); element.addEventListener("nodara:ready", ready); element.data = [task]; element.options = { plugins: [{ name: "unmount", beforeRender: () => element.remove(), onDestroy: destroy }] }; document.body.append(element); expect(element.isConnected).toBe(false); expect(element.controller).toBeUndefined(); expect(destroy).toHaveBeenCalledTimes(1); expect(ready).not.toHaveBeenCalled(); });
  for (const [name, create] of Object.entries(factories)) {
    it(`${name}: theme, tokens, ARIA and custom class updates`, () => {
      const element = host();
      const controller = create(element, { theme: "dark", ariaLabel: "Customer A", className: "custom-a" });
      expect(element.dataset.ndTheme).toBe("dark");
      controller.setOptions({ theme: "light", ariaLabel: "Customer B", tokens: { foreground: "#123456" } });
      expect(element.getAttribute("aria-label")).toBe("Customer B");
      expect(element.dataset.ndTheme).toBe("light");
      expect(element.style.getPropertyValue("--nd-fg")).toBe("#123456");
      expect(element.classList.contains("custom-a")).toBe(true);
      controller.destroy();
    });
    it(`${name}: destroy is idempotent and releases content`, () => {
      const element = host(); const destroy = vi.fn();
      const controller = create(element, { plugins: [{ name: "resource", onDestroy: destroy }] });
      controller.destroy(); controller.destroy(); controller.resize();
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(element.childElementCount).toBe(0);
    });
    it(`${name}: removing a plugin releases its resources`, () => {
      const destroy = vi.fn();
      const controller = create(host(), { plugins: [{ name: "resource", onDestroy: destroy }] });
      controller.setOptions({ plugins: [] }); controller.destroy();
      expect(destroy).toHaveBeenCalledTimes(1);
    });
    it(`${name}: destroying preserves caller-owned semantics`, () => {
      const element = host(); element.setAttribute("role", "group"); element.setAttribute("aria-label", "Customer widget");
      const controller = create(element); controller.destroy();
      expect(element.getAttribute("role")).toBe("group");
      expect(element.getAttribute("aria-label")).toBe("Customer widget");
    });
  }
});

describe("Errors and defensive validation", () => {
  const normalizers = { gantt: normalizeGanttTasks, chart: normalizeChartSeries, topology: normalizeTopology, calendar: normalizeCalendarEvents, map: normalizeGeoMap, diagram: normalizeDiagram };
  for (const [name, normalize] of Object.entries(normalizers)) {
    for (const [kind, value] of [["null", null], ["number", 42]] as const) {
      it(`${name}: malformed ${kind} reports a structured NodaraError`, () => {
        let error: unknown;
        try { (normalize as (input: unknown) => unknown)(value); } catch (cause) { error = cause; }
        expect(error).toBeInstanceOf(Error);
        expect((error as { code?: string })?.code).toMatch(/^ND_/);
      });
    }
  }
  it("invalid controller updates notify onError and the error subscription", () => {
    const onError = vi.fn(); const listener = vi.fn();
    const controller = createGantt(host(), { data: [task], onError }); controller.on("error", listener);
    expect(() => controller.update([{ ...task, start: "invalid" }])).toThrow();
    expect(onError).toHaveBeenCalledTimes(1); expect(listener).toHaveBeenCalledTimes(1);
  });
  it("invalid controller update preserves the last valid data and DOM", () => {
    const element = host(); const controller = createGantt(element, { data: [task] });
    const before = element.innerHTML; const data = controller.getData();
    expect(() => controller.update([{ ...task, start: "invalid" }])).toThrow();
    expect(controller.getData()).toBe(data); expect(element.innerHTML).toBe(before);
  });
  it("render subscriptions receive the documented data payload", () => {
    const controller = createGantt(host(), { data: [task] }); const listener = vi.fn();
    controller.on("render", listener); controller.resize();
    expect(listener).toHaveBeenCalledWith({ data: controller.getData(), options: controller.getOptions() });
  });
  it("plain-text data does not create executable HTML", () => {
    const element = host(); const label = '<img src=x onerror="window.__pwned=true">';
    createGantt(element, { data: [{ ...task, label }] });
    expect(element.querySelector("img")).toBeNull(); expect(element.textContent).toContain(label);
  });
  it("stacking matches categories rather than array positions", () => {
    const data = buildChartData([
      { id: "a", label: "A", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 20 }] },
      { id: "b", label: "B", data: [{ x: "Feb", y: 3 }, { x: "Mar", y: 4 }] },
    ], true);
    expect(data.filter(point => point.series.id === "b").map(point => point.baseline)).toEqual([20, 0]);
  });
  it("destroy prevents later plugin data-change callbacks", () => {
    const onDataChange = vi.fn();
    const controller = createGantt(host(), { data: [task], plugins: [{ name: "observer", onDataChange }] });
    controller.destroy();
    try { controller.update([{ ...task, label: "After destroy" }]); } catch { /* A documented rejection is also acceptable. */ }
    expect(onDataChange).not.toHaveBeenCalled();
  });
  it("a failed initial render disconnects its ResizeObserver", () => {
    const disconnect = vi.fn(); const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe = observe; disconnect = disconnect; });
    try {
      expect(() => createChart(host(), { series: [{ id: "a", label: "A", data: [{ x: 1, y: 1 }] }], valueFormatter: () => { throw new Error("formatter failed"); } })).toThrow("formatter failed");
      expect(observe).toHaveBeenCalledTimes(1); expect(disconnect).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("Web Components dynamic contract", () => {
  defineNodaraElements("audit");
  function element() {
    const widget = document.createElement("audit-gantt") as NodaraElement;
    widget.data = [task]; document.body.append(widget); return widget;
  }
  it("options property resets a removed zoom", () => {
    const widget = element(); widget.options = { zoom: "day" }; widget.options = {};
    expect(widget.dataset.ndZoom).toBe("month");
  });
  it("options attribute resets a removed zoom", () => {
    const widget = element(); widget.setAttribute("options", '{"zoom":"day"}'); widget.setAttribute("options", "{}");
    expect(widget.dataset.ndZoom).toBe("month");
  });
  it("removing options attribute resets to defaults", () => {
    const widget = element(); widget.setAttribute("options", '{"zoom":"day"}'); widget.removeAttribute("options");
    expect(widget.dataset.ndZoom).toBe("month");
  });
  it("ARIA label can be changed through options", () => {
    const widget = document.createElement("audit-gantt") as NodaraElement;
    widget.data = [task]; widget.options = { ariaLabel: "First" }; document.body.append(widget);
    widget.options = { ariaLabel: "Second" };
    expect(widget.getAttribute("aria-label")).toBe("Second");
  });
  it("edited task survives detach and reattach", () => {
    const widget = element();
    widget.querySelector("button")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const edited = JSON.stringify(widget.controller!.getData()); widget.remove(); document.body.append(widget);
    expect(JSON.stringify(widget.controller!.getData())).toBe(edited);
  });
  it("malformed JSON reports an error without clearing the widget", () => {
    const widget = element(); const error = vi.fn(); widget.addEventListener("nodara:error", error);
    widget.setAttribute("options", "{");
    expect(error).toHaveBeenCalledTimes(1); expect(widget.querySelector(".nd-gantt__bar")).not.toBeNull();
  });
});

describe("Distribution requirements", () => {
  for (const name of ["core", "react", "vue", "angular", "web-components"]) {
    it(`${name}: distributed archive includes the MIT notice`, () => {
      const files = execFileSync("tar", ["-tf", `public/downloads/nodara-${name}-0.1.0-alpha.1.tgz`], { encoding: "utf8" });
      expect(files.split(/\r?\n/).some(file => /\/LICENSE(?:\.[^/]*)?$/i.test(file))).toBe(true);
    });
  }
});
