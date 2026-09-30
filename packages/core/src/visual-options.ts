import type { BaseOptions, CalendarEvent, CalendarOptions, ChartOptions, ChartSeries, DiagramOptions, GanttOptions, GanttTask, GeoMapOptions, TopologyOptions } from "./types";
import { calendarRange } from "./calendar-model";
import { resolveGanttRange, buildTimeScale } from "./time-scale";
import { NodaraError, toTimestamp } from "./utils";
import { prepareContours, prepareViolinDensity, seriesScalarGrid } from "./statistics";
import { buildChartData, chartDomain, chartNumericX } from "./chart-model";

type Options = Record<string, unknown>;
const fail = (field: string): never => { throw new NodaraError("ND_INVALID_OPTIONS", `Invalid option: ${field}.`); };
const object = (value: unknown): value is Options => !!value && typeof value === "object" && !Array.isArray(value);
const enumeration = (options: Options, field: string, choices: readonly unknown[]) => { if (options[field] !== undefined && !choices.includes(options[field])) fail(field); };
const number = (options: Options, field: string, minimum: number, maximum = Number.MAX_VALUE, integer = false) => { const value = options[field]; if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum || integer && !Number.isInteger(value))) fail(field); };
function common(input: BaseOptions, callbacks: string[] = [], booleans: string[] = []): Options {
  const options = input as Options;
  for (const field of callbacks) if (options[field] !== undefined && typeof options[field] !== "function") fail(field);
  for (const field of booleans) if (options[field] !== undefined && typeof options[field] !== "boolean") fail(field);
  return options;
}
function zoom(input: Options) {
  for (const key of ["minZoom", "maxZoom", "initialZoom"]) number(input, key, 0.01, 10_000);
  if (input.minZoom !== undefined && input.maxZoom !== undefined && Number(input.minZoom) > Number(input.maxZoom)) fail("minZoom/maxZoom");
}

export function validateGanttOptions(data: GanttTask[], input: GanttOptions): void {
  const options = common(input, ["onTaskSelect", "onTaskChange"], ["editable"]);
  enumeration(options, "zoom", ["day", "week", "month", "quarter"]);
  enumeration(options, "dependencyRouting", ["straight", "orthogonal"]);
  number(options, "rowHeight", 1, 10_000);
  if (typeof input.snap === "number") number(options, "snap", 1, Number.MAX_SAFE_INTEGER); else enumeration(options, "snap", ["none", "day", "week"]);
  if (input.start !== undefined && input.end !== undefined && toTimestamp(input.end) <= toTimestamp(input.start)) fail("start/end");
  const range = resolveGanttRange(data, input.start, input.end);
  const scale = buildTimeScale(range.start, range.end, input.zoom);
  toTimestamp(scale.start, "visible start"); toTimestamp(scale.end, "visible end");
}

export function validateChartOptions(data: ChartSeries[], input: ChartOptions): void {
  const options = common(input, ["valueFormatter", "labelFormatter", "onPointSelect"], ["stacked", "showLegend", "showGrid", "showAxes", "showTooltip"]);
  enumeration(options, "type", ["line", "area", "bar", "scatter", "bubble", "pie", "donut", "radar", "polar-area", "heatmap", "waterfall", "funnel", "gauge", "candlestick", "histogram", "boxplot", "error-bar", "range-area", "step-line", "spline", "lollipop", "bullet", "radial-bar", "ohlc", "violin", "contour"]);
  if (input.violinBandwidth !== "scott") number(options, "violinBandwidth", Number.MIN_VALUE);
  if (input.contourLevels !== undefined && (!Array.isArray(input.contourLevels) || input.contourLevels.some(value => typeof value !== "number" || !Number.isFinite(value)))) fail("contourLevels");
  if (input.type === "contour") prepareContours(seriesScalarGrid(data), input.contourLevels);
  if (input.type === "violin") {
    let minimum = 0, maximum = 1;
    for (const series of data) {
      const density = prepareViolinDensity(series.data.map(point => point.y), input.violinBandwidth);
      if (density?.points.length) { minimum = Math.min(minimum, density.points[0]!.value); maximum = Math.max(maximum, density.points.at(-1)!.value); }
      for (const point of series.data) { minimum = Math.min(minimum, point.y); maximum = Math.max(maximum, point.y); }
    }
    if (!Number.isFinite(maximum - minimum)) fail("combined violin domain; rescale samples/bandwidth");
  }
  if (input.type !== "contour") {
    const points = buildChartData(data, input.stacked);
    if (points.some(point => !Number.isFinite(point.value) || !Number.isFinite(point.baseline)) || !Number.isFinite(chartDomain(points, input.type).range)) fail("chart numeric domain; rescale values");
    let minimumX = Infinity, maximumX = -Infinity, continuous = true, absoluteTotal = 0, waterfallTotal = 0, waterfallMinimum = 0, waterfallMaximum = 1;
    for (const series of data) for (const point of series.data) {
      const x = chartNumericX(point.x); if (!Number.isFinite(x)) continuous = false; else { minimumX = Math.min(minimumX, x); maximumX = Math.max(maximumX, x); }
      if (["pie", "donut"].includes(input.type ?? "")) { absoluteTotal += Math.abs(point.y); if (!Number.isFinite(absoluteTotal)) fail("slice total; rescale values"); }
      if (input.type === "waterfall") { waterfallTotal += point.y; waterfallMinimum = Math.min(waterfallMinimum, waterfallTotal); waterfallMaximum = Math.max(waterfallMaximum, waterfallTotal); if (!Number.isFinite(waterfallTotal) || !Number.isFinite(waterfallMaximum - waterfallMinimum)) fail("waterfall total; rescale values"); }
      if (input.type === "error-bar") {
        const error = point.meta?.error ?? 1; const low = point.meta?.low ?? point.y - Number(error); const high = point.meta?.high ?? point.y + Number(error);
        if (typeof error !== "number" || !Number.isFinite(error) || error < 0 || typeof low !== "number" || typeof high !== "number" || !Number.isFinite(low) || !Number.isFinite(high) || low > high || !Number.isFinite(high - low)) fail("error-bar interval");
      }
    }
    if (continuous && Number.isFinite(minimumX) && !Number.isFinite(maximumX - minimumX)) fail("chart x range; rescale coordinates");
  }
  if (["gauge", "waterfall", "funnel"].includes(input.type ?? "") && data.length > 1) throw new NodaraError("ND_UNSUPPORTED_SERIES", `${input.type} currently supports one series per component. Use separate components for comparison.`);
  if (input.type === "gauge" && (data[0]?.data.length ?? 0) > 1) throw new NodaraError("ND_UNSUPPORTED_SERIES", "Gauge supports one value per component.");
  if (input.type === "histogram" && data.some(series => series.data.some(point => point.meta?.binStart !== undefined || point.meta?.binEnd !== undefined))) {
    for (const series of data) for (const point of series.data) if (typeof point.meta?.binStart !== "number" || typeof point.meta?.binEnd !== "number" || !Number.isFinite(point.meta.binStart) || !Number.isFinite(point.meta.binEnd) || point.meta.binEnd <= point.meta.binStart || !Number.isFinite(point.meta.binEnd - point.meta.binStart)) fail("histogram binStart/binEnd");
    let minimum = Infinity, maximum = -Infinity;
    for (const series of data) for (const point of series.data) { minimum = Math.min(minimum, Number(point.meta!.binStart)); maximum = Math.max(maximum, Number(point.meta!.binEnd)); }
    if (!Number.isFinite(maximum - minimum)) fail("combined histogram domain; rescale bin coordinates");
  }
}

