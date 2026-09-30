import type { CalendarEvent, ChartSeries, GanttTask, GeoMapData, TopologyData } from "./types";
import { NodaraError } from "./utils";

/** All dates are UTC epoch milliseconds; durations are elapsed time, not business time. */
export interface OperationalTask {
  readonly id: string;
  readonly label: string;
  readonly startMs: number;
  readonly durationMs: number;
  readonly progress: number;
  readonly notBeforeMs?: number | undefined;
  readonly locked?: boolean;
  readonly locationId?: string | undefined;
}
export interface OperationalResource { readonly id: string; readonly label: string; readonly capacityUnits: number }
export interface OperationalAssignment { readonly taskId: string; readonly resourceId: string; readonly units: number }
export type OperationalDependencyKind = "FS" | "SS" | "FF" | "SF";
export interface OperationalDependency { readonly id: string; readonly fromTaskId: string; readonly toTaskId: string; readonly kind: OperationalDependencyKind; readonly lagMs: number }
export interface OperationalLocation { readonly id: string; readonly label: string; readonly longitude: number; readonly latitude: number }
export interface OperationalPlan {
  readonly schemaVersion: 1;
  readonly timeBasis: "elapsed";
  readonly projectStartMs: number;
  readonly tasks: readonly OperationalTask[];
  readonly resources: readonly OperationalResource[];
  readonly assignments: readonly OperationalAssignment[];
  readonly dependencies: readonly OperationalDependency[];
  readonly locations: readonly OperationalLocation[];
}
export interface CapacitySegment {
  readonly resourceId: string; readonly startMs: number; readonly endMs: number;
  readonly demandUnits: number; readonly capacityUnits: number; readonly taskIds: readonly string[];
}
export interface OperationalConflict {
  readonly code: "DEPENDENCY" | "NOT_BEFORE" | "CAPACITY" | "LOCKED";
  readonly taskIds: readonly string[];
  readonly message: string;
  readonly requiredStartMs?: number;
  readonly dependencyId?: string;
  readonly resourceId?: string;
  readonly startMs?: number;
  readonly endMs?: number;
}
export interface CriticalPathTask { readonly taskId: string; readonly earliestStartMs: number; readonly earliestEndMs: number; readonly latestStartMs: number; readonly latestEndMs: number; readonly totalFloatMs: number; readonly critical: boolean }
export interface CriticalPathResult { readonly basis: "precedence-only-elapsed"; readonly finishMs: number; readonly tasks: readonly CriticalPathTask[]; readonly criticalTaskIds: readonly string[]; readonly criticalDependencyIds: readonly string[] }

function fail(message: string, details?: unknown): never { throw new NodaraError("ND_INVALID_PLAN", message, details); }
function record(input: unknown, field: string): asserts input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(`${field} must be an object.`);
}
function text(value: unknown, field: string): asserts value is string { if (typeof value !== "string" || !value.trim()) fail(`${field} must be a non-empty string.`); }
function integer(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(`${field} must be a safe integer between ${min} and ${max}.`);
}
const epoch = (value: unknown, field: string) => integer(value, field, -8_640_000_000_000_000, 8_640_000_000_000_000);
function entries(input: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(input)) fail(`${field} must be an array.`);
  return Array.from(input, item => { record(item, field); return item; });
}
function named(input: unknown, field: string): Record<string, unknown>[] {
  const items = entries(input, field); const ids = new Set<string>();
  for (const item of items) { text(item.id, `${field}.id`); text(item.label, `${field}.label`); if (ids.has(item.id)) fail(`Duplicate ${field} id: ${item.id}.`); ids.add(item.id); }
  return items;
}

