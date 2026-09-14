import { describe, expect, it, vi } from "vitest";
import { createCalendar } from "../src/calendar";
import { replaceCalendarEvent } from "../src/calendar-model";
import { createChart } from "../src/chart";
import { buildChartData, chartDomain, chartXScale } from "../src/chart-model";
import { createDiagram } from "../src/diagram";
import { createGeoMap } from "../src/geo-map";
import { calculateTopologyLayout } from "../src/layouts";
import { expandCalendarEvents, parseRecurrence } from "../src/recurrence";
import { createTopology } from "../src/topology";
import { normalizeTopology } from "../src/validation";
import { renderWebGLPoints } from "../src/webgl";
import type { CalendarEvent, CalendarView, ChartSeries, ChartType } from "../src/types";
import { createCanvas2DContext } from "./setup";

vi.mock("../src/webgl", () => ({ renderWebGLPoints: vi.fn(() => true) }));
const events: CalendarEvent[] = [{ id: "meeting", title: "Meeting", start: "2026-08-20T10:00:00Z", durationMinutes: 60 }];
const series: ChartSeries[] = [{ id: "signal", label: "Signal", data: [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 100, y: 30 }] }];
function host() { const root = document.createElement("div"); document.body.append(root); Object.defineProperties(root, { clientWidth: { value: 900 }, clientHeight: { value: 500 } }); return root; }
function canvas() { const context = createCanvas2DContext(); vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => type === "2d" ? context : {}) as never); return context; }

