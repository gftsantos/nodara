import type { OperationalPlan } from "@nodara/core";

export const OPERATIONAL_DAY = 86_400_000;
export const demoPlan: OperationalPlan = {
  schemaVersion: 1,
  timeBasis: "elapsed",
  projectStartMs: Date.UTC(2026, 8, 14),
  tasks: [
    { id: "architecture", label: "Arquitetura e contratos", startMs: Date.UTC(2026, 8, 14), durationMs: 2 * OPERATIONAL_DAY, progress: 100, locationId: "lisbon" },
    { id: "core", label: "Motor de planeamento", startMs: Date.UTC(2026, 8, 16), durationMs: 3 * OPERATIONAL_DAY, progress: 65, locationId: "porto" },
    { id: "portal", label: "Experiência do developer", startMs: Date.UTC(2026, 8, 16), durationMs: 2 * OPERATIONAL_DAY, progress: 45, locationId: "lisbon" },
    { id: "validation", label: "Validação integrada", startMs: Date.UTC(2026, 8, 19), durationMs: 2 * OPERATIONAL_DAY, progress: 0, locationId: "coimbra" },
    { id: "staging", label: "Publicação de teste", startMs: Date.UTC(2026, 8, 21), durationMs: OPERATIONAL_DAY, progress: 0, locationId: "porto" },
    { id: "release", label: "Marco de entrega", startMs: Date.UTC(2026, 8, 22), durationMs: 0, progress: 0, locationId: "lisbon" },
  ],
  dependencies: [
    { id: "arch-core", fromTaskId: "architecture", toTaskId: "core", kind: "FS", lagMs: 0 },
    { id: "arch-portal", fromTaskId: "architecture", toTaskId: "portal", kind: "FS", lagMs: 0 },
    { id: "core-validation", fromTaskId: "core", toTaskId: "validation", kind: "FS", lagMs: 0 },
    { id: "portal-validation", fromTaskId: "portal", toTaskId: "validation", kind: "FS", lagMs: 0 },
    { id: "validation-staging", fromTaskId: "validation", toTaskId: "staging", kind: "FS", lagMs: 0 },
    { id: "staging-release", fromTaskId: "staging", toTaskId: "release", kind: "FS", lagMs: 0 },
  ],
  resources: [{ id: "platform", label: "Platform", capacityUnits: 100 }, { id: "frontend", label: "Frontend", capacityUnits: 100 }, { id: "quality", label: "Quality", capacityUnits: 100 }],
  assignments: [
    { taskId: "architecture", resourceId: "platform", units: 100 },
    { taskId: "core", resourceId: "platform", units: 100 },
    { taskId: "portal", resourceId: "frontend", units: 100 },
    { taskId: "validation", resourceId: "quality", units: 100 },
    { taskId: "staging", resourceId: "platform", units: 100 },
  ],
  locations: [{ id: "lisbon", label: "Lisboa", latitude: 38.7223, longitude: -9.1393 }, { id: "porto", label: "Porto", latitude: 41.1579, longitude: -8.6291 }, { id: "coimbra", label: "Coimbra", latitude: 40.2033, longitude: -8.4103 }],
};
