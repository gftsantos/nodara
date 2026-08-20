# @nodara/core

Framework-agnostic Nodara engine. Every renderer returns a controller with
`update`, `resize`, `destroy` and typed event subscriptions.

```ts
import { createGantt } from "@nodara/core";
import "@nodara/core/styles.css";

const gantt = createGantt("#roadmap", {
  data: tasks,
  zoom: "month",
  onTaskChange: event => save(event.task),
});
```

The core has no runtime framework dependency and is safe to tree-shake.