/** Validates untrusted JSON, removes unknown fields and returns an isolated canonical plan. */
export function normalizeOperationalPlan(input: unknown): OperationalPlan {
  record(input, "plan");
  if (input.schemaVersion !== 1 || input.timeBasis !== "elapsed") fail("Expected schemaVersion 1 and timeBasis 'elapsed'.");
  epoch(input.projectStartMs, "projectStartMs");
  const tasks: OperationalTask[] = named(input.tasks, "tasks").map(task => {
    epoch(task.startMs, "task.startMs"); integer(task.durationMs, "task.durationMs"); epoch(Number(task.startMs) + Number(task.durationMs), "task.endMs");
    integer(task.progress, "task.progress", 0, 100);
    if (task.notBeforeMs !== undefined) epoch(task.notBeforeMs, "task.notBeforeMs");
    if (task.locked !== undefined && typeof task.locked !== "boolean") fail("task.locked must be boolean.");
    if (task.locationId !== undefined) text(task.locationId, "task.locationId");
    return { id: task.id as string, label: task.label as string, startMs: task.startMs as number, durationMs: task.durationMs as number, progress: task.progress as number,
      ...(task.notBeforeMs !== undefined ? { notBeforeMs: task.notBeforeMs as number } : {}), ...(task.locked !== undefined ? { locked: task.locked as boolean } : {}), ...(task.locationId !== undefined ? { locationId: task.locationId as string } : {}) };
  });
  const resources = named(input.resources, "resources").map(resource => { integer(resource.capacityUnits, "resource.capacityUnits"); return { id: resource.id as string, label: resource.label as string, capacityUnits: resource.capacityUnits as number }; });
  const locations = named(input.locations, "locations").map(location => {
    if (typeof location.latitude !== "number" || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || typeof location.longitude !== "number" || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) fail("Invalid geographic coordinate.");
    return { id: location.id as string, label: location.label as string, latitude: location.latitude, longitude: location.longitude };
  });
  const taskIds = new Set(tasks.map(task => task.id)); const resourceIds = new Set(resources.map(resource => resource.id)); const locationIds = new Set(locations.map(location => location.id));
  for (const task of tasks) if (task.locationId && !locationIds.has(task.locationId)) fail(`Unknown location ${task.locationId}.`);
  const assigned = new Set<string>();
  const assignments = entries(input.assignments, "assignments").map(assignment => {
    text(assignment.taskId, "assignment.taskId"); text(assignment.resourceId, "assignment.resourceId"); integer(assignment.units, "assignment.units", 1);
    if (!taskIds.has(assignment.taskId) || !resourceIds.has(assignment.resourceId)) fail("Assignment references an unknown task/resource.");
    const key = JSON.stringify([assignment.taskId, assignment.resourceId]); if (assigned.has(key)) fail("Duplicate task/resource assignment."); assigned.add(key);
    return { taskId: assignment.taskId, resourceId: assignment.resourceId, units: assignment.units };
  });
  const dependencyIds = new Set<string>(); const pairs = new Set<string>();
  const dependencies = entries(input.dependencies, "dependencies").map(dependency => {
    text(dependency.id, "dependency.id"); text(dependency.fromTaskId, "dependency.fromTaskId"); text(dependency.toTaskId, "dependency.toTaskId"); integer(dependency.lagMs, "dependency.lagMs", -Number.MAX_SAFE_INTEGER);
    if (typeof dependency.kind !== "string" || !["FS", "SS", "FF", "SF"].includes(dependency.kind)) fail("Expected an FS, SS, FF or SF dependency.");
    if (!taskIds.has(dependency.fromTaskId) || !taskIds.has(dependency.toTaskId)) fail("Dependency references an unknown task.");
    const pair = JSON.stringify([dependency.fromTaskId, dependency.toTaskId, dependency.kind]);
    if (dependencyIds.has(dependency.id) || pairs.has(pair)) fail("Duplicate dependency id or task pair."); dependencyIds.add(dependency.id); pairs.add(pair);
    return { id: dependency.id, fromTaskId: dependency.fromTaskId, toTaskId: dependency.toTaskId, kind: dependency.kind as OperationalDependencyKind, lagMs: dependency.lagMs };
  });
  const plan: OperationalPlan = { schemaVersion: 1, timeBasis: "elapsed", projectStartMs: input.projectStartMs as number, tasks, resources, locations, assignments, dependencies };
  operationalOrder(plan);
  return plan;
}

/** Stable O(V+E) topological order; no recursion limit on long dependency chains. */
export function operationalOrder(plan: OperationalPlan): string[] {
  const degrees = new Map(plan.tasks.map(task => [task.id, 0])); const outgoing = new Map<string, string[]>();
  for (const edge of plan.dependencies) { degrees.set(edge.toTaskId, (degrees.get(edge.toTaskId) ?? 0) + 1); const targets = outgoing.get(edge.fromTaskId) ?? []; targets.push(edge.toTaskId); outgoing.set(edge.fromTaskId, targets); }
  const ordered = plan.tasks.filter(task => degrees.get(task.id) === 0).map(task => task.id);
  for (let index = 0; index < ordered.length; index++) for (const target of outgoing.get(ordered[index]!) ?? []) { const next = degrees.get(target)! - 1; degrees.set(target, next); if (!next) ordered.push(target); }
  if (ordered.length !== plan.tasks.length) throw new NodaraError("ND_PLAN_CYCLE", "Dependencies contain a cycle.", { taskIds: [...degrees].filter(([, degree]) => degree > 0).map(([id]) => id) });
  return ordered;
}

