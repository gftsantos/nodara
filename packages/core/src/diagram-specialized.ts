import { hierarchy, tree } from "d3-hierarchy";
import type { DiagramData, DiagramLink, DiagramNode } from "./types";
import { normalizeDiagram } from "./validation";
import { NodaraError } from "./utils";
import type { HitRegion } from "./geometry";

export interface SpecializedBox { node: DiagramNode; x: number; y: number; width: number; height: number; depth: number; region: HitRegion }
interface Datum { node: DiagramNode | null; children: Datum[] }
function treeData(input: DiagramData) {
  const data = normalizeDiagram(input); const nodes = data.nodes.map(node => ({ ...node }));
  if (!nodes.some(node => node.parentId)) {
    const parents = new Map<string, string>();
    for (const link of data.links) { if (parents.has(link.to) && parents.get(link.to) !== link.from) throw new NodaraError("ND_TREE_PARENT", "A tree node can only have one parent. Use parentId for hierarchy and links for cross-relations."); parents.set(link.to, link.from); }
    for (const node of nodes) if (parents.has(node.id)) node.parentId = parents.get(node.id)!;
    normalizeDiagram({ nodes, links: [] });
  }
  const items = new Map(nodes.map(node => [node.id, { node, children: [] } as Datum]));
  const roots: Datum[] = [];
  for (const node of nodes) { const item = items.get(node.id)!; if (node.parentId) items.get(node.parentId)!.children.push(item); else roots.push(item); }
  return { root: roots.length === 1 ? roots[0]! : { node: null, children: roots }, synthetic: roots.length !== 1 };
}
/** parentId is authoritative; links infer a forest only when no parents are supplied. */
export function layoutDiagramTree(input: DiagramData, type: "radial-tree" | "mindmap", width: number, height: number, nodeWidth = 92): SpecializedBox[] {
  if (![width, height, nodeWidth].every(n => Number.isFinite(n) && n > 0)) throw new NodaraError("ND_INVALID_LAYOUT", "Invalid tree dimensions.");
  if (!input.nodes.length) return [];
  const { root } = treeData(input); const result: SpecializedBox[] = [];
  const append = (node: DiagramNode, x: number, y: number, depth: number) => { const w = Math.min(nodeWidth, width), h = 40; result.push({ node, x: x - w / 2, y: y - h / 2, width: w, height: h, depth, region: { kind: "rect", x: x - w / 2, y: y - h / 2, width: w, height: h } }); };
  if (type === "radial-tree") {
    const layout = tree<Datum>().size([Math.PI * 2, Math.max(0, Math.min(width, height) / 2 - Math.max(nodeWidth, 40) / 2 - 14)])(hierarchy(root));
    for (const point of layout.descendants()) if (point.data.node) append(point.data.node, width / 2 + Math.cos(point.x - Math.PI / 2) * point.y, height / 2 + Math.sin(point.x - Math.PI / 2) * point.y, point.depth);
  } else {
    if (root.node) append(root.node, width / 2, height / 2, 0);
    const sides = { left: [] as Datum[], right: [] as Datum[] }; let leftLoad = 0, rightLoad = 0;
    for (const child of root.children) { const load = hierarchy(child).leaves().length; const side = child.node?.branchSide ?? (leftLoad < rightLoad ? "left" : "right"); sides[side].push(child); if (side === "left") leftLoad += load; else rightLoad += load; }
    for (const side of ["left", "right"] as const) {
      const layout = tree<Datum>().nodeSize([64, nodeWidth + 32])(hierarchy<Datum>({ node: null, children: sides[side] }));
      for (const point of layout.descendants()) if (point.data.node) append(point.data.node, width / 2 + (side === "left" ? -1 : 1) * point.y, height / 2 + point.x, point.depth);
    }
    // Keep fixed-size labels readable. A small host scrolls the logical canvas;
    // it never compresses levels into overlapping boxes or negative coordinates.
    const dx = Math.max(0, 16 - Math.min(...result.map(box => box.x))), dy = Math.max(0, 16 - Math.min(...result.map(box => box.y)));
    for (const box of result) { box.x += dx; box.y += dy; box.region = { kind: "rect", x: box.x, y: box.y, width: box.width, height: box.height }; }
  }
  return result;
}
export interface ChordSpan { start: number; end: number }
/** Shared path geometry for curves, arrowheads and labels in state diagrams. */
export function stateConnection(from: Omit<SpecializedBox, "depth">, to: Omit<SpecializedBox, "depth">, reciprocal: boolean) {
  const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 }, b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  if (from.node.id === to.node.id) {
    const start = { x: a.x + from.width / 4, y: from.y - 2 }, end = { x: a.x - from.width / 4, y: from.y - 2 };
    return { start, end, control1: { x: start.x, y: start.y - 64 }, control2: { x: end.x, y: end.y - 64 }, angle: Math.PI / 2, label: { x: a.x, y: from.y - 54 } };
  }
  const control = { x: (a.x + b.x) / 2 - (b.y - a.y) * (reciprocal ? 0.25 : 0), y: (a.y + b.y) / 2 + (b.x - a.x) * (reciprocal ? 0.25 : 0) };
  const face = (box: Omit<SpecializedBox, "depth">, center: typeof a, target: typeof a) => { const angle = Math.atan2(target.y - center.y, target.x - center.x); const distance = box.region.kind === "circle" ? box.region.radius + 2 : Math.min(box.width / 2 / Math.max(0.001, Math.abs(Math.cos(angle))), box.height / 2 / Math.max(0.001, Math.abs(Math.sin(angle)))) + 2; return { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance }; };
  const start = face(from, a, control), end = face(to, b, control);
  return { start, end, control1: control, control2: undefined, angle: Math.atan2(end.y - control.y, end.x - control.x), label: { x: (start.x + 2 * control.x + end.x) / 4, y: (start.y + 2 * control.y + end.y) / 4 - 10 } };
}
export interface ChordGroup extends ChordSpan { node: DiagramNode; value: number }
export interface ChordRibbon { link: DiagramLink; value: number; source: ChordSpan; target: ChordSpan }
/** Endpoint-incidence chord: each link contributes its weight at both endpoints.
 * Parallel/directional links stay separate; self-links contribute two endpoint spans.
 */
