import type { DiagramData, DiagramLink, DiagramNode, DiagramOptions, DiagramPort } from "./types";
import { NodaraError } from "./utils";
import { normalizeDiagram } from "./validation";

export interface DiagramRoutePoint { x: number; y: number }
export interface DiagramRouteBox { node: DiagramNode; x: number; y: number; width: number; height: number }
export type DiagramRoute = { link: DiagramLink; status: "routed"; points: DiagramRoutePoint[]; length: number; bends: number }
  | { link: DiagramLink; status: "unroutable" | "limited"; reason: "blocked-terminal" | "outside-bounds" | "no-path" | "self-loop" | "degenerate" | "budget-exceeded" };
export interface DiagramRoutingBudget { maxVertices?: number; maxChecks?: number; maxVisits?: number }
const boxTypes = ["tree", "radial-tree", "mindmap", "flowchart", "org-chart", "er", "state"];
export function validateDiagramRouting(data: DiagramData, options: DiagramOptions) {
  if (options.linkRouting !== "orthogonal" && (data.nodes.some(node => node.ports?.length) || data.links.some(link => link.fromPort !== undefined || link.toPort !== undefined))) throw new NodaraError("ND_UNSUPPORTED_ROUTING", "Diagram ports require linkRouting: orthogonal.");
  if (!boxTypes.includes(options.type ?? "flowchart") && (options.linkRouting === "orthogonal" || options.routingClearance !== undefined || data.nodes.some(node => node.ports?.length) || data.links.some(link => link.fromPort !== undefined || link.toPort !== undefined))) throw new NodaraError("ND_UNSUPPORTED_ROUTING", "Ports and obstacle routing require a box diagram (tree, mindmap, flowchart, org-chart, er or state).");
  if (options.routingClearance !== undefined && options.linkRouting !== "orthogonal") throw new NodaraError("ND_UNSUPPORTED_ROUTING", "routingClearance requires linkRouting: orthogonal.");
}
export function diagramPortPoint(box: DiagramRouteBox, port: DiagramPort): DiagramRoutePoint {
  const offset = port.offset ?? 0.5;
  return { x: box.x + (port.side === "left" ? 0 : port.side === "right" ? box.width : box.width * offset), y: box.y + (port.side === "top" ? 0 : port.side === "bottom" ? box.height : box.height * offset) };
}
const normals = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] } as const;
const equal = (a: DiagramRoutePoint, b: DiagramRoutePoint) => a.x === b.x && a.y === b.y;
const distance = (a: DiagramRoutePoint, b: DiagramRoutePoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function compact(points: DiagramRoutePoint[]) {
  const result: DiagramRoutePoint[] = [];
  for (const point of points) {
    if (result.length && equal(result.at(-1)!, point)) continue;
    while (result.length > 1) {
      const a = result.at(-2)!; const b = result.at(-1)!;
      if ((a.x === b.x && b.x === point.x || a.y === b.y && b.y === point.y) && distance(a, point) === distance(a, b) + distance(b, point)) result.pop(); else break;
    }
    result.push(point);
  }
  return result;
}
// A small stable min-heap; distance first, bends second, insertion order last.
type Entry = { state: number; cost: number; bends: number; order: number };
function heap() {
  const entries: Entry[] = []; const before = (a: Entry, b: Entry) => a.cost < b.cost || a.cost === b.cost && (a.bends < b.bends || a.bends === b.bends && a.order < b.order);
  return { get length() { return entries.length; }, push(entry: Entry) { entries.push(entry); let i = entries.length - 1; while (i > 0) { const parent = (i - 1) >> 1; if (!before(entries[i]!, entries[parent]!)) break; [entries[i], entries[parent]] = [entries[parent]!, entries[i]!]; i = parent; } }, pop() { const first = entries[0]!; const last = entries.pop()!; if (entries.length) { entries[0] = last; let i = 0; while (i * 2 + 1 < entries.length) { let next = i * 2 + 1; if (next + 1 < entries.length && before(entries[next + 1]!, entries[next]!)) next++; if (!before(entries[next]!, entries[i]!)) break; [entries[i], entries[next]] = [entries[next]!, entries[i]!]; i = next; } } return first; } };
}

/** Routes avoid inflated node interiors, not other edges. Budgets are shared by
 * all links in this call. Failure never silently falls back to a crossing line. */
export function routeDiagramLinks(boxes: readonly DiagramRouteBox[], links: readonly DiagramLink[], bounds: { width: number; height: number }, clearance = 8, budget: DiagramRoutingBudget = {}): DiagramRoute[] {
  normalizeDiagram({ nodes: boxes.map(box => box.node), links: [...links] });
  const maxVertices = budget.maxVertices ?? 10_000, maxChecks = budget.maxChecks ?? 2_000_000, maxVisits = budget.maxVisits ?? 200_000;
  if (![bounds.width, bounds.height].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(clearance) || clearance < 0 || ![maxVertices, maxChecks, maxVisits].every(value => Number.isSafeInteger(value) && value > 0)) throw new NodaraError("ND_INVALID_ROUTING", "Invalid routing bounds, clearance or budget.");
  const byId = new Map(boxes.map(box => [box.node.id, box]));
  if (byId.size !== boxes.length || boxes.some(box => ![box.x, box.y, box.width, box.height, box.x + box.width + clearance, box.y + box.height + clearance].every(Number.isFinite) || box.width <= 0 || box.height <= 0)) throw new NodaraError("ND_INVALID_ROUTING", "Routing requires unique finite positive node boxes.");
  const obstacles = boxes.map(box => ({ id: box.node.id, left: box.x - clearance, right: box.x + box.width + clearance, top: box.y - clearance, bottom: box.y + box.height + clearance }));
  let checks = 0, visits = 0; const exhausted = Symbol("budget");
  const inside = (p: DiagramRoutePoint) => p.x >= 0 && p.x <= bounds.width && p.y >= 0 && p.y <= bounds.height;
  const blocked = (a: DiagramRoutePoint, b: DiagramRoutePoint, except?: string) => obstacles.some(rect => {
    if (++checks > maxChecks) throw exhausted;
    if (rect.id === except) return false;
    return a.x === b.x ? a.x > rect.left && a.x < rect.right && Math.max(a.y, b.y) > rect.top && Math.min(a.y, b.y) < rect.bottom : a.y > rect.top && a.y < rect.bottom && Math.max(a.x, b.x) > rect.left && Math.min(a.x, b.x) < rect.right;
  });
  return links.map(link => {
    const from = byId.get(link.from), to = byId.get(link.to);
    if (!from || !to) throw new NodaraError("ND_DANGLING_LINK", "Routing link references an unknown box.");
    const failed = (reason: "blocked-terminal" | "outside-bounds" | "no-path" | "self-loop" | "degenerate"): DiagramRoute => ({ link, status: "unroutable", reason });
    if (link.from === link.to) return failed("self-loop");
    const port = (box: DiagramRouteBox, other: DiagramRouteBox, id?: string): DiagramPort => {
      if (id !== undefined) { const found = box.node.ports?.find(port => port.id === id); if (!found) throw new NodaraError("ND_INVALID_PORT", "Routing link references an unknown port."); return found; }
      const dx = other.x + other.width / 2 - box.x - box.width / 2, dy = other.y + other.height / 2 - box.y - box.height / 2;
      return { id: "", side: Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? "right" : "left" : dy >= 0 ? "bottom" : "top" };
    };
    const source = port(from, to, link.fromPort), target = port(to, from, link.toPort);
    const a = diagramPortPoint(from, source), b = diagramPortPoint(to, target);
    const escape = (point: DiagramRoutePoint, port: DiagramPort) => ({ x: point.x + normals[port.side][0] * clearance, y: point.y + normals[port.side][1] * clearance });
    const start = escape(a, source), finish = escape(b, target);
    if (![a, b, start, finish].every(inside)) return failed("outside-bounds");
    try {
      if (blocked(a, start, from.node.id) || blocked(b, finish, to.node.id)) return failed("blocked-terminal");
      const xs = [...new Set([0, bounds.width, start.x, finish.x, ...obstacles.flatMap(r => [r.left, r.right]).filter(x => x >= 0 && x <= bounds.width)])].sort((a, b) => a - b);
      const ys = [...new Set([0, bounds.height, start.y, finish.y, ...obstacles.flatMap(r => [r.top, r.bottom]).filter(y => y >= 0 && y <= bounds.height)])].sort((a, b) => a - b);
      const count = xs.length * ys.length; if (count > maxVertices) throw exhausted;
      const point = (vertex: number) => ({ x: xs[vertex % xs.length]!, y: ys[Math.floor(vertex / xs.length)]! });
      const first = ys.indexOf(start.y) * xs.length + xs.indexOf(start.x), last = ys.indexOf(finish.y) * xs.length + xs.indexOf(finish.x);
      const queue = heap(), costs = new Float64Array(count * 3).fill(Infinity), turns = new Float64Array(count * 3).fill(Infinity), previous = new Int32Array(count * 3).fill(-1);
      const edgeCache = new Map<string, boolean>(); let order = 0, final = -1;
      costs[first * 3] = 0; turns[first * 3] = 0; queue.push({ state: first * 3, cost: 0, bends: 0, order: order++ });
      while (queue.length) {
        if (++visits > maxVisits) throw exhausted;
        const current = queue.pop(); if (current.cost !== costs[current.state] || current.bends !== turns[current.state]) continue;
        const vertex = Math.floor(current.state / 3), direction = current.state % 3;
        if (vertex === last) { final = current.state; break; }
        const x = vertex % xs.length, y = Math.floor(vertex / xs.length);
        for (const next of [x > 0 ? vertex - 1 : -1, x + 1 < xs.length ? vertex + 1 : -1, y > 0 ? vertex - xs.length : -1, y + 1 < ys.length ? vertex + xs.length : -1]) {
          if (next < 0) continue;
          const key = `${Math.min(vertex, next)}:${Math.max(vertex, next)}`;
          let collision = edgeCache.get(key); if (collision === undefined) { collision = blocked(point(vertex), point(next)); edgeCache.set(key, collision); } if (collision) continue;
          const axis = Math.abs(next - vertex) === 1 && Math.floor(next / xs.length) === y ? 1 : 2, state = next * 3 + axis;
          const cost = current.cost + distance(point(vertex), point(next)), bends = current.bends + (direction !== 0 && direction !== axis ? 1 : 0);
          if (cost < costs[state]! || cost === costs[state] && bends < turns[state]!) { costs[state] = cost; turns[state] = bends; previous[state] = current.state; queue.push({ state, cost, bends, order: order++ }); }
        }
      }
      if (final < 0) return failed("no-path");
      const route: DiagramRoutePoint[] = []; for (let state = final; state >= 0; state = previous[state]!) route.push(point(Math.floor(state / 3)));
      const points = compact([a, ...route.reverse(), b]);
      if (points.length < 2) return failed("degenerate");
      return { link, status: "routed", points, length: points.reduce((sum, p, i) => sum + (i ? distance(points[i - 1]!, p) : 0), 0), bends: Math.max(0, points.length - 2) };
    } catch (error) { if (error !== exhausted) throw error; return { link, status: "limited", reason: "budget-exceeded" }; }
  });
}
