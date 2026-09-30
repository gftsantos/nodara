import { expect, test } from "@playwright/test";
import { mount, tasks, type AuditWindow } from "./browser-fixture";

for (const kind of ["chart", "gantt"] as const) test(`${kind} falls back to Canvas2D after actual GPU context loss`, async ({ page }) => {
  await mount(page, kind === "chart" ? "createChart" : "createGantt", kind === "chart" ? { type: "scatter", renderer: "webgl", series: [{ id: "a", label: "A", color: "red", data: [{ x: 1, y: 1 }] }] } : { data: tasks, renderer: "webgl" });
  const mode = await page.locator("#host").getAttribute("data-nd-renderer");
  test.skip(mode !== "webgl", "This browser profile does not expose WebGL; Canvas fallback is covered separately.");
  const loss = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#host canvas")!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    (window as unknown as { oldCanvas: HTMLCanvasElement }).oldCanvas = canvas;
    if (!extension) return false; extension.loseContext(); return true;
  });
  test.skip(!loss, "WEBGL_lose_context is unavailable in this browser profile.");
  await expect(page.locator("#host")).toHaveAttribute("data-nd-renderer", "canvas");
  expect(await page.evaluate(() => { const previous = (window as unknown as { oldCanvas: HTMLCanvasElement }).oldCanvas; return !previous.isConnected && !!document.querySelector<HTMLCanvasElement>("#host canvas")!.getContext("2d"); })).toBe(true);
  await page.evaluate(() => { const w = window as AuditWindow; w.__events = []; (window as unknown as { oldCanvas: HTMLCanvasElement }).oldCanvas.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 100 })); });
  expect(await page.evaluate(() => (window as AuditWindow).__events)).toEqual([]);
  await page.evaluate(() => (window as AuditWindow).__controller.destroy()); await expect(page.locator("#host canvas")).toHaveCount(0);
});

test("WebGL transparency keeps the expected alpha rather than multiplying it twice", async ({ page }) => {
  await mount(page, "createChart", { series: [] });
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 20;
    const render = (window as AuditWindow).__nodara.renderWebGLPoints as unknown as (canvas: HTMLCanvasElement, points: unknown[], width: number, height: number, color: number[], segments: unknown[], rectangles: unknown[]) => boolean;
    const ok = render(canvas, [], 20, 20, [1, 0, 0, 0.5], [], [{ x: 0, y: 0, width: 20, height: 20, color: [1, 0, 0, 0.5] }]);
    if (!ok) return null;
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl"))!; const pixel = new Uint8Array(4); gl.readPixels(10, 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); return [...pixel];
  });
  test.skip(result === null, "WebGL unavailable in this browser profile.");
  expect(result![0]).toBeGreaterThanOrEqual(126); expect(result![0]).toBeLessThanOrEqual(129);
  expect(result![3]).toBeGreaterThanOrEqual(126); expect(result![3]).toBeLessThanOrEqual(129);
});

for (const color of ["red", "hsl(0 100% 50%)"]) test(`WebGL scatter accepts CSS colour ${color}`, async ({ page }) => {
  await mount(page, "createChart", { type: "scatter", renderer: "webgl", showLegend: false, series: [{ id: "a", label: "A", color, data: [{ x: 1, y: 0.5 }] }] });
  test.skip(await page.locator("#host").getAttribute("data-nd-renderer") !== "webgl", "WebGL unavailable in this browser profile.");
  const pixel = await page.evaluate(() => {
    (window as AuditWindow).__controller.resize();
    const canvas = document.querySelector<HTMLCanvasElement>("#host canvas")!; const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl"))!;
    const dpr = canvas.width / parseFloat(canvas.style.width); const width = parseFloat(canvas.style.width); const height = parseFloat(canvas.style.height);
    const x = (52 + (width - 74) / 2) * dpr; const y = (height - (24 + (height - 62) / 2)) * dpr;
    const pixel = new Uint8Array(4); gl.readPixels(Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); return [...pixel];
  });
  expect(pixel[0]).toBeGreaterThan(200); expect(pixel[1]).toBeLessThan(20); expect(pixel[2]).toBeLessThan(20);
});
