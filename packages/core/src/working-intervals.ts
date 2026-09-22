import { NodaraError } from "@nodara/core";
import type { WorkingClock, WorkingInterval, WorkingWindow } from "./working-time";

/** Internal indexed arithmetic shared by civil calendars and joint availability. */
export function intervalSchedule(intervals: readonly WorkingInterval[], horizon: { startMs: number; endMs: number }): Pick<WorkingClock, "add" | "subtract" | "between" | "alignForward"> {
  const fail = (message: string): never => { throw new NodaraError("ND_WORKING_CALENDAR", message); };
  const check = (value: number) => { if (!Number.isSafeInteger(value) || value < horizon.startMs || value > horizon.endMs) fail("Instant is outside the compiled horizon."); };
  const lower = (value: number, field: "startMs" | "endMs", inclusive: boolean) => {
    let lo = 0, hi = intervals.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1, at = intervals[mid]![field]; if (at < value || inclusive && at === value) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const prefix = [0];
  for (const interval of intervals) prefix.push(prefix.at(-1)! + interval.endMs - interval.startMs);
  const accumulated = (value: number) => { const index = lower(value, "endMs", true), interval = intervals[index]; return prefix[index]! + (interval ? Math.max(0, value - interval.startMs) : 0); };
  const window = (value: number, work: number, reverse: boolean): WorkingWindow => {
    check(value); if (!Number.isSafeInteger(work) || work < 0) fail("Working duration must be a nonnegative safe integer in milliseconds.");
    const segments: WorkingInterval[] = []; let remaining = work;
    if (work) for (let i = reverse ? lower(value, "startMs", false) - 1 : lower(value, "endMs", true); i >= 0 && i < intervals.length; i += reverse ? -1 : 1) {
      const interval = intervals[i]!, start = reverse ? interval.startMs : Math.max(value, interval.startMs), end = reverse ? Math.min(value, interval.endMs) : interval.endMs;
      const consumed = Math.min(remaining, end - start);
      if (consumed <= 0) continue;
      segments.push(Object.freeze(reverse ? { startMs: end - consumed, endMs: end } : { startMs: start, endMs: start + consumed }));
      remaining -= consumed; if (!remaining) break;
    }
    if (remaining) fail("Insufficient joint working time in the compiled horizon; extend it or adjust calendars/capacity explicitly.");
    if (reverse) segments.reverse();
    return Object.freeze({ startMs: segments[0]?.startMs ?? value, endMs: segments.at(-1)?.endMs ?? value, workingMs: work, segments: Object.freeze(segments) });
  };
  return {
    add: (value, work) => window(value, work, false), subtract: (value, work) => window(value, work, true),
    alignForward(value) { check(value); const interval = intervals[lower(value, "endMs", true)]; return interval ? Math.max(value, interval.startMs) : fail("No future work period in the compiled horizon."); },
    between(start, end) { check(start); check(end); if (end < start) fail("End precedes start."); return accumulated(end) - accumulated(start); },
  };
}

export function intersectIntervals(left: readonly WorkingInterval[], right: readonly WorkingInterval[]): WorkingInterval[] {
  const result: WorkingInterval[] = []; let a = 0, b = 0;
  while (a < left.length && b < right.length) {
    const x = left[a]!, y = right[b]!, startMs = Math.max(x.startMs, y.startMs), endMs = Math.min(x.endMs, y.endMs);
    if (endMs > startMs) result.push({ startMs, endMs });
    if (x.endMs <= y.endMs) a++; else b++;
  }
  return result;
}
