import { histogram, histogramSeries, scalarGridSeries, validateChartOptions, validateDiagramLayout, normalizeCalendarEvents, normalizeChartSeries, normalizeDiagram, normalizeGeoMap, normalizeGanttTasks, normalizeTopology } from "@nodara/core";
import type { CalendarEvent, ChartSeries, ChartType, DiagramData, GanttTask, GeoMapData, TopologyData, VisualCatalogItem } from "@nodara/core";
export type CatalogData = GanttTask[] | ChartSeries[] | TopologyData | CalendarEvent[] | GeoMapData | DiagramData;

const ganttData: GanttTask[] = [
  { id: "discovery", label: "Discovery", start: "2026-01-05", end: "2026-01-23", progress: 100, owner: { name: "Ana", color: "#c8fa63" } },
  { id: "design", label: "Product design", start: "2026-01-19", end: "2026-02-20", progress: 82, dependencies: ["discovery"], owner: { name: "Mia", color: "#7884ff" } },
  { id: "platform", label: "Platform core", start: "2026-02-02", end: "2026-03-20", progress: 61, dependencies: ["design"], owner: { name: "Leo", color: "#52d6c7" } },
  { id: "adapters", label: "Framework adapters", start: "2026-02-23", end: "2026-04-03", progress: 46, dependencies: ["platform"], owner: { name: "Sam", color: "#ff7657" } },
  { id: "quality", label: "Quality gates", start: "2026-03-16", end: "2026-04-17", progress: 28, dependencies: ["adapters"], owner: { name: "Noa", color: "#f5c451" } },
  { id: "launch", label: "Public launch", start: "2026-04-20", end: "2026-04-30", progress: 5, dependencies: ["quality"], owner: { name: "Eva", color: "#bf7cff" } },
];

const topologyData: TopologyData = {
  nodes: [
    { id: "gateway", label: "Gateway", status: "healthy", x: 460, y: 70, value: "12ms" },
    { id: "auth", label: "Auth", status: "healthy", x: 220, y: 180, value: "99.99%" },
    { id: "checkout", label: "Checkout", status: "warning", x: 460, y: 180, value: "184ms" },
    { id: "catalog", label: "Catalog", status: "healthy", x: 700, y: 180, value: "43ms" },
    { id: "users", label: "Users DB", status: "healthy", x: 180, y: 320, value: "8ms" },
    { id: "orders", label: "Orders DB", status: "critical", x: 380, y: 330, value: "92%" },
    { id: "payments", label: "Payments", status: "warning", x: 540, y: 330, value: "241ms" },
    { id: "search", label: "Search", status: "healthy", x: 700, y: 330, value: "31ms" },
    { id: "events", label: "Event bus", status: "healthy", x: 460, y: 440, value: "4.2k/s" },
  ],
  edges: [
    { from: "gateway", to: "auth", directed: true, label: "JWT" },
    { from: "gateway", to: "checkout", directed: true },
    { from: "gateway", to: "catalog", directed: true },
    { from: "auth", to: "users", directed: true },
    { from: "checkout", to: "orders", directed: true },
    { from: "checkout", to: "payments", directed: true },
    { from: "catalog", to: "search", directed: true },
    { from: "orders", to: "events", directed: true },
    { from: "payments", to: "events", directed: true },
    { from: "search", to: "events", directed: true },
  ],
};

const calendarData: CalendarEvent[] = [
  { id: "planning", title: "Planeamento", start: "2026-08-17T09:30:00+01:00", durationMinutes: 60, resourceId: "product" },
  { id: "design", title: "Design critique", start: "2026-08-18T14:00:00+01:00", durationMinutes: 90, resourceId: "studio" },
  { id: "ops", title: "Operations sync", start: "2026-08-19T11:00:00+01:00", durationMinutes: 45, resourceId: "platform", recurrence: "FREQ=WEEKLY;COUNT=8" },
  { id: "launch", title: "Release candidate", start: "2026-08-20T15:30:00+01:00", durationMinutes: 120, resourceId: "product" },
  { id: "focus", title: "Focus day", start: "2026-08-21T00:00:00+01:00", allDay: true, resourceId: "studio" },
  { id: "retro", title: "Retro", start: "2026-08-21T16:00:00+01:00", durationMinutes: 60, resourceId: "platform" },
];

