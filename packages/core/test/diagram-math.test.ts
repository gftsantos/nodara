import { describe, expect, it } from "vitest";
import { layoutDiagramHierarchy, layoutDiagramSankey, validateDiagramLayout } from "../src/diagram-model";
import { containsPoint } from "../src/geometry";
import type { DiagramData } from "../src/types";

const tree: DiagramData = { nodes: [{ id: "R", label: "Root", value: 999 }, { id: "A", label: "A", parentId: "R" }, { id: "B", label: "B", parentId: "R", value: 1 }, { id: "a1", label: "A1", parentId: "A", value: 2 }, { id: "a2", label: "A2", parentId: "A", value: 1 }], links: [] };
const flow: DiagramData = { nodes: ["A", "B", "C", "D"].map(id => ({ id, label: id })), links: [{ from: "A", to: "B", value: 6 }, { from: "A", to: "C", value: 4 }, { from: "B", to: "D", value: 6 }, { from: "C", to: "D", value: 4 }] };

describe("Finite geometry at extreme numeric scales", () => {
  for (const values of [[1e308, 1], [Number.MIN_VALUE, Number.MIN_VALUE], [0, 1e308]]) {
    for (const type of ["treemap", "icicle", "sunburst", "circle-pack"] as const) it(`${type} supports weights ${values}`, () => {
      const nodes = values.map((value, index) => ({ id: String(index), label: String(index), value }));
      const boxes = layoutDiagramHierarchy({ nodes, links: [] }, type, 600, 400);
      for (const box of boxes) expect([box.x, box.y, box.width, box.height, ...Object.values(box.region).filter(value => typeof value === "number")].every(Number.isFinite)).toBe(true);
      expect(boxes.map(box => box.value)).toEqual(values);
    });
  }
  it("Sankey normalizes subnormal flows before D3", () => { const result = layoutDiagramSankey({ nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], links: [{ from: "a", to: "b", value: Number.MIN_VALUE }] }, 600, 400); expect(result.links[0]!.width).toBeCloseTo(400); expect(result.nodes[0]!.value).toBe(Number.MIN_VALUE); });
  it("isolated Sankey nodes never multiply dimensions by an unscaled huge weight", () => { const result = layoutDiagramSankey({ nodes: [{ id: "a", label: "A", value: 1e308 }, { id: "b", label: "B", value: 1 }], links: [] }, 600, 400); expect(result.nodes.every(box => Number.isFinite(box.height))).toBe(true); });
});

describe("Quantitative hierarchy layouts", () => {
  it("aggregates leaf weights without double counting parent values", () => { const result = layoutDiagramHierarchy(tree, "treemap", 120, 80); expect(result.find(box => box.node.id === "R")!.value).toBe(4); expect(result.find(box => box.node.id === "A")!.value).toBe(3); });
  it("slice-dice has the reference areas and nested coordinates", () => {
    const boxes = new Map(layoutDiagramHierarchy(tree, "treemap", 120, 80, { tiling: "slice-dice" }).map(box => [box.node.id, box]));
    expect(boxes.get("A")).toMatchObject({ x: 0, y: 0, width: 90, height: 80 }); expect(boxes.get("B")).toMatchObject({ x: 90, y: 0, width: 30, height: 80 });
    expect(boxes.get("a1")!.height).toBeCloseTo(160 / 3); expect(boxes.get("a2")!.y).toBeCloseTo(160 / 3);
  });
  it("squarify keeps each leaf area proportional to its weight", () => { const boxes = layoutDiagramHierarchy(tree, "treemap", 120, 80); for (const box of boxes.filter(box => ["B", "a1", "a2"].includes(box.node.id))) expect(box.width * box.height).toBeCloseTo(120 * 80 * box.value / 4); });
  it("icicle partitions children inside their parent's horizontal interval", () => { const boxes = new Map(layoutDiagramHierarchy(tree, "icicle", 120, 90).map(box => [box.node.id, box])); expect(boxes.get("A")).toMatchObject({ x: 0, width: 90, y: 30, height: 30 }); expect(boxes.get("a1")).toMatchObject({ x: 0, width: 60, y: 60 }); expect(boxes.get("a2")).toMatchObject({ x: 60, width: 30 }); });
  it("sunburst uses nested angular intervals rather than independent rings", () => { const boxes = layoutDiagramHierarchy(tree, "sunburst", 300, 300); const a = boxes.find(box => box.node.id === "A")!.region; const leaf = boxes.find(box => box.node.id === "a1")!.region; if (a.kind !== "sector" || leaf.kind !== "sector") throw new Error("missing sectors"); expect(a.end - a.start).toBeCloseTo(Math.PI * 1.5); expect(leaf.end - leaf.start).toBeCloseTo(Math.PI); expect(leaf.start).toBe(a.start); expect(leaf.innerRadius).toBe(a.outerRadius); });
  it("sunburst selection excludes an ancestor ring when clicking a leaf ring", () => { const boxes = layoutDiagramHierarchy(tree, "sunburst", 300, 300); const a = boxes.find(box => box.node.id === "A")!; const leaf = boxes.find(box => box.node.id === "a1")!; expect(containsPoint(leaf.region, { x: 275, y: 150 })).toBe(true); expect(containsPoint(a.region, { x: 275, y: 150 })).toBe(false); });
  it("packs two equal leaves into tangent contained circles", () => { const input: DiagramData = { nodes: [{ id: "R", label: "Root" }, { id: "A", label: "A", parentId: "R", value: 1 }, { id: "B", label: "B", parentId: "R", value: 1 }], links: [] }; const boxes = layoutDiagramHierarchy(input, "circle-pack", 100, 100); const regions = boxes.map(box => box.region); for (const [index, expected] of [[0, [50, 50, 50]], [1, [25, 50, 25]], [2, [75, 50, 25]]] as const) { const region = regions[index]!; if (region.kind !== "circle") throw new Error("not a circle"); expect(region.x).toBeCloseTo(expected[0], 12); expect(region.y).toBeCloseTo(expected[1], 12); expect(region.radius).toBeCloseTo(expected[2], 12); } });
  it("circle areas, not radii, encode leaf values", () => { const input = { nodes: [{ id: "A", label: "A", value: 1 }, { id: "B", label: "B", value: 4 }], links: [] }; const regions = layoutDiagramHierarchy(input, "circle-pack", 200, 200).map(box => box.region); if (regions[0]!.kind !== "circle" || regions[1]!.kind !== "circle") throw new Error("not circles"); expect(regions[1]!.radius / regions[0]!.radius).toBeCloseTo(2); });
  it("forest roots share a synthetic parent without exposing it as a data node", () => { const input = { nodes: [{ id: "A", label: "A", value: 1 }, { id: "B", label: "B", value: 3 }], links: [] }; const result = layoutDiagramHierarchy(input, "icicle", 100, 100); expect(result).toHaveLength(2); expect(result.map(box => box.depth)).toEqual([0, 0]); expect(result.map(box => box.width)).toEqual([25, 75]); });
  it.each(["treemap", "icicle", "sunburst", "circle-pack"] as const)("%s handles empty and all-zero inputs with finite geometry", type => { expect(layoutDiagramHierarchy({ nodes: [], links: [] }, type, 100, 100)).toEqual([]); const boxes = layoutDiagramHierarchy({ nodes: [{ id: "zero", label: "Zero", value: 0 }], links: [] }, type, 100, 100); expect(boxes.every(box => [box.x, box.y, box.width, box.height].every(Number.isFinite))).toBe(true); });
  it("rejects cycles before constructing a recursive hierarchy", () => { expect(() => layoutDiagramHierarchy({ nodes: [{ id: "A", label: "A", parentId: "B" }, { id: "B", label: "B", parentId: "A" }], links: [] }, "treemap", 100, 100)).toThrow(/cycle/); });
  it("does not derive containment from graph links", () => { expect(layoutDiagramHierarchy(flow, "icicle", 100, 100).every(box => box.depth === 0)).toBe(true); });
  it("does not mutate the input", () => { const before = JSON.stringify(tree); layoutDiagramHierarchy(tree, "circle-pack", 300, 300); expect(JSON.stringify(tree)).toBe(before); });
  it.each(["treemap", "icicle", "sunburst", "circle-pack"] as const)("%s never paints a positive area for a zero total weight", type => { const result = layoutDiagramHierarchy({ nodes: [{ id: "zero", label: "Zero", value: 0 }], links: [] }, type, 600, 400); expect(result[0]!.width * result[0]!.height).toBe(0); expect(containsPoint(result[0]!.region, { x: 300, y: 200 })).toBe(false); });
});

