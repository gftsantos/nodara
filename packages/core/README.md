# @nodara/core

Framework-agnostic Nodara engine. Every renderer returns a reactive controller
with normalized `update`, `setOptions`, `resize`, `destroy`, getters, plugins
and typed event subscriptions.

```ts
import { createGantt } from "@nodara/core";
import "@nodara/core/styles.css";

const gantt = createGantt("#roadmap", {
  data: tasks,
  zoom: "month",
  renderer: "auto",
  interactive: { keyboard: true, pointer: true },
  onTaskChange: event => save(event.task),
});
```

The core includes DOM, Canvas and WebGL strategies, recurrence and topology
layout engines, accessible fallbacks and no runtime framework dependency.

`Chart` supports 26 geometries, including cartesian, radial, scientific and
financial charts. `GeoMap` adds three projections and five geographic modes;
`Diagram` adds 14 flow, hierarchy and relationship diagrams. The public
`visualCatalog` exposes 100 documented recipes across six engines with stable
IDs and typed family metadata.

The catalog separates **6 component APIs**, **69 configuration variants** and
**100 illustrative recipes**. Recipe counts are not independent implementation
counts. Sprint/release examples share Gantt, with distinct two/eight-week data.

## Specialized representations

- Chord uses weighted endpoint-incidence arcs/ribbons (`link.value`, default 1).
  A relation contributes at both endpoints; self-links contribute twice. Parallel
  and directional links remain separate, not aggregated into a flow matrix.
  Zero weights create no ribbons; negative/nonfinite weights are rejected.
- Radial trees position root/depth in polar coordinates; mindmaps use left/right
  branches, optional `branchSide` on root children, and fixed-size logical-canvas
  spacing with scrolling. `parentId` is authoritative; without it, links infer
  parents and reject multiparent/cyclic input.
- ER entities have `attributes: [{name,type?,key?: 'PK'|'FK'|'PK/FK'}]`; links
  support `fromCardinality`/`toCardinality`: `1`, `0..1`, `0..*`, `1..*`.
  State nodes support `stateKind: 'normal'|'initial'|'final'`, labelled transitions
  and curved self-loops. These are renderers, not SQL generation or state execution.
- Gantt ticks use real UTC calendar boundaries (Monday weeks), compact localized
  labels, proportional partial cells and bounded density. `editable:false` blocks
  date changes but preserves selection; `interactive:false` blocks all interaction.

## Integrated working plans (optional entry)

`@nodara/core/working-time` also exports `WorkingPlan`, `evaluateWorkingPlan`,
`createWorkingPlanStore` and `workingPlanViews`. Schema 2 explicitly uses
`timeBasis:'working'`, `calendar`, `horizon`, and task `workingMs`, retaining the
same resource/assignment/location/typed-dependency contracts as schema 1.

```ts
import { createWorkingPlanStore, workingPlanViews } from '@nodara/core/working-time';
// plan: WorkingPlan, e.g. the JSON exported by /operations → working mode.
const store = createWorkingPlanStore(plan);
const preview = store.preview(candidatePlan); // no state/history changes
console.table(preview.changes); // includes finish-only changes and removed tasks
store.apply(candidatePlan, preview.expectedRevision); // rejects capacity conflicts
const views = workingPlanViews(store.getSnapshot().evaluation);
// views.gantt, calendar, topology, map and load use the same task identifiers.
```

Requested `task.startMs` stays separate from derived `evaluation.windows`, so
removing a holiday may restore earlier dates. Work is scheduled through actual
open intervals with FS/SS/FF/SF constraints; lags are elapsed milliseconds. FF/SF
use the earliest millisecond start that meets the finish bound, including closed
gaps. Capacity is swept over working segments, not the enclosing Gantt bar.
Zero-work milestones consume no capacity. Calendar projections carry `meta.taskId`.

Apply is atomic and revision-checked; `allowConflicts:true` explicitly accepts
capacity conflicts only. Cycles, invalid data and insufficient horizon remain
errors. `locked` captures the first evaluated window and protects start, finish,
work and segments thereafter; unlock in a separate transaction. The store provides
frozen snapshots, subscribe/unsubscribe, undo/redo (100 entries), JSON export and
destroy. Reentrant writes from observers or candidate getters are rejected.

The example workspace has one shared project calendar, not per-resource calendars,
resource leveling or working-time CPM. It caps 500 tasks/resources, 5000 dependencies/
assignments and 200000 work segments. No cloud persistence is implied. Full working
integration code in the portal uses real components and is JS/TS typechecked.
# Working calendars and deeper scheduling

The elapsed operational model supports FS, SS, FF and SF, with signed integer
`lagMs`. Cascading is forward-only; CPM is precedence-only, not resource leveling.
`operationalGantt` preserves typed anchors in `dependencyLinks` (legacy
`dependencies` remains an FS shorthand).

The optional entry `@nodara/core/working-time` exports `createWorkingClock`.
It resolves `@js-temporal/polyfill` and `@nodara/core` through a bundler or Node
ESM/CJS; the main visualization entry remains self-contained and does not load
Temporal. Errors share the main entry's `NodaraError` within each module format.

```ts
import { createWorkingClock } from '@nodara/core/working-time';
const clock = createWorkingClock({
  id: 'office', timeZone: 'Europe/Lisbon',
  week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: '09:00', end: '17:00' }] })),
  exceptions: { '2026-10-26': [] }, disambiguation: 'reject'
}, { startDate: '2026-01-01', endDate: '2027-01-01' });
const result = clock.add(clock.fromLocal('2026-10-23T16:00'), 3 * 3_600_000);
console.log(clock.toLocal(result.endMs), result.segments);
```

Hours are actual elapsed time within open shifts, not payroll wall-clock hours.
`add`, `subtract`, `between` and `alignForward` respect civil-day exceptions and
IANA DST. Ambiguous/nonexistent input is rejected by default. Split overnight
periods at midnight; only an end may be `24:00`. Horizons are exclusive and bounded
to 3660 days, with at most 24 periods per day and 20,000 compiled intervals.
Insufficient work time throws instead of truncating. Runtime Intl timezone rules
are used; persist compiled intervals for reproducible historical decisions.
This entry does **not** automatically change the elapsed operational store,
perform resource leveling or assign per-resource calendars.

Box diagrams now support named `ports` and `linkRouting: 'orthogonal'` with
`routingClearance`. `routeDiagramLinks` exposes routed points or explicit
unroutable/limited reasons. Paths avoid inflated node interiors, not other edges;
self-loops and exhausted routing budgets are reported rather than hidden by a
straight-line fallback. Ports/routing are rejected on unsupported diagram types.
