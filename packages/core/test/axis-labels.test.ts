import { describe, expect, it } from "vitest";
import { layoutAxisLabels } from "../src/axis-labels";

describe("measured chart axis labels", () => {
  const measure = (text: string) => Array.from(text).length * 8;
  it("culls clustered dates rather than using a count-only stride", () => {
    const labels = layoutAxisLabels([52, 58, 230, 235, 278].map(x => ({ x, text: "26/10, 11:00" })), 300, measure);
    expect(labels.length).toBe(2);
    expect(labels[1]!.left - labels[0]!.right).toBeGreaterThanOrEqual(10);
  });
  it("keeps edge labels entirely inside the canvas", () => {
    const labels = layoutAxisLabels([{ x: 0, text: "First" }, { x: 300, text: "Last" }], 300, measure);
    expect(labels[0]!.left).toBe(4); expect(labels[1]!.right).toBe(296);
  });
  it("handles unsorted and repeated positions", () => {
    expect(layoutAxisLabels([{ x: 200, text: "B" }, { x: 50, text: "A" }, { x: 50, text: "A2" }], 300, measure).map(label => label.text)).toEqual(["A", "B"]);
  });
  it("ellipsizes an oversized label without splitting Unicode characters", () => {
    const labels = layoutAxisLabels([{ x: 50, text: "🙂".repeat(100) }], 80, measure);
    expect(labels[0]!.text).toBe(`${"🙂".repeat(8)}…`);
    expect(labels[0]!.right).toBeLessThanOrEqual(76);
  });
  it("does not invent labels for empty or unusable candidates", () => {
    expect(layoutAxisLabels([{ x: NaN, text: "A" }, { x: 10, text: "" }], 300, measure)).toEqual([]);
    expect(layoutAxisLabels([{ x: 10, text: "A" }], 4, measure)).toEqual([]);
  });
});
