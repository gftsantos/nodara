import {
  createCalendar,
  createChart,
  createGantt,
  createTopology,
  type CalendarEvent,
  type CalendarOptions,
  type ChartOptions,
  type ChartSeries,
  type GanttOptions,
  type GanttTask,
  type NodaraController,
  type TopologyData,
  type TopologyOptions,
} from "@nodara/core";
import { useEffect, useRef, type CSSProperties } from "react";

interface AdapterProps<TData> {
  className?: string;
  style?: CSSProperties;
  onReady?: (controller: NodaraController<TData>) => void;
}

export type GanttProps = GanttOptions & AdapterProps<GanttTask[]>;
export type ChartProps = ChartOptions & AdapterProps<ChartSeries[]>;
export type TopologyProps = TopologyOptions & AdapterProps<TopologyData>;
export type CalendarProps = CalendarOptions & AdapterProps<CalendarEvent[]>;

export function Gantt({ data, onReady, style, ...options }: GanttProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const controller = createGantt(host.current, { ...options, data });
    onReady?.(controller);
    return () => controller.destroy();
  }, [data, options.ariaLabel, options.className, options.end, options.interactive, options.locale, options.rowHeight, options.start, options.theme, options.tokens, options.zoom, options.onTaskChange, options.onTaskSelect, onReady]);
  return <div ref={host} style={style} />;
}

export function Chart({ series, onReady, style, ...options }: ChartProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const controller = createChart(host.current, { ...options, series });
    onReady?.(controller);
    return () => controller.destroy();
  }, [series, options.ariaLabel, options.className, options.interactive, options.locale, options.showLegend, options.stacked, options.theme, options.tokens, options.type, options.valueFormatter, options.onPointSelect, onReady]);
  return <div ref={host} style={style} />;
}

export function Topology({ data, onReady, style, ...options }: TopologyProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const controller = createTopology(host.current, { ...options, data });
    onReady?.(controller);
    return () => controller.destroy();
  }, [data, options.ariaLabel, options.className, options.interactive, options.layout, options.locale, options.nodeRadius, options.theme, options.tokens, options.onNodeSelect, onReady]);
  return <div ref={host} style={style} />;
}

export function Calendar({ events, onReady, style, ...options }: CalendarProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const controller = createCalendar(host.current, { ...options, events });
    onReady?.(controller);
    return () => controller.destroy();
  }, [events, options.ariaLabel, options.className, options.date, options.interactive, options.locale, options.theme, options.tokens, options.view, options.weekStartsOn, options.onEventSelect, onReady]);
  return <div ref={host} style={style} />;
}

export type {
  CalendarEvent,
  CalendarOptions,
  ChartOptions,
  ChartSeries,
  GanttOptions,
  GanttTask,
  NodaraController,
  TopologyData,
  TopologyOptions,
} from "@nodara/core";