/** Half-open intervals [start,end): adjacent assignments do not overlap. Milestones consume no duration. */
export function operationalCapacity(plan: OperationalPlan): CapacitySegment[] {
  const tasks = new Map(plan.tasks.map(task => [task.id, task]));
  const events = new Map<string, Map<number, { taskId: string; delta: number }[]>>();
  for (const assignment of plan.assignments) {
    const task = tasks.get(assignment.taskId)!; if (!task.durationMs) continue;
    const timeline = events.get(assignment.resourceId) ?? new Map<number, { taskId: string; delta: number }[]>(); events.set(assignment.resourceId, timeline);
    for (const [at, delta] of [[task.startMs, assignment.units], [task.startMs + task.durationMs, -assignment.units]]) { const changes = timeline.get(at!) ?? []; changes.push({ taskId: task.id, delta: delta! }); timeline.set(at!, changes); }
  }
  const result: CapacitySegment[] = [];
  for (const resource of plan.resources) {
    const timeline = events.get(resource.id); if (!timeline) continue;
    const dates = [...timeline.keys()].sort((a, b) => a - b); const active = new Map<string, number>(); let demand = 0;
    for (let index = 0; index < dates.length - 1; index++) {
      const date = dates[index]!;
      for (const change of [...timeline.get(date)!].sort((a, b) => Math.sign(a.delta) - Math.sign(b.delta))) { demand += change.delta; if (!Number.isSafeInteger(demand)) fail("Total resource demand exceeds integer precision."); if (change.delta > 0) active.set(change.taskId, change.delta); else active.delete(change.taskId); }
      if (!Number.isSafeInteger(demand)) fail("Total resource demand exceeds integer precision.");
      if (demand > 0) result.push({ resourceId: resource.id, startMs: date, endMs: dates[index + 1]!, demandUnits: demand, capacityUnits: resource.capacityUnits, taskIds: [...active.keys()].sort() });
    }
  }
  return result;
}

// All four elapsed relations reduce to S_to >= S_from + weight. BigInt prevents
// rounding in intermediate offsets before cancellation with an epoch value.
function dependencyOffset(edge: OperationalDependency, from: OperationalTask, to: OperationalTask): bigint {
  return BigInt(edge.lagMs) + (edge.kind[0] === "F" ? BigInt(from.durationMs) : 0n) - (edge.kind[1] === "F" ? BigInt(to.durationMs) : 0n);
}
function exactEpoch(value: bigint): number {
  if (value < -8_640_000_000_000_000n || value > 8_640_000_000_000_000n) fail("Dependency date exceeds the supported epoch range.");
  return Number(value);
}
function dependencyStart(edge: OperationalDependency, from: OperationalTask, to: OperationalTask, fromStart = from.startMs): bigint {
  return BigInt(fromStart) + dependencyOffset(edge, from, to);
}
const laterEpoch = (current: number, bound: bigint) => bound > BigInt(current) ? exactEpoch(bound) : current;
const earlierEpoch = (current: number, bound: bigint) => bound < BigInt(current) ? exactEpoch(bound) : current;

export function operationalConflicts(plan: OperationalPlan): OperationalConflict[] {
  const tasks = new Map(plan.tasks.map(task => [task.id, task])); const conflicts: OperationalConflict[] = [];
  for (const task of plan.tasks) { const minimum = Math.max(plan.projectStartMs, task.notBeforeMs ?? -Infinity); if (task.startMs < minimum) conflicts.push({ code: "NOT_BEFORE", taskIds: [task.id], requiredStartMs: minimum, message: `${task.label} starts before its earliest permitted date.` }); }
  for (const edge of plan.dependencies) { const predecessor = tasks.get(edge.fromTaskId)!; const successor = tasks.get(edge.toTaskId)!; const required = dependencyStart(edge, predecessor, successor); if (BigInt(successor.startMs) < required) conflicts.push({ code: "DEPENDENCY", taskIds: [predecessor.id, successor.id], dependencyId: edge.id, requiredStartMs: exactEpoch(required), message: `${successor.label}: ${edge.kind} constraint from ${predecessor.label}, lag ${edge.lagMs} ms; required start ${required}.` }); }
  for (const segment of operationalCapacity(plan)) if (segment.demandUnits > segment.capacityUnits) conflicts.push({ code: "CAPACITY", taskIds: segment.taskIds, resourceId: segment.resourceId, startMs: segment.startMs, endMs: segment.endMs, message: `${segment.resourceId}: demand ${segment.demandUnits} exceeds capacity ${segment.capacityUnits}.` });
  return conflicts;
}

