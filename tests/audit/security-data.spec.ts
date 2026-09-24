import { test, expect } from "@playwright/test";
import { mount } from "./browser-fixture";

const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
const fixtures: Array<[string, Record<string, unknown>]> = [
  ["createGantt", { data: [{ id: "a", label: payload, start: "2026-01-01", end: "2026-01-03" }] }],
  ["createChart", { series: [{ id: "a", label: payload, data: [{ x: payload, y: 2 }] }] }],
  ["createCalendar", { date: "2026-01-01", view: "agenda", events: [{ id: "a", title: payload, start: "2026-01-01" }] }],
  ["createTopology", { data: { nodes: [{ id: "a", label: payload }], edges: [] } }],
  ["createGeoMap", { data: { points: [{ id: "a", label: payload, longitude: 0, latitude: 0 }] } }],
  ["createDiagram", { type: "tree", data: { nodes: [{ id: "a", label: payload }], links: [] } }],
];
for (const [engine, options] of fixtures) test(`${engine}: untrusted labels remain text before and after update`, async ({ page }) => {
  await mount(page, engine, options);
  await expect(page.locator("#host script, #host img, #host [onerror]")).toHaveCount(0);
  await expect(page.locator("#host")).toContainText(payload);
  await page.evaluate(() => {
    const controller = Reflect.get(window, "__controller"); controller.update(controller.getData());
  });
  await expect(page.locator("#host script, #host img, #host [onerror]")).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "__xss"))).toBeUndefined();
});
