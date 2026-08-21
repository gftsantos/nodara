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
  resize(): void;
  destroy(): void;
  on<TPayload>(event: string, listener: (payload: TPayload) => void): () => void;
}
```

`update()` always runs runtime normalization. `setOptions()` redraws without
recreating the controller. Lifecycle events include `render`, `data:change`,
`options:change` and `error`.

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

Supports line, area, bar and scatter; positive/negative stacking; axes, grid,
legend and tooltip controls; value and label formatters; Canvas and WebGL; and
an accessible keyboard data table.

## Topology

Supports manual, radial, grid, force and hierarchical layouts. `auto` chooses a
strategy from the data. Pointer pan, wheel zoom, keyboard node selection,
viewport events and Canvas/WebGL renderers share one contract.

## Calendar

Supports day, week, workweek and six-row month views; resource labels and
filters; time zones; keyboard and pointer event editing; and bounded recurrence
expansion for DAILY, WEEKLY and MONTHLY rules with INTERVAL, COUNT, UNTIL and
BYDAY.

## Compatibility policy

- Patch: fixes and non-observable performance improvements.
- Minor: additive props, events, types and renderers.
- Major: removals or behavior changes with a migration guide.

During alpha, all packages remain version-linked. Deprecated fields receive at
least one minor release before removal.
