# @nodara/react

React components powered by `@nodara/core`.

```tsx
import { Gantt } from "@nodara/react";
import "@nodara/core/styles.css";

<Gantt data={tasks} zoom="month" onTaskSelect={({ task }) => open(task.id)} />
```

Every component accepts `onReady` to expose the framework-agnostic controller.
