import { ElementRef } from "@angular/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick, reactive, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { Calendar as ReactCalendar, Chart as ReactChart, Diagram as ReactDiagram, Gantt as ReactGantt, GeoMap as ReactGeoMap, Topology as ReactTopology } from "../../react/src/index";
import { NodaraCalendar, NodaraChart, NodaraDiagram, NodaraGantt, NodaraGeoMap, NodaraTopology } from "../../vue/src/index";
import { NodaraCalendarComponent, NodaraChartComponent, NodaraDiagramComponent, NodaraGanttComponent, NodaraGeoMapComponent, NodaraTopologyComponent } from "../../angular/src/index";
import { defineNodaraElements, type NodaraElement } from "../../web-components/src/index";
import type { GanttTask } from "../src/index";

const tasks: GanttTask[] = [{ id: "a", label: "Alpha", start: "2026-01-01", end: "2026-01-04" }];
const chart = [{ id: "s", label: "Series", data: [{ x: "Jan", y: 1 }] }];
const topology = { nodes: [{ id: "a", label: "A" }], edges: [] };
const events = [{ id: "e", title: "Event", start: "2026-01-01" }];
const geo = { points: [{ id: "pt", label: "Lisboa", latitude: 38.72, longitude: -9.14 }] };
const diagram = { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], links: [{ from: "a", to: "b" }] };

function mountHost(): HTMLDivElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", { value: 800, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: 420, configurable: true });
  document.body.append(element);
  return element;
}

describe("React adapter", () => {
  it("resets removed options instead of leaking the previous recipe", async () => {
    const element = mountHost(); const root = createRoot(element);
    await act(async () => root.render(createElement(ReactChart, { series: chart, stacked: true, showLegend: false })));
    await act(async () => root.render(createElement(ReactChart, { series: chart })));
    expect(element.querySelector(".nd-chart")?.getAttribute("data-nd-stacked")).toBe("false");
    expect(element.querySelector(".nd-chart__legend")).not.toBeNull();
    await act(async () => root.unmount());
  });
  it("[I141] mounts the real gantt renderer", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactGantt, { data: tasks }))); expect(element.querySelector(".nd-gantt")).not.toBeNull(); await act(async () => root.unmount()); });
  it("[I142] updates React gantt data without remounting", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactGantt, { data: tasks }))); const renderer = element.querySelector(".nd-gantt"); await act(async () => root.render(createElement(ReactGantt, { data: [...tasks, { id: "b", label: "Beta", start: "2026-01-05", end: "2026-01-06" }] }))); expect(element.querySelectorAll(".nd-gantt__bar")).toHaveLength(2); expect(element.querySelector(".nd-gantt")).toBe(renderer); await act(async () => root.unmount()); });
  it("[I143] applies React option changes reactively", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactGantt, { data: tasks, zoom: "month" }))); await act(async () => root.render(createElement(ReactGantt, { data: tasks, zoom: "day" }))); expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(24); await act(async () => root.unmount()); });
  it("[I144] mounts React chart", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactChart, { series: chart }))); expect(element.querySelector(".nd-chart__canvas")).not.toBeNull(); await act(async () => root.unmount()); });
  it("[I145] mounts React topology", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactTopology, { data: topology }))); expect(element.querySelector(".nd-topology__canvas")).not.toBeNull(); await act(async () => root.unmount()); });
  it("[I146] mounts React calendar", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactCalendar, { events, date: "2026-01-01" }))); expect(element.querySelector(".nd-calendar__event")).not.toBeNull(); await act(async () => root.unmount()); });
  it("[I214] mounts React geographic maps", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactGeoMap, { data: geo }))); expect(element.querySelector(".nd-geo-map__canvas")).not.toBeNull(); await act(async () => root.unmount()); });
  it("[I215] mounts React diagrams", async () => { const element = mountHost(); const root = createRoot(element); await act(async () => root.render(createElement(ReactDiagram, { data: diagram, type: "sankey" }))); expect(element.querySelector(".nd-diagram__canvas")).not.toBeNull(); await act(async () => root.unmount()); });
});

