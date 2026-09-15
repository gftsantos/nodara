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

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NodaraError("ND_INVALID_SHAPE", `${field} requires an object.`);
}
function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new NodaraError("ND_INVALID_SHAPE", `${field} requires an array.`);
}
function assertUniqueIds(items: Array<{ id: string }>, domain: string): void {
  assertArray(items, domain);
  const ids = new Set<string>();
  for (const item of items) {
    assertRecord(item, domain);
    if (typeof item.id !== "string" || !item.id.trim()) throw new NodaraError("ND_MISSING_ID", `${domain} items require a non-empty id.`);
    if (ids.has(item.id)) throw new NodaraError("ND_DUPLICATE_ID", `Duplicate ${domain} id: ${item.id}.`);
    ids.add(item.id);
  }
}

function normalizeCoordinate(coordinate: GeoCoordinate, field: string): GeoCoordinate {
  assertRecord(coordinate, field);
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
    if (typeof task.label !== "string" || !task.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Task ${task.id} requires a label.`);
    const start = toTimestamp(task.start, `${task.id}.start`);
    const end = toTimestamp(task.end, `${task.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Task ${task.id} ends before it starts.`);
    if (task.dependencies !== undefined) assertArray(task.dependencies, "dependencies");
    if (task.dependencies?.some(id => typeof id !== "string" || !id.trim())) throw new NodaraError("ND_INVALID_DEPENDENCY", "Dependencies require non-empty string identifiers.");
    if (task.dependencyLinks !== undefined) assertArray(task.dependencyLinks, "dependencyLinks");
    const linkKeys = new Set<string>();
    const dependencyLinks = task.dependencyLinks?.map(link => {
      assertRecord(link, "dependencyLink");
      if (typeof link.taskId !== "string" || !ids.has(link.taskId) || link.taskId === task.id || !["FS", "SS", "FF", "SF"].includes(link.kind) || (link.lagMs !== undefined && !Number.isSafeInteger(link.lagMs))) throw new NodaraError("ND_INVALID_DEPENDENCY", "Invalid typed dependency endpoint, kind or lag.");
      const key = JSON.stringify([link.taskId, link.kind]); if (linkKeys.has(key)) throw new NodaraError("ND_INVALID_DEPENDENCY", "Duplicate typed dependency."); linkKeys.add(key);
      return { taskId: link.taskId, kind: link.kind, ...(link.lagMs !== undefined ? { lagMs: link.lagMs } : {}) };
    });
    if (task.owner !== undefined) {
      assertRecord(task.owner, "task owner");
      if (typeof task.owner.name !== "string" || !task.owner.name.trim()) throw new NodaraError("ND_INVALID_OWNER", "Task owner requires a name.");
      for (const key of ["id", "avatarUrl", "color"] as const) if (task.owner[key] !== undefined && typeof task.owner[key] !== "string") throw new NodaraError("ND_INVALID_OWNER", `Owner ${key} must be a string.`);
    }
    if (task.progress !== undefined && !Number.isFinite(task.progress)) throw new NodaraError("ND_INVALID_VALUE", `Task ${task.id} requires finite progress.`);
    const dependencies = [...new Set(task.dependencies ?? [])];
    if (dependencies.includes(task.id)) throw new NodaraError("ND_SELF_DEPENDENCY", `Task ${task.id} cannot depend on itself.`);
    const missing = dependencies.find((id) => !ids.has(id));
    if (missing !== undefined) throw new NodaraError("ND_DANGLING_DEPENDENCY", `Task ${task.id} depends on unknown task ${missing}.`);
    return { ...task, progress: clamp(task.progress ?? 0, 0, 100), dependencies, ...(dependencyLinks ? { dependencyLinks } : {}) };
  });
}

export function normalizeChartSeries(input: ChartSeries[]): ChartSeries[] {
  assertUniqueIds(input, "series");
  return input.map((series) => {
    if (typeof series.label !== "string" || !series.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Series ${series.id} requires a label.`);
    assertArray(series.data, `Series ${series.id}.data`);
    const data = series.data.map((point) => {
      assertRecord(point, "chart point");
      if (!(point.x instanceof Date) && typeof point.x !== "string" && typeof point.x !== "number") throw new NodaraError("ND_INVALID_VALUE", "Chart X must be a string, number or Date.");
      if (typeof point.x === "number" && !Number.isFinite(point.x)) throw new NodaraError("ND_INVALID_VALUE", "Chart X must be finite.");
      if (!Number.isFinite(point.y)) throw new NodaraError("ND_INVALID_VALUE", `Series ${series.id} contains a non-finite value.`);
      if (point.x instanceof Date && !Number.isFinite(point.x.getTime())) throw new NodaraError("ND_INVALID_DATE", `Series ${series.id} contains an invalid date.`);
      return { ...point };
    });
    return { ...series, data };
  });
}

