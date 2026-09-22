import { Temporal } from "@js-temporal/polyfill";
import { NodaraError } from "@nodara/core";
import { intervalSchedule } from "./working-intervals";
export { evaluateWorkingPlan, workingPlanViews, createWorkingPlanStore } from "./working-plan";
export type { WorkingTask, WorkingResource, WorkingPlan, WorkingEvaluation, WorkingSnapshot, WorkingPreview } from "./working-plan";

export type TimeDisambiguation = "reject" | "earlier" | "later" | "compatible";
export interface WorkPeriod { readonly start: string; readonly end: string }
export interface WorkingCalendar {
  readonly id: string;
  readonly timeZone: string;
  readonly week: readonly { readonly day: number; readonly periods: readonly WorkPeriod[] }[];
  /** ISO civil dates override the entire day; [] closes a day (including holidays). */
  readonly exceptions?: Readonly<Record<string, readonly WorkPeriod[]>>;
  readonly disambiguation?: TimeDisambiguation;
}
export interface WorkingInterval { readonly startMs: number; readonly endMs: number }
export interface WorkingWindow extends WorkingInterval { readonly workingMs: number; readonly segments: readonly WorkingInterval[] }
export interface WorkingClock {
  readonly calendar: WorkingCalendar;
  readonly horizon: { readonly startDate: string; readonly endDate: string; readonly startMs: number; readonly endMs: number };
  readonly intervals: readonly WorkingInterval[];
  /** Strict civil date-time, without an offset or timezone suffix. */
  fromLocal(local: string, disambiguation?: TimeDisambiguation): number;
  toLocal(epochMs: number): string;
  alignForward(epochMs: number): number;
  add(epochMs: number, workingMs: number): WorkingWindow;
  subtract(epochMs: number, workingMs: number): WorkingWindow;
  between(startMs: number, endMs: number): number;
}
const failure = (message: string): never => { throw new NodaraError("ND_WORKING_CALENDAR", message); };
function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) failure("Expected a civil ISO date YYYY-MM-DD.");
  return Temporal.PlainDate.from(value, { overflow: "reject" });
}
function policy(value: unknown): TimeDisambiguation {
  if (typeof value !== "string" || !["reject", "earlier", "later", "compatible"].includes(value)) failure("Invalid time disambiguation policy.");
  return value as TimeDisambiguation;
}
function periods(input: readonly WorkPeriod[]): WorkPeriod[] {
  if (!Array.isArray(input) || input.length > 24) failure("A day requires at most 24 work periods.");
  const minute = (value: unknown, end: boolean) => {
    if (typeof value !== "string" || !(end && value === "24:00") && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) failure("Work periods require HH:mm; only an end may be 24:00.");
    return Number((value as string).slice(0, 2)) * 60 + Number((value as string).slice(3));
  };
  const sorted = input.map(period => {
    if (!period || typeof period !== "object") failure("Invalid work period.");
    if (minute(period.end, true) <= minute(period.start, false)) failure("Periods must end after start; split overnight shifts at midnight.");
    return { start: period.start, end: period.end };
  }).sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) if (sorted[i]!.start < sorted[i - 1]!.end) failure("Work periods must not overlap.");
  return sorted;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
  return value;
}

/** Compile a bounded civil horizon to real UTC intervals. No global Temporal patch.
 * Work is actual milliseconds inside shifts, not nominal/payroll wall-clock hours.
 * The runtime's Intl timezone rules are used; persist intervals for reproducibility.
 */
