import { expect, test } from "@playwright/test";
import { mount, type AuditWindow } from "./browser-fixture";

test("retained GPU updates move pixels, clear old geometry, change colour and resize", async ({ page }) => {
  await mount(page, "createChart", { type: "scatter", renderer: "webgl", showLegend: false, performance: { maxDevicePixelRatio: 1 }, series: [{ id: "anchors", label: "Anchors", color: "#00000000", data: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }, { id: "moving", label: "Moving", color: "red", data: [{ x: 50, y: 20 }] }] });
  test.skip(await page.locator("#host").getAttribute("data-nd-renderer") !== "webgl", "This browser profile does not expose WebGL; no GPU pixel validation is claimed.");
  const result = await page.evaluate(() => {
    const w = window as AuditWindow, host = document.getElementById("host")!, canvas = host.querySelector("canvas")!;
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl"))!;
    const data = (y: number, color = "red") => [{ id: "anchors", label: "Anchors", color: "#00000000", data: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }, { id: "moving", label: "Moving", color, data: [{ x: 50, y }] }];
    const pixel = (y: number) => { const value = new Uint8Array(4); gl.readPixels(Math.floor(52 + (canvas.width - 74) / 2), Math.floor(38 + (canvas.height - 62) * y / 100), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, value); return [...value]; };
    const frames = []; let previous = 20;
    for (let i = 0; i < 10; i++) { const next = 25 + 5 * i; w.__controller.update(data(next)); frames.push({ next: pixel(next), old: pixel(previous), retained: host.querySelector("canvas") === canvas }); previous = next; }
    host.style.width = "700px"; w.__controller.setOptions({ tokens: { primary: "#0000ff" } }); w.__controller.update(data(80, "blue")); w.__controller.resize(); const blue = pixel(80);
    const same = host.querySelector("canvas") === canvas; w.__events = []; canvas.dispatchEvent(new MouseEvent("click", { clientX: canvas.getBoundingClientRect().left + 52 + (canvas.width - 74) / 2, clientY: canvas.getBoundingClientRect().top + 24 + (canvas.height - 62) * 0.2, bubbles: true })); const selections = w.__events.length;
    w.__controller.update(data(80, "#00000000")); const transparent = pixel(80);
    w.__controller.destroy(); w.__controller.destroy(); canvas.dispatchEvent(new MouseEvent("click"));
    return { frames, blue, same, transparent, selections, afterDestroySelections: w.__events.length, children: host.childElementCount };
  });
  for (const frame of result.frames) { expect(frame.retained).toBe(true); expect(frame.next[0]).toBeGreaterThan(240); expect(frame.next[3]).toBeGreaterThan(240); expect(frame.old[3]).toBe(0); }
  expect(result.blue[2]).toBeGreaterThan(240); expect(result.blue[0]).toBeLessThan(10); expect(result.same).toBe(true); expect(result.transparent[3]).toBe(0); expect(result.selections).toBe(1); expect(result.afterDestroySelections).toBe(1); expect(result.children).toBe(0);
});
