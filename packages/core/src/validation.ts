import type {
  CalendarEvent,
  ChartSeries,
  DiagramData,
  GanttTask,
  GeoCoordinate,
  GeoMapData,
  TopologyData,
} from "./types";
import { parseRecurrence } from "./recurrence";
import { clamp, NodaraError, toTimestamp } from "./utils";

function assertUniqueIds(items: Array<{ id: string }>, domain: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id?.trim()) throw new NodaraError("ND_MISSING_ID", `${domain} items require a non-empty id.`);
    if (ids.has(item.id)) throw new NodaraError("ND_DUPLICATE_ID", `Duplicate ${domain} id: ${item.id}.`);
    ids.add(item.id);
  }
}

function normalizeCoordinate(coordinate: GeoCoordinate, field: string): GeoCoordinate {
  if (!Number.isFinite(coordinate.longitude) || !Number.isFinite(coordinate.latitude)) {
    throw new NodaraError("ND_INVALID_COORDINATE", `${field} requires finite longitude and latitude.`);
  }
  if (coordinate.longitude < -180 || coordinate.longitude > 180 || coordinate.latitude < -90 || coordinate.latitude > 90) {
    throw new NodaraError("ND_COORDINATE_RANGE", `${field} is outside the geographic coordinate range.`);
  }
  return { longitude: coordinate.longitude, latitude: coordinate.latitude };
}

