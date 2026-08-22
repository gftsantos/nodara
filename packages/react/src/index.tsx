import {
  createCalendar,
  createChart,
  createDiagram,
  createGantt,
  createGeoMap,
  createTopology,
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
} from "@nodara/core";
import { useEffect, useRef, type CSSProperties } from "react";

interface AdapterProps<TData, TOptions> {
  style?: CSSProperties;
  onReady?: (controller: NodaraController<TData, TOptions>) => void;
}

export type GanttProps = GanttOptions & AdapterProps<GanttTask[], GanttOptions>;
export type ChartProps = ChartOptions & AdapterProps<ChartSeries[], ChartOptions>;
export type TopologyProps = TopologyOptions & AdapterProps<TopologyData, TopologyOptions>;
export type CalendarProps = CalendarOptions & AdapterProps<CalendarEvent[], CalendarOptions>;
export type GeoMapProps = GeoMapOptions & AdapterProps<GeoMapData, GeoMapOptions>;
export type DiagramProps = DiagramOptions & AdapterProps<DiagramData, DiagramOptions>;

export function Gantt({ data, onReady, style, ...options }: GanttProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<GanttTask[], GanttOptions> | undefined>(undefined);
  const initial = useRef({ data, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createGantt(host.current, { ...initial.current.options, data: initial.current.data });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(data); }, [data]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
}

export function Chart({ series, onReady, style, ...options }: ChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<ChartSeries[], ChartOptions> | undefined>(undefined);
  const initial = useRef({ series, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createChart(host.current, { ...initial.current.options, series: initial.current.series });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(series); }, [series]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
}

export function Topology({ data, onReady, style, ...options }: TopologyProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<TopologyData, TopologyOptions> | undefined>(undefined);
  const initial = useRef({ data, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createTopology(host.current, { ...initial.current.options, data: initial.current.data });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(data); }, [data]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
}

export function Calendar({ events, onReady, style, ...options }: CalendarProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<CalendarEvent[], CalendarOptions> | undefined>(undefined);
  const initial = useRef({ events, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createCalendar(host.current, { ...initial.current.options, events: initial.current.events });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(events); }, [events]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
}

export function GeoMap({ data, onReady, style, ...options }: GeoMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<GeoMapData, GeoMapOptions> | undefined>(undefined);
  const initial = useRef({ data, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createGeoMap(host.current, { ...initial.current.options, data: initial.current.data });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(data); }, [data]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
}

export function Diagram({ data, onReady, style, ...options }: DiagramProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NodaraController<DiagramData, DiagramOptions> | undefined>(undefined);
  const initial = useRef({ data, options });
  useEffect(() => {
    if (!host.current) return;
    controller.current = createDiagram(host.current, { ...initial.current.options, data: initial.current.data });
    return () => { controller.current?.destroy(); controller.current = undefined; };
  }, []);
  useEffect(() => { controller.current?.update(data); }, [data]);
  useEffect(() => { controller.current?.setOptions(options); }, [options]);
  useEffect(() => { if (controller.current) onReady?.(controller.current); }, [onReady]);
  return <div ref={host} style={style} />;
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