const geoMapData: GeoMapData = {
  points: [
    { id: "lisbon", label: "Lisboa", latitude: 38.72, longitude: -9.14, value: 58 },
    { id: "london", label: "Londres", latitude: 51.51, longitude: -0.13, value: 82 },
    { id: "paris", label: "Paris", latitude: 48.86, longitude: 2.35, value: 67 },
    { id: "new-york", label: "Nova Iorque", latitude: 40.71, longitude: -74.01, value: 94 },
    { id: "sao-paulo", label: "São Paulo", latitude: -23.55, longitude: -46.63, value: 73 },
    { id: "tokyo", label: "Tóquio", latitude: 35.68, longitude: 139.69, value: 88 },
  ],
  routes: [
    { from: "lisbon", to: "london", value: 3, directed: true },
    { from: "lisbon", to: "new-york", value: 7, directed: true },
    { from: "london", to: "tokyo", value: 5, directed: true },
    { from: "sao-paulo", to: "lisbon", value: 4, directed: true },
  ],
  regions: [
    { id: "iberia", label: "Península Ibérica", value: 3, coordinates: [{ longitude: -10, latitude: 36 }, { longitude: 4, latitude: 36 }, { longitude: 4, latitude: 44 }, { longitude: -10, latitude: 44 }] },
    { id: "western-europe", label: "Europa ocidental", value: 6, coordinates: [{ longitude: -6, latitude: 44 }, { longitude: 10, latitude: 44 }, { longitude: 10, latitude: 55 }, { longitude: -6, latitude: 55 }] },
    { id: "east-us", label: "Estados Unidos oriental", value: 8, coordinates: [{ longitude: -84, latitude: 30 }, { longitude: -66, latitude: 30 }, { longitude: -66, latitude: 48 }, { longitude: -84, latitude: 48 }] },
  ],
};

const diagramData: DiagramData = {
  nodes: [
    { id: "traffic", label: "Tráfego", value: 100 },
    { id: "organic", label: "Orgânico", parentId: "traffic", value: 46 },
    { id: "paid", label: "Pago", parentId: "traffic", value: 34 },
    { id: "referral", label: "Referral", parentId: "traffic", value: 20 },
    { id: "trial", label: "Trial", parentId: "organic", value: 61 },
    { id: "customer", label: "Cliente", parentId: "trial", value: 29 },
  ],
  links: [
    { from: "traffic", to: "organic", value: 46, directed: true },
    { from: "traffic", to: "paid", value: 34, directed: true },
    { from: "traffic", to: "referral", value: 20, directed: true },
    { from: "organic", to: "trial", value: 31, directed: true },
    { from: "paid", to: "trial", value: 21, directed: true },
    { from: "referral", to: "trial", value: 9, directed: true },
    { from: "trial", to: "customer", value: 29, directed: true },
  ],
};

const hierarchyData: DiagramData = {
  nodes: [
    { id: "product", label: "Produto", value: 100 },
    { id: "platform", label: "Plataforma", parentId: "product", value: 60 },
    { id: "experience", label: "Experiência", parentId: "product", value: 40 },
    { id: "renderers", label: "Motores", parentId: "platform", value: 35 },
    { id: "domain", label: "Planeamento", parentId: "platform", value: 25 },
    { id: "adapters", label: "Adaptadores", parentId: "experience", value: 24 },
    { id: "docs", label: "Documentação", parentId: "experience", value: 16 },
  ], links: [],
};

