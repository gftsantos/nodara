import type { CalendarView, ChartType, DiagramType, GanttZoom, GeoMapMode, GeoProjection, TopologyLayout } from "./types";

export type VisualFamily = "gantt" | "charts" | "topology" | "calendar" | "maps" | "diagrams";

export interface VisualCatalogItem {
  id: string;
  family: VisualFamily;
  name: string;
  description: string;
  dataContract: "GanttTask[]" | "ChartSeries[]" | "TopologyData" | "CalendarEvent[]" | "GeoMapData" | "DiagramData";
  tags: readonly string[];
  options: Readonly<Record<string, string | number | boolean>>;
}

export interface VisualCatalogGroup {
  id: string;
  family: VisualFamily;
  variant: string;
  dataContract: VisualCatalogItem["dataContract"];
  items: readonly VisualCatalogItem[];
}

const chart = (id: string, name: string, description: string, type: ChartType, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "charts", name, description, dataContract: "ChartSeries[]", tags: [type, ...tags], options: { type, ...options },
});
const gantt = (id: string, name: string, description: string, zoom: GanttZoom, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "gantt", name, description, dataContract: "GanttTask[]", tags: [zoom, ...tags], options: { zoom, ...options },
});
const topology = (id: string, name: string, description: string, layout: TopologyLayout, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "topology", name, description, dataContract: "TopologyData", tags: [layout, ...tags], options: { layout, ...options },
});
const calendar = (id: string, name: string, description: string, view: CalendarView, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "calendar", name, description, dataContract: "CalendarEvent[]", tags: [view, ...tags], options: { view, ...options },
});
const geoMap = (id: string, name: string, description: string, mode: GeoMapMode, projection: GeoProjection = "mercator", options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "maps", name, description, dataContract: "GeoMapData", tags: [mode, projection, ...tags], options: { mode, projection, ...options },
});
const diagram = (id: string, name: string, description: string, type: DiagramType, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id, family: "diagrams", name, description, dataContract: "DiagramData", tags: [type, ...tags], options: { type, ...options },
});

