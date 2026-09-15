import { describe, expect, it } from "vitest";
import { routeDiagramLinks, diagramPortPoint, type DiagramRouteBox } from "../src/diagram-routing";
import { createDiagram } from "../src/diagram";
import { normalizeDiagram } from "../src/validation";
const box = (id: string, x: number, y: number, width = 20, height = 20): DiagramRouteBox => ({ node: { id, label: id }, x, y, width, height });
const bounds = { width: 200, height: 100 }, ends = [box("a", 10, 40), box("b", 150, 40)], links = [{ from: "a", to: "b", directed: true }];
describe("bounded orthogonal diagram routing", () => {
  it("routes a direct line between node boundaries", () => {
    expect(routeDiagramLinks(ends, links, bounds, 5)[0]).toMatchObject({ status: "routed", points: [{ x: 30, y: 50 }, { x: 150, y: 50 }], length: 120, bends: 0 });
  });
  it("chooses the shorter detour around an inflated obstacle", () => {
    const route = routeDiagramLinks([...ends, box("block", 70, 30, 20, 50)], links, bounds, 5)[0]!;
    expect(route.status).toBe("routed"); if (route.status !== "routed") return;
    expect(route.length).toBe(170); expect(Math.min(...route.points.map(p => p.y))).toBe(25);
    expect(route.points.every((p, i) => !i || p.x === route.points[i - 1]!.x || p.y === route.points[i - 1]!.y)).toBe(true);
    expect(routeDiagramLinks([...ends, box("block", 70, 30, 20, 50)], links, bounds, 5)[0]).toEqual(route);
  });
  it("does not silently cross a full wall", () => { expect(routeDiagramLinks([...ends, box("wall", 70, 0, 20, 100)], links, bounds, 5)[0]).toMatchObject({ status: "unroutable", reason: "no-path" }); });
  it("reports adjacent zero-length terminals rather than an invisible success", () => { expect(routeDiagramLinks([box("a", 10, 40), box("b", 30, 40)], links, bounds, 0)[0]).toMatchObject({ status: "unroutable", reason: "degenerate" }); });
  it("rejects blocked terminal stubs", () => { expect(routeDiagramLinks([...ends, box("overlap", 29, 40, 5, 20)], links, bounds, 5)[0]).toMatchObject({ status: "unroutable", reason: "blocked-terminal" }); });
  it("reports outside bounds and unsupported self-loops", () => {
    expect(routeDiagramLinks([box("a", -30, 40), ends[1]!], links, bounds, 5)[0]).toMatchObject({ reason: "outside-bounds" });
    expect(routeDiagramLinks(ends, [{ from: "a", to: "a" }], bounds)[0]).toMatchObject({ reason: "self-loop" });
  });
  it.each([{ maxVertices: 1 }, { maxChecks: 1 }, { maxVisits: 1 }])("reports a bounded search limit %j", budget => { expect(routeDiagramLinks(ends, links, bounds, 5, budget)[0]).toMatchObject({ status: "limited", reason: "budget-exceeded" }); });
  it.each([0, 0.5, 1])("resolves named port offset %s exactly", offset => {
    expect(diagramPortPoint(ends[0]!, { id: "p", side: "right", offset })).toEqual({ x: 30, y: 40 + 20 * offset });
    expect(diagramPortPoint(ends[0]!, { id: "p", side: "top", offset })).toEqual({ x: 10 + 20 * offset, y: 40 });
  });
  it("resolves explicit ports and updates anchors after resize", () => {
    const input = ends.map((b, i) => ({ ...b, node: { ...b.node, ports: [{ id: "p", side: i ? "left" as const : "right" as const, offset: 0.25 }] } }));
    const edge = [{ ...links[0]!, fromPort: "p", toPort: "p" }];
    const before = routeDiagramLinks(input, edge, bounds, 5)[0]!, after = routeDiagramLinks(input.map(b => ({ ...b, height: 40 })), edge, bounds, 5)[0]!;
    expect(before).toMatchObject({ status: "routed", points: [{ x: 30, y: 45 }, { x: 150, y: 45 }] }); expect(after).toMatchObject({ points: [{ x: 30, y: 50 }, { x: 150, y: 50 }] });
  });
  it("isolates ports and rejects malformed / dangling ports", () => {
    const input = { nodes: [{ id: "a", label: "A", ports: [{ id: "out", side: "right" as const }] }, { id: "b", label: "B" }], links: [{ from: "a", to: "b", fromPort: "out" }] };
    const normalized = normalizeDiagram(input); input.nodes[0]!.ports![0]!.id = "changed"; expect(normalized.nodes[0]!.ports![0]!.id).toBe("out");
    expect(() => normalizeDiagram(input)).toThrow(/port/i);
    expect(() => normalizeDiagram({ nodes: [{ id: "a", label: "A", ports: [{ id: "p", side: "right", offset: 2 }] }], links: [] })).toThrow(/port/i);
  });
  it("renders semantic connections and rejects unsupported options atomically", () => {
    const root = document.createElement("div"); document.body.append(root);
    const view = createDiagram(root, { data: { nodes: ends.map(b => b.node), links }, type: "flowchart", linkRouting: "orthogonal" });
    expect(root.dataset.ndRoutedLinks).toBe("1"); expect(root.querySelector(".nd-diagram__connections")?.textContent).toContain("a directed to b");
    const old = root.innerHTML; expect(() => view.setOptions({ type: "sankey" })).toThrow(/routing/i); expect(root.innerHTML).toBe(old);
    view.update({ nodes: ends.map(b => b.node), links: [{ from: "a", to: "a" }] }); expect(root.querySelector('[role="status"]')?.textContent).toContain("self-loop");
    view.destroy(); root.remove();
  });
  it("validates routing dimensions and budgets before allocating", () => { expect(() => routeDiagramLinks(ends, links, { width: NaN, height: 100 })).toThrow(); expect(() => routeDiagramLinks(ends, links, bounds, 5, { maxVisits: 0 })).toThrow(); });
});
