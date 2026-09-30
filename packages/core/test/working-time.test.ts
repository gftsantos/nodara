import { describe, expect, it } from "vitest";
import { createWorkingClock, type WorkingCalendar } from "../src/working-time";
const hour = 3_600_000;
const calendar = (extra: Partial<WorkingCalendar> = {}): WorkingCalendar => ({ id: "office", timeZone: "Europe/Lisbon", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "17:00" }] })), ...extra });
const horizon = { startDate: "2026-01-01", endDate: "2027-01-01" };
const clock = (extra: Partial<WorkingCalendar> = {}) => createWorkingClock(calendar(extra), horizon);
describe("working time, civil exceptions and timezone transitions", () => {
  it("starts civil horizons at the first real instant when midnight does not exist", () => {
    const c = createWorkingClock(calendar({ timeZone: "America/Sao_Paulo", week: [{ day: 7, periods: [{ start: "09:00", end: "17:00" }] }] }), { startDate: "2018-11-04", endDate: "2018-11-05" });
    expect(c.horizon.startMs).toBe(Date.parse("2018-11-04T03:00Z")); expect(c.horizon.endMs).toBe(Date.parse("2018-11-05T02:00Z")); expect(c.between(c.horizon.startMs, c.horizon.endMs)).toBe(8 * hour);
  });
  it("rejects policy coercion without freezing the caller's data", () => {
    const value = ["later"]; expect(() => clock({ disambiguation: value as never })).toThrow(/policy/); expect(Object.isFrozen(value)).toBe(false);
  });
  it("crosses the spring DST weekend in work hours, not elapsed hours", () => {
    const c = clock(); const start = c.fromLocal("2026-03-27T16:00"); const result = c.add(start, 3 * hour);
    expect(result.endMs).toBe(Date.parse("2026-03-30T10:00:00Z")); expect(result.segments).toHaveLength(2);
    expect(c.toLocal(result.endMs)).toContain("2026-03-30T11:00:00.000+01:00");
    expect(c.between(result.startMs, result.endMs)).toBe(3 * hour);
    expect(c.subtract(result.endMs, 3 * hour).startMs).toBe(start);
  });
  it("crosses the autumn transition and excludes lunch", () => {
    const c = clock({ week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] })) });
    expect(c.toLocal(c.add(c.fromLocal("2026-10-23T16:00"), 3 * hour).endMs)).toContain("2026-10-26T11:00:00.000+00:00");
    expect(c.toLocal(c.add(c.fromLocal("2026-09-14T11:00"), 3 * hour).endMs)).toContain("2026-09-14T15:00");
  });
  it("treats exceptions as complete civil-day overrides", () => {
    const c = clock({ exceptions: { "2026-09-14": [], "2026-09-19": [{ start: "10:00", end: "12:00" }] } });
    expect(c.toLocal(c.alignForward(c.fromLocal("2026-09-14T10:00")))).toContain("2026-09-15T09:00");
    expect(c.between(c.fromLocal("2026-09-19T00:00"), c.fromLocal("2026-09-20T00:00"))).toBe(2 * hour);
  });
  it.each([["2026-03-29", 3], ["2026-10-25", 5]] as const)("counts actual working hours for shift 00–04 on %s", (day, hours) => {
    const c = clock({ week: [{ day: 7, periods: [{ start: "00:00", end: "04:00" }] }] });
    expect(c.between(c.fromLocal(`${day}T00:00`), c.fromLocal(`${day}T04:00`))).toBe(hours * hour);
  });
  it("rejects nonexistent and ambiguous local inputs by default", () => {
    const c = clock(); expect(() => c.fromLocal("2026-03-29T01:30")).toThrow(/Local time rejected/); expect(() => c.fromLocal("2026-10-25T01:30")).toThrow(/Local time rejected/);
    expect(c.fromLocal("2026-10-25T01:30", "earlier")).toBe(Date.parse("2026-10-25T00:30Z"));
    expect(c.fromLocal("2026-10-25T01:30", "later")).toBe(Date.parse("2026-10-25T01:30Z"));
  });
  it("supports half-hour transitions and quarter-hour offsets", () => {
    const c = clock({ timeZone: "Australia/Lord_Howe", week: [{ day: 7, periods: [{ start: "00:00", end: "04:00" }] }] });
    expect(c.between(c.fromLocal("2026-10-04T00:00"), c.fromLocal("2026-10-04T04:00"))).toBe(3.5 * hour);
    expect(clock({ timeZone: "Asia/Kathmandu" }).fromLocal("2026-09-14T09:00")).toBe(Date.parse("2026-09-14T03:15Z"));
  });
  it("preserves milliseconds and does not align zero-duration arithmetic", () => {
    const c = clock(); const start = c.fromLocal("2026-09-14T16:59:59.999");
    expect(c.toLocal(c.add(start, 2).endMs)).toContain("2026-09-15T09:00:00.001");
    const weekend = c.fromLocal("2026-09-19T12:00"); expect(c.add(weekend, 0)).toMatchObject({ startMs: weekend, endMs: weekend });
    expect(c.subtract(weekend, hour).endMs).toBe(c.fromLocal("2026-09-18T17:00"));
  });
  it("handles midnight endpoints without adding fixed 24-hour days", () => {
    const c = clock({ week: [{ day: 7, periods: [{ start: "00:00", end: "24:00" }] }] });
    expect(c.between(c.fromLocal("2026-03-29T00:00"), c.fromLocal("2026-03-30T00:00"))).toBe(23 * hour);
  });
  it("fails boundedly for no availability, insufficient horizon and invalid amounts", () => {
    const c = clock({ week: [] }); expect(() => c.add(c.horizon.startMs, 1)).toThrow(/Insufficient/); expect(() => c.alignForward(c.horizon.startMs)).toThrow(/No future/);
    for (const amount of [-1, 0.1, NaN, Infinity]) expect(() => c.add(c.horizon.startMs, amount)).toThrow();
    expect(() => c.add(c.horizon.startMs - 1, 0)).toThrow(/horizon/);
  });
  it.each([{ timeZone: "Invalid/Zone" }, { timeZone: "+01:00" }, { disambiguation: "random" }, { week: [{ day: 1, periods: [{ start: "17:00", end: "09:00" }] }] }, { week: [{ day: 1, periods: [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "13:00" }] }] }, { week: [{ day: 1, periods: [] }, { day: 1, periods: [] }] }, { exceptions: { "2026-02-30": [] } }])("rejects invalid calendar %o", change => {
    expect(() => clock(change as Partial<WorkingCalendar>)).toThrow();
  });
  it("isolates and freezes calendar inputs and interval snapshots", () => {
    const input = calendar(); const c = createWorkingClock(input, horizon); (input.week as { day: number }[])[0]!.day = 7;
    expect(c.calendar.week[0]!.day).toBe(1); expect(Object.isFrozen(c.intervals)).toBe(true); expect(Object.isFrozen(c.calendar.week[0]!.periods)).toBe(true);
  });
  it("limits civil horizons and rejects offset-bearing input", () => {
    expect(() => createWorkingClock(calendar(), { startDate: "2026-01-01", endDate: "2040-01-01" })).toThrow(/3660/);
    expect(() => clock().fromLocal("2026-09-14T09:00Z")).toThrow();
  });
});
