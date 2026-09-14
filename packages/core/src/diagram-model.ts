import { hierarchy, pack, partition, treemap, treemapSliceDice, treemapSquarify } from "d3-hierarchy";
import { sankey, sankeyLeft } from "d3-sankey";
import type { DiagramData, DiagramLink, DiagramNode, DiagramType } from "./types";
import type { HitRegion } from "./geometry";
import { normalizeDiagram } from "./validation";
import { NodaraError } from "./utils";

export interface DiagramLayoutBox { node: DiagramNode; value: number; depth: number; x: number; y: number; width: number; height: number; region: HitRegion }
export interface SankeyLayoutLink { link: DiagramLink; x0: number; y0: number; x1: number; y1: number; width: number }
export interface SankeyLayout { nodes: DiagramLayoutBox[]; links: SankeyLayoutLink[] }
export type HierarchyDiagramType = "treemap" | "icicle" | "sunburst" | "circle-pack";
interface TreeDatum { node: DiagramNode | null; children: TreeDatum[] }

function dimensions(width: number, height: number, gap: number) {
  if (![width, height, gap].every(Number.isFinite) || width <= 0 || height <= 0 || gap < 0) throw new NodaraError("ND_INVALID_LAYOUT", "Layout dimensions must be finite and positive; padding must be non-negative.");
}

/** Acyclic order for flows. Cyclic links remain valid for state/graph diagrams, never for Sankey. */
function flowOrder(data: DiagramData): string[] {
  const degree = new Map(data.nodes.map(node => [node.id, 0])); const outgoing = new Map<string, string[]>();
  for (const edge of data.links) { degree.set(edge.to, degree.get(edge.to)! + 1); const targets = outgoing.get(edge.from) ?? []; targets.push(edge.to); outgoing.set(edge.from, targets); }
  const order = data.nodes.filter(node => degree.get(node.id) === 0).map(node => node.id);
  for (let index = 0; index < order.length; index++) for (const target of outgoing.get(order[index]!) ?? []) { const next = degree.get(target)! - 1; degree.set(target, next); if (!next) order.push(target); }
  if (order.length !== data.nodes.length) throw new NodaraError("ND_FLOW_CYCLE", "Sankey/alluvial requires an acyclic directed graph.");
  return order;
}

export function validateDiagramLayout(data: DiagramData, type: DiagramType = "flowchart"): void {
  if (["treemap", "icicle", "sunburst", "circle-pack", "sankey", "alluvial"].includes(type)) {
    for (const node of data.nodes) if ((node.value ?? 0) < 0) throw new NodaraError("ND_NEGATIVE_WEIGHT", "Area and flow layouts require non-negative node weights.");
  }
  if (type === "sankey" || type === "alluvial") {
    for (const edge of data.links) if ((edge.value ?? 1) < 0) throw new NodaraError("ND_NEGATIVE_WEIGHT", "Sankey link values must be non-negative.");
    flowOrder(data);
    const touched = new Set(data.links.flatMap(edge => [edge.from, edge.to]));
    let total = 0;
    for (const edge of data.links) total += edge.value ?? 1;
    for (const node of data.nodes) if (!touched.has(node.id)) total += node.value ?? 1;
    if (!Number.isFinite(total)) throw new NodaraError("ND_INVALID_WEIGHT", "Sankey total weight exceeds numeric limits.");
  }
  if (["treemap", "icicle", "sunburst", "circle-pack"].includes(type) && data.nodes.length) buildHierarchy(data);
}

function buildHierarchy(data: DiagramData) {
  const items = new Map(data.nodes.map(node => [node.id, { node, children: [] } as TreeDatum])); const roots: TreeDatum[] = [];
  for (const node of data.nodes) { const item = items.get(node.id)!; if (node.parentId) items.get(node.parentId)!.children.push(item); else roots.push(item); }
  const synthetic = roots.length !== 1;
  const root = hierarchy<TreeDatum>(synthetic ? { node: null, children: roots } : roots[0]!, item => item.children);
  // Parent totals are the sum of leaf values; explicit parent values are not counted twice.
  root.sum(item => item.children.length ? 0 : item.node?.value ?? (item.node ? 1 : 0));
  root.each(node => { if (!Number.isFinite(node.value)) throw new NodaraError("ND_INVALID_WEIGHT", "Hierarchy weight sum exceeds numeric limits."); });
  const values = new Map(root.descendants().map(node => [node.data, node.value ?? 0]));
  const total = root.value ?? 0;
  // Relative weights avoid overflow and subnormal division inside the layout algorithms.
  // Contributions below machine precision have no representable visual area.
  if (total) root.sum(item => { const fraction = item.children.length ? 0 : (values.get(item) ?? 0) / total; return fraction < Number.EPSILON ? 0 : fraction; });
  return { root, synthetic, values };
}

