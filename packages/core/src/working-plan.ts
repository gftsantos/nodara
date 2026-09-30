import { NodaraError, normalizeOperationalPlan, operationalOrder, operationalCapacity, operationalTopology, operationalMap } from "@nodara/core";
import type { OperationalPlan, OperationalTask, OperationalConflict, CapacitySegment, GanttTask, CalendarEvent, ChartSeries } from "@nodara/core";
import { createWorkingClock, type WorkingCalendar, type WorkingWindow, type WorkingInterval } from "./working-time";
import { Temporal } from "@js-temporal/polyfill";
import { intersectIntervals, intervalSchedule } from "./working-intervals";

export interface WorkingTask extends Omit<OperationalTask, "durationMs"> { readonly workingMs: number }
export interface WorkingResource { readonly id: string; readonly label: string; readonly capacityUnits: number; readonly calendar?: WorkingCalendar }
export interface WorkingPlan extends Omit<OperationalPlan, "schemaVersion" | "timeBasis" | "tasks" | "resources"> {
  readonly schemaVersion: 2;
  readonly timeBasis: "working";
  readonly calendar: WorkingCalendar;
  readonly horizon: { readonly startDate: string; readonly endDate: string };
  readonly tasks: readonly WorkingTask[];
  /** Omitted calendar inherits the project clock; explicit calendars intersect it. */
  readonly resources: readonly WorkingResource[];
  /** Deterministic, interruptible serial scheduling, not an optimal solver. Default: none. */
  readonly resourceLeveling?: "none" | "serial";
}
export interface WorkingEvaluation {
  readonly plan: WorkingPlan;
  readonly windows: readonly (WorkingWindow & { readonly taskId: string })[];
  readonly capacity: readonly CapacitySegment[];
  readonly conflicts: readonly OperationalConflict[];
  readonly finishMs: number;
}
const fail = (message: string): never => { throw new NodaraError("ND_WORKING_PLAN", message); };
function freeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
function envelope(evaluation: WorkingEvaluation): OperationalPlan {
  const { plan, windows } = evaluation; const byId = new Map(windows.map(window => [window.taskId, window]));
  return { ...plan, schemaVersion: 1, timeBasis: "elapsed", tasks: plan.tasks.map(task => { const window = byId.get(task.id)!; return { ...task, startMs: window.startMs, durationMs: window.endMs - window.startMs }; }) };
}
/** Joint project/resource availability. Lags are elapsed milliseconds.
 * Optional serial leveling reserves locked windows first and never optimizes CPM.
 */