/** CPM ignores current manual dates, resource capacity and locks; not resource leveling. */
export function operationalCriticalPath(plan: OperationalPlan): CriticalPathResult {
  const ordered = operationalOrder(plan); const tasks = new Map(plan.tasks.map(task => [task.id, task]));
  const outgoing = new Map<string, OperationalDependency[]>();
  for (const edge of plan.dependencies) { const edges = outgoing.get(edge.fromTaskId) ?? []; edges.push(edge); outgoing.set(edge.fromTaskId, edges); }
  const earliest = new Map(plan.tasks.map(task => [task.id, Math.max(plan.projectStartMs, task.notBeforeMs ?? -Infinity)])); let finishMs = plan.projectStartMs;
  for (const id of ordered) { const end = earliest.get(id)! + tasks.get(id)!.durationMs; epoch(end, "criticalPath.end"); finishMs = Math.max(finishMs, end); for (const edge of outgoing.get(id) ?? []) { const next = dependencyStart(edge, tasks.get(id)!, tasks.get(edge.toTaskId)!, earliest.get(id)!); earliest.set(edge.toTaskId, laterEpoch(earliest.get(edge.toTaskId)!, next)); } }
  const latest = new Map<string, number>();
  for (const id of [...ordered].reverse()) { let start = finishMs - tasks.get(id)!.durationMs; for (const edge of outgoing.get(id) ?? []) start = earlierEpoch(start, BigInt(latest.get(edge.toTaskId)!) - dependencyOffset(edge, tasks.get(id)!, tasks.get(edge.toTaskId)!)); latest.set(id, start); }
  const result = plan.tasks.map(task => ({ taskId: task.id, earliestStartMs: earliest.get(task.id)!, earliestEndMs: earliest.get(task.id)! + task.durationMs, latestStartMs: latest.get(task.id)!, latestEndMs: latest.get(task.id)! + task.durationMs, totalFloatMs: latest.get(task.id)! - earliest.get(task.id)!, critical: latest.get(task.id) === earliest.get(task.id) }));
  for (const task of result) integer(task.totalFloatMs, "criticalPath.float");
  const criticalTaskIds = result.filter(task => task.critical).map(task => task.taskId); const criticalIds = new Set(criticalTaskIds);
  const criticalDependencyIds = plan.dependencies.filter(edge => criticalIds.has(edge.fromTaskId) && criticalIds.has(edge.toTaskId) && dependencyStart(edge, tasks.get(edge.fromTaskId)!, tasks.get(edge.toTaskId)!, earliest.get(edge.fromTaskId)!) === BigInt(earliest.get(edge.toTaskId)!)).map(edge => edge.id);
  return { basis: "precedence-only-elapsed", finishMs, tasks: result, criticalTaskIds, criticalDependencyIds };
}

/** Forward-only propagation. Returns causes for each automatic move; never silently moves a locked task. */
export function cascadeOperationalPlan(plan: OperationalPlan): { plan: OperationalPlan; moves: { taskId: string; previousStartMs: number; startMs: number; dependencyIds: string[] }[] } {
  const tasks = new Map(plan.tasks.map(task => [task.id, task])); const incoming = new Map<string, OperationalDependency[]>(); const moves: { taskId: string; previousStartMs: number; startMs: number; dependencyIds: string[] }[] = [];
  for (const edge of plan.dependencies) { const edges = incoming.get(edge.toTaskId) ?? []; edges.push(edge); incoming.set(edge.toTaskId, edges); }
  for (const id of operationalOrder(plan)) {
    const task = tasks.get(id)!; const predecessors = incoming.get(id) ?? []; let startMs = Math.max(task.startMs, plan.projectStartMs, task.notBeforeMs ?? -Infinity);
    for (const edge of predecessors) { const predecessor = tasks.get(edge.fromTaskId)!; startMs = laterEpoch(startMs, dependencyStart(edge, predecessor, task)); }
    epoch(startMs + task.durationMs, "cascade.end");
    if (startMs !== task.startMs) {
      if (task.locked) throw new NodaraError("ND_PLAN_LOCKED", `Cannot move locked task ${task.id}.`, { taskIds: [task.id], requiredStartMs: startMs });
      moves.push({ taskId: id, previousStartMs: task.startMs, startMs, dependencyIds: predecessors.filter(edge => dependencyStart(edge, tasks.get(edge.fromTaskId)!, task) === BigInt(startMs)).map(edge => edge.id) }); tasks.set(id, { ...task, startMs });
    }
  }
  return { plan: { ...plan, tasks: plan.tasks.map(task => tasks.get(task.id)!) }, moves };
}

