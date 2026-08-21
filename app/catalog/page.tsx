"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid coupling the Vinext client shell to Next router state */

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Chart, Gantt, Topology } from "@nodara/react";
import {
  normalizeCalendarEvents,
  normalizeChartSeries,
  normalizeGanttTasks,
  normalizeTopology,
  visualCatalog,
  visualCatalogCounts,
} from "@nodara/core";
import type {
  CalendarEvent,
  CalendarOptions,
  ChartOptions,
  ChartSeries,
  ChartType,
  GanttOptions,
  GanttTask,
  TopologyData,
  TopologyOptions,
  VisualCatalogItem,
  VisualFamily,
  VisualTheme,
} from "@nodara/core";
import { ArrowLeft, BookOpen, Check, ChevronRight, Copy, Database, Moon, Play, RotateCcw, Search, Sun } from "lucide-react";
import styles from "./catalog.module.css";

type CatalogData = GanttTask[] | ChartSeries[] | TopologyData | CalendarEvent[];
type FamilyFilter = "all" | VisualFamily;

const familyLabels: Record<VisualFamily, string> = {
  gantt: "Gantt",
  charts: "Gráficos",
  topology: "Topologias",
  calendar: "Calendários",
};

const familyColors: Record<VisualFamily, string> = {
  gantt: "#7884ff",
  charts: "#ff7657",
  topology: "#c8fa63",
  calendar: "#52d6c7",
};

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

