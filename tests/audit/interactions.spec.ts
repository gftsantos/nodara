import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { mount, series, tasks, events, topology, widgets, linePoint, type AuditWindow } from "./browser-fixture";
import { visualCatalog } from "@nodara/core";
import { sampleData } from "../../app/catalog/catalog-data";

test.describe("Tooltip and geometry contracts", () => {
  test.beforeEach(async ({ page }) => mount(page, "createChart", { series, theme: "dark" }));
  test("hover reports the right series/value and leaving hides it", async ({ page }) => {
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    const tip = page.locator(".nd-chart__tooltip");
    await expect(tip).toBeVisible(); await expect(tip).toHaveText("Revenue · Feb: 20");
    await page.mouse.move(0, 0); await expect(tip).toBeHidden();
  });
  test("tooltip includes the category, not only series and Y", async ({ page }) => {
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toContainText("Feb");
  });
  test("tooltip exposes its accessible role", async ({ page }) => {
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.getByRole("tooltip")).toBeVisible();
  });
  test("Escape dismisses a hovered tooltip", async ({ page }) => {
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toBeVisible();
    await page.keyboard.press("Escape"); await expect(page.locator(".nd-chart__tooltip")).toBeHidden();
  });
  test("keyboard focus exposes the same tooltip details", async ({ page }) => {
    await page.locator("#host table button").nth(1).focus();
    await expect(page.locator(".nd-chart__tooltip")).toBeVisible();
    await expect(page.locator(".nd-chart__tooltip")).toContainText("20");
  });
  test("tooltip remains within its clipping container at the right edge", async ({ page }) => {
    const point = await linePoint(page, 2); await page.mouse.move(point.x, point.y);
    const tip = page.locator(".nd-chart__tooltip"); await expect(tip).toBeVisible();
    const tooltip = (await tip.boundingBox())!; const host = (await page.locator("#host").boundingBox())!;
    expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(host.x + host.width);
    expect(tooltip.y + tooltip.height).toBeLessThanOrEqual(host.y + host.height);
  });
  test("tooltip anchor accounts for the legend above the canvas", async ({ page }) => {
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    const tip = page.locator(".nd-chart__tooltip"); await expect(tip).toBeVisible();
    const tooltip = (await tip.boundingBox())!;
    expect(Math.abs(tooltip.y - (point.y + 10))).toBeLessThan(3);
  });
  test("showTooltip false and disabled interactions suppress hover", async ({ page }) => {
    await page.evaluate(() => (window as AuditWindow).__controller.setOptions({ showTooltip: false }));
    let point = await linePoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toBeHidden();
    await page.evaluate(() => (window as AuditWindow).__controller.setOptions({ showTooltip: true, interactive: false }));
    point = await linePoint(page); await page.mouse.move(point.x + 1, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toBeHidden();
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => (window as AuditWindow).__events.length)).toBe(0);
  });
  test("formatter and updated values are reflected without stale tooltip", async ({ page }) => {
    await page.evaluate(() => {
      const w = window as AuditWindow; w.__controller.setOptions({ valueFormatter: (n: number) => `€${n.toFixed(2)}` });
    });
    const point = await linePoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toHaveText("Revenue · Feb: €20.00");
    await page.evaluate(() => {
      const w = window as AuditWindow; const data = w.__controller.getData() as Array<{ label: string }>; data[0]!.label = "Updated"; w.__controller.update(data);
    });
    await expect(page.locator(".nd-chart__tooltip")).toBeHidden();
    await page.mouse.move(point.x + 1, point.y);
    await expect(page.locator(".nd-chart__tooltip")).toHaveText("Updated · Feb: €20.00");
  });
  test("clicking the empty donut hole does not select a slice", async ({ page }) => {
    await page.evaluate(() => (window as AuditWindow).__controller.setOptions({ type: "donut" }));
    const rect = (await page.locator("#host canvas").boundingBox())!;
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    expect(await page.evaluate(() => (window as AuditWindow).__events)).toEqual([]);
  });
  test("a tall bar is selectable through its visible body", async ({ page }) => {
    await page.evaluate(() => {
      const w = window as AuditWindow;
      w.__controller.setOptions({ type: "bar" });
      w.__controller.update([{ id: "a", label: "Bars", data: Array.from({ length: 12 }, (_, i) => ({ x: `C${i}`, y: 100 })) }]);
    });
    const rect = (await page.locator("#host canvas").boundingBox())!;
    await page.mouse.click(rect.x + 52 + (rect.width - 74) / 24, rect.y + (rect.height - 62) / 2 + 24);
    expect(await page.evaluate(() => (window as AuditWindow).__events[0]?.point?.x)).toBe("C0");
  });
});

