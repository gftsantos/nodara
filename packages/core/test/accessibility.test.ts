import { describe, expect, it } from "vitest";
import { contrastRatio, createCalendar, createChart, createDiagram, createGantt, createGeoMap, createTopology } from "../src/index";

function host(): HTMLDivElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", { value: 800, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: 420, configurable: true });
  document.body.append(element);
  return element;
}

describe("accessibility contract", () => {
  it("[I169] applies custom accessible labels to gantt", () => { const element = host(); createGantt(element, { data: [], ariaLabel: "Plano trimestral" }); expect(element.getAttribute("aria-label")).toBe("Plano trimestral"); });
  it("[I170] applies custom accessible labels to charts", () => { const element = host(); createChart(element, { series: [], ariaLabel: "Receita mensal" }); expect(element.getAttribute("aria-label")).toBe("Receita mensal"); });
  it("[I171] gives chart data a matching caption", () => { const element = host(); createChart(element, { series: [], ariaLabel: "Receita mensal" }); expect(element.querySelector("caption")?.textContent).toBe("Receita mensal"); });
  it("[I172] describes topology status in fallback controls", () => { const element = host(); createTopology(element, { data: { nodes: [{ id: "api", label: "API", status: "critical" }], edges: [] } }); expect(element.querySelector("ul button")?.textContent).toContain("critical"); });
  it("[I173] labels calendar events with title and time", () => { const element = host(); createCalendar(element, { events: [{ id: "e", title: "Review", start: "2026-08-17T10:30:00" }], date: "2026-08-17", locale: "pt-PT" }); expect(element.querySelector(".nd-calendar__event")?.getAttribute("aria-label")).toContain("Review"); });
  it("[I174] removes chart controls from tab order when non-interactive", () => { const element = host(); createChart(element, { series: [{ id: "a", label: "A", data: [{ x: 1, y: 2 }] }], interactive: false }); expect(element.querySelector<HTMLButtonElement>("table button")?.tabIndex).toBe(-1); });
  it("[I175] removes topology controls from tab order when non-interactive", () => { const element = host(); createTopology(element, { data: { nodes: [{ id: "a", label: "A" }], edges: [] }, interactive: false }); expect(element.querySelector<HTMLButtonElement>("ul button")?.tabIndex).toBe(-1); });
  it("[I176] preserves consumer class names", () => { const element = host(); createGantt(element, { data: [], className: "customer-dashboard" }); expect(element.classList.contains("customer-dashboard")).toBe(true); });
  it("[I177] exposes resolved theme state", () => { const element = host(); createGantt(element, { data: [], theme: "dark" }); expect(element.dataset.ndTheme).toBe("dark"); });
  it("[I178] keeps the corrected light-mode accent above AA contrast", () => expect(contrastRatio("#416700", "#f3f2ec")).toBeGreaterThanOrEqual(4.5));
  it("[I179] bounds the accessible chart DOM for large datasets", () => { const element = host(); createChart(element, { series: [{ id: "a", label: "A", data: Array.from({ length: 500 }, (_, x) => ({ x, y: x })) }], performance: { accessibilityLimit: 25 } }); expect(element.querySelectorAll("table button")).toHaveLength(25); expect(element.textContent).toContain("475 additional chart points"); });
  it("[I180] bounds the accessible topology DOM for large datasets", () => { const element = host(); createTopology(element, { data: { nodes: Array.from({ length: 500 }, (_, index) => ({ id: String(index), label: `Node ${index}` })), edges: [] }, performance: { accessibilityLimit: 20 } }); expect(element.querySelectorAll("ul button")).toHaveLength(20); expect(element.textContent).toContain("480 additional nodes"); });
  it("[I181] makes the large Gantt accessibility limit configurable", () => { const element = host(); createGantt(element, { data: Array.from({ length: 500 }, (_, index) => ({ id: String(index), label: `Task ${index}`, start: "2026-01-01", end: "2026-01-02" })), performance: { canvasThreshold: 1, accessibilityLimit: 15 } }); expect(element.querySelectorAll("ul button")).toHaveLength(15); expect(element.textContent).toContain("485 additional tasks"); });
  it("[I220] bounds the accessible geographic DOM", () => { const element = host(); createGeoMap(element, { data: { points: Array.from({ length: 80 }, (_, index) => ({ id: String(index), label: `Point ${index}`, latitude: 0, longitude: index })) }, performance: { accessibilityLimit: 12 } }); expect(element.querySelectorAll("ul button")).toHaveLength(12); expect(element.textContent).toContain("68 additional geographic points"); });
  it("[I221] bounds the accessible diagram DOM", () => { const element = host(); createDiagram(element, { data: { nodes: Array.from({ length: 80 }, (_, index) => ({ id: String(index), label: `Node ${index}` })), links: [] }, performance: { accessibilityLimit: 14 } }); expect(element.querySelectorAll("ul button")).toHaveLength(14); expect(element.textContent).toContain("66 additional diagram nodes"); });
});
