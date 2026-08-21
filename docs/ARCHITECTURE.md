# Nodara architecture

## Layers

```text
Application data
      |
      v
Typed contracts + runtime normalization
      |
      v
Reactive controller + plugin lifecycle
      |
      +-- Gantt: semantic DOM / Canvas / WebGL density
      +-- Charts: Canvas / WebGL + accessible table
      +-- Topology: Canvas / WebGL + layout engine
      +-- Calendar: semantic DOM + recurrence engine
      |
      v
React | Vue | Angular | Web Components | JavaScript
```

Framework adapters only map component lifecycle and events. Rendering,
normalization, themes, accessibility semantics, performance selection and
errors belong to `@nodara/core`.

## Reactive controller

Data is normalized on initialization and every update. Options are shallowly
merged and applied without replacing the controller. Render cleanup runs before
every redraw; ResizeObserver, document listeners and plugin hooks are released
on destroy.

## Renderer strategy

`renderer: "auto"` selects DOM for semantic small datasets, Canvas for dense
data and WebGL after a configurable threshold when the browser supports it.
Explicit WebGL gracefully falls back to Canvas. Each Canvas/WebGL component
keeps an accessible DOM representation for assistive technology.

## Performance

- 10,000-task Gantt uses a density renderer instead of creating 10,000 rows.
- Chart geometry and grid topology layouts are linear in item count.
- Force layout iterations are bounded.
- Recurrence expansion has configurable hard limits.
- Device pixel ratio is capped to control Canvas memory.

## Quality gates

The repository runs TypeScript strict, 197 automated core tests, package builds,
server-rendered HTML verification and desktop/mobile browser smoke tests. The
100-iteration implementation ledger is in `docs/ITERATIONS.md`.

## Compatibility

The target is evergreen browsers, Node.js 22+, React 18+, Vue 3.3+ and Angular
17+. Packages publish ESM, CommonJS, declarations and source maps.
