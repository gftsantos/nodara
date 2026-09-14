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
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

export const NodaraGantt = defineComponent({
  name: "NodaraGantt",
  props: {
    data: { type: Array as PropType<GanttTask[]>, required: true },
    options: { type: Object as PropType<Omit<GanttOptions, "data">>, default: () => ({}) },
  },
  emits: ["ready", "task-select", "task-change"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<GanttTask[]> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createGantt(host.value, { ...props.options, data: props.data });
      controller.on("task:select", (event) => emit("task-select", event));
      controller.on("task:change", (event) => emit("task-change", event));
      emit("ready", controller);
    });
    watch(() => props.data, (data) => controller?.update(data), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

export const NodaraChart = defineComponent({
  name: "NodaraChart",
  props: {
    series: { type: Array as PropType<ChartSeries[]>, required: true },
    options: { type: Object as PropType<Omit<ChartOptions, "series">>, default: () => ({}) },
  },
  emits: ["ready", "point-select"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<ChartSeries[]> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createChart(host.value, { ...props.options, series: props.series });
      controller.on("point:select", (event) => emit("point-select", event));
      emit("ready", controller);
    });
    watch(() => props.series, (series) => controller?.update(series), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

export const NodaraTopology = defineComponent({
  name: "NodaraTopology",
  props: {
    data: { type: Object as PropType<TopologyData>, required: true },
    options: { type: Object as PropType<Omit<TopologyOptions, "data">>, default: () => ({}) },
  },
  emits: ["ready", "node-select", "viewport-change"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<TopologyData> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createTopology(host.value, { ...props.options, data: props.data });
      controller.on("node:select", (event) => emit("node-select", event));
      controller.on("viewport:change", (event) => emit("viewport-change", event));
      emit("ready", controller);
    });
    watch(() => props.data, (data) => controller?.update(data), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

export const NodaraCalendar = defineComponent({
  name: "NodaraCalendar",
  props: {
    events: { type: Array as PropType<CalendarEvent[]>, required: true },
    options: { type: Object as PropType<Omit<CalendarOptions, "events">>, default: () => ({}) },
  },
  emits: ["ready", "event-select", "event-change"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<CalendarEvent[]> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createCalendar(host.value, { ...props.options, events: props.events });
      controller.on("event:select", (event) => emit("event-select", event));
      controller.on("event:change", (event) => emit("event-change", event));
      emit("ready", controller);
    });
    watch(() => props.events, (events) => controller?.update(events), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

export const NodaraGeoMap = defineComponent({
  name: "NodaraGeoMap",
  props: {
    data: { type: Object as PropType<GeoMapData>, required: true },
    options: { type: Object as PropType<Omit<GeoMapOptions, "data">>, default: () => ({}) },
  },
  emits: ["ready", "point-select", "viewport-change"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<GeoMapData> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createGeoMap(host.value, { ...props.options, data: props.data });
      controller.on("point:select", (event) => emit("point-select", event));
      controller.on("viewport:change", (event) => emit("viewport-change", event));
      emit("ready", controller);
    });
    watch(() => props.data, (data) => controller?.update(data), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

export const NodaraDiagram = defineComponent({
  name: "NodaraDiagram",
  props: {
    data: { type: Object as PropType<DiagramData>, required: true },
    options: { type: Object as PropType<Omit<DiagramOptions, "data">>, default: () => ({}) },
  },
  emits: ["ready", "node-select"],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let previousOptions = { ...props.options };
    let controller: NodaraController<DiagramData> | undefined;
    onMounted(() => {
      if (!host.value) return;
      controller = createDiagram(host.value, { ...props.options, data: props.data });
      controller.on("node:select", (event) => emit("node-select", event));
      emit("ready", controller);
    });
    watch(() => props.data, (data) => controller?.update(data), { deep: true });
    watch(() => props.options, (options) => {
      const removed = Object.fromEntries(Object.keys(previousOptions).map(key => [key, undefined]));
      controller?.setOptions({ ...removed, ...options });
      previousOptions = { ...options };
    }, { deep: true });
    onBeforeUnmount(() => controller?.destroy());
    return () => h("div", { ref: host });
  },
});

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