test("every chart type exposes hoverable data in the browser", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await mount(page, "createChart", { series });
  const representatives = [...new Map(visualCatalog.filter(item => item.family === "charts").map(item => [item.options.type, item])).values()];
  const results: Array<{ id: string; type: unknown; tooltip: string }> = [];
  for (const item of representatives) {
    const tooltip = await page.evaluate(({ options, data }) => {
      const w = window as AuditWindow; w.__controller.destroy();
      w.__controller = w.__nodara.createChart(document.getElementById("host")!, { ...options, series: data, showTooltip: true, interactive: true });
      const canvas = document.querySelector<HTMLCanvasElement>("#host canvas")!; const rect = canvas.getBoundingClientRect();
      const tooltip = document.querySelector<HTMLElement>(".nd-chart__tooltip")!;
      for (let y = 6; y < rect.height; y += 12) {
        for (let x = 6; x < rect.width; x += 12) {
          canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: rect.x + x, clientY: rect.y + y }));
          if (!tooltip.hidden) return tooltip.textContent ?? "";
        }
      }
      return "";
    }, { options: item.options, data: sampleData(item) });
    results.push({ id: item.id, type: item.options.type, tooltip });
  }
  await testInfo.attach("chart-type-tooltip-coverage.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  expect(results.filter(result => !result.tooltip)).toEqual([]);
});

test("touch tap selects the intended line-chart point", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "audit-mobile", "Native touch emulation is exercised on the mobile profile.");
  await mount(page, "createChart", { series }); const point = await linePoint(page);
  await page.touchscreen.tap(point.x, point.y);
  expect(await page.evaluate(() => (window as AuditWindow).__events[0]?.point?.x)).toBe("Feb");
});

