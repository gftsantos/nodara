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
  const entries = new Map(input.split(";").map((part) => {
    const [key = "", value = ""] = part.split("=");
    return [key.trim().toUpperCase(), value.trim().toUpperCase()];
  }));
  const frequency = entries.get("FREQ");
  if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MONTHLY") {
    throw new NodaraError("ND_INVALID_RECURRENCE", `Unsupported recurrence frequency: ${frequency ?? "missing"}.`);
  }
  const interval = Math.max(1, Number.parseInt(entries.get("INTERVAL") ?? "1", 10) || 1);
  const countValue = entries.has("COUNT") ? Number.parseInt(entries.get("COUNT") ?? "", 10) : undefined;
  const untilValue = entries.has("UNTIL") ? Date.parse(entries.get("UNTIL") ?? "") : undefined;
  const byDayValue = entries.get("BYDAY")?.split(",").map((day) => dayCodes[day]).filter((day): day is number => day !== undefined);
  return {
    frequency,
    interval,
    ...(countValue !== undefined && Number.isFinite(countValue) ? { count: Math.max(1, countValue) } : {}),
    ...(untilValue !== undefined && Number.isFinite(untilValue) ? { until: untilValue } : {}),
    ...(byDayValue?.length ? { byDay: byDayValue } : {}),
  };
}

function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

function nextTimestamp(timestamp: number, rule: RecurrenceRule): number {
  if (rule.frequency === "DAILY") return timestamp + rule.interval * DAY;
  if (rule.frequency === "WEEKLY") return timestamp + rule.interval * 7 * DAY;
  return addMonths(timestamp, rule.interval);
}

export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: number,
  rangeEnd: number,
  maximum = 500,
): CalendarEvent[] {
  if (!event.recurrence) {
    const start = toTimestamp(event.start);
    return start < rangeEnd && toTimestamp(event.end ?? start) >= rangeStart ? [{ ...event }] : [];
  }
  const rule = parseRecurrence(event.recurrence);
  const originalStart = toTimestamp(event.start);
  const duration = toTimestamp(event.end ?? originalStart + (event.durationMinutes ?? 60) * 60_000) - originalStart;
  const occurrences: CalendarEvent[] = [];
  const hardLimit = Math.max(1, maximum);
  const countLimit = rule.count ?? Number.POSITIVE_INFINITY;
  const pushOccurrence = (cursor: number, ordinal: number) => {
    if (cursor + duration >= rangeStart && cursor < rangeEnd) {
      occurrences.push({ ...event, id: `${event.id}::${ordinal}`, start: cursor, end: cursor + duration, meta: { ...event.meta, recurrenceSourceId: event.id, occurrence: ordinal } });
    }
  };

  if (rule.frequency === "WEEKLY" && rule.byDay?.length) {
    const originalDay = new Date(originalStart).getDay();
    const weekBase = originalStart - originalDay * DAY;
    let ordinal = 0;
    let week = 0;
    while (ordinal < countLimit && ordinal < hardLimit) {
      const weekStart = weekBase + week * rule.interval * 7 * DAY;
      if (weekStart >= rangeEnd || (rule.until && weekStart > rule.until)) break;
      for (const day of [...rule.byDay].sort((a, b) => a - b)) {
        const cursor = weekStart + day * DAY;
        if (cursor < originalStart) continue;
        if (rule.until && cursor > rule.until) break;
        if (ordinal >= countLimit || ordinal >= hardLimit) break;
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
  while (ordinal < hardLimit && ordinal < countLimit && cursor < rangeEnd && scanned < hardLimit * 370) {
    if (rule.until && cursor > rule.until) break;
    const allowedDay = !rule.byDay?.length || rule.byDay.includes(new Date(cursor).getDay());
    if (allowedDay) {
      pushOccurrence(cursor, ordinal);
      ordinal += 1;
    }
    cursor = nextTimestamp(cursor, rule);
    scanned += 1;
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
