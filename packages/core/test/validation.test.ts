import { describe, expect, it } from "vitest";
import {
  NodaraError,
  normalizeCalendarEvents,
  normalizeChartSeries,
  normalizeDiagram,
  normalizeGeoMap,
  normalizeGanttTasks,
  normalizeTopology,
} from "../src/index";

const task = { id: "a", label: "Alpha", start: "2026-01-01", end: "2026-01-05", progress: 50 };

describe("Nodara data contracts", () => {
  it("[I001] clamps task progress above 100", () => expect(normalizeGanttTasks([{ ...task, progress: 140 }])[0]?.progress).toBe(100));
  it("[I002] clamps task progress below zero", () => expect(normalizeGanttTasks([{ ...task, progress: -10 }])[0]?.progress).toBe(0));
  it("[I003] does not mutate gantt input", () => { const source = { ...task, progress: 140 }; normalizeGanttTasks([source]); expect(source.progress).toBe(140); });
  it("[I004] rejects inverted task ranges", () => expect(() => normalizeGanttTasks([{ ...task, start: "2026-02-01", end: "2026-01-01" }])).toThrowError(expect.objectContaining<NodaraError>({ code: "ND_INVALID_RANGE" })));
  it("[I005] rejects duplicate task ids", () => expect(() => normalizeGanttTasks([task, { ...task }])).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_ID" })));
  it("[I006] rejects missing task ids", () => expect(() => normalizeGanttTasks([{ ...task, id: "" }])).toThrowError(expect.objectContaining({ code: "ND_MISSING_ID" })));
  it("[I007] rejects missing task labels", () => expect(() => normalizeGanttTasks([{ ...task, label: "" }])).toThrowError(expect.objectContaining({ code: "ND_MISSING_LABEL" })));
  it("[I008] rejects dangling task dependencies", () => expect(() => normalizeGanttTasks([{ ...task, dependencies: ["missing"] }])).toThrowError(expect.objectContaining({ code: "ND_DANGLING_DEPENDENCY" })));
  it("[I009] rejects self dependencies", () => expect(() => normalizeGanttTasks([{ ...task, dependencies: ["a"] }])).toThrowError(expect.objectContaining({ code: "ND_SELF_DEPENDENCY" })));
  it("[I010] deduplicates task dependencies", () => { const tasks = normalizeGanttTasks([task, { ...task, id: "b", dependencies: ["a", "a"] }]); expect(tasks[1]?.dependencies).toEqual(["a"]); });
  it("[I011] rejects duplicate series ids", () => expect(() => normalizeChartSeries([{ id: "r", label: "Revenue", data: [] }, { id: "r", label: "Revenue 2", data: [] }])).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_ID" })));
  it("[I012] rejects infinite chart values", () => expect(() => normalizeChartSeries([{ id: "r", label: "Revenue", data: [{ x: 1, y: Infinity }] }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_VALUE" })));
  it("[I013] rejects NaN chart values", () => expect(() => normalizeChartSeries([{ id: "r", label: "Revenue", data: [{ x: 1, y: Number.NaN }] }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_VALUE" })));
  it("[I014] rejects invalid date points", () => expect(() => normalizeChartSeries([{ id: "r", label: "Revenue", data: [{ x: new Date("invalid"), y: 1 }] }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_DATE" })));
  it("[I015] clones chart data", () => { const source = [{ id: "r", label: "Revenue", data: [{ x: 1, y: 2 }] }]; expect(normalizeChartSeries(source)[0]).not.toBe(source[0]); });
  it("[I016] rejects dangling topology edges", () => expect(() => normalizeTopology({ nodes: [{ id: "api", label: "API" }], edges: [{ from: "api", to: "db" }] })).toThrowError(expect.objectContaining({ code: "ND_DANGLING_EDGE" })));
  it("[I017] rejects duplicate topology nodes", () => expect(() => normalizeTopology({ nodes: [{ id: "api", label: "API" }, { id: "api", label: "API 2" }], edges: [] })).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_ID" })));
  it("[I018] rejects duplicate explicit edge ids", () => expect(() => normalizeTopology({ nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [{ id: "e", from: "a", to: "b" }, { id: "e", from: "b", to: "a" }] })).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_EDGE" })));
  it("[I019] clones topology nodes and edges", () => { const source = { nodes: [{ id: "a", label: "A" }], edges: [] }; const result = normalizeTopology(source); expect(result.nodes[0]).not.toBe(source.nodes[0]); expect(result.edges).not.toBe(source.edges); });
  it("[I020] derives calendar end from duration", () => expect(normalizeCalendarEvents([{ id: "e", title: "Review", start: "2026-08-20T10:00:00Z", durationMinutes: 45 }])[0]?.end).toBe(Date.parse("2026-08-20T10:45:00Z")));
  it("[I021] rejects zero event duration", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "Review", start: 1, durationMinutes: 0 }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_DURATION" })));
  it("[I022] rejects negative event duration", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "Review", start: 1, durationMinutes: -5 }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_DURATION" })));
  it("[I023] rejects inverted event ranges", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "Review", start: 10, end: 5 }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_RANGE" })));
  it("[I024] rejects unsupported recurrence rules", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "Review", start: 1, recurrence: "FREQ=YEARLY" }])).toThrowError(expect.objectContaining({ code: "ND_INVALID_RECURRENCE" })));
  it("[I025] normalizes calendar start to timestamp", () => expect(normalizeCalendarEvents([{ id: "e", title: "Review", start: "2026-01-01" }])[0]?.start).toBe(Date.parse("2026-01-01")));
  it("[I026] rejects duplicate calendar ids", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "One", start: 1 }, { id: "e", title: "Two", start: 2 }])).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_ID" })));
  it("[I027] rejects missing event titles", () => expect(() => normalizeCalendarEvents([{ id: "e", title: "", start: 1 }])).toThrowError(expect.objectContaining({ code: "ND_MISSING_TITLE" })));
  it("[I201] normalizes geographic datasets without mutation", () => { const source = { points: [{ id: "pt", label: "Lisboa", latitude: 38.72, longitude: -9.14 }], routes: [], regions: [] }; const normalized = normalizeGeoMap(source); expect(normalized.points[0]).not.toBe(source.points[0]); expect(normalized).toEqual(source); });
  it("[I202] rejects out-of-range latitude", () => expect(() => normalizeGeoMap({ points: [{ id: "x", label: "X", latitude: 91, longitude: 0 }] })).toThrowError(expect.objectContaining({ code: "ND_COORDINATE_RANGE" })));
  it("[I203] rejects dangling geographic routes", () => expect(() => normalizeGeoMap({ points: [{ id: "a", label: "A", latitude: 0, longitude: 0 }], routes: [{ from: "a", to: "missing" }] })).toThrowError(expect.objectContaining({ code: "ND_DANGLING_ROUTE" })));
  it("[I204] rejects invalid geographic polygons", () => expect(() => normalizeGeoMap({ points: [], regions: [{ id: "r", label: "R", coordinates: [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }] }] })).toThrowError(expect.objectContaining({ code: "ND_INVALID_POLYGON" })));
  it("[I219] rejects duplicate geographic route ids", () => expect(() => normalizeGeoMap({ points: [{ id: "a", label: "A", latitude: 0, longitude: 0 }, { id: "b", label: "B", latitude: 1, longitude: 1 }], routes: [{ id: "r", from: "a", to: "b" }, { id: "r", from: "b", to: "a" }] })).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_ROUTE" })));
  it("[I205] clones diagram nodes and links", () => { const source = { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], links: [{ from: "a", to: "b" }] }; const normalized = normalizeDiagram(source); expect(normalized.nodes[0]).not.toBe(source.nodes[0]); expect(normalized.links[0]).not.toBe(source.links[0]); });
  it("[I206] rejects dangling diagram links", () => expect(() => normalizeDiagram({ nodes: [{ id: "a", label: "A" }], links: [{ from: "a", to: "missing" }] })).toThrowError(expect.objectContaining({ code: "ND_DANGLING_LINK" })));
  it("[I207] rejects dangling diagram parents", () => expect(() => normalizeDiagram({ nodes: [{ id: "a", label: "A", parentId: "missing" }], links: [] })).toThrowError(expect.objectContaining({ code: "ND_DANGLING_PARENT" })));
  it("[I208] rejects duplicate diagram links", () => expect(() => normalizeDiagram({ nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], links: [{ id: "l", from: "a", to: "b" }, { id: "l", from: "a", to: "b" }] })).toThrowError(expect.objectContaining({ code: "ND_DUPLICATE_LINK" })));
});
