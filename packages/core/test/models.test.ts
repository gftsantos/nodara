import { describe, expect, it } from "vitest";
import {
  DAY,
  buildTimeScale,
  calendarRange,
  calculateTopologyLayout,
  dependencyPairs,
  expandCalendarEvents,
  expandRecurringEvent,
  parseRecurrence,
  percentToTimestamp,
  replaceTask,
  resizeTask,
  resolveGanttRange,
  resolveSnap,
  shiftTask,
  snapTimestamp,
  timestampToPercent,
} from "../src/index";
import type { CalendarEvent, GanttTask, TopologyData } from "../src/index";

const baseTask: GanttTask = { id: "a", label: "A", start: 0, end: DAY * 2 };

describe("time scale and gantt model", () => {
  it("[I028] resolves a range from tasks", () => expect(resolveGanttRange([baseTask])).toEqual({ start: 0, end: DAY * 2 }));
  it("[I029] gives empty datasets a safe day range", () => {
    const range = resolveGanttRange([]);
    expect(range.end - range.start).toBe(DAY);
  });
  it("[I030] respects explicit gantt range", () => expect(resolveGanttRange([baseTask], 10, 20)).toEqual({ start: 10, end: 20 }));
  it("[I031] creates 24 day ticks", () => expect(buildTimeScale(0, DAY, "day").ticks).toHaveLength(25));
  it("[I032] creates 14 week ticks", () => expect(buildTimeScale(0, DAY * 7, "week").ticks).toHaveLength(15));
  it("[I033] creates 12 month ticks", () => expect(buildTimeScale(0, DAY * 30, "month").ticks).toHaveLength(13));
  it("[I034] creates 8 quarter ticks", () => expect(buildTimeScale(0, DAY * 90, "quarter").ticks).toHaveLength(9));
  it("[I035] positions first and last ticks", () => { const ticks = buildTimeScale(0, DAY).ticks; expect(ticks[0]?.position).toBe(0); expect(ticks.at(-1)?.position).toBe(100); });
  it("[I036] converts timestamps to percentages", () => expect(timestampToPercent(50, { start: 0, duration: 100 })).toBe(50));
  it("[I037] converts percentages to timestamps", () => expect(percentToTimestamp(25, { start: 100, duration: 200 })).toBe(150));
  it("[I038] clamps out-of-range percentages", () => expect(timestampToPercent(200, { start: 0, duration: 100 })).toBe(100));
  it("[I039] resolves day snap", () => expect(resolveSnap("day")).toBe(DAY));
  it("[I040] resolves week snap", () => expect(resolveSnap("week")).toBe(DAY * 7));
  it("[I041] resolves numeric snap", () => expect(resolveSnap(250)).toBe(250));
  it("[I042] snaps timestamps", () => expect(snapTimestamp(DAY * 1.6, "day")).toBe(DAY * 2));
  it("[I043] shifts both task edges", () => expect(shiftTask(baseTask, DAY)).toMatchObject({ start: DAY, end: DAY * 3 }));
  it("[I044] resizes task start", () => expect(resizeTask(baseTask, "start", DAY / 2)).toMatchObject({ start: DAY / 2, end: DAY * 2 }));
  it("[I045] resizes task end", () => expect(resizeTask(baseTask, "end", DAY)).toMatchObject({ start: 0, end: DAY * 3 }));
  it("[I046] enforces minimum task duration", () => expect(resizeTask(baseTask, "end", -DAY * 5).end).toBe(DAY));
  it("[I047] replaces a task immutably", () => { const next = { ...baseTask, label: "Next" }; const result = replaceTask([baseTask], next); expect(result[0]?.label).toBe("Next"); expect(result).not.toBe(baseTask); });
  it("[I048] resolves dependency pairs", () => { const child = { ...baseTask, id: "b", dependencies: ["a"] }; expect(dependencyPairs([baseTask, child])[0]).toMatchObject({ from: { id: "a" }, to: { id: "b" } }); });
});

