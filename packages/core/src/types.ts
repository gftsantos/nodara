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
  owner?: GanttOwner;
  color?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
}

export type GanttZoom = "day" | "week" | "month" | "quarter";
export type GanttChangeKind = "move" | "resize-start" | "resize-end";

export interface GanttOptions extends BaseOptions {
  data: GanttTask[];
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
  | "candlestick";

export interface ChartOptions extends BaseOptions {
  series: ChartSeries[];
  type?: ChartType;
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  showTooltip?: boolean;
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
  disabled?: boolean;
  meta?: Record<string, unknown>;
}

export type CalendarView = "day" | "week" | "workweek" | "month";

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

export interface NodaraController<TData, TOptions = unknown> {
  readonly element: HTMLElement;
  getData(): TData;
  getOptions(): TOptions;
  update(data: TData): void;
  setOptions(options: Partial<TOptions>): void;
  resize(): void;
  destroy(): void;
  on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe;
}
