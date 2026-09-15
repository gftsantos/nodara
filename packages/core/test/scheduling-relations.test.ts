import { describe, expect, it } from "vitest";
import { normalizeOperationalPlan, operationalConflicts, operationalCriticalPath, cascadeOperationalPlan, operationalGantt, operationalTopology, type OperationalPlan, type OperationalDependencyKind } from "../src/operations-model";
import { createOperationalStore } from "../src/operations-store";
import { createGantt } from "../src/gantt";
import { normalizeGanttTasks } from "../src/validation";
const task = (id: string, startMs: number, durationMs: number) => ({ id, label: id, startMs, durationMs, progress: 0 });
const plan = (kind: OperationalDependencyKind, lagMs = 0): OperationalPlan => ({ schemaVersion: 1, timeBasis: "elapsed", projectStartMs: 0, tasks: [task("A", 10, 4), task("B", 0, 3)], resources: [], assignments: [], locations: [], dependencies: [{ id: "ab", fromTaskId: "A", toTaskId: "B", kind, lagMs }] });
describe("generalized elapsed scheduling", () => {
  it.each([["FS"], new String("FS"), { toString: () => "FS" }])("rejects non-primitive dependency kinds %j", kind => {
    expect(() => normalizeOperationalPlan({ ...plan("FS"), dependencies: [{ ...plan("FS").dependencies[0]!, kind: kind as never }] })).toThrow(/dependency/);
  });
  it("compares redundant out-of-range bounds before converting to dates", () => {
    const min = -8_640_000_000_000_000, max = 8_640_000_000_000_000;
    const input = { ...plan("SS", -1), projectStartMs: min, tasks: [task("A", min, 1), task("B", min, 1)] };
    expect(operationalConflicts(input)).toEqual([]); expect(cascadeOperationalPlan(input).moves).toEqual([]);
    const upper = { ...plan("SS", -20), projectStartMs: max - 10, tasks: [task("A", max - 10, 1), task("B", max - 10, 1)] };
    expect(operationalCriticalPath(upper).tasks.map(t => t.latestStartMs)).toEqual([max - 10, max - 10]);
  });
  for (const [kind, bound] of [["FS", 14], ["SS", 10], ["FF", 11], ["SF", 7]] as const) {
    it.each([-2, 0, 2])(`${kind} conflict and cascade share exact bounds with lag %s`, lag => {
      const input = normalizeOperationalPlan(plan(kind, lag));
      expect(operationalConflicts(input)[0]).toMatchObject({ requiredStartMs: bound + lag, dependencyId: "ab" });
      const result = cascadeOperationalPlan(input);
      expect(result.plan.tasks[1]!.startMs).toBe(bound + lag); expect(operationalConflicts(result.plan)).toEqual([]);
      expect(result.moves[0]!.dependencyIds).toEqual(["ab"]);
    });
    it(`${kind} renders the corresponding start/finish anchors and preserves lag metadata`, () => {
      const source = plan(kind, 2); const data = operationalGantt(source);
      expect(data[1]!.dependencyLinks).toEqual([{ taskId: "A", kind, lagMs: 2 }]);
      expect(operationalTopology(source).edges[0]!.meta).toEqual({ kind, lagMs: 2 });
      const root = document.createElement("div"); document.body.append(root);
      const view = createGantt(root, { data, renderer: "dom", start: 0, end: 86_400_000, dependencyRouting: "straight" });
      const path = root.querySelector('path[data-from="A"]')!;
      expect(root.querySelectorAll('path[data-from="A"]')).toHaveLength(1);
      expect(path.getAttribute("data-kind")).toBe(kind); expect(path.getAttribute("data-lag-ms")).toBe("2");
      const values = path.getAttribute("d")!.match(/[\d.e+-]+/g)!.map(Number);
      expect(values[0]).toBeCloseTo((kind[0] === "F" ? 14 : 10) / 86_400_000 * 100, 12);
      expect(values[2]).toBeCloseTo((kind[1] === "F" ? 3 : 0) / 86_400_000 * 100, 12);
      view.destroy();
    });
  }
  it("retains a predecessor's finish constraint even with SS successors", () => {
    const input = { ...plan("SS"), tasks: [task("A", 0, 10), task("B", 0, 1)] };
    const result = operationalCriticalPath(input); expect(result.finishMs).toBe(10); expect(result.tasks.map(t => t.totalFloatMs)).toEqual([0, 9]);
  });
  it("solves mixed relations in forward and reverse CPM passes", () => {
    const input = { ...plan("FS"), tasks: [task("A", 0, 4), task("B", 0, 3), task("C", 0, 2), task("D", 0, 1)], dependencies: [
      { id: "ab", fromTaskId: "A", toTaskId: "B", kind: "SS" as const, lagMs: 1 },
      { id: "ac", fromTaskId: "A", toTaskId: "C", kind: "FF" as const, lagMs: 1 },
      { id: "bd", fromTaskId: "B", toTaskId: "D", kind: "FS" as const, lagMs: -1 },
      { id: "cd", fromTaskId: "C", toTaskId: "D", kind: "FF" as const, lagMs: 0 },
    ] };
    const result = operationalCriticalPath(input);
    expect(result.tasks.map(t => t.earliestStartMs)).toEqual([0, 1, 3, 4]); expect(result.tasks.map(t => t.latestStartMs)).toEqual([0, 2, 3, 4]); expect(result.finishMs).toBe(5); expect(result.criticalDependencyIds).toEqual(["ac", "cd"]);
  });
  it("supports start-to-finish milestones and distinct constraints on the same pair", () => {
    const input = { ...plan("SF"), tasks: [{ ...task("A", 10, 0), notBeforeMs: 10 }, task("B", 0, 3)] };
    expect(operationalCriticalPath(input).tasks.map(t => t.earliestStartMs)).toEqual([10, 7]);
    expect(normalizeOperationalPlan({ ...plan("SS"), dependencies: [...plan("SS").dependencies, { ...plan("FF").dependencies[0], id: "ff" }] }).dependencies).toHaveLength(2);
  });
  it("rejects locked successor edits atomically and undo/redo restores mixed plans", () => {
    const store = createOperationalStore(cascadeOperationalPlan(plan("FF")).plan);
    const before = store.getSnapshot();
    store.transact({ id: "move", commands: [{ type: "updateTask", taskId: "A", changes: { startMs: 20 } }], scheduling: "cascade-forward" });
    expect(store.getSnapshot().plan.tasks[1]!.startMs).toBe(21); store.undo(); expect(store.getSnapshot().plan).toEqual(before.plan); store.redo(); expect(store.getSnapshot().plan.tasks[1]!.startMs).toBe(21);
    store.transact({ id: "lock", commands: [{ type: "updateTask", taskId: "B", changes: { locked: true } }] }); const locked = store.getSnapshot();
    expect(() => store.transact({ id: "fail", commands: [{ type: "updateTask", taskId: "A", changes: { startMs: 30 } }], scheduling: "cascade-forward", conflicts: "report" })).toThrow(/locked/);
    expect(store.getSnapshot()).toBe(locked); store.destroy();
  });
  it("does not pull successors backwards when a negative lag relaxes a constraint", () => {
    const original = plan("FF", -2); const input = { ...original, tasks: [original.tasks[0]!, task("B", 100, 3)] };
    expect(cascadeOperationalPlan(input).plan.tasks[1]!.startMs).toBe(100);
  });
  it("isolates typed visual links and rejects invalid links before state change", () => {
    const input = operationalGantt(plan("SS")); const result = normalizeGanttTasks(input);
    input[1]!.dependencyLinks![0]!.kind = "FF"; expect(result[1]!.dependencyLinks![0]!.kind).toBe("SS");
    expect(() => normalizeGanttTasks([{ ...result[0]!, dependencyLinks: [{ taskId: "missing", kind: "SS" }] }])).toThrow();
  });
});
