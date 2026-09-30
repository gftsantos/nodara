import type { CalendarEvent } from "./types";
import { DAY } from "./time-scale";
import { NodaraError, toTimestamp } from "./utils";

export interface RecurrenceRule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  count?: number;
  until?: number;
  byDay?: number[];
}

const dayCodes: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export function parseRecurrence(input: string): RecurrenceRule {
  if (typeof input !== "string" || !input.trim()) throw new NodaraError("ND_INVALID_RECURRENCE", "Recurrence must be a non-empty rule string.");
  const entries = new Map(input.split(";").map((part) => {
    const [key = "", value = ""] = part.split("=");
    return [key.trim().toUpperCase(), value.trim().toUpperCase()];
  }));
  const frequency = entries.get("FREQ");
  const allowed = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY"]);
  for (const key of entries.keys()) if (!allowed.has(key)) throw new NodaraError("ND_INVALID_RECURRENCE", `Unsupported recurrence option: ${key}.`);
  if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MONTHLY") {
    throw new NodaraError("ND_INVALID_RECURRENCE", `Unsupported recurrence frequency: ${frequency ?? "missing"}.`);
  }
  const interval = Number(entries.get("INTERVAL") ?? "1");
  const countValue = entries.has("COUNT") ? Number(entries.get("COUNT")) : undefined;
  const untilText = entries.get("UNTIL")?.replace(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/, (_, y, m, d, h, min, s) => `${y}-${m}-${d}${h ? `T${h}:${min}:${s}Z` : ""}`);
  const untilValue = untilText === undefined ? undefined : Date.parse(untilText);
  if (!Number.isSafeInteger(interval) || interval < 1 || (countValue !== undefined && (!Number.isSafeInteger(countValue) || countValue < 1)) || (untilValue !== undefined && !Number.isFinite(untilValue))) throw new NodaraError("ND_INVALID_RECURRENCE", "Invalid recurrence INTERVAL, COUNT or UNTIL.");
  if (entries.has("BYDAY") && entries.get("BYDAY")!.split(",").some(day => dayCodes[day] === undefined)) throw new NodaraError("ND_INVALID_RECURRENCE", "Invalid BYDAY weekday.");
  const byDayValue = entries.get("BYDAY")?.split(",").map((day) => dayCodes[day]).filter((day): day is number => day !== undefined);
  return {
    frequency,
    interval,
    ...(countValue !== undefined && Number.isFinite(countValue) ? { count: Math.max(1, countValue) } : {}),
    ...(untilValue !== undefined && Number.isFinite(untilValue) ? { until: untilValue } : {}),
    ...(byDayValue?.length ? { byDay: byDayValue } : {}),
  };
}

export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: number,
  rangeEnd: number,
  maximum = 500,
): CalendarEvent[] {
  toTimestamp(rangeStart, "rangeStart"); toTimestamp(rangeEnd, "rangeEnd");
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 100_000) throw new NodaraError("ND_INVALID_RECURRENCE", "maximum must be an integer between 1 and 100000.");
  if (rangeEnd <= rangeStart) return [];
  if (event.recurrence === undefined) {
    const start = toTimestamp(event.start);
    return start < rangeEnd && toTimestamp(event.end ?? start) >= rangeStart ? [{ ...event }] : [];
  }
  const rule = parseRecurrence(event.recurrence);
  const originalStart = toTimestamp(event.start);
  const duration = toTimestamp(event.end ?? originalStart + (event.durationMinutes ?? 60) * 60_000) - originalStart;
  const occurrences: CalendarEvent[] = [];
  const hardLimit = Math.max(1, maximum);
  let scans = 0;
  const scan = () => { if (++scans > 100_000) throw new NodaraError("ND_RECURRENCE_LIMIT", "Recurrence expansion exceeded 100000 candidate scans; narrow the range or simplify the rule."); };
  const countLimit = rule.count ?? Number.POSITIVE_INFINITY;
  const pushOccurrence = (cursor: number, ordinal: number) => {
    if (cursor + duration >= rangeStart && cursor < rangeEnd && !event.excludedOccurrences?.includes(ordinal)) {
      occurrences.push({ ...event, id: `${event.id}::${ordinal}`, start: cursor, end: cursor + duration, meta: { ...event.meta, recurrenceSourceId: event.id, occurrence: ordinal } });
    }
  };

  if (rule.frequency === "WEEKLY" && rule.byDay?.length) {
    const originalDay = new Date(originalStart).getDay();
    const weekBase = originalStart - originalDay * DAY;
    let ordinal = 0;
    let week = 0;
    while (ordinal < countLimit && occurrences.length < hardLimit) {
      scan();
      const weekStart = weekBase + week * rule.interval * 7 * DAY;
      if (weekStart >= rangeEnd || (rule.until !== undefined && weekStart > rule.until)) break;
      for (const day of [...rule.byDay].sort((a, b) => a - b)) {
        const cursor = weekStart + day * DAY;
        if (cursor < originalStart) continue;
        if (rule.until !== undefined && cursor > rule.until) break;
        if (ordinal >= countLimit || occurrences.length >= hardLimit) break;
        pushOccurrence(cursor, ordinal);
        ordinal += 1;
      }
      week += 1;
    }
    return occurrences;
  }

  let cursor = originalStart;
  let ordinal = 0;
  let scanned = 0;
  if (rule.frequency !== "MONTHLY" && !rule.byDay?.length) {
    const step = rule.interval * (rule.frequency === "WEEKLY" ? 7 : 1) * DAY;
    ordinal = Math.max(0, Math.floor((rangeStart - duration - originalStart) / step));
    cursor = originalStart + ordinal * step;
  }
  while (occurrences.length < hardLimit && ordinal < countLimit && cursor < rangeEnd) {
    scan();
    if (rule.until !== undefined && cursor > rule.until) break;
    const allowedDay = !rule.byDay?.length || rule.byDay.includes(new Date(cursor).getDay());
    if (allowedDay) {
      pushOccurrence(cursor, ordinal);
      ordinal += 1;
    }
    scanned += 1;
    if (rule.frequency === "MONTHLY") {
      // Advance from the original day; nonexistent dates such as February 31 are skipped.
      const original = new Date(originalStart);
      let candidate: Date;
      do {
        scan();
        candidate = new Date(originalStart);
        candidate.setDate(1);
        candidate.setMonth(original.getMonth() + scanned * rule.interval);
        candidate.setDate(original.getDate());
        if (!Number.isFinite(candidate.getTime()) || candidate.getTime() >= rangeEnd) return occurrences;
        if (candidate.getDate() !== original.getDate()) scanned += 1;
      } while (candidate.getDate() !== original.getDate());
      cursor = candidate.getTime();
    } else cursor += rule.interval * (rule.frequency === "WEEKLY" ? 7 : 1) * DAY;
  }
  return occurrences;
}

export function expandCalendarEvents(
  events: CalendarEvent[],
  rangeStart: number,
  rangeEnd: number,
  maximum = 500,
): CalendarEvent[] {
  return events.flatMap((event) => expandRecurringEvent(event, rangeStart, rangeEnd, maximum));
}