export function validateTopologyOptions(_data: unknown, input: TopologyOptions): void {
  const options = common(input, ["onNodeSelect", "onViewportChange"]);
  enumeration(options, "layout", ["auto", "manual", "radial", "grid", "force", "hierarchical"]);
  number(options, "nodeRadius", 1, 10_000); number(options, "layoutIterations", 0, 10_000, true); zoom(options);
}

export function validateMapOptions(_data: unknown, input: GeoMapOptions): void {
  const options = common(input, ["onPointSelect", "onViewportChange"], ["showGraticule"]);
  enumeration(options, "projection", ["mercator", "equirectangular", "orthographic"]);
  enumeration(options, "mode", ["points", "bubbles", "routes", "heatmap", "choropleth"]);
  number(options, "pointRadius", 0, 10_000); zoom(options);
  if (input.center !== undefined) {
    if (!object(input.center) || input.center.longitude === undefined || input.center.latitude === undefined) fail("center");
    number(input.center as unknown as Options, "longitude", -180, 180); number(input.center as unknown as Options, "latitude", -90, 90);
  }
}

export function validateDiagramOptions(input: DiagramOptions): void {
  const options = common(input, ["onNodeSelect"]);
  enumeration(options, "type", ["sankey", "alluvial", "treemap", "sunburst", "icicle", "circle-pack", "tree", "radial-tree", "mindmap", "flowchart", "org-chart", "er", "state", "chord"]);
  enumeration(options, "orientation", ["horizontal", "vertical"]);
  enumeration(options, "linkRouting", ["straight", "orthogonal"]);
  number(options, "routingClearance", 0, 1000);
  number(options, "nodeWidth", 1, 10_000); number(options, "nodeGap", 0, 10_000); number(options, "linkOpacity", 0, 1);
}

export function validateCalendarOptions(data: CalendarEvent[], input: CalendarOptions): void {
  const options = common(input, ["onEventSelect", "onEventChange"], ["expandRecurrence"]);
  enumeration(options, "view", ["day", "week", "workweek", "month", "agenda", "timeline-day", "timeline-week", "resource-day", "resource-week", "year"]);
  enumeration(options, "weekStartsOn", [0, 1]); number(options, "maxOccurrences", 1, 100_000, true);
  const ids = new Set<string>();
  if (input.resources !== undefined) {
    if (!Array.isArray(input.resources)) fail("resources");
    for (const resource of input.resources) {
      if (!object(resource) || typeof resource.id !== "string" || !resource.id.trim() || ids.has(resource.id) || typeof resource.label !== "string" || !resource.label.trim() || resource.color !== undefined && typeof resource.color !== "string") fail("resources");
      ids.add(resource.id);
    }
  }
  if (input.visibleResourceIds !== undefined && (!Array.isArray(input.visibleResourceIds) || input.visibleResourceIds.some(id => typeof id !== "string" || !id.trim()))) fail("visibleResourceIds");
  const anchor = toTimestamp(input.date ?? data[0]?.start ?? Date.now());
  const range = calendarRange(anchor, input.view, input.weekStartsOn);
  toTimestamp(range.start, "calendar range start"); toTimestamp(range.end, "calendar range end");
}