describe("Audited geometry and interaction regressions", () => {
  it("positions numeric X by value, not ordinal index", () => {
    const x = chartXScale(series, 0, 1000);
    expect(series[0]!.data.map((point, index) => x(point, index))).toEqual([0, 10, 1000]);
  });
  it("preserves irregular date distances", () => {
    const data = [{ ...series[0]!, data: ["2026-01-01", "2026-01-02", "2026-01-11"].map(x => ({ x, y: 1 })) }];
    const x = chartXScale(data, 0, 1000);
    expect(data[0]!.data.map((point, index) => x(point, index))).toEqual([0, 100, 1000]);
  });
  it("does not overflow the argument stack at 100,000 data points", () => {
    const data = [{ ...series[0]!, data: Array.from({ length: 100_000 }, (_, x) => ({ x, y: x - 50_000 })) }];
    expect(chartDomain(buildChartData(data))).toEqual({ minimum: -50_000, maximum: 49_999, range: 99_999 });
  });
  it.each<ChartType>(["line", "area", "bar"])("preserves %s geometry when WebGL is requested", type => {
    const context = canvas(); vi.mocked(renderWebGLPoints).mockClear();
    const controller = createChart(host(), { series, type, renderer: "webgl" });
    expect(renderWebGLPoints).not.toHaveBeenCalled();
    expect(type === "bar" ? context.fillRect : context.lineTo).toHaveBeenCalled();
    controller.destroy();
  });
  it("keeps Y-axis labels without grid lines", () => {
    const context = canvas(); const controller = createChart(host(), { series, showGrid: false });
    expect(context.fillText.mock.calls.filter(call => call[1] === 4)).toHaveLength(5);
    controller.destroy();
  });
  it.each<ChartType>(["range-area", "error-bar", "candlestick", "ohlc", "boxplot"])("includes %s bounds in the axis domain", type => {
    const points = [{ ...series[0]!, data: [{ x: "A", y: 5, meta: { low: -50, high: 200, min: -50, max: 200 } }] }];
    expect(chartDomain(buildChartData(points), type)).toMatchObject({ minimum: -50, maximum: 200 });
  });
  it.each<CalendarView>(["day", "week", "workweek", "month", "agenda", "timeline-day", "timeline-week", "resource-day", "resource-week"])("blocks disabled calendar interactions in %s", view => {
    const root = host(); const select = vi.fn(); const change = vi.fn();
    const controller = createCalendar(root, { events, date: "2026-08-20", view, interactive: false, onEventSelect: select, onEventChange: change });
    const buttons = root.querySelectorAll("button"); expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(button => { button.dispatchEvent(new MouseEvent("click", { detail: 1 })); button.click(); button.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); });
    expect(select).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled(); controller.destroy();
  });
  it("detaches a changed occurrence without deleting its recurring series", () => {
    const root = host(); const controller = createCalendar(root, { events: [{ ...events[0]!, recurrence: "FREQ=DAILY;COUNT=4" }], date: "2026-08-20", view: "month" });
    root.querySelector("button")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    const data = controller.getData();
    expect(data).toHaveLength(2); expect(data[0]!.recurrence).toBe("FREQ=DAILY;COUNT=4"); expect(data[0]!.excludedOccurrences).toEqual([0]);
    expect(expandCalendarEvents(data, Date.parse("2026-08-01"), Date.parse("2026-09-01"))).toHaveLength(4);
    expect(new Set(expandCalendarEvents(data, Date.parse("2026-08-01"), Date.parse("2026-09-01")).map(event => event.id)).size).toBe(4);
    expect(replaceCalendarEvent(data, data[1]!.id, { ...data[1]!, title: "Edited again" })).toHaveLength(2);
    controller.destroy();
  });
  it("keeps old unbounded recurrence visible in a distant window", () => {
    const recurring = [{ ...events[0]!, start: "2020-01-01T10:00:00Z", recurrence: "FREQ=DAILY" }];
    const result = expandCalendarEvents(recurring, Date.parse("2026-09-01"), Date.parse("2026-09-08"), 7);
    expect(result).toHaveLength(7); expect(new Date(result[0]!.start).toISOString()).toBe("2026-09-01T10:00:00.000Z");
  });
  it("does not drift a monthly 31st recurrence into the 3rd", () => {
    const result = expandCalendarEvents([{ ...events[0]!, start: "2026-01-31T10:00:00Z", recurrence: "FREQ=MONTHLY;COUNT=3" }], Date.parse("2026-01-01"), Date.parse("2026-07-01"));
    expect(result.map(event => new Date(event.start).getDate())).toEqual([31, 31, 31]);
  });
  it.each(["INTERVAL=0", "COUNT=garbage", "UNTIL=broken", "BYDAY=XX", "COUNT=-1", "BYMONTH=2"])("rejects invalid recurrence option %s", option => expect(() => parseRecurrence(`FREQ=DAILY;${option}`)).toThrow());
  it("draws only real days in each month of the year", () => {
    const root = host(); const controller = createCalendar(root, { events, view: "year", date: "2026-08-20" });
    expect(root.querySelectorAll(".nd-calendar__month-density i")).toHaveLength(365); controller.destroy();
  });
  it("does not overlay every fourth timeline booking", () => {
    const root = host(); const controller = createCalendar(root, { events: Array.from({ length: 6 }, (_, index) => ({ ...events[0]!, id: String(index) })), view: "timeline-day", date: "2026-08-20" });
    const positions = [...root.querySelectorAll<HTMLElement>(".nd-calendar__timeline-event")].map(button => button.style.top);
    expect(new Set(positions).size).toBe(6); controller.destroy();
  });
  it("moves all DAG edges forward, including a long path to an early enqueued node", () => {
    const data = { nodes: ["a", "b", "c", "d", "e"].map(id => ({ id, label: id })), edges: [["a", "d"], ["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"]].map(([from, to]) => ({ from: from!, to: to! })) };
    const positions = calculateTopologyLayout(data, "hierarchical");
    data.edges.forEach(edge => expect(positions.get(edge.to)!.y).toBeGreaterThan(positions.get(edge.from)!.y));
  });
  it.each(["mercator", "equirectangular"] as const)("centers latitude and longitude in %s", projection => {
    const context = canvas(); const controller = createGeoMap(host(), { data: { points: [{ id: "c", label: "Center", latitude: 40, longitude: -9 }] }, projection, center: { latitude: 40, longitude: -9 }, showGraticule: false });
    expect(context.arc.mock.calls[0]!.slice(0, 2)).toEqual([450, 250]); controller.destroy();
  });
  it("only draws geographic routes in route mode", () => {
    const context = canvas(); const data = { points: [{ id: "a", label: "A", latitude: 20, longitude: 10 }, { id: "b", label: "B", latitude: 40, longitude: 30 }], routes: [{ from: "a", to: "b" }] };
    const controller = createGeoMap(host(), { data, mode: "points" }); expect(context.quadraticCurveTo).not.toHaveBeenCalled();
    controller.setOptions({ mode: "routes" }); expect(context.quadraticCurveTo).toHaveBeenCalled(); controller.destroy();
  });
  it("does not produce NaN radii for negative geographic values", () => {
    const context = canvas(); const controller = createGeoMap(host(), { data: { points: [{ id: "a", label: "A", latitude: 20, longitude: 10, value: -10 }] }, mode: "bubbles" });
    expect(context.arc.mock.calls.every(call => call.slice(0, 3).every(Number.isFinite))).toBe(true); controller.destroy();
  });
  it("rejects nonfinite topology coordinates", () => expect(() => normalizeTopology({ nodes: [{ id: "a", label: "A", x: NaN }], edges: [] })).toThrow());
  it.each(["chart", "topology", "map", "diagram"])("blocks disabled accessible actions in %s", kind => {
    const root = host(); const select = vi.fn(); const interactive = false;
    const controller = kind === "chart" ? createChart(root, { series, interactive, onPointSelect: select }) : kind === "topology" ? createTopology(root, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, interactive, onNodeSelect: select }) : kind === "map" ? createGeoMap(root, { data: { points: [{ id: "a", label: "A", latitude: 0, longitude: 0 }] }, interactive, onPointSelect: select }) : createDiagram(root, { data: { nodes: [{ id: "a", label: "A" }], links: [] }, interactive, onNodeSelect: select });
    root.querySelectorAll("button").forEach(button => button.click()); expect(select).not.toHaveBeenCalled(); controller.destroy();
  });
});
