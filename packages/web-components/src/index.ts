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
  NodaraError,
} from "@nodara/core";

type ElementKind = "gantt" | "chart" | "topology" | "calendar" | "geo-map" | "diagram";
type ElementData = GanttTask[] | ChartSeries[] | TopologyData | CalendarEvent[] | GeoMapData | DiagramData;
type ElementOptions = Omit<GanttOptions, "data"> | Omit<ChartOptions, "series"> | Omit<TopologyOptions, "data"> | Omit<CalendarOptions, "events"> | Omit<GeoMapOptions, "data"> | Omit<DiagramOptions, "data">;
const labels: Record<ElementKind, string> = { gantt: "Gantt chart", chart: "Data chart", topology: "Network topology", calendar: "Calendar", "geo-map": "Geographic map", diagram: "Data diagram" };

export interface NodaraElement extends HTMLElement {
  data: ElementData;
  options: ElementOptions;
  setState(data: ElementData, options: ElementOptions): void;
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
    #applying = false;
    #ariaAttribute: string | null = null;

    static get observedAttributes() { return ["theme", "aria-label", "options"]; }

    get data(): ElementData { return this.#controller?.getData() ?? this.#data; }
    set data(value: ElementData) {
      const controller = this.#controller;
      if (controller) { controller.update(value); this.#data = controller.getData(); }
      else { this.#data = value; this.#mount(); }
    }

    get options(): ElementOptions { return this.#options; }
    set options(value: ElementOptions) {
      if (value !== undefined && value !== null && (typeof value !== "object" || Array.isArray(value))) throw new NodaraError("ND_INVALID_OPTIONS", "Options must be an object.");
      const removed = Object.fromEntries(Object.keys(this.#options).map(key => [key, undefined]));
      const previous = this.#options;
      const candidate = value ?? {};
      const controller = this.#controller; const before = controller?.getOptions();
      this.#options = candidate;
      try { this.#applyOptions(removed); } catch (cause) { if (this.#options === candidate && controller?.getOptions() === before) this.#options = previous; throw cause; }
    }

    get controller(): NodaraController<ElementData, BaseOptions> | undefined { return this.#controller; }

    setState(data: ElementData, options: ElementOptions) {
      if (!options || typeof options !== "object" || Array.isArray(options)) throw new NodaraError("ND_INVALID_OPTIONS", "Options must be an object.");
      const previous = this.#options; const previousData = this.#data;
      const controller = this.#controller; const before = controller?.getOptions();
      const removed = Object.fromEntries(Object.keys(previous).map(key => [key, undefined]));
      this.#options = options; this.#data = data;
      this.#applying = true;
      try {
        if (controller) { controller.setState(data, { ...removed, ...this.#resolvedOptions() }); this.#data = controller.getData(); }
        else this.#mount();
      } catch (cause) {
        if (controller && controller.getOptions() !== before) this.#data = controller.getData();
        else { if (this.#options === options) this.#options = previous; if (this.#data === data) this.#data = previousData; }
        throw cause;
      }
      finally { this.#applying = false; }
    }

    connectedCallback() {
      this.style.display ||= "block";
      this.#mount();
    }

    disconnectedCallback() {
      const controller = this.#controller;
      if (controller) this.#data = controller.getData();
      this.#controller = undefined;
      this.#applying = true;
      try { controller?.destroy(); } finally { this.#applying = false; }
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null) {
      if (this.#applying || (_oldValue === value && name !== "aria-label")) return;
      if (name === "options") {
        let parsed: unknown;
        try {
          parsed = value === null ? {} : JSON.parse(value);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new NodaraError("ND_INVALID_OPTIONS", "Options JSON must be an object.");
        } catch (cause) {
          this.dispatchEvent(new CustomEvent("nodara:error", { detail: cause }));
          return;
        }
        try { this.options = parsed as ElementOptions; } catch { /* The controller error channel already forwarded this error. */ }
        return;
      }
      if (name === "aria-label") {
        const reflected = this.#controller?.getOptions().ariaLabel ?? labels[kind];
        if (this.#controller && _oldValue !== value && value === reflected) return;
        this.#ariaAttribute = value;
      }
      this.#applyOptions();
    }

    #applyOptions(removed: Record<string, undefined> = {}) {
      this.#applying = true;
      try { this.#controller?.setOptions({ ...removed, ...this.#resolvedOptions() }); }
      finally { this.#applying = false; }
    }

    #resolvedOptions(): BaseOptions {
      const theme = (this.getAttribute("theme") ?? (this.#options as BaseOptions).theme ?? "system") as VisualTheme;
      const ariaLabel = this.#ariaAttribute ?? (this.#options as BaseOptions).ariaLabel;
      return { ...(this.#options as BaseOptions), theme, ariaLabel: ariaLabel ?? labels[kind] };
    }

    #forward(controller: NodaraController<ElementData, BaseOptions>) {
      controller.on<ElementData>("data:change", data => { this.#data = data; });
      controller.on<Error>("error", detail => this.dispatchEvent(new CustomEvent("nodara:error", { detail })));
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
      this.#applying = true;
      try {
      if (kind === "gantt") this.#controller = createGantt(this, { ...(options as Omit<GanttOptions, "data">), data: this.#data as GanttTask[] }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "chart") this.#controller = createChart(this, { ...(options as Omit<ChartOptions, "series">), series: this.#data as ChartSeries[] }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "topology") this.#controller = createTopology(this, { ...(options as Omit<TopologyOptions, "data">), data: this.#data as TopologyData }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "geo-map") this.#controller = createGeoMap(this, { ...(options as Omit<GeoMapOptions, "data">), data: this.#data as GeoMapData }) as NodaraController<ElementData, BaseOptions>;
      else if (kind === "diagram") this.#controller = createDiagram(this, { ...(options as Omit<DiagramOptions, "data">), data: this.#data as DiagramData }) as NodaraController<ElementData, BaseOptions>;
      else this.#controller = createCalendar(this, { ...(options as Omit<CalendarOptions, "events">), events: this.#data as CalendarEvent[] }) as NodaraController<ElementData, BaseOptions>;
      } catch (cause) { this.dispatchEvent(new CustomEvent("nodara:error", { detail: cause })); throw cause; }
      finally { this.#applying = false; }
      if (!this.isConnected) {
        const disconnected = this.#controller; this.#controller = undefined;
        this.#applying = true; try { disconnected?.destroy(); } finally { this.#applying = false; }
        return;
      }
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