/** D3 hierarchy layouts behind Nodara's stable flat-node schema. Only parentId defines containment. */
export function layoutDiagramHierarchy(input: DiagramData, type: HierarchyDiagramType, width: number, height: number, options: { padding?: number; labelHeight?: number; tiling?: "squarify" | "slice-dice" } = {}): DiagramLayoutBox[] {
  const padding = options.padding ?? 0; dimensions(width, height, padding);
  if (options.labelHeight !== undefined && (!Number.isFinite(options.labelHeight) || options.labelHeight < 0)) throw new NodaraError("ND_INVALID_LAYOUT", "labelHeight must be finite and non-negative.");
  const data = normalizeDiagram(input); validateDiagramLayout(data, type); if (!data.nodes.length) return [];
  const { root, synthetic, values } = buildHierarchy(data); const offset = synthetic ? 1 : 0;
  const levels = Math.max(1, root.height + 1 - offset);
  if (!root.value) return root.descendants().filter(item => item.data.node).map(item => ({ node: item.data.node!, value: 0, depth: item.depth - offset, x: width / 2, y: height / 2, width: 0, height: 0, region: { kind: "rect", x: width / 2, y: height / 2, width: 0, height: 0 } }));
  if (type === "circle-pack") {
    const packed = pack<TreeDatum>().size([width, height]).padding(padding)(root);
    return packed.descendants().filter(item => item.data.node).map(item => ({ node: item.data.node!, value: values.get(item.data) ?? 0, depth: item.depth - offset, x: item.x - item.r, y: item.y - item.r, width: item.r * 2, height: item.r * 2, region: { kind: "circle", x: item.x, y: item.y, radius: item.r } }));
  }
  if (type === "treemap") {
    const layout = treemap<TreeDatum>().size([width, height]).tile(options.tiling === "slice-dice" ? treemapSliceDice : treemapSquarify).paddingInner(padding).paddingOuter(padding).paddingTop(node => node.children && node.data.node ? Math.max(padding, options.labelHeight ?? 0) : padding)(root);
    return layout.descendants().filter(item => item.data.node).map(item => ({ node: item.data.node!, value: values.get(item.data) ?? 0, depth: item.depth - offset, x: item.x0, y: item.y0, width: Math.max(0, item.x1 - item.x0), height: Math.max(0, item.y1 - item.y0), region: { kind: "rect", x: item.x0, y: item.y0, width: Math.max(0, item.x1 - item.x0), height: Math.max(0, item.y1 - item.y0) } }));
  }
  const layout = partition<TreeDatum>().size([1, 1])(root); const radius = Math.min(width, height) / 2;
  return layout.descendants().filter(item => item.data.node).map(item => {
    const depth = item.depth - offset; const x = item.x0 * width; const y = depth / levels * height; const boxWidth = Math.max(0, item.x1 - item.x0) * width; const boxHeight = height / levels;
    if (type === "icicle") return { node: item.data.node!, value: values.get(item.data) ?? 0, depth, x, y, width: boxWidth, height: boxHeight, region: { kind: "rect", x, y, width: boxWidth, height: boxHeight } };
    return { node: item.data.node!, value: values.get(item.data) ?? 0, depth, x: width / 2 - radius, y: height / 2 - radius, width: radius * 2, height: radius * 2, region: { kind: "sector", x: width / 2, y: height / 2, innerRadius: depth / levels * radius, outerRadius: (depth + 1) / levels * radius, start: -Math.PI / 2 + item.x0 * Math.PI * 2, end: -Math.PI / 2 + item.x1 * Math.PI * 2 } };
  });
}