function chartDataFor(item: VisualCatalogItem): ChartSeries[] {
  const type = item.options.type as ChartType;
  if (type === "histogram") return [histogramSeries(histogram([1, 2, 3, 4, 7, 8, 9, 12, 15, 18, 20, 23, 26, 30, 33, 37, 40, 45], { edges: [0, 5, 10, 20, 30, 50] }), { id: "latency", label: "Latência · amostras", measure: "count" })];
  if (type === "gauge") return [{ id: "score", label: "SLA", color: "#c8fa63", data: [{ x: "SLA", y: 87, meta: { min: 0, max: 100 } }] }];
  if (type === "funnel") return [{ id: "funnel", label: "Conversão", data: [{ x: "Visitas", y: 12000 }, { x: "Trials", y: 7200 }, { x: "Ativações", y: 4100 }, { x: "Clientes", y: 1820 }] }];
  if (type === "waterfall") return [{ id: "variance", label: "Variação", data: [{ x: "Base", y: 120 }, { x: "Novos", y: 48 }, { x: "Expansão", y: 25 }, { x: "Churn", y: -31 }, { x: "Custos", y: -18 }] }];
  if (type === "candlestick" || type === "ohlc") return [{ id: "ohlc", label: "NDR", data: [
    { x: "Seg", y: 106, meta: { open: 101, high: 109, low: 98, close: 106 } },
    { x: "Ter", y: 103, meta: { open: 106, high: 111, low: 101, close: 103 } },
    { x: "Qua", y: 112, meta: { open: 103, high: 116, low: 102, close: 112 } },
    { x: "Qui", y: 118, meta: { open: 112, high: 121, low: 109, close: 118 } },
    { x: "Sex", y: 115, meta: { open: 118, high: 120, low: 111, close: 115 } },
  ] }];
  if (type === "boxplot") return [{ id: "latency", label: "Latência", data: [
    { x: "API", y: 48, meta: { min: 18, q1: 31, median: 48, q3: 63, max: 91 } },
    { x: "Web", y: 61, meta: { min: 24, q1: 42, median: 61, q3: 77, max: 108 } },
    { x: "Worker", y: 37, meta: { min: 12, q1: 25, median: 37, q3: 49, max: 74 } },
  ] }];
  if (type === "error-bar") return [{ id: "measure", label: "Medição", data: [42, 55, 49, 72, 63].map((y, index) => ({ x: `A${index + 1}`, y, meta: { error: 5 + index } })) }];
  if (type === "range-area") return [{ id: "forecast", label: "Previsão", data: [
    { x: "Jan", y: 52, meta: { low: 41, high: 62 } }, { x: "Fev", y: 61, meta: { low: 48, high: 73 } }, { x: "Mar", y: 67, meta: { low: 54, high: 81 } }, { x: "Abr", y: 78, meta: { low: 65, high: 91 } },
  ] }];
  if (type === "bullet") return [{ id: "kpis", label: "KPIs", data: [
    { x: "SLA", y: 87, meta: { target: 92, max: 100 } }, { x: "NPS", y: 71, meta: { target: 75, max: 100 } }, { x: "Adoção", y: 64, meta: { target: 60, max: 100 } },
  ] }];
  if (type === "radial-bar") return [{ id: "health", label: "Saúde", data: [
    { x: "Core", y: 94, meta: { max: 100 } }, { x: "React", y: 88, meta: { max: 100 } }, { x: "Vue", y: 79, meta: { max: 100 } }, { x: "Angular", y: 73, meta: { max: 100 } },
  ] }];
  if (type === "violin") return [{ id: "density", label: "Densidade", data: [8, 18, 37, 62, 84, 96, 89, 68, 42, 21, 9].map((y, index) => ({ x: index, y })) }];
  if (type === "contour") return scalarGridSeries({ x: [0, 1, 2, 3, 4, 5], y: [0, 1, 2, 3, 4], values: [0, 1, 2, 2, 1, 0, 1, 3, 6, 5, 3, 1, 2, 5, 10, 9, 4, 2, 1, 3, 6, 5, 3, 1, 0, 1, 2, 2, 1, 0] });
  if (type === "heatmap") return ["API", "Web", "Worker", "DB"].map((label, row) => ({ id: label.toLowerCase(), label, data: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((x, column) => ({ x, y: ((row + 2) * (column + 3) * 13) % 97 })) }));
  if (type === "bubble") return [{ id: "markets", label: "Mercados", data: [
    { x: "PT", y: 34, meta: { size: 10 } }, { x: "ES", y: 51, meta: { size: 18 } }, { x: "FR", y: 45, meta: { size: 14 } }, { x: "DE", y: 68, meta: { size: 25 } }, { x: "UK", y: 57, meta: { size: 20 } },
  ] }];
  if (["pie", "donut", "polar-area"].includes(type)) return [{ id: "mix", label: "Mix", data: [{ x: "Core", y: 38 }, { x: "React", y: 26 }, { x: "Vue", y: 17 }, { x: "Angular", y: 12 }, { x: "Web", y: 7 }] }];
  if (item.id === "negative-bars") return [{ id: "variance", label: "Variação", data: [{ x: "Jan", y: 18 }, { x: "Fev", y: -9 }, { x: "Mar", y: 24 }, { x: "Abr", y: -14 }, { x: "Mai", y: 31 }] }];
  const time = item.id === "time-series";
  const xs = time ? ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"] : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  return [
    { id: "revenue", label: "Receita", color: "#7884ff", data: xs.map((x, index) => ({ x, y: [42, 55, 49, 72, 83, 96][index]! })) },
    { id: "target", label: "Objetivo", color: "#52d6c7", data: xs.map((x, index) => ({ x, y: [38, 47, 58, 66, 78, 88][index]! })) },
  ];
}