export function operationalGantt(plan: OperationalPlan): GanttTask[] {
  const dependencies = new Map<string, string[]>(); const links = new Map<string, NonNullable<GanttTask["dependencyLinks"]>>();
  for (const edge of plan.dependencies) {
    if (edge.kind === "FS") { const ids = dependencies.get(edge.toTaskId) ?? []; ids.push(edge.fromTaskId); dependencies.set(edge.toTaskId, ids); }
    const list = links.get(edge.toTaskId) ?? []; list.push({ taskId: edge.fromTaskId, kind: edge.kind, lagMs: edge.lagMs }); links.set(edge.toTaskId, list);
  }
  const critical = new Set(operationalCriticalPath(plan).criticalTaskIds);
  return plan.tasks.map(task => ({ id: task.id, label: task.label, start: task.startMs, end: task.startMs + task.durationMs, progress: task.progress, dependencies: dependencies.get(task.id) ?? [], dependencyLinks: links.get(task.id) ?? [], disabled: task.locked ?? false, color: critical.has(task.id) ? "#f1856a" : "#7884ff", meta: { taskId: task.id, critical: critical.has(task.id) } }));
}
export function operationalCalendar(plan: OperationalPlan): CalendarEvent[] { return plan.tasks.map(task => ({ id: task.id, title: task.label, start: task.startMs, end: task.startMs + task.durationMs, disabled: task.locked ?? false, meta: { taskId: task.id } })); }
export function operationalTopology(plan: OperationalPlan): TopologyData { return { nodes: plan.tasks.map(task => ({ id: task.id, label: task.label, status: task.progress === 100 ? "healthy" : "unknown", meta: { taskId: task.id } })), edges: plan.dependencies.map(edge => ({ id: edge.id, from: edge.fromTaskId, to: edge.toTaskId, directed: true, label: `${edge.kind} ${edge.lagMs >= 0 ? "+" : ""}${edge.lagMs} ms`, meta: { kind: edge.kind, lagMs: edge.lagMs } })) }; }
export function operationalMap(plan: OperationalPlan): GeoMapData { return { points: plan.locations.map(location => ({ ...location, value: plan.tasks.filter(task => task.locationId === location.id).length, meta: { taskIds: plan.tasks.filter(task => task.locationId === location.id).map(task => task.id) } })) }; }
/** Resource demand per elapsed-time bucket: peak concurrent units, not a sum of disjoint tasks. */
export function operationalLoadChart(plan: OperationalPlan, startMs: number, endMs: number, bucketMs = 86_400_000): ChartSeries[] {
  epoch(startMs, "load.start"); epoch(endMs, "load.end"); integer(bucketMs, "load.bucket", 1);
  if (endMs < startMs) fail("Load chart end must not precede start.");
  const count = Math.ceil((endMs - startMs) / bucketMs); if (count < 0 || count > 10_000) fail("Load chart requires 0–10,000 buckets.");
  const segments = operationalCapacity(plan);
  return plan.resources.map(resource => ({ id: resource.id, label: `${resource.label} · peak units`, data: Array.from({ length: count }, (_, index) => { const start = startMs + index * bucketMs; const end = Math.min(endMs, start + bucketMs); let peak = 0; for (const segment of segments) if (segment.resourceId === resource.id && segment.startMs < end && segment.endMs > start) peak = Math.max(peak, segment.demandUnits); return { x: start, y: peak, meta: { endMs: end, capacityUnits: resource.capacityUnits } }; }) }));
}
