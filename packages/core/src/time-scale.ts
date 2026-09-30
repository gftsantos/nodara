import type { DateInput, GanttTask, GanttZoom } from "./types";
import { clamp, toTimestamp } from "./utils";

export const DAY = 86_400_000;

export interface TimeScaleTick {
  timestamp: number;
  position: number;
}

export interface TimeScale {
  start: number;
  end: number;
  duration: number;
  ticks: TimeScaleTick[];
}


export function resolveGanttRange(tasks: GanttTask[], start?: DateInput, end?: DateInput): { start: number; end: number } {
  let minimum = start === undefined ? Infinity : toTimestamp(start);
  let maximum = end === undefined ? -Infinity : toTimestamp(end);
  for (const task of tasks) {
    if (start === undefined) minimum = Math.min(minimum, toTimestamp(task.start), toTimestamp(task.end));
    if (end === undefined) maximum = Math.max(maximum, toTimestamp(task.start), toTimestamp(task.end));
  }
  const safeStart = Number.isFinite(minimum) ? minimum : Date.now();
  const safeEnd = Number.isFinite(maximum) && maximum > safeStart ? maximum : safeStart + DAY;
  return { start: safeStart, end: safeEnd };
}

export function buildTimeScale(start: number, end: number, zoom: GanttZoom = "month"): TimeScale {
  const duration = Math.max(DAY, end - start);
  const finish = start + duration;
  const dates = [start];
  // UTC calendar boundaries, never fractional weeks. Partial edge cells are clipped.
  if (zoom === "day" || zoom === "week") {
    const unit = DAY * (zoom === "week" ? 7 : 1);
    const step = unit * Math.max(1, Math.ceil(duration / unit / 120));
    const anchor = zoom === "week" ? 4 * DAY : 0; // Monday 1970-01-05.
    for (let at = anchor + (Math.floor((start - anchor) / step) + 1) * step; at < finish; at += step) dates.push(at);
  } else {
    const first = new Date(start); const last = new Date(finish);
    const month = first.getUTCFullYear() * 12 + first.getUTCMonth();
    const span = last.getUTCFullYear() * 12 + last.getUTCMonth() - month + 1;
    const unit = zoom === "quarter" ? 3 : 1; const step = unit * Math.max(1, Math.ceil(span / unit / 120));
    for (let m = (Math.floor(month / step) + 1) * step; ; m += step) {
      const date = new Date(0); date.setUTCFullYear(Math.floor(m / 12), ((m % 12) + 12) % 12, 1); date.setUTCHours(0, 0, 0, 0);
      const at = date.getTime(); if (!Number.isFinite(at) || at >= finish) break; dates.push(at);
    }
  }
  dates.push(finish);
  const ticks = dates.map(timestamp => ({ timestamp, position: (timestamp - start) / duration * 100 }));
  return { start, end: start + duration, duration, ticks };
}

export function timestampToPercent(timestamp: number, scale: Pick<TimeScale, "start" | "duration">): number {
  return clamp(((timestamp - scale.start) / scale.duration) * 100, 0, 100);
}

export function percentToTimestamp(percent: number, scale: Pick<TimeScale, "start" | "duration">): number {
  return scale.start + (clamp(percent, 0, 100) / 100) * scale.duration;
}

export function resolveSnap(snap: "none" | "day" | "week" | number | undefined): number {
  if (snap === "none") return 1;
  if (snap === "week") return DAY * 7;
  if (typeof snap === "number") return Math.max(1, snap);
  return DAY;
}

export function snapTimestamp(timestamp: number, snap: "none" | "day" | "week" | number | undefined): number {
  const step = resolveSnap(snap);
  return Math.round(timestamp / step) * step;
}

export function shiftTask(task: GanttTask, delta: number): GanttTask {
  return { ...task, start: toTimestamp(task.start) + delta, end: toTimestamp(task.end) + delta };
}

export function resizeTask(task: GanttTask, edge: "start" | "end", delta: number, minimumDuration = DAY): GanttTask {
  const start = toTimestamp(task.start);
  const end = toTimestamp(task.end);
  if (edge === "start") return { ...task, start: Math.min(start + delta, end - minimumDuration), end };
  return { ...task, start, end: Math.max(end + delta, start + minimumDuration) };
}

export function replaceTask(tasks: GanttTask[], nextTask: GanttTask): GanttTask[] {
  return tasks.map((task) => task.id === nextTask.id ? nextTask : task);
}

export function dependencyPairs(tasks: GanttTask[]): Array<{ from: GanttTask; to: GanttTask; kind?: "FS" | "SS" | "FF" | "SF"; lagMs?: number }> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return tasks.flatMap((task) => [...(task.dependencies ?? []).filter(id => !task.dependencyLinks?.some(link => link.taskId === id && link.kind === "FS")).flatMap((id) => {
    const dependency = byId.get(id);
    return dependency ? [{ from: dependency, to: task }] : [];
  }), ...(task.dependencyLinks ?? []).flatMap(link => {
    const from = byId.get(link.taskId); return from ? [{ from, to: task, kind: link.kind, lagMs: link.lagMs ?? 0 }] : [];
  })]);
}