const graph: TopologyData = {
  nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }, { id: "d", label: "D" }],
  edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "c", to: "d" }],
};

describe("topology layouts", () => {
  it("[I049] respects manual positions", () => { const data = { nodes: [{ id: "a", label: "A", x: 10, y: 20 }], edges: [] }; expect(calculateTopologyLayout(data, "manual").get("a")).toMatchObject({ x: 10, y: 20 }); });
  it("[I050] supplies missing manual coordinates", () => expect(calculateTopologyLayout(graph, "manual").size).toBe(4));
  it("[I051] lays out every radial node", () => expect(calculateTopologyLayout(graph, "radial").size).toBe(4));
  it("[I052] centers a single radial node horizontally", () => expect(calculateTopologyLayout({ nodes: [{ id: "a", label: "A" }], edges: [] }, "radial", 800, 500).get("a")?.x).toBeCloseTo(400));
  it("[I053] lays out every grid node", () => expect(calculateTopologyLayout(graph, "grid").size).toBe(4));
  it("[I054] creates unique grid coordinates", () => { const values = [...calculateTopologyLayout(graph, "grid").values()].map((item) => `${item.x}:${item.y}`); expect(new Set(values).size).toBe(4); });
  it("[I055] places hierarchical roots above children", () => { const layout = calculateTopologyLayout(graph, "hierarchical"); expect(layout.get("a")!.y).toBeLessThan(layout.get("b")!.y); });
  it("[I056] places deeper hierarchical nodes lower", () => { const layout = calculateTopologyLayout(graph, "hierarchical"); expect(layout.get("d")!.y).toBeGreaterThan(layout.get("c")!.y); });
  it("[I057] force layout returns all nodes", () => expect(calculateTopologyLayout(graph, "force", 800, 500, 10).size).toBe(4));
  it("[I058] force layout keeps nodes in bounds", () => expect([...calculateTopologyLayout(graph, "force", 300, 200, 10).values()].every((item) => item.x >= 30 && item.x <= 270 && item.y >= 30 && item.y <= 170)).toBe(true));
  it("[I059] force layout is deterministic", () => expect([...calculateTopologyLayout(graph, "force", 300, 200, 10).values()]).toEqual([...calculateTopologyLayout(graph, "force", 300, 200, 10).values()]));
  it("[I060] auto layout uses complete manual coordinates", () => { const data = { nodes: [{ id: "a", label: "A", x: 11, y: 22 }], edges: [] }; expect(calculateTopologyLayout(data, "auto").get("a")).toMatchObject({ x: 11, y: 22 }); });
  it("[I061] auto layout handles small graphs", () => expect(calculateTopologyLayout(graph, "auto").size).toBe(4));
  it("[I062] auto layout handles large graphs efficiently", () => { const data = { nodes: Array.from({ length: 100 }, (_, id) => ({ id: String(id), label: String(id) })), edges: [] }; expect(calculateTopologyLayout(data, "auto").size).toBe(100); });
});