export function normalizeTopology(input: TopologyData): TopologyData {
  assertRecord(input, "topology");
  assertUniqueIds(input.nodes, "node");
  assertArray(input.edges, "edges");
  const ids = new Set(input.nodes.map((node) => node.id));
  for (const edge of input.edges) {
    assertRecord(edge, "edge");
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
  return { nodes: input.nodes.map((node) => {
    if (typeof node.label !== "string" || !node.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Node ${node.id} requires a label.`);
    if ((node.x !== undefined && !Number.isFinite(node.x)) || (node.y !== undefined && !Number.isFinite(node.y))) throw new NodaraError("ND_INVALID_COORDINATE", `Node ${node.id} requires finite coordinates.`);
    return { ...node };
  }), edges: input.edges.map((edge) => ({ ...edge })) };
}

export function normalizeCalendarEvents(input: CalendarEvent[]): CalendarEvent[] {
  assertUniqueIds(input, "event");
  return input.map((event) => {
    if (typeof event.title !== "string" || !event.title.trim()) throw new NodaraError("ND_MISSING_TITLE", `Event ${event.id} requires a title.`);
    const start = toTimestamp(event.start, `${event.id}.start`);
    if (event.durationMinutes !== undefined && (!Number.isFinite(event.durationMinutes) || event.durationMinutes <= 0)) {
      throw new NodaraError("ND_INVALID_DURATION", `Event ${event.id} requires a positive duration.`);
    }
    const end = event.end === undefined ? start + (event.durationMinutes ?? 60) * 60_000 : toTimestamp(event.end, `${event.id}.end`);
    if (end < start) throw new NodaraError("ND_INVALID_RANGE", `Event ${event.id} ends before it starts.`);
    toTimestamp(end, `${event.id}.end`);
    if (event.recurrence !== undefined) parseRecurrence(event.recurrence);
    if (event.excludedOccurrences !== undefined && (!Array.isArray(event.excludedOccurrences) || event.excludedOccurrences.some(value => !Number.isSafeInteger(value) || value < 0))) throw new NodaraError("ND_INVALID_RECURRENCE", "excludedOccurrences requires non-negative integer ordinals.");
    return { ...event, start, end };
  });
}

export function normalizeGeoMap(input: GeoMapData): GeoMapData {
  assertRecord(input, "geo map");
  assertUniqueIds(input.points, "geo point");
  assertUniqueIds(input.regions ?? [], "geo region");
  const points = input.points.map((point) => {
    if (typeof point.label !== "string" || !point.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Geo point ${point.id} requires a label.`);
    if (point.value !== undefined && !Number.isFinite(point.value)) throw new NodaraError("ND_INVALID_VALUE", `Geo point ${point.id} contains a non-finite value.`);
    return { ...point, ...normalizeCoordinate(point, `Point ${point.id}`), ...(point.meta ? { meta: { ...point.meta } } : {}) };
  });
  const pointIds = new Set(points.map((point) => point.id));
  const routeIds = new Set<string>();
  assertArray(input.routes ?? [], "routes");
  const routes = (input.routes ?? []).map((route, index) => {
    assertRecord(route, "route");
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
    if (typeof region.label !== "string" || !region.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Geo region ${region.id} requires a label.`);
    assertArray(region.coordinates, "region coordinates");
    if (region.coordinates.length < 3) throw new NodaraError("ND_INVALID_POLYGON", `Region ${region.id} requires at least three coordinates.`);
    if (region.value !== undefined && !Number.isFinite(region.value)) throw new NodaraError("ND_INVALID_VALUE", `Region ${region.id} contains a non-finite value.`);
    return { ...region, coordinates: region.coordinates.map((coordinate, index) => normalizeCoordinate(coordinate, `Region ${region.id}.coordinates[${index}]`)), ...(region.meta ? { meta: { ...region.meta } } : {}) };
  });
  return { points, routes, regions };
}

export function normalizeDiagram(input: DiagramData): DiagramData {
  assertRecord(input, "diagram");
  assertUniqueIds(input.nodes, "diagram node");
  assertArray(input.links, "diagram links");
  const ids = new Set(input.nodes.map((node) => node.id));
  const nodes = input.nodes.map((node) => {
    if (typeof node.label !== "string" || !node.label.trim()) throw new NodaraError("ND_MISSING_LABEL", `Diagram node ${node.id} requires a label.`);
    if (node.parentId === node.id) throw new NodaraError("ND_SELF_DEPENDENCY", `Diagram node ${node.id} cannot parent itself.`);
    if (node.parentId && !ids.has(node.parentId)) throw new NodaraError("ND_DANGLING_PARENT", `Diagram node ${node.id} references unknown parent ${node.parentId}.`);
    if (node.value !== undefined && !Number.isFinite(node.value)) throw new NodaraError("ND_INVALID_VALUE", `Diagram node ${node.id} contains a non-finite value.`);
    if (node.ports !== undefined) assertArray(node.ports, "diagram ports");
    if (node.branchSide !== undefined && !["left", "right"].includes(node.branchSide) || node.stateKind !== undefined && !["normal", "initial", "final"].includes(node.stateKind)) throw new NodaraError("ND_INVALID_DIAGRAM", "Invalid branchSide or stateKind.");
    if (node.attributes !== undefined) {
      assertArray(node.attributes, "entity attributes"); const names = new Set<string>();
      if (node.attributes.length > 100) throw new NodaraError("ND_INVALID_DIAGRAM", "At most 100 attributes per entity.");
      for (const attribute of node.attributes) { assertRecord(attribute, "attribute"); if (typeof attribute.name !== "string" || !attribute.name.trim() || names.has(attribute.name) || attribute.type !== undefined && typeof attribute.type !== "string" || attribute.key !== undefined && (typeof attribute.key !== "string" || !["PK", "FK", "PK/FK"].includes(attribute.key))) throw new NodaraError("ND_INVALID_DIAGRAM", "Invalid or duplicate entity attribute."); names.add(attribute.name); }
    }
    const portIds = new Set<string>();
    const ports = node.ports?.map(port => {
      assertRecord(port, "diagram port");
      if (typeof port.id !== "string" || !port.id.trim() || portIds.has(port.id) || !["top", "right", "bottom", "left"].includes(port.side) || port.offset !== undefined && (!Number.isFinite(port.offset) || port.offset < 0 || port.offset > 1) || port.label !== undefined && typeof port.label !== "string") throw new NodaraError("ND_INVALID_PORT", `Invalid port on diagram node ${node.id}.`);
      portIds.add(port.id); return { ...port };
    });
    return { ...node, ...(node.attributes ? { attributes: node.attributes.map(attribute => ({ ...attribute })) } : {}), ...(ports ? { ports } : {}), ...(node.meta ? { meta: { ...node.meta } } : {}) };
  });
  const linkIds = new Set<string>();
  const parentById = new Map(nodes.filter(node => node.parentId).map(node => [node.id, node.parentId!]));
  const visited = new Set<string>();
  for (const node of nodes) {
    const path = new Set<string>(); let current: string | undefined = node.id;
    while (current && !visited.has(current)) { if (path.has(current)) throw new NodaraError("ND_HIERARCHY_CYCLE", "Diagram parentId relations contain a cycle."); path.add(current); current = parentById.get(current); }
    path.forEach(id => visited.add(id));
  }
  const links = input.links.map((link, index) => {
    assertRecord(link, "diagram link");
    if (!ids.has(link.from) || !ids.has(link.to)) throw new NodaraError("ND_DANGLING_LINK", `Diagram link ${link.from} → ${link.to} references an unknown node.`);
    const id = link.id ?? `${link.from}:${link.to}:${index}`;
    if (linkIds.has(id)) throw new NodaraError("ND_DUPLICATE_LINK", `Duplicate diagram link id: ${id}.`);
    linkIds.add(id);
    if (link.value !== undefined && !Number.isFinite(link.value)) throw new NodaraError("ND_INVALID_VALUE", `Diagram link ${id} contains a non-finite value.`);
    for (const cardinality of [link.fromCardinality, link.toCardinality]) if (cardinality !== undefined && !["1", "0..1", "0..*", "1..*"].includes(cardinality)) throw new NodaraError("ND_INVALID_DIAGRAM", "Invalid ER cardinality.");
    for (const [endpoint, portId] of [[link.from, link.fromPort], [link.to, link.toPort]]) if (portId !== undefined && (typeof portId !== "string" || !nodes.find(node => node.id === endpoint)?.ports?.some(port => port.id === portId))) throw new NodaraError("ND_INVALID_PORT", `Unknown port on diagram link ${id}.`);
    return { ...link, ...(link.meta ? { meta: { ...link.meta } } : {}) };
  });
  return { nodes, links };
}
