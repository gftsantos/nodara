export type DateInput = string | number | Date;

export type VisualTheme = "light" | "dark" | "system";

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

export interface BaseOptions {
  ariaLabel?: string;
  className?: string;
  interactive?: boolean;
  locale?: string;
  theme?: VisualTheme;
  tokens?: Partial<ThemeTokens>;
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

export interface GanttOptions extends BaseOptions {
  data: GanttTask[];
  start?: DateInput;
  end?: DateInput;
  zoom?: "day" | "week" | "month" | "quarter";
  rowHeight?: number;
  onTaskSelect?: (event: GanttTaskEvent) => void;
  onTaskChange?: (event: GanttTaskEvent) => void;
}

export interface GanttTaskEvent {
  task: GanttTask;
  source: "pointer" | "keyboard" | "api";
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

export interface ChartOptions extends BaseOptions {
  series: ChartSeries[];
  type?: "line" | "area" | "bar";
  stacked?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  onPointSelect?: (event: ChartPointEvent) => void;
}

export interface ChartPointEvent {
  point: ChartPoint;
  series: ChartSeries;
  source: "pointer" | "keyboard" | "api";
}

export interface TopologyNode {
  id: string;
  label: string;
  kind?: string;
  status?: "healthy" | "warning" | "critical" | "unknown";
  x?: number;
  y?: number;
  value?: string | number;
  meta?: Record<string, unknown>;
}

export interface TopologyEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  value?: number;
  directed?: boolean;
  meta?: Record<string, unknown>;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyOptions extends BaseOptions {
  data: TopologyData;
  layout?: "auto" | "manual" | "radial";
  nodeRadius?: number;
  onNodeSelect?: (event: TopologyNodeEvent) => void;
}

export interface TopologyNodeEvent {
  node: TopologyNode;
  source: "pointer" | "keyboard" | "api";
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
  meta?: Record<string, unknown>;
}

export interface CalendarOptions extends BaseOptions {
  events: CalendarEvent[];
  view?: "day" | "week" | "month";
  date?: DateInput;
  weekStartsOn?: 0 | 1;
  onEventSelect?: (event: CalendarEventSelectEvent) => void;
}

export interface CalendarEventSelectEvent {
  event: CalendarEvent;
  source: "pointer" | "keyboard" | "api";
}

export type Unsubscribe = () => void;

export interface NodaraController<TData> {
  readonly element: HTMLElement;
  update(data: TData): void;
  resize(): void;
  destroy(): void;
  on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe;
}
