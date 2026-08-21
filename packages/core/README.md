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