export function evaluateWorkingPlan(input: WorkingPlan, previous?: WorkingEvaluation): WorkingEvaluation {
  if (!input || input.schemaVersion !== 2 || input.timeBasis !== "working" || !Array.isArray(input.tasks)) fail("Expected schemaVersion 2 and timeBasis 'working'.");
  if (input.tasks.length > 500 || !Array.isArray(input.resources) || input.resources.length > 500 || !Array.isArray(input.dependencies) || input.dependencies.length > 5000 || !Array.isArray(input.assignments) || input.assignments.length > 5000) fail("Working plan limits: 500 tasks/resources and 5000 assignments/dependencies.");
  const clock = createWorkingClock(input.calendar, input.horizon);
  if (input.resourceLeveling !== undefined && !["none", "serial"].includes(input.resourceLeveling)) fail("resourceLeveling must be 'none' or 'serial'.");
  const base = normalizeOperationalPlan({ ...input, schemaVersion: 1, timeBasis: "elapsed", tasks: input.tasks.map(task => ({ ...task, durationMs: 0 })) });
  const compiled = new Map<string, ReturnType<typeof createWorkingClock>>(); let intervalBudget = clock.intervals.length;
  const resourceClocks = new Map<string, ReturnType<typeof createWorkingClock>>();
  const resources: WorkingResource[] = base.resources.map((resource, index) => {
    const calendar = input.resources[index]!.calendar; if (calendar === undefined) return resource;
    const key = JSON.stringify(calendar); let resourceClock = compiled.get(key);
    if (!resourceClock) {
      try {
        // Cover the project's entire UTC horizon, even across the date line.
        const startDate = Temporal.Instant.fromEpochMilliseconds(clock.horizon.startMs).toZonedDateTimeISO(calendar.timeZone).toPlainDate().toString();
        const endDate = Temporal.Instant.fromEpochMilliseconds(clock.horizon.endMs - 1).toZonedDateTimeISO(calendar.timeZone).toPlainDate().add({ days: 1 }).toString();
        resourceClock = createWorkingClock(calendar, { startDate, endDate });
      } catch (error) { fail(`Resource ${resource.id} calendar: ${error instanceof Error ? error.message : String(error)}`); }
      intervalBudget += resourceClock!.intervals.length; if (intervalBudget > 200000) fail("Working plan exceeds 200000 compiled calendar intervals.");
      compiled.set(key, resourceClock!);
    }
    resourceClocks.set(resource.id, resourceClock!); return { ...resource, calendar: resourceClock!.calendar };
  });
  if (base.projectStartMs < clock.horizon.startMs || base.projectStartMs >= clock.horizon.endMs) fail("Project start must be inside the explicit working horizon, including empty plans.");
  const work = new Map(input.tasks.map(task => { if (!Number.isSafeInteger(task.workingMs) || task.workingMs < 0) fail("workingMs must be a nonnegative integer; elapsed durations are never converted implicitly."); return [task.id, task.workingMs]; }));
  const tasks = new Map(base.tasks.map(task => [task.id, task])); const windows = new Map<string, WorkingWindow>();
  const assignments = new Map<string, OperationalPlan["assignments"][number][]>();
  for (const assignment of base.assignments) { const list = assignments.get(assignment.taskId) ?? []; list.push(assignment); assignments.set(assignment.taskId, list); }
  const jointCache = new Map<string, readonly WorkingInterval[]>(); let jointIntervalBudget = 0;
  const scheduleCache = new Map<readonly WorkingInterval[], ReturnType<typeof intervalSchedule>>();
  const joint = (id: string) => {
    const ids = (assignments.get(id) ?? []).map(a => a.resourceId).filter(id => resourceClocks.has(id)).sort(), key = JSON.stringify(ids);
    let intervals = jointCache.get(key);
    if (!intervals) { intervals = clock.intervals; for (const resourceId of ids) intervals = intersectIntervals(intervals, resourceClocks.get(resourceId)!.intervals); jointIntervalBudget += intervals.length; if (jointIntervalBudget > 200000) fail("Working plan exceeds 200000 cached joint intervals."); jointCache.set(key, intervals); }
    return intervals;
  };
  const serial = input.resourceLeveling === "serial";
  const locked = serial && base.tasks.some(task => task.locked) ? new Map(evaluateWorkingPlan({ ...input, resourceLeveling: "none" }).windows.filter(w => tasks.get(w.taskId)!.locked).map(w => [w.taskId, w])) : new Map<string, WorkingWindow>();
  for (const [id, fixed] of locked) {
    const schedule = intervalSchedule(joint(id), clock.horizon);
    if (fixed.workingMs !== work.get(id) || fixed.startMs < clock.horizon.startMs || fixed.endMs > clock.horizon.endMs || fixed.segments.some(segment => schedule.between(segment.startMs, segment.endMs) !== segment.endMs - segment.startMs)) throw new NodaraError("ND_PLAN_LOCKED", `Unlock ${id} before changing its working availability.`);
  }
  const bookings = new Map<string, Map<number, number>>(); let reservationCount = 0;
  const reserve = (id: string, window: WorkingWindow) => {
    for (const assignment of assignments.get(id) ?? []) {
      const events = bookings.get(assignment.resourceId) ?? new Map<number, number>(); bookings.set(assignment.resourceId, events);
      for (const segment of window.segments) {
        if (++reservationCount > 2000000) fail("Working plan exceeds 2000000 resource reservations.");
        for (const [at, delta] of [[segment.startMs, assignment.units], [segment.endMs, -assignment.units]]) { const next = (events.get(at!) ?? 0) + delta!; if (!Number.isSafeInteger(next)) fail("Resource demand exceeds integer precision."); events.set(at!, next); }
      }
    }
  };
  for (const [id, window] of locked) reserve(id, window);
  const capacities = new Map(resources.map(resource => [resource.id, resource.capacityUnits]));
  const available = (id: string) => {
    let intervals = joint(id);
    if (serial && !locked.has(id)) for (const assignment of assignments.get(id) ?? []) {
      const capacity = capacities.get(assignment.resourceId)!;
      if (assignment.units > capacity && work.get(id)) fail(`Resource ${assignment.resourceId}: task ${id} requires more than its total capacity.`);
      const events = bookings.get(assignment.resourceId); if (!events?.size) continue;
      const free: WorkingInterval[] = []; let used = 0, from = clock.horizon.startMs;
      for (const [at, delta] of [...events].sort(([a], [b]) => a - b)) {
        if (at > from && used <= capacity - assignment.units) free.push({ startMs: from, endMs: at });
        used += delta; if (!Number.isSafeInteger(used)) fail("Resource demand exceeds integer precision."); from = at;
      }
      if (from < clock.horizon.endMs && used <= capacity - assignment.units) free.push({ startMs: from, endMs: clock.horizon.endMs });
      // Merge adjacent free spans so unrelated bookings do not fragment work.
      const merged: WorkingInterval[] = [];
      for (const span of free) { const prior = merged.at(-1); if (prior?.endMs === span.startMs) merged[merged.length - 1] = { startMs: prior.startMs, endMs: span.endMs }; else merged.push(span); }
      intervals = intersectIntervals(intervals, merged);
    }
    // Unleveled tasks with the same assignment calendars share one index.
    if (!serial) { let schedule = scheduleCache.get(intervals); if (!schedule) { schedule = intervalSchedule(intervals, clock.horizon); scheduleCache.set(intervals, schedule); } return schedule; }
    return intervalSchedule(intervals, clock.horizon);
  };
  const incoming = new Map<string, typeof base.dependencies[number][]>();
  for (const edge of base.dependencies) { const entries = incoming.get(edge.toTaskId) ?? []; entries.push(edge); incoming.set(edge.toTaskId, entries); }
  for (const id of operationalOrder(base)) {
    const task = tasks.get(id)!, duration = work.get(id)!;
    const taskClock = available(id);
    let start = Math.max(task.startMs, base.projectStartMs, task.notBeforeMs ?? -Infinity); let finishFloor = -Infinity;
    for (const edge of incoming.get(id) ?? []) {
      const from = windows.get(edge.fromTaskId)!; const anchor = edge.kind[0] === "F" ? from.endMs : from.startMs;
      const exact = BigInt(anchor) + BigInt(edge.lagMs);
      if (exact > BigInt(clock.horizon.endMs)) fail("Dependency exceeds the explicit working horizon.");
      const bound = Number(exact); if (edge.kind[1] === "S") start = Math.max(start, bound); else finishFloor = Math.max(finishFloor, bound);
    }
    const fixed = locked.get(id);
    if (fixed) {
      if (fixed.startMs < start || fixed.endMs < finishFloor) throw new NodaraError("ND_PLAN_LOCKED", `Leveling would move locked task ${id}; unlock it in a separate transaction.`);
      windows.set(id, { startMs: fixed.startMs, endMs: fixed.endMs, workingMs: fixed.workingMs, segments: fixed.segments }); continue;
    }
    let window = taskClock.add(start, duration);
    if (window.endMs < finishFloor) {
      // Earliest admissible start whose finish meets FF/SF. Monotone, including
      // non-working gaps; subtract(finish,duration) alone is incorrect in a gap.
      let low = start, high = clock.horizon.endMs;
      while (low < high) { const mid = low + Math.floor((high - low) / 2); let end = Infinity; try { end = taskClock.add(mid, duration).endMs; } catch { /* Insufficient horizon is the upper side of this bounded search. */ } if (end >= finishFloor) high = mid; else low = mid + 1; }
      window = taskClock.add(low, duration);
    }
    windows.set(id, window);
    if (serial) reserve(id, window);
  }
  if (previous) for (const task of previous.plan.tasks) if (task.locked) {
    const before = previous.windows.find(window => window.taskId === task.id)!, after = windows.get(task.id), next = input.tasks.find(item => item.id === task.id);
    if (!after || !next || next.workingMs !== task.workingMs || before.startMs !== after.startMs || before.endMs !== after.endMs || JSON.stringify(before.segments) !== JSON.stringify(after.segments)) throw new NodaraError("ND_PLAN_LOCKED", `Unlock ${task.label} in a separate transaction before changing its working window.`);
  }
  // Keep requested starts separate from derived windows. Removing a holiday or
  // reducing predecessor work must not turn the old cascade into a hard constraint.
  const normalizedTasks: WorkingTask[] = base.tasks.map(task => { const { durationMs, ...rest } = task; void durationMs; return { ...rest, workingMs: work.get(task.id)! }; });
  const plan: WorkingPlan = { ...base, schemaVersion: 2, timeBasis: "working", calendar: clock.calendar, horizon: { startDate: clock.horizon.startDate, endDate: clock.horizon.endDate }, tasks: normalizedTasks, resources, ...(input.resourceLeveling === undefined ? {} : { resourceLeveling: input.resourceLeveling }) };
  // Reuse the half-open capacity sweep with actual work segments, not envelopes.
  const segmentTasks: OperationalTask[] = [], segmentAssignments: OperationalPlan["assignments"][number][] = [], sourceIds = new Map<string, string>();
  for (const task of base.tasks) for (const [index, segment] of windows.get(task.id)!.segments.entries()) {
    if (segmentTasks.length >= 200000) fail("Working plan exceeds 200000 work segments.");
    const id = JSON.stringify([task.id, index]); sourceIds.set(id, task.id); segmentTasks.push({ ...task, id, startMs: segment.startMs, durationMs: segment.endMs - segment.startMs });
    for (const assignment of assignments.get(task.id) ?? []) { if (segmentAssignments.length >= 2000000) fail("Working plan exceeds 2000000 resource reservations."); segmentAssignments.push({ ...assignment, taskId: id }); }
  }
  const capacity = operationalCapacity({ ...base, tasks: segmentTasks, assignments: segmentAssignments, dependencies: [] }).map(segment => ({ ...segment, taskIds: [...new Set(segment.taskIds.map(id => sourceIds.get(id)!))] }));
  const conflicts: OperationalConflict[] = capacity.filter(segment => segment.demandUnits > segment.capacityUnits).map(segment => ({ code: "CAPACITY", taskIds: segment.taskIds, resourceId: segment.resourceId, startMs: segment.startMs, endMs: segment.endMs, message: `${segment.resourceId}: ${segment.demandUnits}u > ${segment.capacityUnits}u` }));
  return freeze({ plan, windows: base.tasks.map(task => ({ taskId: task.id, ...windows.get(task.id)! })), capacity, conflicts, finishMs: Math.max(base.projectStartMs, ...[...windows.values()].map(window => window.endMs)) });
}
export function workingPlanViews(evaluation: WorkingEvaluation) {
  const base = envelope(evaluation), byId = new Map(evaluation.windows.map(window => [window.taskId, window]));
  const gantt: GanttTask[] = base.tasks.map(task => ({ id: task.id, label: task.label, start: task.startMs, end: byId.get(task.id)!.endMs, progress: task.progress, dependencyLinks: base.dependencies.filter(edge => edge.toTaskId === task.id).map(edge => ({ taskId: edge.fromTaskId, kind: edge.kind, lagMs: edge.lagMs })), meta: { taskId: task.id, workingMs: byId.get(task.id)!.workingMs } }));
  const calendar: CalendarEvent[] = evaluation.plan.tasks.flatMap(task => { const window = byId.get(task.id)!; return window.segments.length ? window.segments.map((segment, index) => ({ id: JSON.stringify([task.id, index]), title: task.label, start: segment.startMs, end: segment.endMs, meta: { taskId: task.id, segment: index } })) : [{ id: JSON.stringify([task.id, "milestone"]), title: `${task.label} · marco`, start: window.startMs, end: window.endMs, meta: { taskId: task.id, segment: -1 } }]; });
  const load: ChartSeries[] = base.resources.map(resource => { const segments = evaluation.capacity.filter(segment => segment.resourceId === resource.id); return { id: resource.id, label: resource.label, data: segments.flatMap((segment, index) => [{ x: segment.startMs, y: segment.demandUnits, meta: { taskIds: segment.taskIds, endMs: segment.endMs } }, ...(segments[index + 1]?.startMs === segment.endMs ? [] : [{ x: segment.endMs, y: 0, meta: { taskIds: [] as string[], endMs: segments[index + 1]?.startMs ?? segment.endMs } }])]) }; });
  return { gantt, calendar, load, topology: operationalTopology(base), map: operationalMap(base) };
}
export interface WorkingSnapshot { readonly revision: number; readonly evaluation: WorkingEvaluation; readonly canUndo: boolean; readonly canRedo: boolean }
export interface WorkingPreview { readonly expectedRevision: number; readonly evaluation: WorkingEvaluation; readonly changes: readonly { readonly taskId: string; readonly before?: WorkingWindow; readonly after?: WorkingWindow }[] }
/** Whole-plan candidate commits: draft -> preview -> one frozen snapshot. */
export function createWorkingPlanStore(initial: WorkingPlan) {
  let snapshot: WorkingSnapshot = freeze({ revision: 0, evaluation: evaluateWorkingPlan(initial), canUndo: false, canRedo: false });
  const past: WorkingEvaluation[] = [], future: WorkingEvaluation[] = [], listeners = new Set<() => void>(); let destroyed = false, notifying = false, evaluating = false;
  const assertWritable = () => { if (destroyed || notifying || evaluating) fail("Working store is destroyed, evaluating or notifying observers."); };
  const publish = (evaluation: WorkingEvaluation) => { snapshot = freeze({ revision: snapshot.revision + 1, evaluation, canUndo: past.length > 0, canRedo: future.length > 0 }); notifying = true; try { for (const listener of [...listeners]) { if (destroyed) break; try { listener(); } catch { /* An observer cannot roll back a committed snapshot. */ } } } finally { notifying = false; } return snapshot; };
  const preview = (candidate: WorkingPlan): WorkingPreview => {
    if (destroyed || evaluating) fail("Working store is destroyed or evaluating.");
    evaluating = true;
    try {
    const evaluation = evaluateWorkingPlan(candidate, snapshot.evaluation);
    const ids = new Set([...snapshot.evaluation.windows, ...evaluation.windows].map(window => window.taskId));
    const changes = [...ids].flatMap(taskId => { const before = snapshot.evaluation.windows.find(window => window.taskId === taskId), after = evaluation.windows.find(window => window.taskId === taskId); return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ taskId, ...(before ? { before } : {}), ...(after ? { after } : {}) }]; });
    return freeze({ expectedRevision: snapshot.revision, evaluation, changes });
    } finally { evaluating = false; }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { if (destroyed) return () => {}; listeners.add(listener); return () => { listeners.delete(listener); }; },
    preview,
    apply(candidate: WorkingPlan, expectedRevision: number, allowConflicts = false) { assertWritable(); if (typeof allowConflicts !== "boolean") fail("allowConflicts must be boolean."); if (snapshot.revision !== expectedRevision) throw new NodaraError("ND_PLAN_REVISION", "Preview is stale; recalculate it."); const result = preview(candidate); assertWritable(); if (snapshot.revision !== expectedRevision) throw new NodaraError("ND_PLAN_REVISION", "Preview is stale; recalculate it."); if (result.evaluation.conflicts.length && !allowConflicts) throw new NodaraError("ND_PLAN_CONFLICT", "Resolve capacity conflicts or explicitly allow them."); if (JSON.stringify(result.evaluation.plan) === JSON.stringify(snapshot.evaluation.plan)) return snapshot; past.push(snapshot.evaluation); if (past.length > 100) past.shift(); future.length = 0; return publish(result.evaluation); },
    undo() { assertWritable(); const previous = past.pop(); if (!previous) return snapshot; future.push(snapshot.evaluation); return publish(previous); },
    redo() { assertWritable(); const next = future.pop(); if (!next) return snapshot; past.push(snapshot.evaluation); return publish(next); },
    exportJSON: () => JSON.stringify(snapshot.evaluation.plan, null, 2),
    destroy() { if (evaluating) fail("Cannot destroy while evaluating a candidate."); destroyed = true; listeners.clear(); past.length = 0; future.length = 0; },
  };
}
