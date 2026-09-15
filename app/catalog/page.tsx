"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid coupling the Vinext client shell to Next router state */

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Chart, Diagram, Gantt, GeoMap, Topology } from "@nodara/react";
import {
  replaceCalendarEvent,
  groupVisualCatalog,
  visualCatalog,
  visualCatalogCounts,
  visualCatalogGroups,
  visualCatalogStats,
  visualCatalogUniqueCounts,
} from "@nodara/core";
import type {
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
  TopologyData,
  TopologyOptions,
  VisualCatalogItem,
  VisualFamily,
  VisualTheme,
} from "@nodara/core";
import { ArrowLeft, BookOpen, ChevronRight, Database, Moon, Play, RotateCcw, Search, Sun } from "lucide-react";
import styles from "./catalog.module.css";
import { sampleData, normalizeData, type CatalogData } from "./catalog-data";
import { previewOptions, type IntegrationSettings } from "./integration";
import IntegrationWorkbench from "./integration-workbench";
import { recipeLimitations } from "./capabilities";

type FamilyFilter = "all" | VisualFamily;
type CatalogView = "components" | "types" | "recipes";

const familyLabels: Record<VisualFamily, string> = {
  gantt: "Gantt",
  charts: "Gráficos",
  topology: "Topologias",
  calendar: "Calendários",
  maps: "Mapas",
  diagrams: "Diagramas",
};

const familyColors: Record<VisualFamily, string> = {
  gantt: "#7884ff",
  charts: "#ff7657",
  topology: "#c8fa63",
  calendar: "#52d6c7",
  maps: "#43a9ff",
  diagrams: "#bf7cff",
};


function CatalogPreview({ data, item, onDataChange, onEvent, settings }: { data: CatalogData; item: VisualCatalogItem; onDataChange: (data: CatalogData) => void; onEvent: (message: string) => void; settings: IntegrationSettings }) {
  if (item.family === "gantt") {
    const options = previewOptions(item, settings) as Partial<Omit<GanttOptions, "data">>;
    return <Gantt data={data as GanttTask[]} {...options} onTaskSelect={({ task }) => onEvent(`task:select · ${task.label}`)} onTaskChange={({ task }) => { const next = (data as GanttTask[]).map((entry) => entry.id === task.id ? task : entry); onDataChange(next); onEvent(`task:change · ${task.label}`); }} style={{ height: settings.height }} />;
  }
  if (item.family === "charts") {
    const options = previewOptions(item, settings) as Partial<Omit<ChartOptions, "series">>;
    return <Chart series={data as ChartSeries[]} {...options} showTooltip onPointSelect={({ point, series }) => onEvent(`point:select · ${series.label} / ${String(point.x)}`)} style={{ height: settings.height }} />;
  }
  if (item.family === "topology") {
    const options = previewOptions(item, settings) as Partial<Omit<TopologyOptions, "data">>;
    return <Topology data={data as TopologyData} {...options} onNodeSelect={({ node }) => onEvent(`node:select · ${node.label}`)} onViewportChange={({ zoom }) => onEvent(`viewport:change · ${zoom.toFixed(2)}×`)} style={{ height: settings.height }} />;
  }
  if (item.family === "maps") {
    const options = previewOptions(item, settings) as Partial<Omit<GeoMapOptions, "data">>;
    return <GeoMap data={data as GeoMapData} {...options} onPointSelect={({ point }) => onEvent(`point:select · ${point.label}`)} onViewportChange={({ zoom }) => onEvent(`viewport:change · ${zoom.toFixed(2)}×`)} style={{ height: settings.height }} />;
  }
  if (item.family === "diagrams") {
    const options = previewOptions(item, settings) as Partial<Omit<DiagramOptions, "data">>;
    return <Diagram data={data as DiagramData} {...options} onNodeSelect={({ node }) => onEvent(`node:select · ${node.label}`)} style={{ height: settings.height }} />;
  }
  const options = previewOptions(item, settings) as Partial<Omit<CalendarOptions, "events">>;
  return <Calendar events={data as CalendarEvent[]} {...options} date="2026-08-20" resources={[{ id: "product", label: "Produto", color: "#7884ff" }, { id: "studio", label: "Studio", color: "#52d6c7" }, { id: "platform", label: "Platform", color: "#ff7657" }]} onEventSelect={({ event }) => onEvent(`event:select · ${event.title}`)} onEventChange={({ event, previousEvent }) => { const next = replaceCalendarEvent(data as CalendarEvent[], previousEvent.id, event); onDataChange(next); onEvent(`event:change · ${event.title}`); }} style={{ height: settings.height }} />;
}

