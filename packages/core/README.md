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

`Chart` supports 14 geometries: line, area, bar, scatter, bubble, pie, donut,
radar, polar area, heatmap, waterfall, funnel, gauge and candlestick. The public
`visualCatalog` registry exposes 48 documented recipes across Gantt, charts,
topologies and calendars, with stable IDs and typed family metadata.
