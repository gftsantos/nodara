import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { widgets } from "../audit/browser-fixture";
const consumerDirectory = process.env.NODARA_CONSUMER_VARIANT === "minimum" ? "work/runtime-audit-minimum" : "work/runtime-audit";
const consumerRequire = createRequire(resolve(consumerDirectory, "package.json"));
const consumerStyles = consumerRequire.resolve("@nodara/core/styles.css");
type AdapterWindow = typeof window & { __adapter: { events: unknown[]; mount(kind: string, data: unknown, options: Record<string, unknown>): Promise<void>; update(data: unknown): Promise<void>; setOptions(options: Record<string, unknown>): Promise<void>; setState(data: unknown, options: Record<string, unknown>): Promise<void>; destroy(): Promise<void> } }

test("working-time tarball resolves Temporal and shared errors inside a browser", async ({ page }) => {
  await page.setContent('<!doctype html><html lang="en"><head><title>Working time consumer</title></head><body><main>Working time</main></body></html>');
  await page.addScriptTag({ type: "module", path: resolve(consumerDirectory, "working-time.js") });
  type WorkingWindow = typeof window & { __workingTime: typeof import("@nodara/core/working-time") & Pick<typeof import("@nodara/core"), "NodaraError"> };
  await page.waitForFunction(() => Boolean((window as WorkingWindow).__workingTime));
  const result = await page.evaluate(() => {
    const { createWorkingClock, NodaraError } = (window as WorkingWindow).__workingTime;
    const clock = createWorkingClock({ id: "dst", timeZone: "Europe/Lisbon", week: [{ day: 7, periods: [{ start: "00:00", end: "04:00" }] }] }, { startDate: "2026-03-29", endDate: "2026-03-30" });
    let sharedError = false; try { clock.fromLocal("2026-03-29T01:30"); } catch (error) { sharedError = error instanceof NodaraError && error.code === "ND_WORKING_CALENDAR"; }
    return { duration: clock.between(clock.horizon.startMs, clock.horizon.endMs), sharedError };
  });
  expect(result).toEqual({ duration: 10_800_000, sharedError: true });
});

for (const framework of ["react", "vue", "angular", "web-components"]) {
  test(`${framework}: switches chart data and its schema-dependent type atomically`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Atomic consumer</title></head><body><div id="host" style="width:900px;height:420px"></div></body></html>');
    await page.addStyleTag({ path: consumerStyles });
    await page.addScriptTag({ type: "module", path: resolve(consumerDirectory, `${framework}.js`) });
    await page.waitForFunction(() => Boolean((window as AdapterWindow).__adapter));
    await page.evaluate(() => (window as AdapterWindow).__adapter.mount("chart", [{ id: "s", label: "Line", data: [{ x: "Jan", y: 1 }, { x: "Feb", y: 2 }] }], { type: "line" }));
    await page.evaluate(() => (window as AdapterWindow).__adapter.setState([{ id: "row0", label: "y = 0", gridY: 0, data: [{ x: 0, y: 0 }, { x: 1, y: 2 }] }, { id: "row1", label: "y = 1", gridY: 1, data: [{ x: 0, y: 2 }, { x: 1, y: 0 }] }], { type: "contour" }));
    await expect(page.locator(".nd-chart")).toHaveAttribute("data-nd-type", "contour");
    expect(Number(await page.locator(".nd-chart").getAttribute("data-nd-contours"))).toBeGreaterThan(0);
    await page.evaluate(() => (window as AdapterWindow).__adapter.destroy()); expect(errors).toEqual([]);
  });
  for (const [kind, , config] of widgets) {
    test(`${framework}/${kind}: real runtime mount, data, options, selection and unmount`, async ({ page }) => {
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.setContent('<!doctype html><html lang="en"><head><title>Consumer audit</title></head><body><div id="host" style="width:900px;height:420px"></div></body></html>');
      await page.addStyleTag({ path: consumerStyles });
      await page.addScriptTag({ type: "module", path: resolve(consumerDirectory, `${framework}.js`) });
      await page.waitForFunction(() => Boolean((window as AdapterWindow).__adapter), null, { timeout: 20_000 });
      const dataKey = kind === "chart" ? "series" : kind === "calendar" ? "events" : "data";
      const data = structuredClone(config[dataKey]); const options: Record<string, unknown> = { ...config, theme: "dark" }; delete options[dataKey];
      await page.evaluate(({ kind, data, options }) => (window as AdapterWindow).__adapter.mount(kind, data, options), { kind, data, options });
      await expect(page.locator(".nd-root")).toHaveCount(1); await expect(page.locator(".nd-root")).toHaveAttribute("data-nd-theme", "dark");
      await page.evaluate(options => (window as AdapterWindow).__adapter.setOptions({ ...options, theme: "light" }), options);
      await expect(page.locator(".nd-root")).toHaveAttribute("data-nd-theme", "light");
      const changed = structuredClone(data) as Record<string, unknown> & Array<Record<string, unknown>>;
      if (kind === "chart" || kind === "gantt") changed[0]!.label = "Updated customer data";
      else if (kind === "calendar") changed[0]!.title = "Updated customer data";
      else ((kind === "map" ? changed.points : changed.nodes) as Array<Record<string, unknown>>)[0]!.label = "Updated customer data";
      await page.evaluate(data => (window as AdapterWindow).__adapter.update(data), changed);
      await expect(page.locator(".nd-root")).toContainText("Updated customer data");
      await page.locator(".nd-root button").first().focus(); await page.keyboard.press("Enter");
      expect(await page.evaluate(() => (window as AdapterWindow).__adapter.events.length)).toBe(1);
      await page.evaluate(() => (window as AdapterWindow).__adapter.destroy()); await expect(page.locator(".nd-root")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