export const visualCatalog: readonly VisualCatalogItem[] = [
  gantt("project-plan", "Plano de projeto", "Execução de projeto com progresso, responsáveis e dependências.", "month", { dependencyRouting: "orthogonal" }, ["project"]),
  gantt("product-roadmap", "Roadmap de produto", "Iniciativas e releases distribuídas por trimestre.", "quarter", {}, ["roadmap"]),
  gantt("sprint-board", "Sprint timeline", "Trabalho de curta duração com snap diário.", "day", { snap: "day" }, ["agile"]),
  gantt("release-train", "Release train", "Cadência semanal de entregas interdependentes.", "week", { snap: "week" }, ["release"]),
  gantt("resource-plan", "Planeamento de recursos", "Tarefas agrupadas visualmente por responsável.", "week", { rowHeight: 64 }, ["resources"]),
  gantt("dependency-plan", "Mapa de dependências", "Relações ortogonais entre atividades críticas.", "month", { dependencyRouting: "orthogonal" }, ["dependencies"]),
  gantt("portfolio-plan", "Portefólio anual", "Programas executivos condensados em trimestres.", "quarter", { rowHeight: 48 }, ["portfolio"]),
  gantt("campaign-plan", "Campanha multicanal", "Conteúdo, media e lançamento coordenados por semana.", "week", { snap: "day" }, ["marketing"]),
  gantt("construction-plan", "Plano de construção", "Fases longas, predecessoras e percentagem concluída.", "month", { dependencyRouting: "straight" }, ["construction"]),
  gantt("migration-plan", "Migração técnica", "Cutover detalhado e tarefas editáveis ao dia.", "day", { snap: "day" }, ["migration"]),
  gantt("critical-path", "Caminho crítico", "Preset de dependências; não calcula caminho crítico ou folgas.", "week", { dependencyRouting: "orthogonal", rowHeight: 58 }, ["critical"]),
  gantt("capacity-plan", "Plano de capacidade", "Ocupação de equipas e janelas de execução.", "month", { rowHeight: 54 }, ["capacity"]),

  chart("line-chart", "Line chart", "Tendências contínuas e comparação entre séries.", "line", {}, ["trend"]),
  chart("area-chart", "Area chart", "Evolução com ênfase no volume acumulado.", "area", {}, ["trend"]),
  chart("bar-chart", "Bar chart", "Comparação direta entre categorias.", "bar", {}, ["comparison"]),
  chart("grouped-bars", "Grouped bars", "Séries lado a lado por categoria.", "bar", { stacked: false }, ["comparison"]),
  chart("stacked-bars", "Stacked bars", "Composição positiva e negativa por categoria.", "bar", { stacked: true }, ["composition"]),
  chart("stacked-area", "Stacked area", "Contribuição acumulada de várias séries.", "area", { stacked: true }, ["composition"]),
  chart("scatter-plot", "Scatter plot", "Distribuição e correlação entre observações.", "scatter", {}, ["distribution"]),
  chart("bubble-chart", "Bubble chart", "Magnitude adicional controlada por meta.size.", "bubble", {}, ["distribution", "size"]),
  chart("pie-chart", "Pie chart", "Partes de um total com setores proporcionais.", "pie", { showAxes: false }, ["composition"]),
  chart("donut-chart", "Donut chart", "Composição circular com centro livre.", "donut", { showAxes: false }, ["composition"]),
  chart("radar-chart", "Radar chart", "Perfis multivariados sobre eixos radiais.", "radar", { showAxes: false }, ["multivariate"]),
  chart("polar-area", "Polar area", "Categorias angulares com raio proporcional.", "polar-area", { showAxes: false }, ["radial"]),
  chart("heatmap", "Heatmap", "Intensidade por célula, série e categoria.", "heatmap", { showAxes: false }, ["matrix"]),
  chart("waterfall", "Waterfall", "Impactos positivos e negativos sobre um acumulado.", "waterfall", {}, ["finance"]),
  chart("funnel", "Funnel", "Conversão sequencial entre etapas.", "funnel", { showAxes: false }, ["conversion"]),
  chart("gauge", "Gauge", "Indicador semicircular com mínimo e máximo em meta.", "gauge", { showAxes: false, showLegend: false }, ["kpi"]),
  chart("candlestick", "Candlestick", "Velas OHLC com open, high, low e close em meta.", "candlestick", {}, ["finance"]),
  chart("sparkline", "Sparkline", "Tendência compacta sem eixos, grelha ou legenda.", "line", { showAxes: false, showGrid: false, showLegend: false }, ["compact"]),
  chart("time-series", "Time series", "Série temporal com Date ou timestamp no eixo x.", "line", {}, ["time"]),
  chart("negative-bars", "Positive / negative bars", "Valores divergentes em torno da baseline zero.", "bar", {}, ["variance"]),
  chart("histogram", "Histogram", "Bins com limites numéricos; histogram() calcula contagens e densidades a partir de amostras.", "histogram", {}, ["scientific"]),
  chart("boxplot", "Box plot", "Quartis, mediana, extremos e dispersão.", "boxplot", {}, ["scientific", "statistics"]),
  chart("error-bars", "Error bars", "Estimativas com erro, limites inferior e superior.", "error-bar", {}, ["scientific"]),
  chart("range-area", "Range area", "Banda entre limites low e high ao longo do tempo.", "range-area", {}, ["forecast"]),
  chart("step-line", "Step line", "Mudanças discretas com patamares horizontais.", "step-line", {}, ["process"]),
  chart("spline", "Spline", "Curva suavizada para tendências contínuas.", "spline", {}, ["trend"]),
  chart("lollipop", "Lollipop", "Comparação leve por haste e marcador.", "lollipop", {}, ["comparison"]),
  chart("bullet", "Bullet chart", "Valor, referência e escala para KPIs compactos.", "bullet", { showAxes: false }, ["kpi"]),
  chart("radial-bars", "Radial bars", "Vários indicadores em anéis concêntricos.", "radial-bar", { showAxes: false }, ["kpi"]),
  chart("ohlc", "OHLC", "Ticks financeiros para abertura, máximo, mínimo e fecho.", "ohlc", {}, ["finance"]),
  chart("violin", "Violin plot", "KDE gaussiano de amostras brutas, com densidade espelhada por série.", "violin", {}, ["scientific", "statistics"]),
  chart("contour", "Contour plot", "Isolinhas de grelha escalar com coordenadas explícitas e marching squares.", "contour", { showAxes: false }, ["scientific"]),

  topology("service-map", "Mapa de serviços", "Serviços distribuídos por forças e relações observáveis.", "force", { layoutIterations: 90 }, ["services"]),
  topology("architecture-map", "Arquitetura hierárquica", "Camadas técnicas organizadas da origem ao consumidor.", "hierarchical", {}, ["architecture"]),
  topology("dependency-wheel", "Dependency wheel", "Dependências distribuídas radialmente.", "radial", {}, ["dependencies"]),
  topology("asset-grid", "Inventário de ativos", "Muitos nós organizados numa grelha previsível.", "grid", {}, ["assets"]),
  topology("manual-network", "Network map manual", "Coordenadas fornecidas pelo domínio sem auto-layout.", "manual", {}, ["network"]),
  topology("directed-dag", "Directed DAG", "Fluxo dirigido com níveis calculados.", "hierarchical", {}, ["dag"]),
  topology("org-network", "Rede organizacional", "Relações de colaboração em árvore hierárquica.", "hierarchical", { nodeRadius: 22 }, ["organization"]),
  topology("cloud-map", "Cloud topology", "Dependências entre regiões, serviços e bases de dados.", "force", { layoutIterations: 120 }, ["cloud"]),
  topology("supply-chain", "Supply chain", "Fluxo dirigido de fornecedor a distribuição.", "hierarchical", {}, ["operations"]),
  topology("incident-map", "Incident blast radius", "Serviço crítico no centro e dependências em redor.", "radial", { initialZoom: 1.1 }, ["incident"]),
  topology("mesh-topology", "Service mesh", "Malha de comunicação com múltiplas ligações laterais.", "force", { layoutIterations: 150 }, ["mesh"]),
  topology("security-graph", "Security graph", "Identidades, recursos e possíveis caminhos de ataque.", "hierarchical", {}, ["security"]),

  calendar("day-calendar", "Calendário diário", "Foco nas marcações de um único dia.", "day", {}, ["agenda"]),
  calendar("week-calendar", "Calendário semanal", "Semana completa com eventos editáveis.", "week", {}, ["week"]),
  calendar("workweek", "Semana de trabalho", "Segunda a sexta para equipas operacionais.", "workweek", {}, ["business"]),
  calendar("month-calendar", "Calendário mensal", "Visão global de entregas e compromissos.", "month", {}, ["month"]),
  calendar("resource-schedule", "Agenda de recursos", "Eventos coloridos e filtrados por recurso.", "resource-week", {}, ["resources"]),
  calendar("recurring-events", "Eventos recorrentes", "Expansão segura de regras RRULE na janela visível.", "month", { expandRecurrence: true }, ["rrule"]),
  calendar("all-day-planner", "All-day planner", "Marcos, ausências e eventos de dia inteiro.", "week", {}, ["all-day"]),
  calendar("timezone-calendar", "Calendário multi-timezone", "Apresentação consistente num fuso IANA explícito.", "week", { timeZone: "Europe/Lisbon" }, ["timezone"]),
  calendar("agenda-list", "Agenda list", "Lista cronológica, pesquisável e orientada a detalhe.", "agenda", {}, ["list"]),
  calendar("timeline-day", "Timeline diária", "Eventos posicionados numa linha temporal de um dia.", "timeline-day", {}, ["timeline"]),
  calendar("timeline-week", "Timeline semanal", "Planeamento linear de sete dias.", "timeline-week", {}, ["timeline"]),
  calendar("resource-day", "Scheduler diário", "Linhas por recurso e reservas num único dia.", "resource-day", {}, ["scheduler"]),
  calendar("resource-week", "Scheduler semanal", "Capacidade de recursos ao longo da semana.", "resource-week", {}, ["scheduler"]),
  calendar("year-planner", "Planeador anual", "Densidade de eventos em doze meses.", "year", {}, ["year"]),
  calendar("shift-scheduler", "Turnos de equipa", "Escalas operacionais por pessoa e período.", "resource-week", {}, ["shifts"]),
  calendar("room-booking", "Reserva de salas", "Disponibilidade e reservas por sala.", "resource-day", {}, ["booking"]),

  geoMap("point-map", "Point map", "Localizações pontuais com seleção acessível.", "points"),
  geoMap("bubble-map", "Bubble map", "Círculos proporcionais à magnitude geográfica.", "bubbles"),
  geoMap("route-map", "Route map", "Ligações curvas entre origens e destinos.", "routes"),
  geoMap("geo-heatmap", "Geographic heatmap", "Concentração espacial por gradientes de intensidade.", "heatmap"),
  geoMap("choropleth", "Choropleth", "Regiões preenchidas segundo valores do domínio.", "choropleth"),
  geoMap("mercator-map", "Mercator map", "Projeção Web Mercator navegável.", "points", "mercator"),
  geoMap("equirectangular-map", "Equirectangular map", "Latitude e longitude numa grelha linear.", "points", "equirectangular"),
  geoMap("orthographic-globe", "Orthographic globe", "Vista hemisférica com projeção de globo.", "points", "orthographic"),
  geoMap("flight-routes", "Flight routes", "Rotas aéreas dirigidas entre hubs.", "routes", "orthographic", {}, ["aviation"]),
  geoMap("store-locator", "Store locator", "Lojas, cobertura e seleção de pontos.", "points", "mercator", {}, ["retail"]),
  geoMap("live-vehicles", "Live vehicles", "Posições móveis atualizáveis pelo controller.", "bubbles", "mercator", {}, ["realtime"]),
  geoMap("coverage-map", "Coverage map", "Zonas de cobertura combinadas com pontos operacionais.", "choropleth", "mercator", {}, ["network"]),
  geoMap("risk-regions", "Risk regions", "Áreas geográficas coloridas por nível de risco.", "choropleth", "equirectangular", {}, ["risk"]),
  geoMap("migration-flows", "Migration flows", "Volumes e direções entre regiões do mundo.", "routes", "equirectangular", {}, ["flow"]),

  diagram("sankey", "Sankey", "Fluxos ponderados com largura proporcional ao valor.", "sankey", {}, ["flow"]),
  diagram("alluvial", "Alluvial", "Mudanças de composição entre várias etapas.", "alluvial", {}, ["flow"]),
  diagram("treemap", "Treemap", "Retângulos proporcionais; encaixe hierárquico ainda limitado.", "treemap", {}, ["hierarchy"]),
  diagram("sunburst", "Sunburst", "Hierarquia radial organizada por profundidade.", "sunburst", {}, ["hierarchy"]),
  diagram("icicle", "Icicle", "Hierarquia por níveis e blocos proporcionais.", "icicle", {}, ["hierarchy"]),
  diagram("circle-pack", "Circle packing", "Nós quantitativos em círculos proporcionais.", "circle-pack", {}, ["hierarchy"]),
  diagram("tree", "Tree diagram", "Árvore navegável com níveis calculados.", "tree", { orientation: "vertical" }, ["hierarchy"]),
  diagram("radial-tree", "Radial tree", "Estrutura hierárquica distribuída em redor do centro.", "radial-tree", {}, ["hierarchy"]),
  diagram("mindmap", "Mind map", "Ideias e relações organizadas radialmente.", "mindmap", {}, ["ideation"]),
  diagram("flowchart", "Flowchart", "Processos dirigidos entre passos e decisões.", "flowchart", {}, ["process"]),
  diagram("org-chart", "Org chart", "Estrutura de reporte e equipas.", "org-chart", { orientation: "vertical" }, ["organization"]),
  diagram("er-diagram", "ER diagram", "Preset de caixas e relações; sem notação ER especializada.", "er", {}, ["database"]),
  diagram("state-diagram", "State diagram", "Preset de nós e transições; sem execução de máquina de estados.", "state", {}, ["state"]),
  diagram("chord", "Chord diagram", "Relações circulares entre grupos.", "chord", {}, ["relations"]),
] as const;

