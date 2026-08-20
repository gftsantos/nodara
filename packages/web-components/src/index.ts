import {
  createCalendar,
  createChart,
  createGantt,
  createTopology,
  type CalendarEvent,
  type ChartSeries,
  type GanttTask,
  type NodaraController,
  type TopologyData,
  type VisualTheme,
} from "@nodara/core";

type ElementKind = "gantt" | "chart" | "topology" | "calendar";
type ElementData = GanttTask[] | ChartSeries[] | TopologyData | CalendarEvent[];

export interface NodaraElement extends HTMLElement {
  data: ElementData;
  readonly controller?: NodaraController<unknown>;
}

function createElementClass(kind: ElementKind): CustomElementConstructor {
  return class extends HTMLElement {
    #data: ElementData = kind === "topology" ? { nodes: [], edges: [] } : [];
    #controller: NodaraController<ElementData> | undefined;

    static get observedAttributes() { return ["theme", "aria-label"]; }

    get data(): ElementData { return this.#data; }
    set data(value: ElementData) {
      this.#data = value;
      this.#render();
    }

    get controller(): NodaraController<ElementData> | undefined { return this.#controller; }

    connectedCallback() {
      this.style.display ||= "block";
      this.#render();
    }

    disconnectedCallback() {
      this.#controller?.destroy();
      this.#controller = undefined;
    }

    attributeChangedCallback() { this.#render(); }

    #render() {
      if (!this.isConnected) return;
      this.#controller?.destroy();
      const theme = (this.getAttribute("theme") ?? "system") as VisualTheme;
      const ariaLabel = this.getAttribute("aria-label") ?? undefined;
      if (kind === "gantt") {
        this.#controller = createGantt(this, { data: this.#data as GanttTask[], theme, ...(ariaLabel ? { ariaLabel } : {}) }) as NodaraController<ElementData>;
      } else if (kind === "chart") {
        this.#controller = createChart(this, { series: this.#data as ChartSeries[], theme, ...(ariaLabel ? { ariaLabel } : {}) }) as NodaraController<ElementData>;
      } else if (kind === "topology") {
        this.#controller = createTopology(this, { data: this.#data as TopologyData, theme, ...(ariaLabel ? { ariaLabel } : {}) }) as NodaraController<ElementData>;
      } else {
        this.#controller = createCalendar(this, { events: this.#data as CalendarEvent[], theme, ...(ariaLabel ? { ariaLabel } : {}) }) as NodaraController<ElementData>;
      }
      this.dispatchEvent(new CustomEvent("nodara:ready", { detail: this.#controller }));
    }
  };
}

export function defineNodaraElements(prefix = "nd"): void {
  if (typeof customElements === "undefined") return;
  (["gantt", "chart", "topology", "calendar"] as ElementKind[]).forEach((kind) => {
    const name = `${prefix}-${kind}`;
    if (!customElements.get(name)) customElements.define(name, createElementClass(kind));
  });
}

export type {
  CalendarEvent,
  ChartSeries,
  GanttTask,
  NodaraController,
  TopologyData,
} from "@nodara/core";