export function layoutDiagramChord(input: DiagramData, padding = 0.045): { groups: ChordGroup[]; ribbons: ChordRibbon[]; total: number } {
  const data = normalizeDiagram(input);
  if (!Number.isFinite(padding) || padding < 0 || padding > 0.5 || data.nodes.length > 1000 || data.links.length > 10000) throw new NodaraError("ND_INVALID_LAYOUT", "Chord limit: 1000 groups, 10000 links; padding 0–0.5 radians.");
  const weights = new Map(data.nodes.map(node => [node.id, 0])); let total = 0;
  for (const link of data.links) { const value = link.value ?? 1; if (value < 0) throw new NodaraError("ND_NEGATIVE_WEIGHT", "Chord requires non-negative link values."); weights.set(link.from, weights.get(link.from)! + value); weights.set(link.to, weights.get(link.to)! + value); total += value * 2; }
  if (!Number.isFinite(total)) throw new NodaraError("ND_INVALID_WEIGHT", "Chord endpoint total exceeds numeric limits.");
  const gap = Math.min(padding, Math.PI / Math.max(1, data.nodes.length)); const available = 2 * Math.PI - gap * data.nodes.length; const angleFor = (value: number) => total ? value / total * available : 0; let angle = -Math.PI / 2;
  const groups = data.nodes.map(node => { const value = weights.get(node.id)!; const group = { node, value, start: angle, end: angle + angleFor(value) }; angle = group.end + gap; return group; });
  const cursor = new Map(groups.map(group => [group.node.id, group.start]));
  const span = (id: string, value: number) => { const start = cursor.get(id)!; const end = start + angleFor(value); cursor.set(id, end); return { start, end }; };
  return { groups, ribbons: data.links.filter(link => (link.value ?? 1) > 0).map(link => ({ link, value: link.value ?? 1, source: span(link.from, link.value ?? 1), target: span(link.to, link.value ?? 1) })), total };
}
