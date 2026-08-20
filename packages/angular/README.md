# @nodara/angular

Standalone Angular components powered by `@nodara/core`.

```ts
import { NodaraGanttComponent } from "@nodara/angular";

@Component({
  imports: [NodaraGanttComponent],
  template: `<nd-gantt [data]="tasks" (taskSelect)="openTask($event)" />`,
})
export class RoadmapComponent {}
```
