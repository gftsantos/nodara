# Nodara architecture

## Layers

```text
Consumer data / OperationalPlan schema 1
  -> defensive normalization and option/layout validation
  -> visual controller OR immutable transactional OperationalStore
  -> six visual projections with shared types and theme tokens
  -> JavaScript | React | Vue | Angular | Web Components
```

The operational store is independent of a renderer. Commands validate references, dates, precedence and capacity before publishing an immutable snapshot. Selection belongs to the portal UI, not the undo history. Export/import serializes the plan, not history, revision or selection.

## Visual controller

Initialization, update and setState normalize data. setState validates the candidate data and merged options together before changing either; setOptions changes options only. Invalid built-in data/options preserve the previous state and DOM.

Plugin hooks and consumer callbacks run synchronously. Reentrant mutations during an atomic option/state change are rejected; schedule a subsequent mutation after dispatch. Listener snapshots, bounded recursive dispatch, cleanup, ResizeObserver and theme listeners have regression tests. Exceptions in consumer hooks/formatters are not transactional rollbacks of arbitrary external side effects; an error after commit can report a committed state. getData/getOptions expose the current visual-controller references, not deep-frozen snapshots. The operational store has a separate immutable contract.

Framework adapters delegate to this controller. React skips unchanged props, uses setOptions for option-only changes and setState for simultaneous changes. Angular tracks successfully applied options rather than an invalid prior input. Web Components retain committed state even if a removed plugin's cleanup throws.

## Renderer capabilities

| Component | Current implementation |
| --- | --- |
| Gantt | Semantic DOM; Canvas/WebGL density mode |
| Chart | Canvas; WebGL for compatible scatter charts |
| Topology | Canvas/WebGL; DOM preference resolves to Canvas |
| Calendar | Semantic DOM |
| GeoMap | Canvas |
| Diagram | Canvas |

renderer is a preference subject to component capabilities. WebGL paths include Canvas fallback after initialization failure or actual context loss. A density Gantt is an overview, not full interaction parity with the DOM scheduler.

Canvas/WebGL representations have an accessible DOM counterpart capped by accessibilityLimit (default 300); remaining data is accessible via the API. Automated accessibility checks do not constitute a screen-reader or WCAG certification.

## Mathematics and scheduling

- D3 hierarchy and Sankey algorithms are bundled behind Nodara's flat-node schema. parentId defines hierarchy, leaf weights determine aggregate area; flows reject cycles and negative values.
- Gaussian KDE uses an absolute bandwidth or Scott's rule with sample standard deviation. Degenerate default violins show samples instead of inventing a density.
- Histogram bins use [start,end), with an inclusive final edge. Density uses bin width and the included-sample count.
- Contours use a rectangular scalar grid, physical coordinates, marching squares and asymptotic saddle decisions. They are isolines, not filled polygons or interpolation of scattered points.
- Recurrence supports a documented DAILY/WEEKLY/MONTHLY subset with hard expansion limits. Calendar grids still use the browser's local timezone; formatting a label in another zone does not change geometry.
- Operational scheduling uses integer UTC instants and elapsed durations, FS dependencies with nonnegative lag, explicit locks, capacity conflicts and precedence-only CPM. Capacity zero is valid; zero-duration tasks are milestones. No working-day calendar, optimization solver or automatic resource leveling is implied.

## Performance contract

Automatic thresholds can switch a 10,000-task Gantt to density rendering; this is not a fluidity benchmark. Force layout has quadratic pairwise repulsion per iteration. KDE costs O(samples × evaluations), contours O(cells × levels); both have a 10-million-work ceiling. Device pixel ratio and semantic item counts are bounded. Measured reports must include dataset, environment, actual renderer, warmup and sample count.

## Quality and compatibility

Use npm run verify:release for the full local gate. CI pins action revisions, Node/npm, preserves evidence, and does not publish npm packages automatically. Security exceptions are specific, reviewed and expiring, never blanket audit suppression.

Reference runtime: Node 22.13.1. Declared consumers: React >=18.2.0, Vue >=3.3.0, Angular >=21.2.21 <22; ranges are not claims that every version has been executed. Browser tests include Chromium, Firefox, WebKit and mobile Chromium emulation, not physical-device Safari.

Core, React, Vue and Web Components provide ESM/CJS and declarations; Angular provides ESM/declarations. The isolated-consumer audit installs the final content-addressed tarballs, validates their checksums and rejects dependencies resolved from the parent workspace.