describe("Vue adapter", () => {
  it("resets deleted nested options", async () => {
    const element = mountHost(); const options = reactive<{ stacked?: boolean }>({ stacked: true });
    const app = createApp({ setup: () => () => h(NodaraChart, { series: chart, options }) }); app.mount(element);
    delete options.stacked; await nextTick(); await nextTick();
    expect(element.querySelector(".nd-chart")?.getAttribute("data-nd-stacked")).toBe("false"); app.unmount();
  });
  it("forwards real calendar change events", async () => {
    const element = mountHost(); const change = vi.fn();
    const app = createApp({ render: () => h(NodaraCalendar, { events, options: { date: "2026-01-01" }, onEventChange: change }) }); app.mount(element); await nextTick();
    element.querySelector(".nd-calendar__event")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ change: "move", source: "keyboard" })); app.unmount();
  });
  it("forwards topology viewport events", async () => {
    const element = mountHost(); const change = vi.fn(); const app = createApp({ render: () => h(NodaraTopology, { data: topology, onViewportChange: change }) }); app.mount(element); await nextTick();
    element.querySelector("canvas")!.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 })); expect(change).toHaveBeenCalled(); app.unmount();
  });
  it("[I147] mounts the real Vue gantt renderer", async () => { const element = mountHost(); const app = createApp({ render: () => h(NodaraGantt, { data: tasks }) }); app.mount(element); await nextTick(); expect(element.querySelector(".nd-gantt")).not.toBeNull(); app.unmount(); });
  it("[I148] updates Vue gantt data", async () => { const element = mountHost(); const data = ref(tasks); const app = createApp({ setup: () => () => h(NodaraGantt, { data: data.value }) }); app.mount(element); data.value = [...tasks, { id: "b", label: "Beta", start: "2026-01-05", end: "2026-01-06" }]; await nextTick(); await nextTick(); expect(element.querySelectorAll(".nd-gantt__bar")).toHaveLength(2); app.unmount(); });
  it("[I149] applies Vue option changes reactively", async () => { const element = mountHost(); const options = reactive({ zoom: "month" as "month" | "day" }); const app = createApp({ setup: () => () => h(NodaraGantt, { data: tasks, options }) }); app.mount(element); options.zoom = "day"; await nextTick(); await nextTick(); expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(24); app.unmount(); });
  it("[I150] mounts every Vue visualization", async () => { const element = mountHost(); const app = createApp({ render: () => h("div", [h(NodaraChart, { series: chart }), h(NodaraTopology, { data: topology }), h(NodaraCalendar, { events, options: { date: "2026-01-01" } }), h(NodaraGeoMap, { data: geo }), h(NodaraDiagram, { data: diagram })]) }); app.mount(element); await nextTick(); expect(element.querySelector(".nd-chart")).not.toBeNull(); expect(element.querySelector(".nd-topology")).not.toBeNull(); expect(element.querySelector(".nd-calendar")).not.toBeNull(); expect(element.querySelector(".nd-geo-map")).not.toBeNull(); expect(element.querySelector(".nd-diagram")).not.toBeNull(); app.unmount(); });
});

describe("Angular adapter", () => {
  it("resets removed Angular options", () => {
    const element = mountHost(); const component = new NodaraChartComponent(); component.host = new ElementRef(element); component.series = chart; component.options = { stacked: true }; component.ngAfterViewInit(); component.options = {};
    component.ngOnChanges({ options: { previousValue: { stacked: true }, currentValue: {}, firstChange: false, isFirstChange: () => false } });
    expect(element.getAttribute("data-nd-stacked")).toBe("false"); component.ngOnDestroy();
  });
  it("forwards Angular calendar change events", () => {
    const element = mountHost(); const component = new NodaraCalendarComponent(); component.host = new ElementRef(element); component.events = events; component.options = { date: "2026-01-01" }; const change = vi.fn(); component.eventChange.subscribe(change); component.ngAfterViewInit();
    element.querySelector(".nd-calendar__event")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); expect(change).toHaveBeenCalled(); component.ngOnDestroy();
  });
  it("forwards Angular map and topology viewport events", () => {
    for (const component of [new NodaraGeoMapComponent(), new NodaraTopologyComponent()]) {
      const element = mountHost(); component.host = new ElementRef(element);
      if (component instanceof NodaraGeoMapComponent) component.data = geo; else component.data = topology;
      const change = vi.fn(); component.viewportChange.subscribe(change); component.ngAfterViewInit(); element.querySelector("canvas")!.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 })); expect(change).toHaveBeenCalled(); component.ngOnDestroy();
    }
  });
  it("[I151] mounts and updates Angular gantt data", () => { const element = mountHost(); const component = new NodaraGanttComponent(); component.host = new ElementRef(element); component.data = tasks; component.ngAfterViewInit(); component.data = [...tasks, { id: "b", label: "Beta", start: "2026-01-05", end: "2026-01-06" }]; component.ngOnChanges({ data: {} as never }); expect(element.querySelectorAll(".nd-gantt__bar")).toHaveLength(2); component.ngOnDestroy(); });
  it("[I152] applies Angular options reactively", () => { const element = mountHost(); const component = new NodaraGanttComponent(); component.host = new ElementRef(element); component.data = tasks; component.options = { zoom: "month" }; component.ngAfterViewInit(); component.options = { zoom: "day" }; component.ngOnChanges({ options: {} as never }); expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(24); component.ngOnDestroy(); });
  it("[I153] mounts Angular chart", () => { const element = mountHost(); const component = new NodaraChartComponent(); component.host = new ElementRef(element); component.series = chart; component.ngAfterViewInit(); expect(element.classList.contains("nd-chart")).toBe(true); component.ngOnDestroy(); });
  it("[I154] mounts Angular topology", () => { const element = mountHost(); const component = new NodaraTopologyComponent(); component.host = new ElementRef(element); component.data = topology; component.ngAfterViewInit(); expect(element.classList.contains("nd-topology")).toBe(true); component.ngOnDestroy(); });
  it("[I155] mounts Angular calendar", () => { const element = mountHost(); const component = new NodaraCalendarComponent(); component.host = new ElementRef(element); component.events = events; component.options = { date: "2026-01-01" }; component.ngAfterViewInit(); expect(element.classList.contains("nd-calendar")).toBe(true); component.ngOnDestroy(); });
  it("[I216] mounts Angular geographic maps", () => { const element = mountHost(); const component = new NodaraGeoMapComponent(); component.host = new ElementRef(element); component.data = geo; component.ngAfterViewInit(); expect(element.classList.contains("nd-geo-map")).toBe(true); component.ngOnDestroy(); });
  it("[I217] mounts Angular diagrams", () => { const element = mountHost(); const component = new NodaraDiagramComponent(); component.host = new ElementRef(element); component.data = diagram; component.ngAfterViewInit(); expect(element.classList.contains("nd-diagram")).toBe(true); component.ngOnDestroy(); });
});