export function createWorkingClock(input: WorkingCalendar, horizon: { startDate: string; endDate: string }): WorkingClock {
  try {
    if (!input || typeof input !== "object" || typeof input.id !== "string" || !input.id.trim() || typeof input.timeZone !== "string" || !input.timeZone.trim()) failure("Calendar requires id and timezone.");
    if (/^[+-]/.test(input.timeZone)) failure("Use a named IANA timezone, not a fixed offset.");
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format(0);
    const disambiguation = policy(input.disambiguation ?? "reject");
    const startDate = date(horizon.startDate); const endDate = date(horizon.endDate);
    const days = startDate.until(endDate).days;
    if (days < 1 || days > 3660) failure("The exclusive calendar horizon must contain 1–3660 civil days.");
    if (!Array.isArray(input.week) || input.week.length > 7) failure("Expected at most seven weekday rules.");
    const weekdays = new Set<number>();
    const week = input.week.map(rule => {
      if (!rule || !Number.isInteger(rule.day) || rule.day < 1 || rule.day > 7 || weekdays.has(rule.day)) failure("Weekdays must be unique ISO numbers 1–7.");
      weekdays.add(rule.day); return { day: rule.day, periods: periods(rule.periods) };
    });
    if (input.exceptions !== undefined && (!input.exceptions || typeof input.exceptions !== "object" || Array.isArray(input.exceptions))) failure("Expected a date-to-periods exception map.");
    const exceptionEntries = Object.entries(input.exceptions ?? {});
    if (exceptionEntries.length > 3660) failure("At most 3660 calendar exceptions are supported.");
    const exceptions = Object.fromEntries(exceptionEntries.map(([key, value]) => { date(key); return [key, periods(value)]; }));
    const calendar = freeze({ id: input.id, timeZone: input.timeZone, disambiguation, week, exceptions });
    const boundary = (day: Temporal.PlainDate, time: string) => (time === "24:00" ? day.add({ days: 1 }).toPlainDateTime("00:00") : day.toPlainDateTime(time)).toZonedDateTime(calendar.timeZone, { disambiguation }).epochMilliseconds;
    // A civil day's start can be 01:00 (or a date can be skipped entirely).
    // Ambiguous shift inputs still follow the explicit policy above.
    const startMs = startDate.toZonedDateTime(calendar.timeZone).epochMilliseconds; const endMs = endDate.toZonedDateTime(calendar.timeZone).epochMilliseconds;
    if (endMs <= startMs) failure("Calendar horizon has no elapsed duration.");
    const intervals: WorkingInterval[] = [];
    for (let i = 0; i < days; i++) {
      const day = startDate.add({ days: i }); const key = day.toString();
      const shifts = Object.hasOwn(exceptions, key) ? exceptions[key]! : week.find(rule => rule.day === day.dayOfWeek)?.periods ?? [];
      for (const shift of shifts) {
        const start = boundary(day, shift.start); const end = boundary(day, shift.end);
        if (end <= start) failure(`Shift ${key} has no positive elapsed duration under its timezone policy.`);
        if (start < startMs || end > endMs) failure("Resolved shift falls outside its horizon.");
        intervals.push({ startMs: start, endMs: end });
        if (intervals.length > 20_000) failure("Calendar interval budget exceeded (20,000).");
      }
    }
    intervals.sort((a, b) => a.startMs - b.startMs);
    const merged: WorkingInterval[] = [];
    for (const current of intervals) {
      const previous = merged.at(-1);
      if (previous && current.startMs <= previous.endMs) merged[merged.length - 1] = { startMs: previous.startMs, endMs: Math.max(previous.endMs, current.endMs) };
      else merged.push(current);
    }
    const checkInstant = (value: number) => { if (!Number.isSafeInteger(value) || value < startMs || value > endMs) failure("Instant is outside the compiled horizon."); };
    return Object.freeze({
      calendar, horizon: freeze({ startDate: startDate.toString(), endDate: endDate.toString(), startMs, endMs }), intervals: freeze(merged),
      fromLocal(local: string, choice: TimeDisambiguation = disambiguation) {
        try {
          if (typeof local !== "string" || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?$/.test(local)) failure("Expected a local ISO date-time without offset or timezone suffix.");
          const result = Temporal.PlainDateTime.from(local, { overflow: "reject" }).toZonedDateTime(calendar.timeZone, { disambiguation: policy(choice) }).epochMilliseconds;
          checkInstant(result); return result;
        } catch (error) { return failure(`Local time rejected: ${error instanceof Error ? error.message : String(error)}`); }
      },
      toLocal(value: number) { checkInstant(value); return Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO(calendar.timeZone).toString({ smallestUnit: "millisecond" }); },
      ...intervalSchedule(merged, { startMs, endMs }),
    });
  } catch (error) {
    if (error instanceof NodaraError) throw error;
    return failure(error instanceof Error ? error.message : String(error));
  }
}
