import { describe, expect, it } from "vitest";
import {
  NodaraError,
  normalizeCalendarEvents,
  normalizeChartSeries,
  normalizeGanttTasks,
  normalizeTopology,
} from "../src/index";

describe("Nodara data contracts", () => {
  it("normalizes gantt progress without mutating source data", () => {
    const source = [{ id: "a", label: "Alpha", start: "2026-01-01", end: "2026-01-05", progress: 140 }];
    const normalized = normalizeGanttTasks(source);
    expect(normalized[0]?.progress).toBe(100);
    expect(source[0]?.progress).toBe(140);
  });

  it("rejects invalid task ranges with a stable error code", () => {
    expect(() => normalizeGanttTasks([
      { id: "a", label: "Alpha", start: "2026-02-01", end: "2026-01-01" },
    ])).toThrowError(expect.objectContaining<NodaraError>({ code: "ND_INVALID_RANGE" }));
  });

  it("rejects duplicate series identifiers", () => {
    expect(() => normalizeChartSeries([
      { id: "revenue", label: "Revenue", data: [{ x: "Jan", y: 1 }] },
      { id: "revenue", label: "Revenue forecast", data: [{ x: "Feb", y: 2 }] },
    ])).toThrowError(expect.objectContaining<NodaraError>({ code: "ND_DUPLICATE_ID" }));
  });

  it("rejects topology edges that reference missing nodes", () => {
    expect(() => normalizeTopology({
      nodes: [{ id: "api", label: "API" }],
      edges: [{ from: "api", to: "database" }],
    })).toThrowError(expect.objectContaining<NodaraError>({ code: "ND_DANGLING_EDGE" }));
  });

  it("derives calendar end time from duration", () => {
    const [event] = normalizeCalendarEvents([
      { id: "review", title: "Review", start: "2026-08-20T10:00:00Z", durationMinutes: 45 },
    ]);
    expect(event?.end).toBe(Date.parse("2026-08-20T10:45:00Z"));
  });
});