export const visualCatalogCounts: Readonly<Record<VisualFamily, number>> = visualCatalog.reduce<Record<VisualFamily, number>>((counts, item) => {
  counts[item.family] += 1;
  return counts;
}, { gantt: 0, charts: 0, topology: 0, calendar: 0, maps: 0, diagrams: 0 });

/**
 * Returns the public visual primitive used by a recipe. Recipes with the same
 * key share a renderer geometry/view while keeping their own domain defaults.
 */
export function getVisualCatalogGroupKey(item: VisualCatalogItem): string {
  if (item.family === "gantt") return `${item.family}:${String(item.options.zoom)}`;
  if (item.family === "charts") return `${item.family}:${String(item.options.type)}`;
  if (item.family === "topology") return `${item.family}:${String(item.options.layout)}`;
  if (item.family === "calendar") return `${item.family}:${String(item.options.view)}`;
  if (item.family === "maps") return `${item.family}:${String(item.options.mode)}:${String(item.options.projection)}`;
  return `${item.family}:${String(item.options.type)}`;
}

export function groupVisualCatalog(items: readonly VisualCatalogItem[] = visualCatalog): readonly VisualCatalogGroup[] {
  const groups = new Map<string, VisualCatalogItem[]>();
  for (const item of items) {
    const key = getVisualCatalogGroupKey(item);
    const current = groups.get(key);
    if (current) current.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([id, groupItems]) => ({
    id,
    family: groupItems[0]!.family,
    variant: id.slice(id.indexOf(":") + 1).replaceAll(":", " · "),
    dataContract: groupItems[0]!.dataContract,
    items: groupItems,
  }));
}

export const visualCatalogGroups = groupVisualCatalog();

export const visualCatalogUniqueCounts: Readonly<Record<VisualFamily, number>> = visualCatalogGroups.reduce<Record<VisualFamily, number>>((counts, group) => {
  counts[group.family] += 1;
  return counts;
}, { gantt: 0, charts: 0, topology: 0, calendar: 0, maps: 0, diagrams: 0 });

export const visualCatalogStats = Object.freeze({
  components: 6,
  visualTypes: visualCatalogGroups.length,
  recipes: visualCatalog.length,
  additionalPresets: visualCatalog.length - visualCatalogGroups.length,
});

export function getVisualCatalogItem(id: string): VisualCatalogItem | undefined {
  return visualCatalog.find((item) => item.id === id);
}