/** Conserves link widths through a global pixels-per-unit scale; node height is max(inflow,outflow). */
export function layoutDiagramSankey(input: DiagramData, width: number, height: number, options: { nodeWidth?: number; nodeGap?: number; iterations?: number } = {}): SankeyLayout {
  const gap = options.nodeGap ?? 12; const nodeWidth = options.nodeWidth ?? 20; const iterations = options.iterations ?? 6;
  dimensions(width, height, gap);
  if (!Number.isFinite(nodeWidth) || nodeWidth <= 0 || nodeWidth > width || !Number.isInteger(iterations) || iterations < 0 || iterations > 100) throw new NodaraError("ND_INVALID_LAYOUT", "Invalid Sankey node width or iterations.");
  const data = normalizeDiagram(input); validateDiagramLayout(data, "sankey"); if (!data.nodes.length) return { nodes: [], links: [] };
  let total = 0; const touched = new Set<string>();
  for (const edge of data.links) { total += edge.value ?? 1; touched.add(edge.from); touched.add(edge.to); }
  if (!Number.isFinite(total)) throw new NodaraError("ND_INVALID_WEIGHT", "Sankey flow sum exceeds numeric limits.");
  const nodeWeight = new Map(data.nodes.map(node => [node.id, touched.has(node.id) ? 0 : node.value ?? 1]));
  for (const value of nodeWeight.values()) total += value;
  if (!Number.isFinite(total)) throw new NodaraError("ND_INVALID_WEIGHT", "Sankey total weight exceeds numeric limits.");
  if (!total) return { nodes: data.nodes.map(node => ({ node, value: 0, depth: 0, x: 0, y: height / 2, width: nodeWidth, height: 0, region: { kind: "rect", x: 0, y: height / 2, width: nodeWidth, height: 0 } })), links: [] };
  if (!data.links.length) {
    const spacing = Math.min(gap, height / Math.max(1, data.nodes.length) * 0.5); const available = height - spacing * (data.nodes.length - 1); let y = 0;
    return { nodes: data.nodes.map(node => { const value = node.value ?? 1; const itemHeight = available * (value / total); const x = (width - nodeWidth) / 2; const box: DiagramLayoutBox = { node, value, depth: 0, x, y, width: nodeWidth, height: itemHeight, region: { kind: "rect", x, y, width: nodeWidth, height: itemHeight } }; y += itemHeight + spacing; return box; }), links: [] };
  }
  const relative = (value: number) => value / total < Number.EPSILON ? 0 : value / total;
  const inflow = new Map<string, number>(); const outflow = new Map<string, number>();
  for (const edge of data.links) { inflow.set(edge.to, (inflow.get(edge.to) ?? 0) + (edge.value ?? 1)); outflow.set(edge.from, (outflow.get(edge.from) ?? 0) + (edge.value ?? 1)); }
  type Node = { id: string; original: DiagramNode; fixedValue?: number };
  type Link = { original: DiagramLink };
  const graph = sankey<Node, Link>().nodeId(node => node.id).nodeAlign(sankeyLeft).nodeSort(() => 0).linkSort(() => 0).nodeWidth(nodeWidth).nodePadding(Math.min(gap, height / Math.max(1, data.nodes.length) * 0.5)).extent([[0, 0], [width, height]]).iterations(iterations)({
    nodes: data.nodes.map(node => ({ id: node.id, original: node, ...(touched.has(node.id) ? {} : { fixedValue: relative(node.value ?? 1) }) })),
    links: data.links.map(link => ({ source: link.from, target: link.to, value: relative(link.value ?? 1), original: link })),
  });
  return {
    nodes: graph.nodes.map(node => ({ node: node.original, value: touched.has(node.id) ? Math.max(inflow.get(node.id) ?? 0, outflow.get(node.id) ?? 0) : node.original.value ?? 1, depth: node.depth!, x: node.x0!, y: node.y0!, width: node.x1! - node.x0!, height: node.y1! - node.y0!, region: { kind: "rect", x: node.x0!, y: node.y0!, width: node.x1! - node.x0!, height: node.y1! - node.y0! } })),
    links: graph.links.filter(link => link.value > 0).map(link => { const source = link.source as typeof graph.nodes[number]; const target = link.target as typeof graph.nodes[number]; return { link: link.original, x0: source.x1!, y0: link.y0!, x1: target.x0!, y1: link.y1!, width: link.width! }; }),
  };
}