export function normalizeGanttTasks(input: GanttTask[]): GanttTask[] {
  assertUniqueIds(input, "task");
  const ids = new Set(input.map((task) => task.id));
  return input.map((task) => {
    if (!task.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Task ${task.id} requires a label.`);
    const start = toTimestamp(task.start, `${task.id}.start`);
    const end = toTimestamp(task.end, `${task.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Task ${task.id} ends before it starts.`);
    const dependencies = [...new Set(task.dependencies ?? [])];
    if (dependencies.includes(task.id)) throw new NodaraError("ND_SELF_DEPENDENCY", `Task ${task.id} cannot depend on itself.`);
    const missing = dependencies.find((id) => !ids.has(id));
    if (missing) throw new NodaraError("ND_DANGLING_DEPENDENCY", `Task ${task.id} depends on unknown task ${missing}.`);
    return { ...task, progress: clamp(task.progress ?? 0, 0, 100), dependencies };
  });
}

export function normalizeChartSeries(input: ChartSeries[]): ChartSeries[] {
  assertUniqueIds(input, "series");
  return input.map((series) => {
    if (!series.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Series ${series.id} requires a label.`);
    const data = series.data.map((point) => {
      if (!Number.isFinite(point.y)) throw new NodaraError("ND_INVALID_VALUE", `Series ${series.id} contains a non-finite value.`);
      if (point.x instanceof Date && !Number.isFinite(point.x.getTime())) throw new NodaraError("ND_INVALID_DATE", `Series ${series.id} contains an invalid date.`);
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
  const edgeIds = new Set<string>();
  input.edges.forEach((edge, index) => {
    const id = edge.id ?? `${edge.from}:${edge.to}:${index}`;
    if (edgeIds.has(id)) throw new NodaraError("ND_DUPLICATE_EDGE", `Duplicate edge id: ${id}.`);
    edgeIds.add(id);
  });
  return { nodes: input.nodes.map((node) => ({ ...node })), edges: input.edges.map((edge) => ({ ...edge })) };
}

export function normalizeCalendarEvents(input: CalendarEvent[]): CalendarEvent[] {
  assertUniqueIds(input, "event");
  return input.map((event) => {
    if (!event.title?.trim()) throw new NodaraError("ND_MISSING_TITLE", `Event ${event.id} requires a title.`);
    const start = toTimestamp(event.start, `${event.id}.start`);
    if (event.durationMinutes !== undefined && (!Number.isFinite(event.durationMinutes) || event.durationMinutes <= 0)) {
      throw new NodaraError("ND_INVALID_DURATION", `Event ${event.id} requires a positive duration.`);
    }
    const end = event.end === undefined ? start + (event.durationMinutes ?? 60) * 60_000 : toTimestamp(event.end, `${event.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Event ${event.id} ends before it starts.`);
    if (event.recurrence) parseRecurrence(event.recurrence);
    return { ...event, start, end };
  });
}

export function normalizeGeoMap(input: GeoMapData): GeoMapData {
  assertUniqueIds(input.points, "geo point");
  assertUniqueIds(input.regions ?? [], "geo region");
  const points = input.points.map((point) => {
    if (!point.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Geo point ${point.id} requires a label.`);
    if (point.value !== undefined && !Number.isFinite(point.value)) throw new NodaraError("ND_INVALID_VALUE", `Geo point ${point.id} contains a non-finite value.`);
    return { ...point, ...normalizeCoordinate(point, `Point ${point.id}`), ...(point.meta ? { meta: { ...point.meta } } : {}) };
  });
  const pointIds = new Set(points.map((point) => point.id));
  const routeIds = new Set<string>();
  const routes = (input.routes ?? []).map((route, index) => {
    const normalizeEnd = (value: string | GeoCoordinate, field: string) => {
      if (typeof value === "string") {
        if (!pointIds.has(value)) throw new NodaraError("ND_DANGLING_ROUTE", `Route ${index} references unknown point ${value}.`);
        return value;
      }
      return normalizeCoordinate(value, `Route ${index}.${field}`);
    };
    if (route.id && routeIds.has(route.id)) throw new NodaraError("ND_DUPLICATE_ROUTE", `Duplicate geographic route id: ${route.id}.`);
    if (route.id) routeIds.add(route.id);
    if (route.value !== undefined && !Number.isFinite(route.value)) throw new NodaraError("ND_INVALID_VALUE", `Route ${index} contains a non-finite value.`);
    return { ...route, from: normalizeEnd(route.from, "from"), to: normalizeEnd(route.to, "to"), ...(route.meta ? { meta: { ...route.meta } } : {}) };
  });
  const regions = (input.regions ?? []).map((region) => {
    if (!region.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Geo region ${region.id} requires a label.`);
    if (region.coordinates.length < 3) throw new NodaraError("ND_INVALID_POLYGON", `Region ${region.id} requires at least three coordinates.`);
    if (region.value !== undefined && !Number.isFinite(region.value)) throw new NodaraError("ND_INVALID_VALUE", `Region ${region.id} contains a non-finite value.`);
    return { ...region, coordinates: region.coordinates.map((coordinate, index) => normalizeCoordinate(coordinate, `Region ${region.id}.coordinates[${index}]`)), ...(region.meta ? { meta: { ...region.meta } } : {}) };
  });
  return { points, routes, regions };
}

export function normalizeDiagram(input: DiagramData): DiagramData {
  assertUniqueIds(input.nodes, "diagram node");
  const ids = new Set(input.nodes.map((node) => node.id));
  const nodes = input.nodes.map((node) => {
    if (!node.label?.trim()) throw new NodaraError("ND_MISSING_LABEL", `Diagram node ${node.id} requires a label.`);
    if (node.parentId === node.id) throw new NodaraError("ND_SELF_DEPENDENCY", `Diagram node ${node.id} cannot parent itself.`);
    if (node.parentId && !ids.has(node.parentId)) throw new NodaraError("ND_DANGLING_PARENT", `Diagram node ${node.id} references unknown parent ${node.parentId}.`);
    if (node.value !== undefined && !Number.isFinite(node.value)) throw new NodaraError("ND_INVALID_VALUE", `Diagram node ${node.id} contains a non-finite value.`);
    return { ...node, ...(node.meta ? { meta: { ...node.meta } } : {}) };
  });
  const linkIds = new Set<string>();
  const links = input.links.map((link, index) => {
    if (!ids.has(link.from) || !ids.has(link.to)) throw new NodaraError("ND_DANGLING_LINK", `Diagram link ${link.from} → ${link.to} references an unknown node.`);
    const id = link.id ?? `${link.from}:${link.to}:${index}`;
    if (linkIds.has(id)) throw new NodaraError("ND_DUPLICATE_LINK", `Duplicate diagram link id: ${id}.`);
    linkIds.add(id);
    if (link.value !== undefined && !Number.isFinite(link.value)) throw new NodaraError("ND_INVALID_VALUE", `Diagram link ${id} contains a non-finite value.`);
    return { ...link, ...(link.meta ? { meta: { ...link.meta } } : {}) };
  });
  return { nodes, links };
}
