import type { TopologyData, TopologyLayout, TopologyNode } from "./types";

export interface PositionedNode {
  node: TopologyNode;
  x: number;
  y: number;
}

export type PositionMap = Map<string, PositionedNode>;

function radial(nodes: TopologyNode[], width: number, height: number): PositionMap {
  const centerX = width / 2;
  const centerY = height / 2;
  const orbit = Math.max(50, Math.min(width, height) * 0.34);
  return new Map(nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(nodes.length, 1);
    return [node.id, { node, x: centerX + Math.cos(angle) * orbit, y: centerY + Math.sin(angle) * orbit }];
  }));
}

function grid(nodes: TopologyNode[], width: number, height: number): PositionMap {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / columns));
  return new Map(nodes.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return [node.id, { node, x: ((column + 1) * width) / (columns + 1), y: ((row + 1) * height) / (rows + 1) }];
  }));
}

function manual(nodes: TopologyNode[], width: number, height: number): PositionMap {
  const fallback = radial(nodes, width, height);
  return new Map(nodes.map((node) => {
    const item = fallback.get(node.id)!;
    return [node.id, { node, x: node.x ?? item.x, y: node.y ?? item.y }];
  }));
}

function hierarchical(data: TopologyData, width: number, height: number): PositionMap {
  const incoming = new Map(data.nodes.map((node) => [node.id, 0]));
  data.edges.forEach((edge) => incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1));
  const levels = new Map<string, number>();
  const queue = data.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  queue.forEach((id) => levels.set(id, 0));
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index]!;
    const level = levels.get(id) ?? 0;
    data.edges.filter((edge) => edge.from === id).forEach((edge) => {
      levels.set(edge.to, Math.max(levels.get(edge.to) ?? 0, level + 1));
      if (!queue.includes(edge.to)) queue.push(edge.to);
    });
  }
  data.nodes.forEach((node) => { if (!levels.has(node.id)) levels.set(node.id, 0); });
  const maximumLevel = Math.max(...levels.values(), 0);
  const grouped = new Map<number, TopologyNode[]>();
  data.nodes.forEach((node) => grouped.set(levels.get(node.id) ?? 0, [...(grouped.get(levels.get(node.id) ?? 0) ?? []), node]));
  const positioned: PositionMap = new Map();
  grouped.forEach((nodes, level) => nodes.forEach((node, index) => positioned.set(node.id, {
    node,
    x: ((index + 1) * width) / (nodes.length + 1),
    y: ((level + 1) * height) / (maximumLevel + 2),
  })));
  return positioned;
}

function force(data: TopologyData, width: number, height: number, iterations: number): PositionMap {
  const positions = grid(data.nodes, width, height);
  const count = data.nodes.length;
  if (count < 2) return positions;
  const ideal = Math.sqrt((width * height) / count) * 0.75;
  for (let iteration = 0; iteration < Math.min(Math.max(iterations, 1), 300); iteration += 1) {
    const movement = new Map(data.nodes.map((node) => [node.id, { x: 0, y: 0 }]));
    for (let a = 0; a < count; a += 1) {
      for (let b = a + 1; b < count; b += 1) {
        const first = positions.get(data.nodes[a]!.id)!;
        const second = positions.get(data.nodes[b]!.id)!;
        const dx = first.x - second.x || 0.01;
        const dy = first.y - second.y || 0.01;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const repulsion = (ideal * ideal) / distance * 0.015;
        movement.get(first.node.id)!.x += (dx / distance) * repulsion;
        movement.get(first.node.id)!.y += (dy / distance) * repulsion;
        movement.get(second.node.id)!.x -= (dx / distance) * repulsion;
        movement.get(second.node.id)!.y -= (dy / distance) * repulsion;
      }
    }
    data.edges.forEach((edge) => {
      const first = positions.get(edge.from);
      const second = positions.get(edge.to);
      if (!first || !second) return;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const attraction = ((distance - ideal) * 0.02);
      movement.get(first.node.id)!.x += (dx / distance) * attraction;
      movement.get(first.node.id)!.y += (dy / distance) * attraction;
      movement.get(second.node.id)!.x -= (dx / distance) * attraction;
      movement.get(second.node.id)!.y -= (dy / distance) * attraction;
    });
    positions.forEach((item, id) => {
      const delta = movement.get(id)!;
      item.x = Math.min(width - 30, Math.max(30, item.x + delta.x));
      item.y = Math.min(height - 30, Math.max(30, item.y + delta.y));
    });
  }
  return positions;
}

export function calculateTopologyLayout(
  data: TopologyData,
  layout: TopologyLayout = "auto",
  width = 800,
  height = 500,
  iterations = 60,
): PositionMap {
  const resolved = layout === "auto" ? (data.nodes.every((node) => node.x !== undefined && node.y !== undefined) ? "manual" : data.nodes.length > 80 ? "grid" : "force") : layout;
  if (resolved === "manual") return manual(data.nodes, width, height);
  if (resolved === "radial") return radial(data.nodes, width, height);
  if (resolved === "grid") return grid(data.nodes, width, height);
  if (resolved === "hierarchical") return hierarchical(data, width, height);
  return force(data, width, height, iterations);
}