describe("calendar ranges and recurrence", () => {
  const event: CalendarEvent = { id: "e", title: "Event", start: "2026-01-05T10:00:00Z", durationMinutes: 60, recurrence: "FREQ=DAILY;COUNT=3" };
  it("[I063] creates a one-day view", () => expect(calendarRange(Date.parse("2026-01-05"), "day").days).toHaveLength(1));
  it("[I064] creates a seven-day week", () => expect(calendarRange(Date.parse("2026-01-05"), "week").days).toHaveLength(7));
  it("[I065] creates a five-day workweek", () => expect(calendarRange(Date.parse("2026-01-05"), "workweek").days).toHaveLength(5));
  it("[I066] creates a six-row month grid", () => expect(calendarRange(Date.parse("2026-02-15"), "month").days).toHaveLength(42));
  it("[I067] parses daily frequency", () => expect(parseRecurrence("FREQ=DAILY").frequency).toBe("DAILY"));
  it("[I068] parses recurrence interval", () => expect(parseRecurrence("FREQ=DAILY;INTERVAL=3").interval).toBe(3));
  it("[I069] parses weekly frequency", () => expect(parseRecurrence("FREQ=WEEKLY").frequency).toBe("WEEKLY"));
  it("[I070] parses monthly frequency", () => expect(parseRecurrence("FREQ=MONTHLY").frequency).toBe("MONTHLY"));
  it("[I071] parses recurrence count", () => expect(parseRecurrence("FREQ=DAILY;COUNT=5").count).toBe(5));
  it("[I072] parses recurrence until", () => expect(parseRecurrence("FREQ=DAILY;UNTIL=2026-01-10").until).toBe(Date.parse("2026-01-10")));
  it("[I073] parses BYDAY", () => expect(parseRecurrence("FREQ=WEEKLY;BYDAY=MO,WE").byDay).toEqual([1, 3]));
  it("[I074] rejects unknown recurrence frequency", () => expect(() => parseRecurrence("FREQ=HOURLY")).toThrowError(expect.objectContaining({ code: "ND_INVALID_RECURRENCE" })));
  it("[I075] includes non-recurring events in range", () => expect(expandRecurringEvent({ ...event, recurrence: undefined }, Date.parse("2026-01-01"), Date.parse("2026-02-01"))).toHaveLength(1));
  it("[I076] excludes non-recurring events outside range", () => expect(expandRecurringEvent({ ...event, recurrence: undefined }, Date.parse("2027-01-01"), Date.parse("2027-02-01"))).toHaveLength(0));
  it("[I077] expands daily recurrence count", () => expect(expandRecurringEvent(event, Date.parse("2026-01-01"), Date.parse("2026-02-01"))).toHaveLength(3));
  it("[I078] expands weekly recurrence", () => expect(expandRecurringEvent({ ...event, recurrence: "FREQ=WEEKLY;COUNT=3" }, Date.parse("2026-01-01"), Date.parse("2026-03-01"))).toHaveLength(3));
  it("[I079] expands monthly recurrence", () => expect(expandRecurringEvent({ ...event, recurrence: "FREQ=MONTHLY;COUNT=3" }, Date.parse("2026-01-01"), Date.parse("2026-05-01"))).toHaveLength(3));
  it("[I080] clips recurrence to the visible range", () => expect(expandRecurringEvent({ ...event, recurrence: "FREQ=DAILY;COUNT=20" }, Date.parse("2026-01-10"), Date.parse("2026-01-12"))).toHaveLength(2));
  it("[I081] enforces recurrence hard limits", () => expect(expandRecurringEvent({ ...event, recurrence: "FREQ=DAILY;COUNT=100" }, Date.parse("2026-01-01"), Date.parse("2027-01-01"), 7)).toHaveLength(7));
  it("[I082] creates unique occurrence ids", () => { const result = expandRecurringEvent(event, Date.parse("2026-01-01"), Date.parse("2026-02-01")); expect(new Set(result.map((item) => item.id)).size).toBe(result.length); });
  it("[I083] preserves recurrence source metadata", () => expect(expandRecurringEvent(event, Date.parse("2026-01-01"), Date.parse("2026-02-01"))[0]?.meta?.recurrenceSourceId).toBe("e"));
  it("[I084] expands multiple calendar events", () => expect(expandCalendarEvents([event, { id: "x", title: "X", start: "2026-01-06" }], Date.parse("2026-01-01"), Date.parse("2026-02-01"))).toHaveLength(4));
  it("[I163] expands multiple BYDAY occurrences per week", () => expect(expandRecurringEvent({ ...event, recurrence: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4" }, Date.parse("2026-01-01"), Date.parse("2026-02-01"))).toHaveLength(4));
});