test.describe("Keyboard, pointer cancellation and lifecycle", () => {
  test("Gantt retains focus after keyboard editing", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks });
    const first = page.locator('.nd-gantt__bar[data-task-id="a"]'); await first.focus();
    await page.keyboard.press("ArrowRight"); await expect(first).toBeFocused();
    await page.keyboard.press("ArrowRight");
    expect(await page.evaluate(() => (window as AuditWindow).__events.filter(e => e.change === "move").length)).toBe(2);
  });
  test("Gantt emits one selection for Enter", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks });
    await page.locator(".nd-gantt__bar").first().focus(); await page.keyboard.press("Enter");
    expect(await page.evaluate(() => (window as AuditWindow).__events.length)).toBe(1);
  });
  test("Gantt keyboard resize changes end and preserves start", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks });
    const start = await page.evaluate(() => new Date(((window as AuditWindow).__controller.getData() as Array<{ start: string | number }>)[0]!.start).getTime());
    await page.locator(".nd-gantt__bar").first().focus(); await page.keyboard.press("Shift+ArrowRight");
    expect(await page.evaluate(() => (window as AuditWindow).__events[0]?.change)).toBe("resize-end");
    expect(await page.evaluate(() => new Date(((window as AuditWindow).__controller.getData() as Array<{ start: string | number }>)[0]!.start).getTime())).toBe(start);
  });
  test("Calendar retains focus after keyboard editing", async ({ page }) => {
    await mount(page, "createCalendar", { events, date: "2026-01-02", view: "week" });
    const event = page.locator(".nd-calendar__event").first(); await event.focus();
    await page.keyboard.press("ArrowRight"); await expect(event).toBeFocused();
  });
  test("Gantt density mode disables keyboard tab stops", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks, renderer: "canvas", interactive: { keyboard: false } });
    await expect(page.locator("#host ul button").first()).toHaveAttribute("tabindex", "-1");
  });
  test("Gantt density mode ignores blank canvas space and disabled tasks", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks.map(task => ({ ...task, disabled: true })), renderer: "canvas" });
    const rect = (await page.locator("#host canvas").boundingBox())!;
    await page.mouse.click(rect.x + 10, rect.y + rect.height - 10);
    expect(await page.evaluate(() => (window as AuditWindow).__events)).toEqual([]);
  });
  test("Gantt pointercancel cancels the drag", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks, start: "2026-01-01", end: "2026-01-15" });
    const result = await page.evaluate(() => {
      const w = window as AuditWindow; const before = JSON.stringify(w.__controller.getData());
      const bar = document.querySelector(".nd-gantt__bar")!;
      bar.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, button: 0, pointerId: 1, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: 300, pointerId: 1, bubbles: true }));
      return { before, after: JSON.stringify(w.__controller.getData()), count: w.__events.length };
    });
    expect(result.after).toBe(result.before); expect(result.count).toBe(0);
  });
  test("Gantt ignores pointerup from a different pointer", async ({ page }) => {
    await mount(page, "createGantt", { data: tasks, start: "2026-01-01", end: "2026-01-15" });
    const result = await page.evaluate(() => {
      const w = window as AuditWindow; const before = JSON.stringify(w.__controller.getData());
      document.querySelector(".nd-gantt__bar")!.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, button: 0, pointerId: 1, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: 300, pointerId: 2, bubbles: true }));
      return { before, after: JSON.stringify(w.__controller.getData()) };
    });
    expect(result.after).toBe(result.before);
  });
  test("topology data updates preserve a user-controlled viewport", async ({ page }) => {
    await mount(page, "createTopology", { data: topology, layout: "manual" });
    const canvas = (await page.locator("#host canvas").boundingBox())!;
    await page.mouse.move(canvas.x + 10, canvas.y + 10); await page.mouse.down();
    await page.mouse.move(canvas.x + 60, canvas.y + 50); await page.mouse.up();
    const before = await page.evaluate(() => (window as AuditWindow).__events.at(-1));
    // Fractional device-pixel scaling can introduce <0.00005 CSS-pixel error.
    expect(before?.x).toBeCloseTo(50, 4);
    await page.evaluate(() => { const w = window as AuditWindow; w.__controller.update(w.__controller.getData()); });
    await page.mouse.move(canvas.x + 10, canvas.y + 10); await page.mouse.down();
    await page.mouse.move(canvas.x + 20, canvas.y + 20); await page.mouse.up();
    const after = await page.evaluate(() => (window as AuditWindow).__events.at(-1));
    expect(after?.x).toBeCloseTo(before!.x! + 10, 4); expect(after?.y).toBeCloseTo(before!.y! + 10, 4);
  });
  test("system theme follows OS changes without a data update", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" }); await mount(page, "createChart", { series, theme: "system" });
    await expect(page.locator("#host")).toHaveAttribute("data-nd-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("#host")).toHaveAttribute("data-nd-theme", "light");
  });
  test("topology WebGL preserves visible edges", async ({ page }) => {
    await mount(page, "createTopology", { data: topology, layout: "manual", renderer: "canvas" });
    const canvasControl = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#host canvas")!;
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      const pixels = canvas.getContext("2d")!.getImageData(Math.round(199 * ratio), Math.round(189 * ratio), Math.ceil(3 * ratio), Math.ceil(3 * ratio)).data;
      return Math.max(...pixels.filter((_, index) => index % 4 === 3));
    });
    expect(canvasControl, "The Canvas positive control must paint the sampled edge location").toBeGreaterThan(0);
    const result = await page.evaluate(() => {
      const w = window as AuditWindow; w.__controller.setOptions({ renderer: "webgl", theme: "dark", performance: { maxDevicePixelRatio: 1 } });
      const host = document.getElementById("host")!; const canvas = host.querySelector("canvas")!;
      if (host.dataset.ndRenderer !== "webgl") return { supported: false, alpha: 0 };
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return { supported: false, alpha: 0 };
      const pixels = new Uint8Array(3 * 3 * 4);
      gl.readPixels(199, canvas.height - 191, 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { supported: true, alpha: Math.max(...pixels.filter((_, i) => i % 4 === 3)) };
    });
    test.skip(!result.supported, "WebGL context unavailable: this does not certify WebGL behavior.");
    expect(result.alpha).toBeGreaterThan(0);
  });
});

test.describe("Each engine: semantics, scale and cleanup", () => {
  for (const [name, engine, options] of widgets) {
    test(`${name}: focused data has a visible focus target`, async ({ page }) => {
      await mount(page, engine, options);
      const target = page.locator("#host button").first(); await target.focus(); await expect(target).toBeFocused();
      const clipped = await target.evaluate(element => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.clip !== "auto" || style.clipPath !== "none") return true;
        }
        return false;
      });
      expect(clipped).toBe(false);
    });
    test(`${name}: can resize and destroy without late callbacks`, async ({ page }) => {
      await mount(page, engine, options);
      const result = await page.evaluate(() => {
        const w = window as AuditWindow; const button = document.querySelector<HTMLButtonElement>("#host button");
        w.__controller.resize(); w.__controller.destroy(); button?.click();
        return { count: w.__events.length, children: document.getElementById("host")!.children.length };
      });
      expect(result.children).toBe(0); expect(result.count).toBe(0);
    });
    test(`${name}: WCAG A/AA automated scan in light theme`, async ({ page }, testInfo) => {
      await mount(page, engine, { ...options, theme: "light" });
      await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
      const result = await page.evaluate(async () => (window as AuditWindow).axe.run("#host", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
      await testInfo.attach("axe.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
      expect(result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    });
  }
});
