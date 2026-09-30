export type DateInput = string | number | Date;

export type VisualTheme = "light" | "dark" | "system";
export type RenderMode = "auto" | "dom" | "canvas" | "webgl";
export type InteractionSource = "pointer" | "keyboard" | "api";

export interface ThemeTokens {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  positive: string;
  warning: string;
  danger: string;
  fontFamily: string;
  borderRadius: number;
}

export interface InteractionOptions {
  keyboard?: boolean;
  pointer?: boolean;
  pan?: boolean;
  zoom?: boolean;
}

export interface PerformanceOptions {
  canvasThreshold?: number;
  webglThreshold?: number;
  maxDevicePixelRatio?: number;
  accessibilityLimit?: number;
}

export interface NodaraPluginContext<TData = unknown, TOptions = unknown> {
  element: HTMLElement;
  data: TData;
  options: TOptions;
}

export interface NodaraPlugin<TData = unknown, TOptions = unknown> {
  name: string;
  beforeRender?(context: NodaraPluginContext<TData, TOptions>): void;
  afterRender?(context: NodaraPluginContext<TData, TOptions>): void;
  onDataChange?(context: NodaraPluginContext<TData, TOptions>): void;
  onOptionsChange?(context: NodaraPluginContext<TData, TOptions>): void;
  onDestroy?(context: NodaraPluginContext<TData, TOptions>): void;
}

export interface BaseOptions {
  ariaLabel?: string;
  className?: string;
  interactive?: boolean | InteractionOptions;
  locale?: string;
  theme?: VisualTheme;
  tokens?: Partial<ThemeTokens>;
  renderer?: RenderMode;
  performance?: PerformanceOptions;
  plugins?: NodaraPlugin[];
  onError?: (error: Error) => void;
}