export function sampleData(item: VisualCatalogItem): CatalogData {
  if (item.id === "sprint-board" || item.id === "release-train") {
    const sprint = item.id === "sprint-board", day = 86_400_000, start = Date.UTC(2026, 8, 14);
    const names = sprint ? ["Sprint timeline · objetivo", "Pesquisa com utilizadores", "Implementar formulário", "Integrar API", "Testes de aceitação", "Demonstração do sprint"] : ["Release train · alinhamento", "Equipa API · contrato", "Equipa Web · integração", "Equipa Mobile · integração", "Validação conjunta", "Entrega coordenada"];
    const windows = sprint ? [[0, 1], [1, 3], [3, 5], [5, 8], [8, 10], [10, 11]] : [[0, 7], [7, 14], [14, 28], [14, 35], [35, 49], [49, 56]];
    return names.map((label, index) => ({ id: `task-${index}`, label, start: start + windows[index]![0]! * day, end: start + windows[index]![1]! * day, progress: Math.max(0, 100 - index * 25), owner: { name: sprint ? "Produto" : ["Programa", "API", "Web", "Mobile", "Qualidade", "Operações"][index]! }, ...(index ? { dependencies: [sprint || index < 3 ? `task-${index - 1}` : index === 3 ? "task-1" : `task-${index - 1}`] } : {}) }));
  }
  if (item.family === "diagrams") {
    const type = item.options.type;
    if (type === "radial-tree" || type === "mindmap") return { nodes: [{ id: "root", label: item.name }, { id: "product", label: "Produto", parentId: "root", branchSide: "left" }, { id: "tech", label: "Tecnologia", parentId: "root", branchSide: "right" }, { id: "research", label: "Pesquisa", parentId: "product" }, { id: "design", label: "Design", parentId: "product" }, { id: "api", label: "API", parentId: "tech" }, { id: "web", label: "Web", parentId: "tech" }], links: [] };
    if (type === "er") return { nodes: [{ id: "customer", label: "Cliente", attributes: [{ name: "id", type: "uuid", key: "PK" }, { name: "nome", type: "text" }] }, { id: "order", label: "Encomenda", attributes: [{ name: "id", type: "uuid", key: "PK" }, { name: "cliente_id", type: "uuid", key: "FK" }, { name: "total", type: "decimal" }] }], links: [{ from: "customer", to: "order", fromCardinality: "1", toCardinality: "0..*", label: "faz" }] };
    if (type === "state") return { nodes: [{ id: "start", label: "Início", stateKind: "initial" }, { id: "pending", label: "Pendente" }, { id: "paid", label: "Pago" }, { id: "end", label: "Fim", stateKind: "final" }], links: [{ from: "start", to: "pending", label: "criar" }, { from: "pending", to: "pending", label: "tentar novamente" }, { from: "pending", to: "paid", label: "pagar" }, { from: "paid", to: "end", label: "enviar" }] };
    if (type === "chord") return { nodes: [{ id: "web", label: "Web" }, { id: "mobile", label: "Mobile" }, { id: "api", label: "API" }, { id: "data", label: "Dados" }], links: [{ from: "web", to: "api", value: 60 }, { from: "mobile", to: "api", value: 30 }, { from: "api", to: "data", value: 80 }, { from: "web", to: "data", value: 10 }] };
  }
  if (item.family === "gantt") return structuredClone(ganttData).map((task, index) => index === 0 ? { ...task, label: item.name } : task);
  if (item.family === "charts") return chartDataFor(item).map((series, index) => index === 0 ? { ...series, label: item.name } : series);
  if (item.family === "topology") {
    const sample = structuredClone(topologyData);
    sample.nodes[0] = { ...sample.nodes[0]!, label: item.name };
    return sample;
  }
  if (item.family === "calendar") return structuredClone(calendarData).map((event, index) => index === 0 ? { ...event, title: item.name } : event);
  if (item.family === "maps") {
    const sample = structuredClone(geoMapData);
    sample.points[0] = { ...sample.points[0]!, label: item.name };
    return sample;
  }
  const sample = structuredClone(["treemap", "sunburst", "icicle", "circle-pack"].includes(String(item.options.type)) ? hierarchyData : diagramData);
  sample.nodes[0] = { ...sample.nodes[0]!, label: item.name };
  return sample;
}

export function normalizeData(item: VisualCatalogItem, json: string): CatalogData {
  const parsed: unknown = JSON.parse(json);
  if (item.family === "gantt") return normalizeGanttTasks(parsed as GanttTask[]);
  if (item.family === "charts") { const data = normalizeChartSeries(parsed as ChartSeries[]); validateChartOptions(data, { ...item.options, series: data }); return data; }
  if (item.family === "topology") return normalizeTopology(parsed as TopologyData);
  if (item.family === "calendar") return normalizeCalendarEvents(parsed as CalendarEvent[]);
  if (item.family === "maps") return normalizeGeoMap(parsed as GeoMapData);
  const data = normalizeDiagram(parsed as DiagramData); validateDiagramLayout(data, item.options.type as import("@nodara/core").DiagramType); return data;
}
