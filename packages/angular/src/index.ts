import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import type { AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import {
  createCalendar,
  createChart,
  createDiagram,
  createGantt,
  createGeoMap,
  createTopology,
  type CalendarEvent,
  type CalendarEventSelectEvent,
  type CalendarOptions,
  type ChartOptions,
  type ChartPointEvent,
  type ChartSeries,
  type DiagramData,
  type DiagramNodeEvent,
  type DiagramOptions,
  type GanttOptions,
  type GanttTask,
  type GanttTaskEvent,
  type GeoMapData,
  type GeoMapOptions,
  type GeoPointEvent,
  type NodaraController,
  type TopologyData,
  type TopologyNodeEvent,
  type TopologyOptions,
} from "@nodara/core";

const template = `<div #host class="nd-angular-host"></div>`;
const styles = [`.nd-angular-host{display:block;width:100%;height:100%}`];

@Component({ selector: "nd-gantt", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraGanttComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) data: GanttTask[] = [];
  @Input() options: Omit<GanttOptions, "data"> = {};
  @Output() ready = new EventEmitter<NodaraController<GanttTask[]>>();
  @Output() taskSelect = new EventEmitter<GanttTaskEvent>();
  @Output() taskChange = new EventEmitter<GanttTaskEvent>();
  private controller?: NodaraController<GanttTask[]>;

  ngAfterViewInit() {
    this.controller = createGantt(this.host.nativeElement, { ...this.options, data: this.data });
    this.controller.on<GanttTaskEvent>("task:select", (event) => this.taskSelect.emit(event));
    this.controller.on<GanttTaskEvent>("task:change", (event) => this.taskChange.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["data"] && this.controller) this.controller.update(this.data);
  }
  ngOnDestroy() { this.controller?.destroy(); }
}

@Component({ selector: "nd-chart", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) series: ChartSeries[] = [];
  @Input() options: Omit<ChartOptions, "series"> = {};
  @Output() ready = new EventEmitter<NodaraController<ChartSeries[]>>();
  @Output() pointSelect = new EventEmitter<ChartPointEvent>();
  private controller?: NodaraController<ChartSeries[]>;

  ngAfterViewInit() {
    this.controller = createChart(this.host.nativeElement, { ...this.options, series: this.series });
    this.controller.on<ChartPointEvent>("point:select", (event) => this.pointSelect.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["series"] && this.controller) this.controller.update(this.series);
  }
  ngOnDestroy() { this.controller?.destroy(); }
}

@Component({ selector: "nd-topology", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraTopologyComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) data: TopologyData = { nodes: [], edges: [] };
  @Input() options: Omit<TopologyOptions, "data"> = {};
  @Output() ready = new EventEmitter<NodaraController<TopologyData>>();
  @Output() nodeSelect = new EventEmitter<TopologyNodeEvent>();
  private controller?: NodaraController<TopologyData>;

  ngAfterViewInit() {
    this.controller = createTopology(this.host.nativeElement, { ...this.options, data: this.data });
    this.controller.on<TopologyNodeEvent>("node:select", (event) => this.nodeSelect.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["data"] && this.controller) this.controller.update(this.data);
  }
  ngOnDestroy() { this.controller?.destroy(); }
}

@Component({ selector: "nd-calendar", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraCalendarComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) events: CalendarEvent[] = [];
  @Input() options: Omit<CalendarOptions, "events"> = {};
  @Output() ready = new EventEmitter<NodaraController<CalendarEvent[]>>();
  @Output() eventSelect = new EventEmitter<CalendarEventSelectEvent>();
  private controller?: NodaraController<CalendarEvent[]>;

  ngAfterViewInit() {
    this.controller = createCalendar(this.host.nativeElement, { ...this.options, events: this.events });
    this.controller.on<CalendarEventSelectEvent>("event:select", (event) => this.eventSelect.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["events"] && this.controller) this.controller.update(this.events);
  }
  ngOnDestroy() { this.controller?.destroy(); }
}

@Component({ selector: "nd-geo-map", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraGeoMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) data: GeoMapData = { points: [], routes: [], regions: [] };
  @Input() options: Omit<GeoMapOptions, "data"> = {};
  @Output() ready = new EventEmitter<NodaraController<GeoMapData>>();
  @Output() pointSelect = new EventEmitter<GeoPointEvent>();
  private controller?: NodaraController<GeoMapData>;

  ngAfterViewInit() {
    this.controller = createGeoMap(this.host.nativeElement, { ...this.options, data: this.data });
    this.controller.on<GeoPointEvent>("point:select", (event) => this.pointSelect.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["data"] && this.controller) this.controller.update(this.data);
  }
  ngOnDestroy() { this.controller?.destroy(); }
}

@Component({ selector: "nd-diagram", standalone: true, template, styles, encapsulation: ViewEncapsulation.None })
export class NodaraDiagramComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLElement>;
  @Input({ required: true }) data: DiagramData = { nodes: [], links: [] };
  @Input() options: Omit<DiagramOptions, "data"> = {};
  @Output() ready = new EventEmitter<NodaraController<DiagramData>>();
  @Output() nodeSelect = new EventEmitter<DiagramNodeEvent>();
  private controller?: NodaraController<DiagramData>;

  ngAfterViewInit() {
    this.controller = createDiagram(this.host.nativeElement, { ...this.options, data: this.data });
    this.controller.on<DiagramNodeEvent>("node:select", (event) => this.nodeSelect.emit(event));
    this.ready.emit(this.controller);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"] && this.controller) this.controller.setOptions(this.options);
    if (changes["data"] && this.controller) this.controller.update(this.data);
  }
  ngOnDestroy() { this.controller?.destroy(); }
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