export interface GanttOwner {
  id?: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

export interface GanttTask {
  id: string;
  label: string;
  start: DateInput;
  end: DateInput;
  progress?: number;
  dependencies?: string[];
  /** Typed predecessors. Explicit FS entries override the same legacy dependency. */
  dependencyLinks?: { taskId: string; kind: "FS" | "SS" | "FF" | "SF"; lagMs?: number }[];
  owner?: GanttOwner;
  color?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
}

export type GanttZoom = "day" | "week" | "month" | "quarter";
export type GanttChangeKind = "move" | "resize-start" | "resize-end";

export interface GanttOptions extends BaseOptions {
  data: GanttTask[];
  /** false keeps selection available while preventing date edits. */
  editable?: boolean;
  start?: DateInput;
  end?: DateInput;
  zoom?: GanttZoom;
  rowHeight?: number;
  snap?: "none" | "day" | "week" | number;
  dependencyRouting?: "straight" | "orthogonal";
  onTaskSelect?: (event: GanttTaskEvent) => void;
  onTaskChange?: (event: GanttTaskEvent) => void;
}

export interface GanttTaskEvent {
  task: GanttTask;
  previousTask?: GanttTask;
  change?: GanttChangeKind;
  source: InteractionSource;
}

export interface ChartPoint {
  x: string | number | Date;
  y: number;
  meta?: Record<string, unknown>;
}

export interface ChartSeries {
  id: string;
  label: string;
  color?: string;
  data: ChartPoint[];
  /** Contour only: physical Y coordinate of this scalar-grid row. */
  gridY?: number;
}

export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "scatter"
  | "bubble"
  | "pie"
  | "donut"
  | "radar"
  | "polar-area"
  | "heatmap"
  | "waterfall"
  | "funnel"
  | "gauge"
  | "candlestick"
  | "histogram"
  | "boxplot"
  | "error-bar"
  | "range-area"
  | "step-line"
  | "spline"
  | "lollipop"
  | "bullet"
  | "radial-bar"
  | "ohlc"
  | "violin"
  | "contour";

export interface ChartOptions extends BaseOptions {
  series: ChartSeries[];
  type?: ChartType;
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  showTooltip?: boolean;
  /** Absolute Gaussian KDE bandwidth. Default Scott; constant samples show a rug only. */
  violinBandwidth?: number | "scott";
  /** Scalar levels of contour isolines. Default: five interior levels of the scalar range. */
  contourLevels?: number[];
  valueFormatter?: (value: number) => string;
  labelFormatter?: (value: ChartPoint["x"]) => string;
  onPointSelect?: (event: ChartPointEvent) => void;
}

export interface ChartPointEvent {
  point: ChartPoint;
  series: ChartSeries;
  source: InteractionSource;
}

export interface TopologyNode {
  id: string;
  label: string;
  kind?: string;
  status?: "healthy" | "warning" | "critical" | "unknown";
  x?: number;
  y?: number;
  value?: string | number;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface TopologyEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  value?: number;
  directed?: boolean;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export type TopologyLayout = "auto" | "manual" | "radial" | "grid" | "force" | "hierarchical";

export interface TopologyOptions extends BaseOptions {
  data: TopologyData;
  layout?: TopologyLayout;
  nodeRadius?: number;
  layoutIterations?: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  onNodeSelect?: (event: TopologyNodeEvent) => void;
  onViewportChange?: (event: TopologyViewportEvent) => void;
}

export interface TopologyNodeEvent {
  node: TopologyNode;
  source: InteractionSource;
}

export interface TopologyViewportEvent {
  zoom: number;
  x: number;
  y: number;
  source: InteractionSource;
}

export interface GeoCoordinate {
  longitude: number;
  latitude: number;
}

export interface GeoPoint extends GeoCoordinate {
  id: string;
  label: string;
  value?: number;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface GeoRoute {
  id?: string;
  from: string | GeoCoordinate;
  to: string | GeoCoordinate;
  label?: string;
  value?: number;
  color?: string;
  directed?: boolean;
  meta?: Record<string, unknown>;
}

export interface GeoRegion {
  id: string;
  label: string;
  coordinates: GeoCoordinate[];
  value?: number;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface GeoMapData {
  points: GeoPoint[];
  routes?: GeoRoute[];
  regions?: GeoRegion[];
}

export type GeoProjection = "mercator" | "equirectangular" | "orthographic";
export type GeoMapMode = "points" | "bubbles" | "routes" | "heatmap" | "choropleth";

export interface GeoMapOptions extends BaseOptions {
  data: GeoMapData;
  projection?: GeoProjection;
  mode?: GeoMapMode;
  center?: GeoCoordinate;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  pointRadius?: number;
  showGraticule?: boolean;
  onPointSelect?: (event: GeoPointEvent) => void;
  onViewportChange?: (event: GeoViewportEvent) => void;
}

export interface GeoPointEvent {
  point: GeoPoint;
  source: InteractionSource;
}

export interface GeoViewportEvent {
  zoom: number;
  x: number;
  y: number;
  source: InteractionSource;
}

export interface DiagramPort {
  id: string;
  side: "top" | "right" | "bottom" | "left";
  /** Fraction along the side, from left/top; defaults to 0.5. */
  offset?: number;
  label?: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  parentId?: string;
  value?: number;
  color?: string;
  kind?: string;
  branchSide?: "left" | "right";
  attributes?: { name: string; type?: string; key?: "PK" | "FK" | "PK/FK" }[];
  stateKind?: "normal" | "initial" | "final";
  ports?: DiagramPort[];
  meta?: Record<string, unknown>;
}

export interface DiagramLink {
  id?: string;
  from: string;
  to: string;
  label?: string;
  value?: number;
  color?: string;
  directed?: boolean;
  fromCardinality?: "1" | "0..1" | "0..*" | "1..*";
  toCardinality?: "1" | "0..1" | "0..*" | "1..*";
  fromPort?: string;
  toPort?: string;
  meta?: Record<string, unknown>;
}

export interface DiagramData {
  nodes: DiagramNode[];
  links: DiagramLink[];
}

export type DiagramType = "sankey" | "alluvial" | "treemap" | "sunburst" | "icicle" | "circle-pack" | "tree" | "radial-tree" | "mindmap" | "flowchart" | "org-chart" | "er" | "state" | "chord";

export interface DiagramOptions extends BaseOptions {
  data: DiagramData;
  type?: DiagramType;
  orientation?: "horizontal" | "vertical";
  nodeWidth?: number;
  nodeGap?: number;
  linkOpacity?: number;
  linkRouting?: "straight" | "orthogonal";
  routingClearance?: number;
  onNodeSelect?: (event: DiagramNodeEvent) => void;
}

export interface DiagramNodeEvent {
  node: DiagramNode;
  source: InteractionSource;
}

export interface CalendarResource {
  id: string;
  label: string;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: DateInput;
  end?: DateInput;
  durationMinutes?: number;
  resourceId?: string;
  color?: string;
  allDay?: boolean;
  recurrence?: string;
  /** Zero-based occurrence ordinals detached from this recurring series. */
  excludedOccurrences?: number[];
  disabled?: boolean;
  meta?: Record<string, unknown>;
}

export type CalendarView = "day" | "week" | "workweek" | "month" | "agenda" | "timeline-day" | "timeline-week" | "resource-day" | "resource-week" | "year";

export interface CalendarOptions extends BaseOptions {
  events: CalendarEvent[];
  view?: CalendarView;
  date?: DateInput;
  weekStartsOn?: 0 | 1;
  timeZone?: string;
  resources?: CalendarResource[];
  visibleResourceIds?: string[];
  expandRecurrence?: boolean;
  maxOccurrences?: number;
  onEventSelect?: (event: CalendarEventSelectEvent) => void;
  onEventChange?: (event: CalendarEventChangeEvent) => void;
}

export interface CalendarEventSelectEvent {
  event: CalendarEvent;
  source: InteractionSource;
}

export interface CalendarEventChangeEvent extends CalendarEventSelectEvent {
  previousEvent: CalendarEvent;
  change: "move" | "resize";
}

export type Unsubscribe = () => void;

export interface NodaraEvents<TData, TOptions> {
  "data:change": TData;
  "options:change": TOptions;
  render: { data: TData; options: TOptions };
  error: Error;
  "task:select": GanttTaskEvent;
  "task:change": GanttTaskEvent;
  "event:select": CalendarEventSelectEvent;
  "event:change": CalendarEventChangeEvent;
  "point:select": TData extends GeoMapData ? GeoPointEvent : ChartPointEvent;
  "node:select": TData extends DiagramData ? DiagramNodeEvent : TopologyNodeEvent;
  "viewport:change": TData extends GeoMapData ? GeoViewportEvent : TopologyViewportEvent;
}

export interface NodaraController<TData, TOptions = unknown> {
  readonly element: HTMLElement;
  getData(): TData;
  getOptions(): TOptions;
  update(data: TData): void;
  setOptions(options: Partial<TOptions>): void;
  /** Validate data and options together; one render, no invalid intermediate state. */
  setState(data: TData, options: Partial<TOptions>): void;
  resize(): void;
  destroy(): void;
  on<TEvent extends keyof NodaraEvents<TData, TOptions>>(event: TEvent, listener: (payload: NodaraEvents<TData, TOptions>[TEvent]) => void): Unsubscribe;
  on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe;
}