describe("Web Components adapter", () => {
  it("resets removed custom-element options", () => {
    defineNodaraElements("audit"); const element = document.createElement("audit-chart") as NodaraElement; element.data = chart; element.options = { stacked: true }; document.body.append(element); element.options = {};
    expect(element.getAttribute("data-nd-stacked")).toBe("false"); element.remove();
  });
  it("[I156] registers all custom elements", () => { defineNodaraElements("test156"); expect(customElements.get("test156-gantt")).toBeDefined(); expect(customElements.get("test156-chart")).toBeDefined(); expect(customElements.get("test156-topology")).toBeDefined(); expect(customElements.get("test156-calendar")).toBeDefined(); expect(customElements.get("test156-geo-map")).toBeDefined(); expect(customElements.get("test156-diagram")).toBeDefined(); });
  it("[I218] renders geographic and diagram custom elements", () => { defineNodaraElements("test218"); const map = document.createElement("test218-geo-map") as NodaraElement; map.data = geo; const flow = document.createElement("test218-diagram") as NodaraElement; flow.data = diagram; document.body.append(map, flow); expect(map.querySelector("canvas")).not.toBeNull(); expect(flow.querySelector("canvas")).not.toBeNull(); });
  it("[I157] renders data assigned before connection", () => { defineNodaraElements("test157"); const element = document.createElement("test157-gantt") as NodaraElement; element.data = tasks; document.body.append(element); expect(element.querySelectorAll(".nd-gantt__bar")).toHaveLength(1); });
  it("[I158] updates custom-element data without recreation", () => { defineNodaraElements("test158"); const element = document.createElement("test158-gantt") as NodaraElement; element.data = tasks; document.body.append(element); const controller = element.controller; element.data = [...tasks, { id: "b", label: "Beta", start: "2026-01-05", end: "2026-01-06" }]; expect(element.querySelectorAll(".nd-gantt__bar")).toHaveLength(2); expect(element.controller).toBe(controller); });
  it("[I159] applies custom-element options reactively", () => { defineNodaraElements("test159"); const element = document.createElement("test159-gantt") as NodaraElement; element.data = tasks; document.body.append(element); element.options = { zoom: "day" }; expect(element.querySelectorAll(".nd-gantt__scale span")).toHaveLength(24); });
  it("[I160] forwards custom-element domain events", () => { defineNodaraElements("test160"); const element = document.createElement("test160-gantt") as NodaraElement; element.data = tasks; const listener = vi.fn(); element.addEventListener("nodara:task-select", listener); document.body.append(element); element.querySelector<HTMLButtonElement>(".nd-gantt__bar")!.click(); expect(listener).toHaveBeenCalled(); });
  it("[I161] reports invalid JSON options", () => { defineNodaraElements("test161"); const element = document.createElement("test161-gantt") as NodaraElement; const listener = vi.fn(); element.addEventListener("nodara:error", listener); document.body.append(element); element.setAttribute("options", "not-json"); expect(listener).toHaveBeenCalled(); });
  it("[I162] destroys the controller when disconnected", () => { defineNodaraElements("test162"); const element = document.createElement("test162-gantt") as NodaraElement; element.data = tasks; document.body.append(element); document.body.removeChild(element); expect(element.innerHTML).toBe(""); });
});
