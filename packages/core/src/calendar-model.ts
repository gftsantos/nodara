import type { CalendarEvent, CalendarView } from "./types";
import { DAY } from "./time-scale";
import { toTimestamp } from "./utils";

export interface CalendarRange {
  start: number;
  end: number;
  days: number[];
}

export function startOfDay(input: number): number {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function startOfWeek(input: number, weekStartsOn: 0 | 1): number {
  const start = startOfDay(input);
  const date = new Date(start);
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return start - offset * DAY;
}

export function calendarRange(anchor: number, view: CalendarView = "week", weekStartsOn: 0 | 1 = 1): CalendarRange {
  if (view === "day" || view === "timeline-day" || view === "resource-day") {
    const start = startOfDay(anchor);
    return { start, end: start + DAY, days: [start] };
  }
  if (view === "month") {
    const first = new Date(anchor);
    first.setDate(1);
    const start = startOfWeek(first.getTime(), weekStartsOn);
    const days = Array.from({ length: 42 }, (_, index) => start + index * DAY);
    return { start, end: start + 42 * DAY, days };
  }
  if (view === "year") {
    const date = new Date(anchor);
    const start = new Date(date.getFullYear(), 0, 1).getTime();
    const end = new Date(date.getFullYear() + 1, 0, 1).getTime();
    return { start, end, days: Array.from({ length: Math.round((end - start) / DAY) }, (_, index) => start + index * DAY) };
  }
  const start = startOfWeek(anchor, weekStartsOn);
  const allDays = Array.from({ length: 7 }, (_, index) => start + index * DAY);
  const days = view === "workweek" ? allDays.filter((day) => {
    const weekDay = new Date(day).getDay();
    return weekDay !== 0 && weekDay !== 6;
  }) : allDays;
  return { start, end: start + 7 * DAY, days };
}

export function moveCalendarEvent(event: CalendarEvent, delta: number): CalendarEvent {
  const start = toTimestamp(event.start);
  const end = toTimestamp(event.end ?? start + (event.durationMinutes ?? 60) * 60_000);
  return { ...event, start: start + delta, end: end + delta };
}

export function resizeCalendarEvent(event: CalendarEvent, delta: number, minimumDuration = 15 * 60_000): CalendarEvent {
  const start = toTimestamp(event.start);
  const end = toTimestamp(event.end ?? start + (event.durationMinutes ?? 60) * 60_000);
  return { ...event, start, end: Math.max(start + minimumDuration, end + delta) };
}

export function replaceCalendarEvent(events: CalendarEvent[], previousId: string, next: CalendarEvent): CalendarEvent[] {
  const sourceId = previousId.split("::")[0]!;
  return events.map((event) => event.id === sourceId || event.id === previousId ? { ...next, id: sourceId } : event);
}
