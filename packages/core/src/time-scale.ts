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

const zoomTickCounts: Record<GanttZoom, number> = { day: 24, week: 14, month: 12, quarter: 8 };

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
  const count = zoomTickCounts[zoom];
  const ticks = Array.from({ length: count + 1 }, (_, index) => ({
    timestamp: start + (duration * index) / count,
    position: (index / count) * 100,
  }));
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

export function dependencyPairs(tasks: GanttTask[]): Array<{ from: GanttTask; to: GanttTask }> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return tasks.flatMap((task) => (task.dependencies ?? []).flatMap((id) => {
    const dependency = byId.get(id);
    return dependency ? [{ from: dependency, to: task }] : [];
  }));
}
