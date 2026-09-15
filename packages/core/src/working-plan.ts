import { NodaraError, normalizeOperationalPlan, operationalOrder, operationalCapacity, operationalTopology, operationalMap } from "@nodara/core";
import type { OperationalPlan, OperationalTask, OperationalConflict, CapacitySegment, GanttTask, CalendarEvent, ChartSeries } from "@nodara/core";
import { createWorkingClock, type WorkingCalendar, type WorkingWindow } from "./working-time";

export interface WorkingTask extends Omit<OperationalTask, "durationMs"> { readonly workingMs: number }
export interface WorkingPlan extends Omit<OperationalPlan, "schemaVersion" | "timeBasis" | "tasks"> {
  readonly schemaVersion: 2;
  readonly timeBasis: "working";
  readonly calendar: WorkingCalendar;
  readonly horizon: { readonly startDate: string; readonly endDate: string };
  readonly tasks: readonly WorkingTask[];
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
/** One project calendar shared by all resources. Lags are elapsed milliseconds.
 * No resource leveling or business-time CPM is implied by this forward scheduler.
 */
export function evaluateWorkingPlan(input: WorkingPlan, previous?: WorkingEvaluation): WorkingEvaluation {
  if (!input || input.schemaVersion !== 2 || input.timeBasis !== "working" || !Array.isArray(input.tasks)) fail("Expected schemaVersion 2 and timeBasis 'working'.");
  if (input.tasks.length > 500 || !Array.isArray(input.resources) || input.resources.length > 500 || !Array.isArray(input.dependencies) || input.dependencies.length > 5000 || !Array.isArray(input.assignments) || input.assignments.length > 5000) fail("Working plan limits: 500 tasks/resources and 5000 assignments/dependencies.");
  const clock = createWorkingClock(input.calendar, input.horizon);
  const base = normalizeOperationalPlan({ ...input, schemaVersion: 1, timeBasis: "elapsed", tasks: input.tasks.map(task => ({ ...task, durationMs: 0 })) });
  if (base.projectStartMs < clock.horizon.startMs || base.projectStartMs >= clock.horizon.endMs) fail("Project start must be inside the explicit working horizon, including empty plans.");
  const work = new Map(input.tasks.map(task => { if (!Number.isSafeInteger(task.workingMs) || task.workingMs < 0) fail("workingMs must be a nonnegative integer; elapsed durations are never converted implicitly."); return [task.id, task.workingMs]; }));
  const tasks = new Map(base.tasks.map(task => [task.id, task])); const windows = new Map<string, WorkingWindow>();
  const incoming = new Map<string, typeof base.dependencies[number][]>();
  for (const edge of base.dependencies) { const entries = incoming.get(edge.toTaskId) ?? []; entries.push(edge); incoming.set(edge.toTaskId, entries); }
  for (const id of operationalOrder(base)) {
    const task = tasks.get(id)!, duration = work.get(id)!;
    let start = Math.max(task.startMs, base.projectStartMs, task.notBeforeMs ?? -Infinity); let finishFloor = -Infinity;
    for (const edge of incoming.get(id) ?? []) {
      const from = windows.get(edge.fromTaskId)!; const anchor = edge.kind[0] === "F" ? from.endMs : from.startMs;
      const exact = BigInt(anchor) + BigInt(edge.lagMs);
      if (exact > BigInt(clock.horizon.endMs)) fail("Dependency exceeds the explicit working horizon.");
      const bound = Number(exact); if (edge.kind[1] === "S") start = Math.max(start, bound); else finishFloor = Math.max(finishFloor, bound);
    }
    let window = clock.add(start, duration);
    if (window.endMs < finishFloor) {
      // Earliest admissible start whose finish meets FF/SF. Monotone, including
      // non-working gaps; subtract(finish,duration) alone is incorrect in a gap.
      let low = start, high = clock.horizon.endMs;
      while (low < high) { const mid = low + Math.floor((high - low) / 2); let end = Infinity; try { end = clock.add(mid, duration).endMs; } catch { /* Insufficient horizon is the upper side of this bounded search. */ } if (end >= finishFloor) high = mid; else low = mid + 1; }
      window = clock.add(low, duration);
    }
    windows.set(id, window);
  }
  if (previous) for (const task of previous.plan.tasks) if (task.locked) {
    const before = previous.windows.find(window => window.taskId === task.id)!, after = windows.get(task.id), next = input.tasks.find(item => item.id === task.id);
    if (!after || !next || next.workingMs !== task.workingMs || before.startMs !== after.startMs || before.endMs !== after.endMs || JSON.stringify(before.segments) !== JSON.stringify(after.segments)) throw new NodaraError("ND_PLAN_LOCKED", `Unlock ${task.label} in a separate transaction before changing its working window.`);
  }
  // Keep requested starts separate from derived windows. Removing a holiday or
  // reducing predecessor work must not turn the old cascade into a hard constraint.
  const normalizedTasks: WorkingTask[] = base.tasks.map(task => { const { durationMs, ...rest } = task; void durationMs; return { ...rest, workingMs: work.get(task.id)! }; });
  const plan: WorkingPlan = { ...base, schemaVersion: 2, timeBasis: "working", calendar: clock.calendar, horizon: { startDate: clock.horizon.startDate, endDate: clock.horizon.endDate }, tasks: normalizedTasks };
  // Reuse the half-open capacity sweep with actual work segments, not envelopes.
  const segmentTasks: OperationalTask[] = [], segmentAssignments: OperationalPlan["assignments"][number][] = [], sourceIds = new Map<string, string>();
  const assignments = new Map<string, OperationalPlan["assignments"][number][]>();
  for (const assignment of base.assignments) { const list = assignments.get(assignment.taskId) ?? []; list.push(assignment); assignments.set(assignment.taskId, list); }
  for (const task of base.tasks) for (const [index, segment] of windows.get(task.id)!.segments.entries()) {
    if (segmentTasks.length >= 200000) fail("Working plan exceeds 200000 work segments.");
    const id = JSON.stringify([task.id, index]); sourceIds.set(id, task.id); segmentTasks.push({ ...task, id, startMs: segment.startMs, durationMs: segment.endMs - segment.startMs });
    for (const assignment of assignments.get(task.id) ?? []) segmentAssignments.push({ ...assignment, taskId: id });
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
