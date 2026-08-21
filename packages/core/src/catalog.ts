import type { CalendarView, ChartType, GanttZoom, TopologyLayout } from "./types";

export type VisualFamily = "gantt" | "charts" | "topology" | "calendar";

export interface VisualCatalogItem {
  id: string;
  family: VisualFamily;
  name: string;
  description: string;
  dataContract: "GanttTask[]" | "ChartSeries[]" | "TopologyData" | "CalendarEvent[]";
  tags: readonly string[];
  options: Readonly<Record<string, string | number | boolean>>;
}

const chart = (id: string, name: string, description: string, type: ChartType, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id,
  family: "charts",
  name,
  description,
  dataContract: "ChartSeries[]",
  tags: [type, ...tags],
  options: { type, ...options },
});

const gantt = (id: string, name: string, description: string, zoom: GanttZoom, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id,
  family: "gantt",
  name,
  description,
  dataContract: "GanttTask[]",
  tags: [zoom, ...tags],
  options: { zoom, ...options },
});

const topology = (id: string, name: string, description: string, layout: TopologyLayout, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id,
  family: "topology",
  name,
  description,
  dataContract: "TopologyData",
  tags: [layout, ...tags],
  options: { layout, ...options },
});

const calendar = (id: string, name: string, description: string, view: CalendarView, options: Readonly<Record<string, string | number | boolean>> = {}, tags: readonly string[] = []): VisualCatalogItem => ({
  id,
  family: "calendar",
  name,
  description,
  dataContract: "CalendarEvent[]",
  tags: [view, ...tags],
  options: { view, ...options },
});

export const visualCatalog: readonly VisualCatalogItem[] = [
  gantt("project-plan", "Plano de projeto", "Execução de projeto com progresso, owners e dependências.", "month", { dependencyRouting: "orthogonal" }, ["project"]),
  gantt("product-roadmap", "Roadmap de produto", "Iniciativas e releases distribuídas por trimestre.", "quarter", {}, ["roadmap"]),
  gantt("sprint-board", "Sprint timeline", "Trabalho de curta duração com snap diário.", "day", { snap: "day" }, ["agile"]),
  gantt("release-train", "Release train", "Cadência semanal de entregas interdependentes.", "week", { snap: "week" }, ["release"]),
  gantt("resource-plan", "Planeamento de recursos", "Tarefas agrupadas visualmente por responsável.", "week", { rowHeight: 64 }, ["resources"]),
  gantt("dependency-plan", "Mapa de dependências", "Relações ortogonais entre atividades críticas.", "month", { dependencyRouting: "orthogonal" }, ["dependencies"]),
  gantt("portfolio-plan", "Portefólio anual", "Programas executivos condensados em trimestres.", "quarter", { rowHeight: 48 }, ["portfolio"]),
  gantt("campaign-plan", "Campanha multicanal", "Conteúdo, media e lançamento coordenados por semana.", "week", { snap: "day" }, ["marketing"]),
  gantt("construction-plan", "Plano de construção", "Fases longas, predecessoras e percentagem concluída.", "month", { dependencyRouting: "straight" }, ["construction"]),
  gantt("migration-plan", "Migração técnica", "Cutover detalhado e tarefas editáveis ao dia.", "day", { snap: "day" }, ["migration"]),

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
  chart("candlestick", "Candlestick", "OHLC financeiro através de meta.open/high/low/close.", "candlestick", {}, ["finance", "ohlc"]),
  chart("sparkline", "Sparkline", "Tendência compacta sem eixos, grelha ou legenda.", "line", { showAxes: false, showGrid: false, showLegend: false }, ["compact"]),
  chart("time-series", "Time series", "Série temporal com Date ou timestamp no eixo x.", "line", {}, ["time"]),
  chart("negative-bars", "Positive / negative bars", "Valores divergentes em torno da baseline zero.", "bar", {}, ["variance"]),

  topology("service-map", "Mapa de serviços", "Serviços distribuídos por forças e relações observáveis.", "force", { layoutIterations: 90 }, ["services"]),
  topology("architecture-map", "Arquitetura hierárquica", "Camadas técnicas organizadas da origem ao consumidor.", "hierarchical", {}, ["architecture"]),
  topology("dependency-wheel", "Dependency wheel", "Dependências distribuídas radialmente.", "radial", {}, ["dependencies"]),
  topology("asset-grid", "Inventário de ativos", "Muitos nós organizados numa grelha previsível.", "grid", {}, ["assets"]),
  topology("manual-network", "Network map manual", "Coordenadas fornecidas pelo domínio sem auto-layout.", "manual", {}, ["network"]),
  topology("directed-dag", "Directed DAG", "Fluxo dirigido com níveis calculados.", "hierarchical", {}, ["dag"]),
  topology("org-chart", "Organograma", "Relações de reporte em árvore hierárquica.", "hierarchical", { nodeRadius: 22 }, ["organization"]),
  topology("cloud-map", "Cloud topology", "Dependências entre regiões, serviços e bases de dados.", "force", { layoutIterations: 120 }, ["cloud"]),
  topology("supply-chain", "Supply chain", "Fluxo dirigido de fornecedor a distribuição.", "hierarchical", {}, ["operations"]),
  topology("incident-map", "Incident blast radius", "Serviço crítico no centro e dependências em redor.", "radial", { initialZoom: 1.1 }, ["incident"]),

  calendar("day-agenda", "Agenda diária", "Foco nas marcações de um único dia.", "day", {}, ["agenda"]),
  calendar("week-calendar", "Calendário semanal", "Semana completa com eventos editáveis.", "week", {}, ["week"]),
  calendar("workweek", "Semana de trabalho", "Segunda a sexta para equipas operacionais.", "workweek", {}, ["business"]),
  calendar("month-calendar", "Calendário mensal", "Visão global de entregas e compromissos.", "month", {}, ["month"]),
  calendar("resource-schedule", "Agenda de recursos", "Eventos coloridos e filtrados por recurso.", "workweek", {}, ["resources"]),
  calendar("recurring-events", "Eventos recorrentes", "Expansão segura de regras RRULE na janela visível.", "month", { expandRecurrence: true }, ["rrule"]),
  calendar("all-day-planner", "All-day planner", "Marcos, ausências e eventos de dia inteiro.", "week", {}, ["all-day"]),
  calendar("timezone-calendar", "Calendário multi-timezone", "Apresentação consistente num fuso IANA explícito.", "week", { timeZone: "Europe/Lisbon" }, ["timezone"]),
] as const;

export const visualCatalogCounts: Readonly<Record<VisualFamily, number>> = visualCatalog.reduce<Record<VisualFamily, number>>((counts, item) => {
  counts[item.family] += 1;
  return counts;
}, { gantt: 0, charts: 0, topology: 0, calendar: 0 });

export function getVisualCatalogItem(id: string): VisualCatalogItem | undefined {
  return visualCatalog.find((item) => item.id === id);
}
