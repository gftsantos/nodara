import { describe, expect, it, vi } from "vitest";
import { createCalendar, createGeoMap } from "../src/index";
import { formatDate } from "../src/utils";
import { createCanvas2DContext } from "./setup";

function host() {
  const root = document.createElement("div");
  Object.defineProperty(root, "clientWidth", { value: 900 });
  Object.defineProperty(root, "clientHeight", { value: 500 });
  document.body.append(root); return root;
}
describe("large updates preserve semantics", () => {
  it("reuses equivalent date formatters and separates locale/time zone options", () => {
    const Original = Intl.DateTimeFormat;
    const constructor = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locale, options) { return new Original(locale, options); });
    const stamp = Date.UTC(2026, 8, 24, 1);
    const a = formatDate(stamp, "fr-CA", { day: "2-digit", timeZone: "UTC" });
    expect(formatDate(stamp, "fr-CA", { timeZone: "UTC", day: "2-digit" })).toBe(a);
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(formatDate(stamp, "fr-CA", { timeZone: "America/New_York", day: "2-digit" })).not.toBe(a);
    expect(constructor).toHaveBeenCalledTimes(2);
    expect(() => formatDate(stamp, "en", { timeZone: "Not/AZone" })).toThrow();
  });
  it("bounds the formatter cache while allowing old configurations to be recreated", () => {
    const Original = Intl.DateTimeFormat;
    const constructor = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locale, options) { return new Original(locale, options); });
    const locales = ["ar", "bg", "ca", "cs", "da", "de", "el", "en", "es", "et", "fa", "fi", "fr", "he", "hi", "hr", "hu", "id", "is", "it", "ja", "ko", "lt", "lv", "ms", "nb", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "th", "tr", "uk", "vi", "zh"];
    const options = { month: "narrow", era: "long" } as const;
    for (const locale of locales) formatDate(0, locale, options);
    constructor.mockClear();
    formatDate(0, locales[0], options);
    expect(constructor).toHaveBeenCalledTimes(1);
  });
  it("retains all agenda events, selection and atomic updates with new titles", () => {
    const root = host(), onEventSelect = vi.fn();
    const events = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), title: `Event ${i}`, start: Date.UTC(2026, 8, 24, i % 24) }));
    const controller = createCalendar(root, { events, view: "agenda", date: events[0]!.start, expandRecurrence: false, onEventSelect });
    expect(root.querySelectorAll(".nd-calendar__agenda-event")).toHaveLength(2000);
    controller.update(events.map(event => ({ ...event, title: event.title + " revised" })));
    root.querySelector<HTMLButtonElement>("button")!.click();
    expect(onEventSelect.mock.calls[0]![0].event.title).toContain("revised");
    controller.setOptions({ locale: "pt-PT", timeZone: "Europe/Lisbon" });
    expect(root.querySelectorAll(".nd-calendar__agenda-event")).toHaveLength(2000);
    controller.destroy(); expect(root.childElementCount).toBe(0);
  });
  it("indexes route endpoints, reflects changed positions and keeps semantic selection", () => {
    const context = createCanvas2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const root = host();
    const points = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), label: `Point ${i}`, longitude: i % 180, latitude: 0 }));
    const routes = [{ from: "0", to: "999" }], onPointSelect = vi.fn();
    const controller = createGeoMap(root, { data: { points, routes }, mode: "routes", center: { longitude: 0, latitude: 0 }, projection: "equirectangular", showGraticule: false, onPointSelect });
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(1);
    const endX = context.quadraticCurveTo.mock.calls[0]![2];
    expect(root.dataset.ndAccessibleItems).toBe("300");
    controller.update({ points: points.map(point => ({ ...point, longitude: 1 })), routes });
    expect(context.quadraticCurveTo.mock.calls[1]![2]).not.toBe(endX);
    root.querySelector<HTMLButtonElement>("button")!.click();
    expect(onPointSelect.mock.calls[0]![0].point.longitude).toBe(1);
    controller.destroy(); expect(root.childElementCount).toBe(0);
  });
});
