import { cascadeOperationalPlan, normalizeOperationalPlan, operationalConflicts, type OperationalAssignment, type OperationalConflict, type OperationalDependency, type OperationalLocation, type OperationalPlan, type OperationalResource, type OperationalTask } from "./operations-model";
import { NodaraError } from "./utils";

export type OperationalCommand =
  | { type: "addTask"; task: OperationalTask }
  | { type: "updateTask"; taskId: string; changes: Partial<Omit<OperationalTask, "id">> }
  | { type: "removeTask"; taskId: string }
  | { type: "addDependency"; dependency: OperationalDependency }
  | { type: "removeDependency"; dependencyId: string }
  | { type: "assign"; assignment: OperationalAssignment }
  | { type: "unassign"; taskId: string; resourceId: string }
  | { type: "upsertResource"; resource: OperationalResource }
  | { type: "removeResource"; resourceId: string }
  | { type: "upsertLocation"; location: OperationalLocation }
  | { type: "removeLocation"; locationId: string }
  | { type: "replacePlan"; plan: OperationalPlan };
export interface OperationalTransaction {
  readonly id: string;
  readonly label?: string;
  readonly expectedRevision?: number;
  readonly commands: readonly OperationalCommand[];
  readonly scheduling?: "manual" | "cascade-forward";
  readonly conflicts?: "reject" | "report";
}
export interface OperationalSnapshot {
  readonly revision: number;
  readonly plan: OperationalPlan;
  readonly conflicts: readonly OperationalConflict[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly lastTransaction: { readonly id: string; readonly label: string; readonly kind: "commit" | "undo" | "redo" } | null;
}
export interface OperationalPreview {
  readonly plan: OperationalPlan;
  readonly conflicts: readonly OperationalConflict[];
  readonly moves: readonly { readonly taskId: string; readonly previousStartMs: number; readonly startMs: number; readonly dependencyIds: readonly string[] }[];
  readonly changed: boolean;
}
export interface OperationalStore {
  getSnapshot(): OperationalSnapshot;
  preview(transaction: OperationalTransaction): OperationalPreview;
  transact(transaction: OperationalTransaction): OperationalSnapshot;
  undo(): OperationalSnapshot;
  redo(): OperationalSnapshot;
  subscribe(listener: (snapshot: OperationalSnapshot) => void): () => void;
  exportJSON(): string;
  destroy(): void;
}
type Draft = { -readonly [K in keyof OperationalPlan]: OperationalPlan[K] extends readonly (infer T)[] ? T[] : OperationalPlan[K] };
function freeze<T>(input: T): T {
  if (input && typeof input === "object" && !Object.isFrozen(input)) { Object.freeze(input); for (const value of Object.values(input)) freeze(value); }
  return input;
}
const error = (code: string, message: string, details?: unknown): never => { throw new NodaraError(code, message, details); };
function requireIndex<T>(items: readonly T[], predicate: (item: T) => boolean, id: string) { const index = items.findIndex(predicate); if (index < 0) error("ND_PLAN_NOT_FOUND", `Unknown entity: ${id}.`); return index; }

/** Framework-neutral authoritative state. One transaction publishes one frozen snapshot, including cascades. */
export function createOperationalStore(initialPlan: unknown, options: { historyLimit?: number; onObserverError?: (error: unknown) => void } = {}): OperationalStore {
  const historyLimit = options.historyLimit ?? 100;
  if (!Number.isSafeInteger(historyLimit) || historyLimit < 0 || historyLimit > 10_000) error("ND_INVALID_OPTIONS", "historyLimit must be an integer between 0 and 10,000.");
  const initial = normalizeOperationalPlan(initialPlan);
  let snapshot: OperationalSnapshot = freeze({ revision: 0, plan: initial, conflicts: operationalConflicts(initial), canUndo: false, canRedo: false, lastTransaction: null });
  const past: OperationalPlan[] = []; const future: OperationalPlan[] = []; const listeners = new Set<(snapshot: OperationalSnapshot) => void>();
  let destroyed = false; let notifying = false;
  const assertWritable = () => { if (destroyed) error("ND_PLAN_DESTROYED", "The operational store was destroyed."); if (notifying) error("ND_PLAN_REENTRANT", "Do not mutate a plan from a synchronous subscriber; schedule the next command separately."); };
  const prepare = (transaction: OperationalTransaction): OperationalPreview => {
    if (destroyed) error("ND_PLAN_DESTROYED", "The operational store was destroyed.");
    if (!transaction || typeof transaction.id !== "string" || !transaction.id.trim() || !Array.isArray(transaction.commands)) error("ND_INVALID_TRANSACTION", "A transaction requires a non-empty id and commands array.");
    if (transaction.label !== undefined && typeof transaction.label !== "string") error("ND_INVALID_TRANSACTION", "Transaction label must be a string.");
    if (transaction.expectedRevision !== undefined && transaction.expectedRevision !== snapshot.revision) error("ND_PLAN_REVISION", "The plan changed since this transaction was prepared.", { expected: transaction.expectedRevision, actual: snapshot.revision });
    if (transaction.scheduling !== undefined && !["manual", "cascade-forward"].includes(transaction.scheduling)) error("ND_INVALID_TRANSACTION", "Unknown scheduling policy.");
    if (transaction.conflicts !== undefined && !["reject", "report"].includes(transaction.conflicts)) error("ND_INVALID_TRANSACTION", "Unknown conflict policy.");
    let draft = structuredClone(snapshot.plan) as Draft;
    for (const command of transaction.commands) {
      if (!command || typeof command !== "object") error("ND_INVALID_TRANSACTION", "Commands must be objects.");
      const required = ({ upsertResource: "resource", upsertLocation: "location", addTask: "task", assign: "assignment", addDependency: "dependency" } as Record<string, string>)[command.type];
      if (required && !(required in command)) error("ND_INVALID_TRANSACTION", `Missing command field: ${required}.`);
      for (const key of ["resource", "location", "task", "assignment", "dependency"] as const) if (key in command) { const value = (command as unknown as Record<string, unknown>)[key]; if (!value || typeof value !== "object" || Array.isArray(value)) error("ND_INVALID_TRANSACTION", `${key} must be an object.`); }
      switch (command.type) {
        case "replacePlan": draft = normalizeOperationalPlan(command.plan) as Draft; break;
        case "addTask": draft.tasks.push(structuredClone(command.task)); break;
        case "updateTask": {
          const index = requireIndex(draft.tasks, task => task.id === command.taskId, command.taskId); const previous = draft.tasks[index]!;
          if (!command.changes || typeof command.changes !== "object" || Array.isArray(command.changes) || "id" in command.changes) error("ND_INVALID_TRANSACTION", "Task changes must be an object without an id.");
          // Unlock explicitly in a preceding command, so an edit cannot bypass a lock accidentally.
          if (previous.locked && ((command.changes.startMs !== undefined && command.changes.startMs !== previous.startMs) || (command.changes.durationMs !== undefined && command.changes.durationMs !== previous.durationMs))) error("ND_PLAN_LOCKED", `Cannot change the window of locked task ${previous.id}.`);
          draft.tasks[index] = { ...previous, ...structuredClone(command.changes) }; break;
        }
        case "removeTask": { const index = requireIndex(draft.tasks, task => task.id === command.taskId, command.taskId); if (draft.tasks[index]!.locked) error("ND_PLAN_LOCKED", `Cannot remove locked task ${command.taskId}.`); draft.tasks.splice(index, 1); break; }
        case "addDependency": draft.dependencies.push(structuredClone(command.dependency)); break;
        case "removeDependency": draft.dependencies.splice(requireIndex(draft.dependencies, edge => edge.id === command.dependencyId, command.dependencyId), 1); break;
        case "assign": draft.assignments.push(structuredClone(command.assignment)); break;
        case "unassign": draft.assignments.splice(requireIndex(draft.assignments, assignment => assignment.taskId === command.taskId && assignment.resourceId === command.resourceId, `${command.taskId}/${command.resourceId}`), 1); break;
        case "upsertResource": { const index = draft.resources.findIndex(resource => resource.id === command.resource.id); if (index < 0) draft.resources.push(structuredClone(command.resource)); else draft.resources[index] = structuredClone(command.resource); break; }
        case "removeResource": draft.resources.splice(requireIndex(draft.resources, resource => resource.id === command.resourceId, command.resourceId), 1); break;
        case "upsertLocation": { const index = draft.locations.findIndex(location => location.id === command.location.id); if (index < 0) draft.locations.push(structuredClone(command.location)); else draft.locations[index] = structuredClone(command.location); break; }
        case "removeLocation": draft.locations.splice(requireIndex(draft.locations, location => location.id === command.locationId, command.locationId), 1); break;
        default: error("ND_INVALID_TRANSACTION", `Unknown command: ${String((command as { type: unknown }).type)}.`);
      }
    }
    let plan = normalizeOperationalPlan(draft); let moves: OperationalPreview["moves"] = [];
    if (transaction.scheduling === "cascade-forward") { const result = cascadeOperationalPlan(plan); plan = result.plan; moves = result.moves; }
    const conflicts = operationalConflicts(plan);
    if (conflicts.length && transaction.conflicts !== "report") error("ND_PLAN_CONFLICT", "Transaction rejected: the candidate plan contains conflicts.", { conflicts });
    return freeze({ plan, conflicts, moves, changed: JSON.stringify(plan) !== JSON.stringify(snapshot.plan) });
  };
  const publish = (plan: OperationalPlan, transaction: OperationalSnapshot["lastTransaction"]) => {
    snapshot = freeze({ revision: snapshot.revision + 1, plan, conflicts: operationalConflicts(plan), canUndo: past.length > 0, canRedo: future.length > 0, lastTransaction: transaction });
    notifying = true;
    try { for (const listener of [...listeners]) { if (destroyed) break; try { listener(snapshot); } catch (cause) { try { options.onObserverError?.(cause); } catch { /* Observer failures never undo an already committed plan. */ } } } }
    finally { notifying = false; }
    return snapshot;
  };
  return {
    getSnapshot: () => snapshot,
    preview: prepare,
    transact(transaction) {
      assertWritable(); const result = prepare(transaction); if (!result.changed) return snapshot;
      if (historyLimit) { past.push(snapshot.plan); if (past.length > historyLimit) past.shift(); }
      future.length = 0;
      return publish(result.plan, { id: transaction.id, label: transaction.label ?? transaction.id, kind: "commit" });
    },
    undo() { assertWritable(); const plan = past.pop(); if (!plan) return snapshot; future.push(snapshot.plan); return publish(plan, { id: `undo:${snapshot.revision}`, label: "Undo", kind: "undo" }); },
    redo() { assertWritable(); const plan = future.pop(); if (!plan) return snapshot; past.push(snapshot.plan); return publish(plan, { id: `redo:${snapshot.revision}`, label: "Redo", kind: "redo" }); },
    subscribe(listener) { if (destroyed) return () => {}; listeners.add(listener); return () => listeners.delete(listener); },
    exportJSON: () => JSON.stringify(snapshot.plan, null, 2),
    destroy() { destroyed = true; listeners.clear(); past.length = 0; future.length = 0; },
  };
}
