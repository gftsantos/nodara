import type { WorkingPlan } from "@nodara/core/working-time";
export const workingDemo: WorkingPlan = {
  schemaVersion: 2, timeBasis: "working", projectStartMs: Date.parse("2026-10-23T15:00:00Z"),
  calendar: { id: "lisboa", timeZone: "Europe/Lisbon", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "17:00" }] })), exceptions: {} },
  horizon: { startDate: "2026-10-01", endDate: "2026-12-01" },
  tasks: [
    { id: "a", label: "Preparar entrega", startMs: Date.parse("2026-10-23T15:00:00Z"), workingMs: 10800000, progress: 0, locationId: "lisboa" },
    { id: "b", label: "Validar integração", startMs: Date.parse("2026-10-23T15:00:00Z"), workingMs: 7200000, progress: 0, locationId: "porto" },
    { id: "c", label: "Apoiar operação", startMs: Date.parse("2026-10-27T10:00:00Z"), workingMs: 7200000, progress: 0, locationId: "lisboa" },
  ],
  dependencies: [{ id: "ab", fromTaskId: "a", toTaskId: "b", kind: "FS", lagMs: 0 }],
  resources: [{ id: "equipa", label: "Equipa de entrega", capacityUnits: 100 }],
  assignments: ["a", "b", "c"].map(taskId => ({ taskId, resourceId: "equipa", units: 100 })),
  locations: [{ id: "lisboa", label: "Lisboa", longitude: -9.14, latitude: 38.72 }, { id: "porto", label: "Porto", longitude: -8.61, latitude: 41.15 }],
};
