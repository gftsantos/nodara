# Public API

## Shared controller

Every factory returns the same lifecycle surface:

```ts
interface NodaraController<TData, TOptions> {
  readonly element: HTMLElement;
  getData(): TData;
  getOptions(): TOptions;
  update(data: TData): void;
  setOptions(options: Partial<TOptions>): void;
  setState(data: TData, options: Partial<TOptions>): void;
  resize(): void;
  destroy(): void;
  on<TPayload>(event: string, listener: (payload: TPayload) => void): () => void;
}
```

`update()` always runs runtime normalization. `setOptions()` redraws without
recreating the controller. Lifecycle events include `render`, `data:change`,
`options:change` and `error`.

`setState()` validates data and options together before committing and renders
once. Use it when changing chart/diagram type and data at the same time. React,
Vue and Angular use this atomic path; Web Components expose `element.setState`.
Known event names infer their payload through `NodaraEvents<TData,TOptions>`;
the explicit generic overload remains available for custom plugin events.
The `render` payload is `{data, options}`, not just the data array.

Do not mutate `getData()`/`getOptions()` results directly. Visual controllers do
not promise deep freezing. The operational store does. Synchronous mutation
recursion is bounded; changing options inside an active options/plugin change
throws `ND_REENTRANT_OPTIONS`. Defer such changes outside the callback.

## Shared options

- `theme`: `light | dark | system`.
- `tokens`: partial design-token overrides.
- `renderer`: `auto | dom | canvas | webgl`.
- `interactive`: a boolean or per-capability keyboard/pointer/pan/zoom object.
- `locale`, `ariaLabel`, `className`.
- `performance`: Canvas/WebGL thresholds, pixel ratio and a configurable limit
  for the semantic fallback DOM used by large datasets.
- `plugins`: before/after render, data, options and destroy hooks.
- `onError`: centralized renderer error handling.

## Gantt

Supports day/week/month/quarter zoom, explicit ranges, row height, snap,
straight or orthogonal dependencies, pointer drag, resize handles, keyboard
move/resize and typed `task:select` / `task:change` events. Large datasets use
an automatic density renderer.

## Charts

Supports 26 configured geometries with Canvas; scatter also supports WebGL.
Positive and negative stacking use shared X identities, not per-series indices.
Axes/grid/legend/tooltip controls, formatters and an accessible keyboard data
table share the public contract. Candles, OHLC, boxplots, bullets and radial bars
display all series. Gauge, waterfall and funnel currently require one series;
gauge requires one value. Unsupported extra data is rejected, not hidden.

`histogram(samples,{edges})` calculates counts/densities and out-of-range counts;
`histogramSeries()` preserves numeric bin bounds for unequal-width rendering.
`gaussianKDE(samples,{bandwidth,evaluationPoints})` supports absolute bandwidth
or Scott's rule (sample SD). `violinBandwidth` configures the violin renderer;
constant samples without an explicit width are shown as sample marks only.
`marchingSquares({x,y,values},levels)` computes scalar-grid isolines, including
bilinear saddle disambiguation. `scalarGridSeries()` creates editable chart rows
with `gridY`; `seriesScalarGrid()` validates and reverses the bridge.
`contourLevels` controls scalar levels. This is not scattered interpolation,
2D density estimation or filled polygon extraction. See `/docs#statistics`.

## Geographic maps and diagrams

`createGeoMap` projects consumer-supplied points/routes/polygons. It does not
include tiles, geocoding, world cartography or road routing.

`layoutDiagramHierarchy` uses D3 hierarchy for treemap, icicle, sunburst and
circle packing. `parentId` defines containment; internal values aggregate leaves
without double-counting explicit parent values. `layoutDiagramSankey` uses a
global flow scale, max(inflow,outflow) node sizes and rejects directed cycles.
`validateDiagramLayout` applies type-specific constraints. Negatives are invalid
for area/flow encodings. Contributions below relative machine precision collapse
visually; original numeric values remain in the output. Chord uses weighted arcs
and ribbons; ER exposes attributes, keys and cardinalities; state supports initial/
final states and transitions. These are not full semantic diagram editors.

## Topology

Supports manual, radial, grid, force and hierarchical layouts. `auto` chooses a
strategy from the data. Pointer pan, wheel zoom, keyboard node selection,
viewport events and Canvas/WebGL renderers share one contract.

## Calendar

Supports day, week, workweek and six-row month views; resource labels and
filters; timezone-formatted labels; keyboard and pointer event editing; and bounded recurrence
expansion for DAILY, WEEKLY and MONTHLY rules with INTERVAL, COUNT, UNTIL and
BYDAY.

The grid follows the browser timezone, not the `timeZone` label option. Agenda,
year and resource/timeline views currently support consultation and selection;
editing is available in day/week/workweek/month. Recurrence candidate scanning is
bounded and `maxOccurrences` is per source event. No complete RFC5545 claim.

## Integrated operational planning

`normalizeOperationalPlan` validates schema 1, elapsed-time tasks, resource
capacity/assignments, locations and acyclic FS/SS/FF/SF dependencies with signed lag.
`createOperationalStore` exposes preview/transact, frozen snapshots, bounded
undo/redo, subscriptions, monotonic revisions and explicit JSON export.
`operationalCriticalPath` computes precedence-only CPM; it does not level
resources or interpret business calendars. `cascadeOperationalPlan` moves tasks
forward and explains each move, rejecting a required move of a locked task.
`operationalCapacity`/`operationalConflicts` use half-open intervals.
`operationalGantt`, `operationalCalendar`, `operationalTopology`, `operationalMap`
and `operationalLoadChart` project the same state. See `/docs#operations`.

`@nodara/core/working-time` separately exports `WorkingPlan` schema 2 and
`WorkingResource`, `evaluateWorkingPlan`, `createWorkingPlanStore`, `workingPlanViews`
and `createWorkingClock`. Resources optionally carry their own calendar; task work
uses the intersection with the project and all assigned resources. Optional
`resourceLeveling:'serial'` reserves locked windows first and uses free capacity in
stable topological order, interrupting work when necessary. Omission/`'none'` keeps
legacy behavior. Lags remain elapsed. Preview/apply/history preserve these options.
This is not optimal scheduling or working-time CPM. See the core README for bounds.

## Compatibility policy

- Patch: fixes and non-observable performance improvements.
- Minor: additive props, events, types and renderers.
- Major: removals or behavior changes with a migration guide.

During alpha, all packages remain version-linked. Deprecated fields receive at
least one minor release before removal.

`docs/public-api-candidate.json` records the built declaration surface across six
entry points. `scripts/check-api-surface.mjs` checks it in the release gate.
Review every baseline change alongside migration notes; matching declarations
alone do not prove behavioral compatibility. Isolated consumer tests remain required.
## Interaction callback ordering

`onTaskChange` / `onEventChange` receive a proposed move/resize before the renderer commits it. A thrown callback aborts that interaction. Controller `task:change` / `event:change` subscriptions run after commit. Calling `update` or `setState` does not fabricate interaction events. Synchronous cross-view reconciliation should be scheduled after this local commit (the operational example uses a microtask). Arbitrary consumer side effects are not rolled back by the visual controller.