export default function CatalogPage() {
  const [activeId, setActiveId] = useState(visualCatalog[0]!.id);
  const [catalogView, setCatalogView] = useState<CatalogView>("components");
  const [filter, setFilter] = useState<FamilyFilter>("all");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<VisualTheme>("dark");
  const [data, setData] = useState<CatalogData>(() => sampleData(visualCatalog[0]!));
  const [editor, setEditor] = useState(() => JSON.stringify(sampleData(visualCatalog[0]!), null, 2));
  const [editorStatus, setEditorStatus] = useState("Dados de exemplo prontos.");
  const [eventLog, setEventLog] = useState("À espera de interação…");
  const [interactive, setInteractive] = useState(true);
  const [height, setHeight] = useState(420);
  const [autoApply, setAutoApply] = useState(true);
  const [editorError, setEditorError] = useState(false);
  const settings = { theme, interactive, height };
  const pageRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLElement>(null);
  const activeItem = visualCatalog.find((item) => item.id === activeId) ?? visualCatalog[0]!;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-PT");
    return visualCatalog.filter((item) => (filter === "all" || item.family === filter) && (!normalized || `${familyLabels[item.family]} ${item.family} ${Object.values(item.options).join(" ")} ${item.name} ${item.description} ${item.tags.join(" ")}`.toLocaleLowerCase("pt-PT").includes(normalized)));
  }, [filter, query]);
  const filteredGroups = useMemo(() => groupVisualCatalog(filtered), [filtered]);
  const activeGroup = visualCatalogGroups.find((group) => group.items.some((item) => item.id === activeItem.id)) ?? visualCatalogGroups[0]!;
  const componentItems = filtered.filter((item, index, all) => all.findIndex(candidate => candidate.family === item.family) === index);
  const resultCount = catalogView === "components" ? componentItems.length : catalogView === "types" ? filteredGroups.length : filtered.length;
  const resultNoun = catalogView === "components" ? "componente" : catalogView === "types" ? "variante" : "exemplo";
  const variantTitle = (item: VisualCatalogItem) => { const group = visualCatalogGroups.find(group => group.items.some(recipe => recipe.id === item.id))!; const label = ({ day: "diário", week: "semanal", month: "mensal", quarter: "trimestral" } as Record<string, string>)[group.variant] ?? group.variant.replaceAll("-", " "); return `${familyLabels[item.family]} · ${label}`; };

  useEffect(() => {
    const selectHash = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const item = visualCatalog.find((entry) => entry.id === id);
      if (item) {
        setFilter(item.family); setQuery(""); setCatalogView("types");
        const next = sampleData(item);
        setActiveId(item.id);
        setData(next);
        setEditor(JSON.stringify(next, null, 2));
        setEditorStatus("Dados de exemplo prontos.");
        setEditorError(false);
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

  const choose = (item: VisualCatalogItem, scroll = true) => {
    const next = sampleData(item);
    setActiveId(item.id);
    setData(next);
    setEditor(JSON.stringify(next, null, 2));
    setEditorStatus("Dados de exemplo prontos.");
    setEditorError(false);
    setEventLog("À espera de interação…");
    window.history.pushState(null, "", `#${item.id}`);
    if (scroll && window.innerWidth < 980) requestAnimationFrame(() => demoRef.current?.scrollIntoView({ behavior: "instant", block: "start" }));
  };

  const updateData = (next: CatalogData) => {
    setData(next);
    setEditor(JSON.stringify(next, null, 2));
    setEditorError(false);
  };

  useEffect(() => {
    if (!autoApply) return;
    const timeout = window.setTimeout(() => {
      try {
        const next = normalizeData(activeItem, editor);
        setData(next);
        setEditorError(false);
        setEditorStatus("Preview atualizado automaticamente.");
      } catch (error) {
        setEditorError(true);
        setEditorStatus(error instanceof Error ? error.message : "Dados inválidos.");
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [activeItem, editor, autoApply]);

  const applyEditor = () => {
    try {
      const next = normalizeData(activeItem, editor);
      setData(next);
      setEditor(JSON.stringify(next, null, 2));
      setEditorStatus("Dados validados e renderizados.");
      setEditorError(false);
    } catch (error) {
      setEditorError(true);
      setEditorStatus(error instanceof Error ? error.message : "Dados inválidos.");
    }
  };

  const reset = () => {
    const next = sampleData(activeItem);
    updateData(next);
    setEditorStatus("Exemplo reposto.");
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
        <p>CATÁLOGO NODARA · ARQUITETURA EXPLICADA</p>
        <h1>Explora. Ajusta.<br /><span>Copia e integra.</span></h1>
        <div className={styles.heroBottom}>
          <p>Começa pelo componente, escolhe uma variante e experimenta um exemplo editável. São {visualCatalogStats.components} APIs públicas e {visualCatalogStats.recipes} exemplos ilustrativos — não {visualCatalogStats.recipes} componentes independentes. Variantes partilham infraestrutura; os limites estão junto de cada exemplo.</p>
          <div className={styles.metric}><strong>{visualCatalogStats.components}</strong><span>componentes públicos</span></div>
          <div className={styles.metric}><strong data-contrast-sample="accent">{visualCatalogStats.visualTypes}</strong><span>variantes configuráveis</span></div>
          <div className={styles.metric}><strong>{visualCatalogStats.recipes}</strong><span>exemplos editáveis</span></div>
        </div>
        <div className={styles.modelStrip} aria-label="Modelo do catálogo">
          <div><span>01</span><strong>Componente</strong><small>API e contrato comuns</small></div>
          <ChevronRight aria-hidden="true" />
          <div><span>02</span><strong>Variante</strong><small>Geometria, vista ou configuração</small></div>
          <ChevronRight aria-hidden="true" />
          <div><span>03</span><strong>Exemplo</strong><small>Dados ilustrativos e opções</small></div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.collection}>
          <div className={styles.toolbar}>
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar visualização…" aria-label="Procurar no catálogo" /></label>
            <div className={styles.viewSwitch} role="group" aria-label="Nível de detalhe do catálogo">
              <button type="button" aria-pressed={catalogView === "components"} className={catalogView === "components" ? styles.activeView : ""} onClick={() => setCatalogView("components")}><strong>Componentes</strong><span>{visualCatalogStats.components} APIs públicas</span></button>
              <button type="button" aria-pressed={catalogView === "types"} className={catalogView === "types" ? styles.activeView : ""} onClick={() => setCatalogView("types")}><strong>Variantes</strong><span>{visualCatalogStats.visualTypes} configurações</span></button>
              <button type="button" aria-pressed={catalogView === "recipes"} className={catalogView === "recipes" ? styles.activeView : ""} onClick={() => setCatalogView("recipes")}><strong>Exemplos</strong><span>{visualCatalogStats.recipes} receitas ilustrativas</span></button>
            </div>
            <div className={styles.filters} role="group" aria-label="Filtrar por família">
              <button type="button" className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>Todas <span>{catalogView === "components" ? visualCatalogStats.components : catalogView === "types" ? visualCatalogStats.visualTypes : visualCatalogStats.recipes}</span></button>
              {(Object.keys(familyLabels) as VisualFamily[]).map((family) => <button type="button" className={filter === family ? styles.activeFilter : ""} onClick={() => setFilter(family)} key={family}>{familyLabels[family]} <span>{catalogView === "components" ? 1 : catalogView === "types" ? visualCatalogUniqueCounts[family] : visualCatalogCounts[family]}</span></button>)}
            </div>
          </div>
          <div className={styles.resultLine}><span>{resultCount} {resultNoun}{resultCount === 1 ? "" : "s"}</span><span>{catalogView === "types" ? `${filtered.length} ${filtered.length === 1 ? "exemplo disponível" : "exemplos disponíveis"}` : "Todos ligados ao core público"}</span></div>
          <div className={styles.grid}>
            {(catalogView === "components" ? componentItems.map(item => ({ item, recipes: filtered.filter(recipe => recipe.family === item.family) })) : catalogView === "types" ? filteredGroups.map((group) => ({ item: group.items[0]!, recipes: group.items })) : filtered.map((item) => ({ item, recipes: [item] }))).map(({ item, recipes }, index) => (
              <button type="button" data-catalog-id={item.id} className={`${styles.card} ${recipes.some((recipe) => recipe.id === activeItem.id) ? styles.activeCard : ""}`} onClick={() => { if (catalogView === "components") { setFilter(item.family); setCatalogView("types"); } choose(item, catalogView !== "components"); }} key={catalogView === "types" ? `${item.family}-${recipes.map((recipe) => recipe.id).join("-")}` : item.id} style={{ "--family": theme === "light" ? "var(--accent)" : familyColors[item.family] } as React.CSSProperties} aria-label={catalogView === "components" ? `Explorar componente: ${familyLabels[item.family]}` : catalogView === "types" ? `Explorar variante: ${variantTitle(item)}` : `Abrir demonstração: ${item.name}`}>
                <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.cardFamily}>{familyLabels[item.family]} · {catalogView === "components" ? "COMPONENTE" : catalogView === "types" ? "VARIANTE" : "EXEMPLO"}</span>
                <strong>{catalogView === "components" ? familyLabels[item.family] : catalogView === "types" ? variantTitle(item) : item.name}</strong>
                <span className={styles.cardDescription}>{catalogView === "components" ? `${item.dataContract} · ${visualCatalogUniqueCounts[item.family]} variantes · ${visualCatalogCounts[item.family]} exemplos` : catalogView === "types" ? `${item.dataContract} · ${recipes.length} exemplo(s) com esta configuração` : item.description}</span>
                <span className={styles.tags}>{item.tags.slice(0, 3).map((tag, tagIndex) => <i key={`${tag}-${tagIndex}`}>{tag}</i>)}</span>
                <span className={styles.open}>{catalogView === "components" ? "Explorar variantes" : recipes.length > 1 ? `${recipes.length} exemplos · abrir grupo` : "Abrir demo real"} <ChevronRight size={15} /></span>
              </button>
            ))}
          </div>
          {resultCount === 0 && <div className={styles.empty}>Nenhuma visualização corresponde à pesquisa.</div>}
        </div>

        <aside className={styles.demo} data-active-id={activeItem.id} ref={demoRef} aria-label={`Demonstração de ${activeItem.name}`}>
          <div className={styles.demoHead}>
            <div><span style={{ color: theme === "light" ? "var(--accent)" : familyColors[activeItem.family] }}>{familyLabels[activeItem.family]} · {activeGroup.variant}</span><h2>{activeItem.name}</h2><p>{activeItem.description}</p>
              <p>Componente: {familyLabels[activeItem.family]} · Variante: {activeGroup.variant} · Exemplo ilustrativo</p>
              {activeGroup.items.length > 1 && <label className={styles.recipePicker}>Exemplo desta variante<select aria-label="Escolher exemplo desta variante" value={activeItem.id} onChange={(event) => { const item = visualCatalog.find((entry) => entry.id === event.target.value); if (item) choose(item); }}>{activeGroup.items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
            </div>
            <span className={styles.realBadge}><Play size={12} fill="currentColor" /> MOTOR REAL</span>
          </div>
          <div className={styles.preview}>
            <CatalogPreview data={data} item={activeItem} onDataChange={updateData} onEvent={setEventLog} settings={settings} />
          </div>
          <div className={styles.liveBar}><span><i /> LIVE EVENT</span><code>{eventLog}</code></div>
          <div className={styles.demoTabs}>
            <section>
              <div className={styles.sectionTitle}><span><Database size={14} /> Dados editáveis</span><button type="button" onClick={reset}><RotateCcw size={13} /> Repor</button></div>
              <label className={styles.checkbox}><input type="checkbox" checked={autoApply} onChange={event => setAutoApply(event.target.checked)} /> Renderizar enquanto escrevo</label>
              <textarea value={editor} onChange={(event) => setEditor(event.target.value)} spellCheck={false} aria-label="Editar dados da demonstração" aria-invalid={editorError} aria-describedby="catalog-editor-status" />
              <div className={styles.editorFooter}><span id="catalog-editor-status" role={editorError ? "alert" : "status"} aria-live="polite">{editorStatus}{editorError ? " O último preview válido foi preservado." : ""}</span><button type="button" data-contrast-sample="action" onClick={applyEditor}><Play size={13} fill="currentColor" /> Validar e renderizar</button></div>
            </section>
            <section>
              <div className={styles.sectionTitle}><span>Contrato e limites</span></div>
              {recipeLimitations(activeItem).length > 0 && <div className={styles.warning} aria-label="Limitações desta receita">{recipeLimitations(activeItem).map(note => <p key={note}>{note}</p>)}</div>}
              <dl className={styles.reference}>
                <div><dt>Dados</dt><dd>{activeItem.dataContract}</dd></div>
                <div><dt>Opções ativas</dt><dd>{Object.entries(activeItem.options).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</dd></div>
                <div><dt>Eventos</dt><dd>{activeItem.family === "gantt" ? "task:select · task:change" : activeItem.family === "charts" ? "point:select" : activeItem.family === "maps" ? "point:select · viewport:change" : activeItem.family === "topology" ? "node:select · viewport:change" : activeItem.family === "diagrams" ? "node:select" : "event:select · event:change"}</dd></div>
              </dl>
              <a className={styles.docsLink} href={`/docs#${activeItem.family === "charts" ? "charts" : activeItem.family === "maps" ? "geo-map" : activeItem.family === "diagrams" ? "diagram" : activeItem.family}`}><BookOpen size={14} /> Abrir referência completa da API <ChevronRight size={14} /></a>
            </section>
          </div>
          <IntegrationWorkbench item={activeItem} data={data} settings={settings} pending={editorError || (() => { try { return JSON.stringify(normalizeData(activeItem, editor)) !== JSON.stringify(data); } catch { return true; } })()} onSettingsChange={next => { setTheme(next.theme); setInteractive(next.interactive); setHeight(next.height); }} />
        </aside>
      </section>
    </main>
  );
}
