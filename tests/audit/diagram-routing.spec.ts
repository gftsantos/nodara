import { expect, test } from "@playwright/test";
import { mount } from "./browser-fixture";
test("unroutable diagram warnings remain inside a fixed-size viewport", async ({ page }) => {
  await mount(page, "createDiagram", { type: "flowchart", linkRouting: "orthogonal", data: { nodes: [{ id: "a", label: "Self-linked service" }], links: [{ from: "a", to: "a", directed: true }] } });
  const warning = page.locator("#host .nd-diagram__routing-warning"); await expect(warning).toBeVisible(); await expect(warning).toContainText("self-loop");
  const root = (await page.locator("#host").boundingBox())!, rect = (await warning.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(root.x); expect(rect.y).toBeGreaterThanOrEqual(root.y); expect(rect.x + rect.width).toBeLessThanOrEqual(root.x + root.width); expect(rect.y + rect.height).toBeLessThanOrEqual(root.y + root.height);
  await warning.focus(); await expect(warning).toBeFocused();
});
