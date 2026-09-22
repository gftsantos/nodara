import { describe, expect, it } from "vitest";
import { createWorkingClock, createWorkingPlanStore, evaluateWorkingPlan, workingPlanViews, type WorkingCalendar, type WorkingPlan } from "../src/working-time";
const H = 3600000, epoch = (value: string) => Date.parse(value);
const calendar = (start = "09:00", end = "17:00", timeZone = "UTC"): WorkingCalendar => ({ id: "office", timeZone, week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start, end }] })) });
function plan(): WorkingPlan {
  const startMs = epoch("2026-10-19T09:00Z");
  return { schemaVersion: 2, timeBasis: "working", projectStartMs: startMs, calendar: calendar(), horizon: { startDate: "2026-10-19", endDate: "2026-11-01" },
    tasks: ["a", "b"].map(id => ({ id, label: id, startMs, workingMs: 4 * H, progress: 0 })), resources: [{ id: "r", label: "Team", capacityUnits: 100 }], assignments: ["a", "b"].map(taskId => ({ taskId, resourceId: "r", units: 100 })), dependencies: [], locations: [] };
}
describe("resource calendars and serial leveling", () => {
  it("is additive: absent resource calendars and leveling keep legacy windows", () => {
    const p = plan(), before = evaluateWorkingPlan(p), after = evaluateWorkingPlan({ ...p, resources: p.resources.map(r => ({ ...r, calendar: p.calendar })), resourceLeveling: "none" });
    expect(after.windows).toEqual(before.windows); expect(before.conflicts).toHaveLength(1);
  });
  it("intersects shifts and excludes resource holidays without changing work", () => {
    const p = plan(); const result = evaluateWorkingPlan({ ...p, resources: [{ ...p.resources[0]!, calendar: { ...calendar("13:00", "20:00"), exceptions: { "2026-10-19": [] } } }] });
    expect(result.windows[0]).toMatchObject({ startMs: epoch("2026-10-20T13:00Z"), endMs: epoch("2026-10-20T17:00Z"), workingMs: 4 * H });
    expect(result.plan.resources[0]!.calendar!.exceptions).toEqual({ "2026-10-19": [] });
  });
  it("all assigned resources must be available simultaneously", () => {
    const p = plan(); const result = evaluateWorkingPlan({ ...p, resources: [{ id: "r", label: "One", capacityUnits: 100, calendar: calendar("10:00", "16:00") }, { id: "s", label: "Two", capacityUnits: 100, calendar: calendar("14:00", "18:00") }], assignments: [...p.assignments, { taskId: "a", resourceId: "s", units: 50 }] });
    expect(result.windows[0]!.segments).toEqual([{ startMs: epoch("2026-10-19T14:00Z"), endMs: epoch("2026-10-19T16:00Z") }, { startMs: epoch("2026-10-20T14:00Z"), endMs: epoch("2026-10-20T16:00Z") }]);
    expect(result.windows[1]!.startMs).toBe(epoch("2026-10-19T10:00Z"));
  });
  it("resource timezone conversion handles different DST transition weeks", () => {
    const p = plan(); const result = evaluateWorkingPlan({ ...p, projectStartMs: epoch("2026-10-26T09:00Z"), tasks: p.tasks.map(t => ({ ...t, startMs: epoch("2026-10-26T09:00Z") })), resources: [{ ...p.resources[0]!, calendar: calendar("09:00", "17:00", "America/New_York") }] });
    expect(result.windows[0]).toMatchObject({ startMs: epoch("2026-10-26T13:00Z"), endMs: epoch("2026-10-26T17:00Z") });
  });
  it.each(["Pacific/Kiritimati", "America/Adak", "Asia/Kathmandu"])("covers project UTC boundaries in %s", timeZone => {
    const p = plan(), full = { ...calendar(), week: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, periods: [{ start: "00:00", end: "24:00" }] })) };
    const result = evaluateWorkingPlan({ ...p, calendar: full, horizon: { startDate: "2026-10-19", endDate: "2026-10-20" }, tasks: p.tasks.map(t => ({ ...t, workingMs: H, startMs: epoch("2026-10-19T23:00Z") })), resources: [{ ...p.resources[0]!, calendar: { ...full, timeZone } }] });
    expect(result.windows[0]!.endMs).toBe(epoch("2026-10-20T00:00Z"));
  });
  it("split overnight shifts retain exact working segments", () => {
    const p = plan(), night = { ...calendar(), week: [{ day: 1, periods: [{ start: "22:00", end: "24:00" }] }, { day: 2, periods: [{ start: "00:00", end: "02:00" }] }] };
    const result = evaluateWorkingPlan({ ...p, calendar: { ...calendar(), week: [1, 2].map(day => ({ day, periods: [{ start: "00:00", end: "24:00" }] })) }, resources: [{ ...p.resources[0]!, calendar: night }] });
    expect(result.windows[0]).toMatchObject({ startMs: epoch("2026-10-19T22:00Z"), endMs: epoch("2026-10-20T02:00Z") });
  });
  it.each([null, {}, { ...calendar(), timeZone: "Invalid/Zone" }, { ...calendar(), week: [{ day: 1, periods: [{ start: "20:00", end: "08:00" }] }] }])("rejects invalid resource calendar %j atomically", candidate => {
    const p = plan(), store = createWorkingPlanStore(p), before = store.getSnapshot();
    expect(() => store.preview({ ...p, resources: [{ ...p.resources[0]!, calendar: candidate as WorkingCalendar }] })).toThrow(); expect(store.getSnapshot()).toBe(before);
  });
  it("no common work fails instead of silently ignoring an unavailable resource", () => {
    const p = plan(); expect(() => evaluateWorkingPlan({ ...p, resources: [{ ...p.resources[0]!, calendar: calendar("18:00", "20:00") }] })).toThrow(/joint working time/);
  });
  it("unassigned tasks inherit project hours while unused calendars are validated", () => {
    const p = plan(), result = evaluateWorkingPlan({ ...p, assignments: [], resources: [{ ...p.resources[0]!, calendar: calendar("18:00", "20:00") }] });
    expect(result.windows[0]!.endMs).toBe(epoch("2026-10-19T13:00Z")); expect(result.capacity).toEqual([]);
  });
  it("serial leveling removes overload with stable topological priority", () => {
    const p = plan(), result = evaluateWorkingPlan({ ...p, resourceLeveling: "serial" });
    expect(result.windows.map(w => w.endMs)).toEqual([epoch("2026-10-19T13:00Z"), epoch("2026-10-19T17:00Z")]); expect(result.conflicts).toEqual([]);
    expect(evaluateWorkingPlan(result.plan)).toEqual(result);
    const reversed = evaluateWorkingPlan({ ...p, tasks: [...p.tasks].reverse(), resourceLeveling: "serial" }); expect(reversed.windows[0]!.taskId).toBe("b"); expect(reversed.windows[0]!.startMs).toBe(p.projectStartMs);
  });
  it("fractional allocations keep parallel work when capacity permits", () => {
    const p = plan(), result = evaluateWorkingPlan({ ...p, resourceLeveling: "serial", assignments: p.assignments.map(a => ({ ...a, units: 50 })) });
    expect(result.windows[0]!.startMs).toBe(result.windows[1]!.startMs); expect(result.capacity[0]!.demandUnits).toBe(100);
  });
  it("locked reservations are honored even when listed after other tasks", () => {
    const p = plan(), result = evaluateWorkingPlan({ ...p, resourceLeveling: "serial", tasks: p.tasks.map(t => t.id === "b" ? { ...t, locked: true, startMs: t.startMs + H, workingMs: 2 * H } : t) });
    expect(result.windows[0]!.segments).toEqual([{ startMs: p.projectStartMs, endMs: p.projectStartMs + H }, { startMs: p.projectStartMs + 3 * H, endMs: p.projectStartMs + 6 * H }]); expect(result.conflicts).toEqual([]);
  });
  it("locked predecessor conflict does not silently move its dependent", () => {
    const p = plan(); expect(() => evaluateWorkingPlan({ ...p, resourceLeveling: "serial", tasks: p.tasks.map(t => ({ ...t, locked: t.id === "b" })), dependencies: [{ id: "ss", fromTaskId: "a", toTaskId: "b", kind: "SS", lagMs: 0 }] })).toThrow(/locked/);
  });
  it.each(["FS", "SS", "FF", "SF"] as const)("leveled %s still satisfies signed lag and preserves working duration", kind => {
    const p = plan(); for (const lagMs of [-H, 0, H, 20 * H]) {
      const result = evaluateWorkingPlan({ ...p, resourceLeveling: "serial", dependencies: [{ id: "ab", fromTaskId: "a", toTaskId: "b", kind, lagMs }] }), [a, b] = result.windows;
      expect(kind[1] === "S" ? b!.startMs : b!.endMs).toBeGreaterThanOrEqual((kind[0] === "S" ? a!.startMs : a!.endMs) + lagMs); expect(b!.workingMs).toBe(4 * H); expect(result.conflicts).toEqual([]);
    }
  });
  it.each([0, 50])("rejects impossible capacity %s without inflating units", capacityUnits => {
    const p = plan(); expect(() => evaluateWorkingPlan({ ...p, resourceLeveling: "serial", resources: [{ ...p.resources[0]!, capacityUnits }] })).toThrow(/total capacity/);
  });
  it("insufficient leveling horizon is explicit and atomic", () => {
    const p = plan(), short = { ...p, horizon: { startDate: "2026-10-19", endDate: "2026-10-20" }, tasks: p.tasks.map(t => ({ ...t, workingMs: 8 * H })) }, store = createWorkingPlanStore(short);
    expect(() => store.apply({ ...short, resourceLeveling: "serial" }, 0)).toThrow(); expect(store.getSnapshot().revision).toBe(0);
  });
  it("resource absence + leveling preview applies once, replays and exports", () => {
    const p = plan(), store = createWorkingPlanStore(p), initial = store.exportJSON(), candidate: WorkingPlan = { ...p, resourceLeveling: "serial", resources: [{ ...p.resources[0]!, calendar: { ...calendar(), exceptions: { "2026-10-19": [] } } }] };
    const preview = store.preview(candidate); expect(store.exportJSON()).toBe(initial); expect(preview.changes).toHaveLength(2); expect(preview.evaluation.conflicts).toEqual([]);
    store.apply(preview.evaluation.plan, preview.expectedRevision); expect(store.getSnapshot().revision).toBe(1); const saved = store.exportJSON();
    expect(evaluateWorkingPlan(JSON.parse(saved))).toEqual(store.getSnapshot().evaluation); expect(workingPlanViews(store.getSnapshot().evaluation).calendar).toHaveLength(2);
    store.undo(); expect(store.exportJSON()).toBe(initial); store.redo(); expect(store.exportJSON()).toBe(saved);
    expect(() => store.apply(candidate, 0)).toThrow(/stale/);
  });
  it("locked calendar changes require a separate unlock", () => {
    const p = plan(), locked = { ...p, tasks: p.tasks.map(t => ({ ...t, locked: true })) }, store = createWorkingPlanStore(locked);
    expect(() => store.preview({ ...locked, resources: [{ ...p.resources[0]!, calendar: calendar("13:00", "17:00") }] })).toThrow(/Unlock/);
  });
  it("existing serial locks survive no-op preview and unrelated edits", () => {
    const p = plan(), lockedPlan: WorkingPlan = { ...p, resourceLeveling: "serial", tasks: p.tasks.map(t => t.id === "b" ? { ...t, locked: true, startMs: t.startMs + H, workingMs: 2 * H } : t) }, store = createWorkingPlanStore(lockedPlan);
    const before = store.getSnapshot().evaluation.windows;
    expect(store.preview(store.getSnapshot().evaluation.plan).changes).toEqual([]);
    store.apply({ ...store.getSnapshot().evaluation.plan, tasks: store.getSnapshot().evaluation.plan.tasks.map(t => ({ ...t, label: t.label + " renamed" })) }, 0);
    expect(store.getSnapshot().evaluation.windows).toEqual(before);
    expect(evaluateWorkingPlan(JSON.parse(store.exportJSON()))).toEqual(store.getSnapshot().evaluation);
  });
  it.each([true, "automatic", null, 0])("rejects unsupported leveling option %j", resourceLeveling => { expect(() => evaluateWorkingPlan({ ...plan(), resourceLeveling } as WorkingPlan)).toThrow(/resourceLeveling/); });
  it("zero-duration milestones do not require availability or capacity", () => {
    const p = plan(), result = evaluateWorkingPlan({ ...p, resourceLeveling: "serial", tasks: p.tasks.map(t => ({ ...t, workingMs: 0 })), resources: [{ ...p.resources[0]!, capacityUnits: 0, calendar: { ...calendar(), week: [] } }] }); expect(result.conflicts).toEqual([]); expect(result.windows[0]!.startMs).toBe(p.projectStartMs);
  });
  it("canonical resource calendars are frozen and input-isolated", () => {
    const p = plan(), cal = calendar(), result = evaluateWorkingPlan({ ...p, resources: [{ ...p.resources[0]!, calendar: cal }] }); expect(result.plan.resources[0]!.calendar).not.toBe(cal); expect(Object.isFrozen(result.plan.resources[0]!.calendar!.week)).toBe(true); expect(Object.isFrozen(cal)).toBe(false);
  });
});
describe("indexed clock arithmetic", () => {
  it.each(Array.from({ length: 20 }, (_, i) => i))("matches reference interval sums and inverse addition for seed %s", seed => {
    const clock = createWorkingClock({ ...calendar(), timeZone: "Europe/Lisbon", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] })) }, { startDate: "2026-10-01", endDate: "2026-11-01" });
    const from = clock.horizon.startMs + seed * 86400000 + 30 * 60000, to = from + 2 * 86400000;
    const expected = clock.intervals.reduce((sum, span) => sum + Math.max(0, Math.min(to, span.endMs) - Math.max(from, span.startMs)), 0);
    expect(clock.between(from, to)).toBe(expected);
    const window = clock.add(from, 6 * H); expect(clock.between(window.startMs, window.endMs)).toBe(6 * H); expect(clock.subtract(window.endMs, 6 * H)).toEqual(window);
  });
});
