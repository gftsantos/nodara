import {
  createCalendar,
  createChart,
  createDiagram,
  createGantt,
  createGeoMap,
  createTopology,
  type BaseOptions,
  type CalendarEvent,
  type CalendarOptions,
  type ChartOptions,
  type ChartSeries,
  type DiagramData,
  type DiagramOptions,
  type GanttOptions,
  type GanttTask,
  type GeoMapData,
  type GeoMapOptions,
  type NodaraController,
  type TopologyData,
  type TopologyOptions,
  type VisualTheme,
} from "@nodara/core";

type ElementKind = "gantt" | "chart" | "topology" | "calendar" | "geo-map" | "diagram";
type ElementData = GanttTask[] | ChartSeries[] | TopologyData | CalendarEvent[] | GeoMapData | DiagramData;
type ElementOptions = Omit<GanttOptions, "data"> | Omit<ChartOptions, "series"> | Omit<TopologyOptions, "data"> | Omit<CalendarOptions, "events"> | Omit<GeoMapOptions, "data"> | Omit<DiagramOptions, "data">;

export interface NodaraElement extends HTMLElement {
  data: ElementData;
  options: ElementOptions;
  readonly controller?: NodaraController<ElementData, BaseOptions>;
}

function createElementClass(kind: ElementKind): CustomElementConstructor {
  return class extends HTMLElement {
    #data: ElementData = kind === "topology"
      ? { nodes: [], edges: [] }
      : kind === "geo-map"
        ? { points: [], routes: [], regions: [] }
        : kind === "diagram"
          ? { nodes: [], links: [] }
          : [];
    #options: ElementOptions = {};
    #controller: NodaraController<ElementData, BaseOptions> | undefined;

    static get observedAttributes() { return ["theme", "aria-label", "options"]; }

    get data(): ElementData { return this.#data; }
    set data(value: ElementData) {
      this.#data = value;
      if (this.#controller) this.#controller.update(value);
      else this.#mount();
    }

    get options(): ElementOptions { return this.#options; }
    set options(value: ElementOptions) {
      const removed = Object.fromEntries(Object.keys(this.#options).map(key => [key, undefined]));
      this.#options = value ?? {};
      this.#controller?.setOptions({ ...removed, ...this.#resolvedOptions() });
    }

    get controller(): NodaraController<ElementData, BaseOptions> | undefined { return this.#controller; }

    connectedCallback() {
      this.style.display ||= "block";
      this.#mount();
    }

    disconnectedCallback() {
      this.#controller?.destroy();
      this.#controller = undefined;
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null) {
      if (name === "options" && value) {
        try {
          this.#options = JSON.parse(value) as ElementOptions;
        } catch (cause) {
          this.dispatchEvent(new CustomEvent("nodara:error", { detail: cause }));
          return;
        }
      }
      this.#controller?.setOptions(this.#resolvedOptions());
    }

    #resolvedOptions(): BaseOptions {
      const theme = (this.getAttribute("theme") ?? (this.#options as BaseOptions).theme ?? "system") as VisualTheme;
      const ariaLabel = this.getAttribute("aria-label") ?? (this.#options as BaseOptions).ariaLabel;
      return { ...(this.#options as BaseOptions), theme, ...(ariaLabel ? { ariaLabel } : {}) };
    }

    #forward(controller: NodaraController<ElementData, BaseOptions>) {
      const events = kind === "gantt"
        ? ["task:select", "task:change"]
        : kind === "chart"
          ? ["point:select"]
          : kind === "topology"
            ? ["node:select", "viewport:change"]
            : kind === "geo-map"
              ? ["point:select", "viewport:change"]
              : kind === "diagram"
                ? ["node:select"]
                : ["event:select", "event:change"];
      events.forEach((event) => controller.on(event, (detail) => this.dispatchEvent(new CustomEvent(`nodara:${event.replace(":", "-")}`, { detail }))));
    }

    #mount() {
      if (!this.isConnected || this.#controller) return;
      const options = this.#resolvedOptions();
      if (kind === "gantt") this.#controller = createGantt(this, { ...(options as Omit<GanttOptions, "data">), data: this.#data as GanttTask[] }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "chart") this.#controller = createChart(this, { ...(options as Omit<ChartOptions, "series">), series: this.#data as ChartSeries[] }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "topology") this.#controller = createTopology(this, { ...(options as Omit<TopologyOptions, "data">), data: this.#data as TopologyData }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "geo-map") this.#controller = createGeoMap(this, { ...(options as Omit<GeoMapOptions, "data">), data: this.#data as GeoMapData }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "diagram") this.#controller = createDiagram(this, { ...(options as Omit<DiagramOptions, "data">), data: this.#data as DiagramData }) as NodaraController<ElementData, BaseOptions>;
      else this.#controller = createCalendar(this, { ...(options as Omit<CalendarOptions, "events">), events: this.#data as CalendarEvent[] }) as NodaraController<ElementData, BaseOptions>;
      this.#forward(this.#controller);
      this.dispatchEvent(new CustomEvent("nodara:ready", { detail: this.#controller }));
    }
  };
}

export function defineNodaraElements(prefix = "nd"): void {
  if (typeof customElements === "undefined") return;
  (["gantt", "chart", "topology", "calendar", "geo-map", "diagram"] as ElementKind[]).forEach((kind) => {
    const name = `${prefix}-${kind}`;
    if (!customElements.get(name)) customElements.define(name, createElementClass(kind));
  });
}

export type {
  CalendarEvent,
  CalendarOptions,
  ChartOptions,
  ChartSeries,
  DiagramData,
  DiagramOptions,
  GanttOptions,
  GanttTask,
  GeoMapData,
  GeoMapOptions,
  NodaraController,
  TopologyData,
  TopologyOptions,
} from "@nodara/core";
