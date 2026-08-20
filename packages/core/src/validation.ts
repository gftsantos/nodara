import type {
  CalendarEvent,
  ChartSeries,
  GanttTask,
  TopologyData,
} from "./types";
import { clamp, NodaraError, toTimestamp } from "./utils";

function assertUniqueIds(items: Array<{ id: string }>, domain: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id?.trim()) throw new NodaraError("ND_MISSING_ID", `${domain} items require a non-empty id.`);
    if (ids.has(item.id)) throw new NodaraError("ND_DUPLICATE_ID", `Duplicate ${domain} id: ${item.id}.`);
    ids.add(item.id);
  }
}

export function normalizeGanttTasks(input: GanttTask[]): GanttTask[] {
  assertUniqueIds(input, "task");
  return input.map((task) => {
    if (!task.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Task ${task.id} requires a label.`);
    const start = toTimestamp(task.start, `${task.id}.start`);
    const end = toTimestamp(task.end, `${task.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Task ${task.id} ends before it starts.`);
    return { ...task, progress: clamp(task.progress ?? 0, 0, 100) };
  });
}

export function normalizeChartSeries(input: ChartSeries[]): ChartSeries[] {
  assertUniqueIds(input, "series");
  return input.map((series) => {
    if (!series.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Series ${series.id} requires a label.`);
    const data = series.data.map((point) => {
      if (!Number.isFinite(point.y)) throw new NodaraError("ND_INVALID_VALUE", `Series ${series.id} contains a non-finite value.`);
      return { ...point };
    });
    return { ...series, data };
  });
}

export function normalizeTopology(input: TopologyData): TopologyData {
  assertUniqueIds(input.nodes, "node");
  const ids = new Set(input.nodes.map((node) => node.id));
  for (const edge of input.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new NodaraError("ND_DANGLING_EDGE", `Edge ${edge.from} → ${edge.to} references an unknown node.`);
    }
  }
  return { nodes: input.nodes.map((node) => ({ ...node })), edges: input.edges.map((edge) => ({ ...edge })) };
}

export function normalizeCalendarEvents(input: CalendarEvent[]): CalendarEvent[] {
  assertUniqueIds(input, "event");
  return input.map((event) => {
    if (!event.title?.trim()) throw new NodaraError("ND_MISSING_TITLE", `Event ${event.id} requires a title.`);
    const start = toTimestamp(event.start, `${event.id}.start`);
    const end = event.end === undefined ? start + (event.durationMinutes ?? 60) * 60_000 : toTimestamp(event.end, `${event.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Event ${event.id} ends before it starts.`);
    return { ...event, end };
  });
}
