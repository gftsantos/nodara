import type { WorkingCalendar } from "@nodara/core/working-time";
import { serializeCode } from "../catalog/integration";
export function workingTimeExample(calendar: WorkingCalendar, horizon: { startDate: string; endDate: string }, local: string, amount: number) {
  // Inline object preserves contextual typing in TypeScript and remains plain JS.
  return `import { createWorkingClock } from '@nodara/core/working-time';\n\nconst clock = createWorkingClock(${serializeCode(calendar)}, ${serializeCode(horizon)});\nconst result = clock.add(clock.fromLocal(${serializeCode(local)}), ${amount});\nconsole.log(result, clock.toLocal(result.endMs));`;
}