describe("Sankey quantitative flow layout", () => {
  it("matches the diamond fixture with a common pixels-per-unit scale", () => { const result = layoutDiagramSankey(flow, 300, 120, { nodeWidth: 20, nodeGap: 10, iterations: 0 }); expect(result.nodes[0]).toMatchObject({ x: 0, y: 5, width: 20, height: 110, value: 10 }); expect(result.nodes[1]).toMatchObject({ x: 140, y: 0, height: 66 }); expect(result.nodes[2]).toMatchObject({ x: 140, y: 76, height: 44 }); expect(result.links.map(link => link.width)).toEqual([66, 44, 66, 44]); expect(result.links[0]).toMatchObject({ x0: 20, y0: 38, x1: 140, y1: 33 }); });
  it("summing outgoing link widths equals source height", () => { const result = layoutDiagramSankey(flow, 600, 300); const a = result.nodes.find(box => box.node.id === "A")!; expect(result.links.filter(link => link.link.from === "A").reduce((sum, link) => sum + link.width, 0)).toBeCloseTo(a.height); });
  it("doubling all flow values preserves geometry", () => { const before = layoutDiagramSankey(flow, 600, 300); const after = layoutDiagramSankey({ ...flow, links: flow.links.map(link => ({ ...link, value: link.value! * 2 })) }, 600, 300); expect(after.links.map(link => link.width)).toEqual(before.links.map(link => link.width)); });
  it("handles empty, isolated and zero-flow graphs without NaN", () => { for (const input of [{ nodes: [], links: [] }, { nodes: [{ id: "A", label: "A" }], links: [] }, { nodes: [{ id: "A", label: "A", value: 0 }], links: [] }, { ...flow, links: flow.links.map(link => ({ ...link, value: 0 })) }]) { const result = layoutDiagramSankey(input, 200, 100); expect(result.nodes.every(box => [box.x, box.y, box.width, box.height].every(Number.isFinite))).toBe(true); } });
  it("rejects cycles only for flow layouts", () => { const cyclic = { nodes: flow.nodes, links: [...flow.links, { from: "D", to: "A", value: 1 }] }; expect(() => layoutDiagramSankey(cyclic, 300, 100)).toThrow(/acyclic/); expect(() => validateDiagramLayout(cyclic, "state")).not.toThrow(); });
  it("rejects negative flows and numeric overflow", () => { for (const value of [-1, Number.MAX_VALUE]) { const input = { ...flow, links: flow.links.map(link => ({ ...link, value })) }; expect(() => layoutDiagramSankey(input, 300, 100)).toThrow(); } });
  it("does not mutate data with D3 node/link backreferences", () => { const before = JSON.stringify(flow); layoutDiagramSankey(flow, 300, 100); expect(JSON.stringify(flow)).toBe(before); });
});