function chartDataFor(item: VisualCatalogItem): ChartSeries[] {
  const type = item.options.type as ChartType;
  if (type === "gauge") return [{ id: "score", label: "SLA", color: "#c8fa63", data: [{ x: "SLA", y: 87, meta: { min: 0, max: 100 } }] }];
  if (type === "funnel") return [{ id: "funnel", label: "Conversão", data: [{ x: "Visitas", y: 12000 }, { x: "Trials", y: 7200 }, { x: "Ativações", y: 4100 }, { x: "Clientes", y: 1820 }] }];
  if (type === "waterfall") return [{ id: "variance", label: "Variação", data: [{ x: "Base", y: 120 }, { x: "Novos", y: 48 }, { x: "Expansão", y: 25 }, { x: "Churn", y: -31 }, { x: "Custos", y: -18 }] }];
  if (type === "candlestick") return [{ id: "ohlc", label: "NDR", data: [
    { x: "Seg", y: 106, meta: { open: 101, high: 109, low: 98, close: 106 } },
    { x: "Ter", y: 103, meta: { open: 106, high: 111, low: 101, close: 103 } },
    { x: "Qua", y: 112, meta: { open: 103, high: 116, low: 102, close: 112 } },
    { x: "Qui", y: 118, meta: { open: 112, high: 121, low: 109, close: 118 } },
    { x: "Sex", y: 115, meta: { open: 118, high: 120, low: 111, close: 115 } },
  ] }];
  if (type === "heatmap") return ["API", "Web", "Worker", "DB"].map((label, row) => ({ id: label.toLowerCase(), label, data: ["S", "T", "Q", "Q", "S", "S", "D"].map((x, column) => ({ x, y: ((row + 2) * (column + 3) * 13) % 97 })) }));
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

function sampleData(item: VisualCatalogItem): CatalogData {
  if (item.family === "gantt") return structuredClone(ganttData);
  if (item.family === "charts") return chartDataFor(item);
  if (item.family === "topology") return structuredClone(topologyData);
  return structuredClone(calendarData);
}

function normalizeData(item: VisualCatalogItem, json: string): CatalogData {
  const parsed: unknown = JSON.parse(json);
  if (item.family === "gantt") return normalizeGanttTasks(parsed as GanttTask[]);
  if (item.family === "charts") return normalizeChartSeries(parsed as ChartSeries[]);
  if (item.family === "topology") return normalizeTopology(parsed as TopologyData);
  return normalizeCalendarEvents(parsed as CalendarEvent[]);
}

function codeFor(item: VisualCatalogItem): string {
  const props = Object.entries(item.options).map(([key, value]) => typeof value === "string" ? `${key}="${value}"` : value === true ? key : `${key}={${String(value)}}`).join(" ");
  if (item.family === "gantt") return `<Gantt data={tasks} ${props}\n  onTaskChange={({ task }) => save(task)} />`;
  if (item.family === "charts") return `<Chart series={series} ${props}\n  showTooltip onPointSelect={({ point }) => inspect(point)} />`;
  if (item.family === "topology") return `<Topology data={network} ${props}\n  interactive={{ pan: true, zoom: true }} />`;
  return `<Calendar events={events} date="2026-08-20" ${props}\n  onEventChange={({ event }) => save(event)} />`;
}

function CatalogPreview({ data, item, onDataChange, onEvent, theme }: { data: CatalogData; item: VisualCatalogItem; onDataChange: (data: CatalogData) => void; onEvent: (message: string) => void; theme: VisualTheme }) {
  if (item.family === "gantt") {
    const options = item.options as Partial<Omit<GanttOptions, "data">>;
    return <Gantt data={data as GanttTask[]} {...options} start="2026-01-01" end="2026-04-30" theme={theme} locale="pt-PT" interactive onTaskSelect={({ task }) => onEvent(`task:select · ${task.label}`)} onTaskChange={({ task }) => { const next = (data as GanttTask[]).map((entry) => entry.id === task.id ? task : entry); onDataChange(next); onEvent(`task:change · ${task.label}`); }} style={{ height: 430 }} />;
  }
  if (item.family === "charts") {
    const options = item.options as Partial<Omit<ChartOptions, "series">>;
    return <Chart series={data as ChartSeries[]} {...options} theme={theme} locale="pt-PT" interactive showTooltip onPointSelect={({ point, series }) => onEvent(`point:select · ${series.label} / ${String(point.x)}`)} style={{ height: 430 }} />;
  }
  if (item.family === "topology") {
    const options = item.options as Partial<Omit<TopologyOptions, "data">>;
    return <Topology data={data as TopologyData} {...options} theme={theme} interactive={{ keyboard: true, pointer: true, pan: true, zoom: true }} onNodeSelect={({ node }) => onEvent(`node:select · ${node.label}`)} onViewportChange={({ zoom }) => onEvent(`viewport:change · ${zoom.toFixed(2)}×`)} style={{ height: 430 }} />;
  }
  const options = item.options as Partial<Omit<CalendarOptions, "events">>;
  return <Calendar events={data as CalendarEvent[]} {...options} date="2026-08-20" theme={theme} locale="pt-PT" interactive resources={[{ id: "product", label: "Produto", color: "#7884ff" }, { id: "studio", label: "Studio", color: "#52d6c7" }, { id: "platform", label: "Platform", color: "#ff7657" }]} onEventSelect={({ event }) => onEvent(`event:select · ${event.title}`)} onEventChange={({ event }) => { const next = (data as CalendarEvent[]).map((entry) => entry.id === event.id ? event : entry); onDataChange(next); onEvent(`event:change · ${event.title}`); }} style={{ height: 430 }} />;
}

export default function CatalogPage() {
  const [activeId, setActiveId] = useState(visualCatalog[0]!.id);
  const [filter, setFilter] = useState<FamilyFilter>("all");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<VisualTheme>("dark");
  const [data, setData] = useState<CatalogData>(() => sampleData(visualCatalog[0]!));
  const [editor, setEditor] = useState(() => JSON.stringify(sampleData(visualCatalog[0]!), null, 2));
  const [editorStatus, setEditorStatus] = useState("Dados de exemplo prontos.");
  const [eventLog, setEventLog] = useState("À espera de interação…");
  const [copied, setCopied] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLElement>(null);
  const activeItem = visualCatalog.find((item) => item.id === activeId) ?? visualCatalog[0]!;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-PT");
    return visualCatalog.filter((item) => (filter === "all" || item.family === filter) && (!normalized || `${item.name} ${item.description} ${item.tags.join(" ")}`.toLocaleLowerCase("pt-PT").includes(normalized)));
  }, [filter, query]);

  useEffect(() => {
    const selectHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const item = visualCatalog.find((entry) => entry.id === id);
      if (item) {
        const next = sampleData(item);
        setActiveId(item.id);
        setData(next);
        setEditor(JSON.stringify(next, null, 2));
        setEditorStatus("Dados de exemplo prontos.");
        setEventLog("À espera de interação…");
      }
    };
    const root = pageRef.current;
    if (root) root.dataset.catalogReady = "true";
    selectHash();
    window.addEventListener("hashchange", selectHash);
    return () => {
      if (root) delete root.dataset.catalogReady;
      window.removeEventListener("hashchange", selectHash);
    };
  }, []);

  const choose = (item: VisualCatalogItem) => {
    const next = sampleData(item);
    setActiveId(item.id);
    setData(next);
    setEditor(JSON.stringify(next, null, 2));
    setEditorStatus("Dados de exemplo prontos.");
    setEventLog("À espera de interação…");
    window.history.pushState(null, "", `#${item.id}`);
    if (window.innerWidth < 980) requestAnimationFrame(() => demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const updateData = (next: CatalogData) => {
    setData(next);
    setEditor(JSON.stringify(next, null, 2));
  };

  const applyEditor = () => {
    try {
      const next = normalizeData(activeItem, editor);
      setData(next);
      setEditor(JSON.stringify(next, null, 2));
      setEditorStatus("Dados validados e renderizados.");
    } catch (error) {
      setEditorStatus(error instanceof Error ? error.message : "Dados inválidos.");
    }
  };

  const reset = () => {
    const next = sampleData(activeItem);
    updateData(next);
    setEditorStatus("Exemplo reposto.");
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeFor(activeItem));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main ref={pageRef} className={styles.page} data-theme={theme}>
      <header className={styles.header}>
        <a className={styles.brand} href="/"><span>N</span>NODARA</a>
        <nav aria-label="Navegação principal">
          <a href="/"><ArrowLeft size={15} /> Portal</a>
          <a href="/docs"><BookOpen size={15} /> Documentação</a>
          <button type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <p>CATÁLOGO NODARA · PRIMEIRA COLEÇÃO</p>
        <h1>48 visualizações reais.<br /><span>Não quatro screenshots.</span></h1>
        <div className={styles.heroBottom}>
          <p>Quatro motores partilhados, 48 receitas utilizáveis e 14 geometrias de gráfico. Cada item abre uma instância real com dados editáveis, eventos e código de integração.</p>
          <div className={styles.metric}><strong>48</strong><span>demos funcionais</span></div>
          <div className={styles.metric}><strong>14</strong><span>tipos de gráfico</span></div>
          <div className={styles.metric}><strong>4</strong><span>motores</span></div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.collection}>
          <div className={styles.toolbar}>
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar visualização…" aria-label="Procurar no catálogo" /></label>
            <div className={styles.filters} role="group" aria-label="Filtrar por família">
              <button type="button" className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>Todas <span>48</span></button>
              {(Object.keys(familyLabels) as VisualFamily[]).map((family) => <button type="button" className={filter === family ? styles.activeFilter : ""} onClick={() => setFilter(family)} key={family}>{familyLabels[family]} <span>{visualCatalogCounts[family]}</span></button>)}
            </div>
          </div>
          <div className={styles.resultLine}><span>{filtered.length} resultados</span><span>Todos ligados ao core público</span></div>
          <div className={styles.grid}>
            {filtered.map((item, index) => (
              <button type="button" className={`${styles.card} ${activeItem.id === item.id ? styles.activeCard : ""}`} onClick={() => choose(item)} key={item.id} style={{ "--family": familyColors[item.family] } as React.CSSProperties} aria-label={`Abrir demonstração: ${item.name}`}>
                <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.cardFamily}>{familyLabels[item.family]}</span>
                <strong>{item.name}</strong>
                <span className={styles.cardDescription}>{item.description}</span>
                <span className={styles.tags}>{item.tags.slice(0, 3).map((tag, tagIndex) => <i key={`${tag}-${tagIndex}`}>{tag}</i>)}</span>
                <span className={styles.open}>Abrir demo real <ChevronRight size={15} /></span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <div className={styles.empty}>Nenhuma visualização corresponde à pesquisa.</div>}
        </div>

        <aside className={styles.demo} ref={demoRef} aria-label={`Demonstração de ${activeItem.name}`}>
          <div className={styles.demoHead}>
            <div><span style={{ color: familyColors[activeItem.family] }}>{familyLabels[activeItem.family]}</span><h2>{activeItem.name}</h2><p>{activeItem.description}</p></div>
            <span className={styles.realBadge}><Play size={12} fill="currentColor" /> MOTOR REAL</span>
          </div>
          <div className={styles.preview}>
            <CatalogPreview data={data} item={activeItem} onDataChange={updateData} onEvent={setEventLog} theme={theme} />
          </div>
          <div className={styles.liveBar}><span><i /> LIVE EVENT</span><code>{eventLog}</code></div>
          <div className={styles.demoTabs}>
            <section>
              <div className={styles.sectionTitle}><span><Database size={14} /> Dados editáveis</span><button type="button" onClick={reset}><RotateCcw size={13} /> Repor</button></div>
              <textarea value={editor} onChange={(event) => setEditor(event.target.value)} spellCheck={false} aria-label="Editar dados da demonstração" />
              <div className={styles.editorFooter}><span>{editorStatus}</span><button type="button" onClick={applyEditor}><Play size={13} fill="currentColor" /> Validar e renderizar</button></div>
            </section>
            <section>
              <div className={styles.sectionTitle}><span>Integração React</span><button type="button" onClick={copyCode}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copiado" : "Copiar"}</button></div>
              <pre><code>{codeFor(activeItem)}</code></pre>
              <dl className={styles.reference}>
                <div><dt>Dados</dt><dd>{activeItem.dataContract}</dd></div>
                <div><dt>Opções ativas</dt><dd>{Object.entries(activeItem.options).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</dd></div>
                <div><dt>Eventos</dt><dd>{activeItem.family === "gantt" ? "task:select · task:change" : activeItem.family === "charts" ? "point:select" : activeItem.family === "topology" ? "node:select · viewport:change" : "event:select · event:change"}</dd></div>
              </dl>
              <a className={styles.docsLink} href={`/docs#${activeItem.family === "charts" ? "charts" : activeItem.family}`}><BookOpen size={14} /> Abrir referência completa da API <ChevronRight size={14} /></a>
            </section>
          </div>
        </aside>
      </section>
    </main>
  );
}
