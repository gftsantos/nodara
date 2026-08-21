"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Chart, Gantt, Topology } from "@nodara/react";
import {
  normalizeCalendarEvents,
  normalizeChartSeries,
  normalizeGanttTasks,
  normalizeTopology,
} from "@nodara/core";
import type { CalendarEvent, ChartSeries, GanttTask, TopologyData, VisualTheme } from "@nodara/core";
import {
  ArrowRight,
  BarChart3,
  Braces,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  Command,
  Copy,
  ExternalLink,
  FileJson,
  Gauge,
  Menu,
  Moon,
  Network,
  PackageCheck,
  PanelLeftClose,
  Play,
  RotateCcw,
  Rows3,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";

type FeatureId = "gantt" | "charts" | "topology" | "calendar";
type FrameworkId = "react" | "angular" | "vue" | "vanilla";
type DialogId = "example" | "schemas" | "tokens" | "accessibility" | "help" | "architecture";

const featureItems: Array<{
  id: FeatureId;
  name: string;
  description: string;
  icon: typeof Rows3;
  accent: string;
  count: number;
}> = [
  {
    id: "gantt",
    name: "Gantt",
    description: "Planos, recursos e dependências",
    icon: Rows3,
    accent: "#6e7dff",
    count: 10,
  },
  {
    id: "charts",
    name: "Gráficos",
    description: "Dashboards e análise em tempo real",
    icon: BarChart3,
    accent: "#ff7657",
    count: 20,
  },
  {
    id: "topology",
    name: "Grafos & topologias",
    description: "Sistemas, redes e relações",
    icon: Network,
    accent: "#c8fa63",
    count: 10,
  },
  {
    id: "calendar",
    name: "Calendários",
    description: "Agenda, recursos e recorrências",
    icon: CalendarDays,
    accent: "#52d6c7",
    count: 8,
  },
];

const frameworks: Array<{ id: FrameworkId; label: string; install: string }> = [
  { id: "react", label: "React", install: "npm i @nodara/react" },
  { id: "angular", label: "Angular", install: "npm i @nodara/angular" },
  { id: "vue", label: "Vue", install: "npm i @nodara/vue" },
  { id: "vanilla", label: "JavaScript", install: "npm i @nodara/core" },
];

const snippets: Record<FrameworkId, string> = {
  react: `import { Gantt } from '@nodara/react';
import '@nodara/core/styles.css';

export function ProductPlan() {
  return (
    <Gantt
      data={roadmap}
      start="2026-01-01"
      zoom="month"
      onTaskChange={syncTask}
    />
  );
}`,
  angular: `import { NodaraGanttComponent } from '@nodara/angular';

@Component({
  selector: 'product-plan',
  imports: [NodaraGanttComponent],
  template: \`
    <nd-gantt
      [data]="roadmap"
      [options]="{ zoom: 'month' }"
      (taskSelect)="openTask($event)"
    />
  \`,
})
export class ProductPlan {}`,
  vue: `<script setup lang="ts">
import { NodaraGantt } from '@nodara/vue';
import '@nodara/core/styles.css';
</script>

<template>
  <NodaraGantt
    :data="roadmap"
    :options="{ zoom: 'month' }"
    @task-change="syncTask"
  />
</template>`,
  vanilla: `import { createGantt } from '@nodara/core';
import '@nodara/core/styles.css';

const gantt = createGantt('#roadmap', {
  data: roadmap,
  start: '2026-01-01',
  zoom: 'month',
});

gantt.on('task:change', syncTask);`,
};

const featureSnippets: Record<FeatureId, string> = {
  gantt: `<Gantt
  data={roadmap}
  start="2026-01-01"
  end="2026-04-30"
  zoom="month"
  onTaskChange={syncTask}
/>`,
  charts: `<Chart
  series={revenue}
  type="area"
  stacked
  showTooltip
  valueFormatter={formatCurrency}
/>`,
  topology: `<Topology
  data={services}
  layout="hierarchical"
  renderer="auto"
  interactive={{ pan: true, zoom: true }}
/>`,
  calendar: `<Calendar
  events={schedule}
  date="2026-08-20"
  view="workweek"
  expandRecurrence
  onEventChange={syncEvent}
/>`,
};

const foundationDetails = {
  schemas: {
    eyebrow: "CONTRATO DE DADOS",
    title: "Tipos & schemas",
    description: "Contratos TypeScript exportados por cada pacote e validação em runtime antes de qualquer renderização.",
    items: ["Erros com código, caminho e sugestão de correção", "Normalização imutável em todas as atualizações", "Tipos partilhados entre React, Angular, Vue e JavaScript"],
    code: `import type { GanttTask } from '@nodara/core';

const task: GanttTask = {
  id: 'ND-104',
  label: 'Motor de permissões',
  start: '2026-02-03',
  end: '2026-03-18',
  progress: 72,
};`,
  },
  tokens: {
    eyebrow: "DESIGN SYSTEM",
    title: "Temas & tokens",
    description: "Personaliza cores, tipografia, espaçamento e estados sem alterar a lógica do componente.",
    items: ["Temas dark e light incluídos", "Tokens globais ou por instância", "Contraste validado para estados críticos"],
    code: `const theme = {
  background: '#0b0e0f',
  surface: '#121617',
  foreground: '#f3f4ef',
  primary: '#c8fa63',
  radius: 8,
};

<Topology data={services} theme={theme} />`,
  },
  accessibility: {
    eyebrow: "INCLUSÃO POR DEFEITO",
    title: "Acessibilidade",
    description: "Cada visualização mantém uma representação semântica paralela ao Canvas ou WebGL.",
    items: ["Navegação e seleção por teclado", "Rótulos para leitores de ecrã", "Modo de movimento reduzido", "Contraste e foco visível testados"],
    code: `interactive={{
  keyboard: true,
  pointer: true,
  pan: true,
  zoom: true,
}}
ariaLabel="Topologia dos serviços de produção"`,
  },
} as const;

const featureCopy: Record<
  FeatureId,
  { eyebrow: string; title: string; description: string }
> = {
  gantt: {
    eyebrow: "PLANEAMENTO",
    title: "Roadmap de produto",
    description: "Dependências, marcos e capacidade numa única linha temporal.",
  },
  charts: {
    eyebrow: "ANALYTICS",
    title: "Receita em movimento",
    description: "Milhares de pontos, transições fluidas e zero configuração.",
  },
  topology: {
    eyebrow: "OBSERVABILIDADE",
    title: "Topologia de serviços",
    description: "Relações complexas que a tua equipa entende num relance.",
  },
  calendar: {
    eyebrow: "OPERAÇÕES",
    title: "Agenda da equipa",
    description: "Recursos, fusos horários e recorrências sem arestas soltas.",
  },
};

const searchEntries = [
  "Gantt · dependências",
  "Gantt · drag & drop",
  "Gráficos · séries temporais",
  "Gráficos · acessibilidade",
  "Topologias · auto-layout",
  "Topologias · WebGL",
  "Calendário · recorrências",
  "Calendário · recursos",
  "Guia de migração",
  "Tokens de design",
];

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="copy-button" onClick={copy} aria-label={`${label}: ${value}`}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copiado" : label}</span>
    </button>
  );
}

const initialGanttTasks: GanttTask[] = [
  { id: "discovery", label: "Discovery", start: "2026-01-04", end: "2026-01-30", progress: 100, owner: { name: "Marta", color: "#7884ff" }, color: "#7884ff" },
  { id: "design", label: "Design system", start: "2026-01-24", end: "2026-03-05", progress: 82, dependencies: ["discovery"], owner: { name: "Inês", color: "#ff7657" }, color: "#ff7657" },
  { id: "renderer", label: "Core renderer", start: "2026-02-19", end: "2026-04-02", progress: 64, dependencies: ["design"], owner: { name: "Luís", color: "#c8fa63" }, color: "#c8fa63" },
  { id: "a11y", label: "Acessibilidade", start: "2026-03-11", end: "2026-04-11", progress: 38, dependencies: ["renderer"], owner: { name: "Sofia", color: "#52d6c7" }, color: "#52d6c7" },
  { id: "release", label: "Release 1.0", start: "2026-04-01", end: "2026-04-22", progress: 12, dependencies: ["a11y"], owner: { name: "Equipa", color: "#f5c451" }, color: "#f5c451" },
];

const baseChartSeries: ChartSeries[] = [
  { id: "actual", label: "MRR", color: "#7884ff", data: [31, 46, 42, 68, 58, 77, 70, 90, 76, 96].map((y, index) => ({ x: ["NOV", "DEZ", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO"][index]!, y: y * 4_820 })) },
  { id: "forecast", label: "Forecast", color: "#52d6c7", data: [28, 39, 45, 57, 64, 70, 78, 84, 91, 100].map((y, index) => ({ x: index, y: y * 1_600 })) },
];

const baseTopology: TopologyData = {
  nodes: [
    { id: "gateway", label: "API Gateway", status: "healthy", value: "2.4k/s" },
    { id: "auth", label: "Auth", status: "healthy", value: "99.99%" },
    { id: "billing", label: "Billing", status: "warning", value: "99.97%" },
    { id: "events", label: "Events", status: "healthy", value: "8.1k/s" },
    { id: "warehouse", label: "Warehouse", status: "healthy", value: "12.8 TB" },
  ],
  edges: [
    { from: "gateway", to: "auth", directed: true, label: "JWT" },
    { from: "gateway", to: "billing", directed: true },
    { from: "gateway", to: "events", directed: true },
    { from: "events", to: "warehouse", directed: true },
    { from: "billing", to: "warehouse", directed: true },
  ],
};

const baseCalendarEvents: CalendarEvent[] = [
  { id: "planning", title: "Planning", start: "2026-08-17T09:30:00", durationMinutes: 60, resourceId: "product", color: "#7884ff", recurrence: "FREQ=DAILY;COUNT=5" },
  { id: "research", title: "Research", start: "2026-08-18T13:00:00", durationMinutes: 90, resourceId: "studio", color: "#52d6c7" },
  { id: "api-review", title: "API review", start: "2026-08-19T10:30:00", durationMinutes: 75, resourceId: "platform", color: "#ff7657" },
  { id: "release", title: "Release 1.0", start: "2026-08-21T12:00:00", durationMinutes: 120, allDay: false, color: "#f5c451" },
];

type PlaygroundDataMap = {
  gantt: GanttTask[];
  charts: ChartSeries[];
  topology: TopologyData;
  calendar: CalendarEvent[];
};

const initialPlaygroundData: PlaygroundDataMap = {
  gantt: initialGanttTasks,
  charts: baseChartSeries,
  topology: baseTopology,
  calendar: baseCalendarEvents,
};

const payloads: Record<FeatureId, string> = {
  gantt: JSON.stringify(initialGanttTasks, null, 2),
  charts: JSON.stringify(baseChartSeries, null, 2),
  topology: JSON.stringify(baseTopology, null, 2),
  calendar: JSON.stringify(baseCalendarEvents, null, 2),
};

function assertEditableCollection(value: unknown, feature: FeatureId): asserts value is Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new Error(`O contrato de ${feature} deve ser um array JSON.`);
  if (value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("Cada item deve ser um objeto JSON.");
  }
  value.forEach((item, index) => {
    if (typeof item.id !== "string" || !item.id.trim()) throw new Error(`O item ${index + 1} requer um id de texto não vazio.`);
  });
}

function assertTextField(item: Record<string, unknown>, field: string, context: string) {
  if (typeof item[field] !== "string" || !(item[field] as string).trim()) {
    throw new Error(`${context} requer o campo ${field} como texto não vazio.`);
  }
}

function parsePlaygroundData(feature: FeatureId, source: string): PlaygroundDataMap[FeatureId] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "estrutura incompleta";
    throw new Error(`JSON inválido: ${message}`);
  }

  if (feature === "topology") {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("A topologia requer um objeto com nodes e edges.");
    const topology = parsed as Partial<TopologyData>;
    if (!Array.isArray(topology.nodes) || !Array.isArray(topology.edges)) throw new Error("A topologia requer os arrays nodes e edges.");
    if (topology.nodes.some((node) => !node || typeof node !== "object") || topology.edges.some((edge) => !edge || typeof edge !== "object")) {
      throw new Error("Cada node e edge deve ser um objeto JSON.");
    }
    topology.nodes.forEach((node, index) => {
      const record = node as unknown as Record<string, unknown>;
      assertTextField(record, "id", `O node ${index + 1}`);
      assertTextField(record, "label", `O node ${index + 1}`);
    });
    topology.edges.forEach((edge, index) => {
      const record = edge as unknown as Record<string, unknown>;
      assertTextField(record, "from", `O edge ${index + 1}`);
      assertTextField(record, "to", `O edge ${index + 1}`);
    });
    return normalizeTopology(topology as TopologyData);
  }

  assertEditableCollection(parsed, feature);
  if (feature === "gantt") {
    parsed.forEach((task, index) => assertTextField(task, "label", `A task ${index + 1}`));
    return normalizeGanttTasks(parsed as unknown as GanttTask[]);
  }
  if (feature === "charts") {
    parsed.forEach((series, index) => {
      assertTextField(series, "label", `A série ${index + 1}`);
      if (!Array.isArray(series.data)) throw new Error(`A série ${index + 1} requer um array data.`);
      if (series.data.some((point) => !point || typeof point !== "object" || Array.isArray(point))) {
        throw new Error(`Cada ponto da série ${index + 1} deve ser um objeto JSON.`);
      }
    });
    return normalizeChartSeries(parsed as unknown as ChartSeries[]);
  }
  parsed.forEach((event, index) => assertTextField(event, "title", `O evento ${index + 1}`));
  return normalizeCalendarEvents(parsed as unknown as CalendarEvent[]);
}

function GanttPreview({ data, onChange, theme, liveTick }: { data: GanttTask[]; onChange: (data: GanttTask[]) => void; theme: VisualTheme; liveTick: number }) {
  const displayedTasks = useMemo(() => data.map((task, index) => ({
    ...task,
    progress: Math.min(100, (task.progress ?? 0) + (liveTick > 0 ? (liveTick + index) % 6 : 0)),
  })), [data, liveTick]);

  return <div className="real-preview gantt-shell"><Gantt data={displayedTasks} theme={theme} locale="pt-PT" start="2026-01-01" end="2026-04-30" zoom="month" snap="day" rowHeight={54} dependencyRouting="orthogonal" onTaskChange={({ task }) => onChange(data.map((item) => item.id === task.id ? task : item))} style={{ height: 420 }} /></div>;
}

function ChartsPreview({ data, liveTick, theme }: { data: ChartSeries[]; liveTick: number; theme: VisualTheme }) {
  const series = useMemo(() => data.map((entry, seriesIndex) => ({
    ...entry,
    data: entry.data.map((point, pointIndex) => ({
      ...point,
      y: Math.max(0, point.y + (((liveTick + pointIndex * 3 + seriesIndex) % 7) - 3) * 1_250),
    })),
  })), [data, liveTick]);
  return <div className="real-preview charts-shell"><Chart series={series} theme={theme} locale="pt-PT" type="area" stacked showTooltip valueFormatter={(value) => new Intl.NumberFormat("pt-PT", { notation: "compact", style: "currency", currency: "EUR" }).format(value)} performance={{ canvasThreshold: 500, webglThreshold: 1_000 }} style={{ height: 420 }} /></div>;
}

function TopologyPreview({ data, liveTick, theme }: { data: TopologyData; liveTick: number; theme: VisualTheme }) {
  const displayedData = useMemo<TopologyData>(() => ({
    nodes: data.nodes.map((node, index) => ({
      ...node,
      status: liveTick > 0 && index === liveTick % data.nodes.length && liveTick % 4 === 0 ? "warning" : node.status,
      value: node.id === "gateway" ? `${2.4 + (liveTick % 5) * 0.1}k/s`
        : node.id === "events" ? `${8.1 + (liveTick % 4) * 0.2}k/s`
          : node.value,
    })),
    edges: data.edges,
  }), [data, liveTick]);
  return <div className="real-preview topology-shell"><Topology data={displayedData} theme={theme} layout="hierarchical" renderer="auto" performance={{ canvasThreshold: 80, webglThreshold: 150 }} interactive={{ keyboard: true, pointer: true, pan: true, zoom: true }} style={{ height: 420 }} /></div>;
}

function CalendarPreview({ data, onChange, theme, liveTick }: { data: CalendarEvent[]; onChange: (data: CalendarEvent[]) => void; theme: VisualTheme; liveTick: number }) {
  const displayedEvents = useMemo(() => data.map((event, index) => ({
    ...event,
    durationMinutes: Math.max(30, (event.durationMinutes ?? 60) + (liveTick > 0 && index === liveTick % data.length ? (liveTick % 2 === 0 ? 5 : -5) : 0)),
  })), [data, liveTick]);

  return <div className="real-preview calendar-shell"><Calendar events={displayedEvents} theme={theme} locale="pt-PT" date="2026-08-20" view="workweek" weekStartsOn={1} expandRecurrence resources={[{ id: "product", label: "Produto", color: "#7884ff" }, { id: "studio", label: "Studio 2", color: "#52d6c7" }, { id: "platform", label: "Platform", color: "#ff7657" }]} onEventChange={({ event }) => onChange(data.map((item) => item.id === event.id ? event : item))} style={{ height: 420 }} /></div>;
}

function FeaturePreview({ data, feature, liveTick, onCalendarChange, onGanttChange, theme }: {
  data: PlaygroundDataMap;
  feature: FeatureId;
  liveTick: number;
  onCalendarChange: (data: CalendarEvent[]) => void;
  onGanttChange: (data: GanttTask[]) => void;
  theme: VisualTheme;
}) {
  if (feature === "charts") return <ChartsPreview data={data.charts} liveTick={liveTick} theme={theme} />;
  if (feature === "topology") return <TopologyPreview data={data.topology} liveTick={liveTick} theme={theme} />;
  if (feature === "calendar") return <CalendarPreview data={data.calendar} onChange={onCalendarChange} liveTick={liveTick} theme={theme} />;
  return <GanttPreview data={data.gantt} onChange={onGanttChange} liveTick={liveTick} theme={theme} />;
}

function PortalDialog({ dialog, feature, onClose }: { dialog: DialogId; feature: FeatureId; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const featureData = featureItems.find((item) => item.id === feature)!;

  useEffect(() => { closeRef.current?.focus(); }, []);

  if (dialog === "example") {
    return (
      <div className="info-overlay">
        <button type="button" className="info-backdrop" aria-label="Fechar exemplo" onClick={onClose} />
        <section className="info-dialog info-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="info-dialog-head"><div><span>EXEMPLO EXECUTÁVEL</span><h2 id="dialog-title">{featureData.name}</h2></div><button ref={closeRef} onClick={onClose} aria-label="Fechar painel"><X size={18} /></button></div>
          <p>Este é o mesmo componente real do preview. Copia os dados e a integração para começares com um contrato funcional.</p>
          <div className="example-dialog-grid">
            <article><div className="dialog-code-head"><span>DADOS DE ENTRADA</span><CopyButton value={payloads[feature]} /></div><pre><code>{payloads[feature]}</code></pre></article>
            <article><div className="dialog-code-head"><span>INTEGRAÇÃO REACT</span><CopyButton value={featureSnippets[feature]} /></div><pre><code>{featureSnippets[feature]}</code></pre></article>
          </div>
          <div className="info-dialog-actions"><button className="secondary-button" onClick={onClose}>Fechar</button><a className="primary-button" href={`/docs#${feature}`}>Documentação de {featureData.name} <ArrowRight size={15} /></a></div>
        </section>
      </div>
    );
  }

  if (dialog === "help") {
    return (
      <div className="info-overlay">
        <button type="button" className="info-backdrop" aria-label="Fechar ajuda" onClick={onClose} />
        <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="info-dialog-head"><div><span>SUPORTE DE ENGENHARIA</span><h2 id="dialog-title">Precisas de ajuda?</h2></div><button ref={closeRef} onClick={onClose} aria-label="Fechar painel"><X size={18} /></button></div>
          <p>Partilha o caso de uso, volume de dados, framework e resultado esperado. Assim conseguimos responder com um exemplo reproduzível.</p>
          <div className="support-options"><a className="primary-button" href="https://github.com/gftsantos/nodara/issues/new" target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir pedido no GitHub</a><a className="secondary-button" href="/docs#overview">Ver documentação</a></div>
        </section>
      </div>
    );
  }

  if (dialog === "architecture") {
    return (
      <div className="info-overlay">
        <button type="button" className="info-backdrop" aria-label="Fechar arquitetura" onClick={onClose} />
        <section className="info-dialog info-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="info-dialog-head"><div><span>ARQUITETURA NODARA</span><h2 id="dialog-title">Um core, três motores.</h2></div><button ref={closeRef} onClick={onClose} aria-label="Fechar painel"><X size={18} /></button></div>
          <p>A API mantém-se estável enquanto o motor escolhe a estratégia adequada ao volume e às capacidades do browser.</p>
          <div className="architecture-dialog-grid"><article><b>DOM</b><strong>Semântica primeiro</strong><span>Listas pequenas, edição e acessibilidade nativa.</span></article><article><b>CANVAS</b><strong>Interação fluida</strong><span>Centenas a milhares de elementos visuais.</span></article><article><b>WEBGL</b><strong>Grandes volumes</strong><span>Buffers compactos e renderização acelerada.</span></article></div>
          <div className="info-dialog-actions"><button className="secondary-button" onClick={onClose}>Fechar</button><a className="primary-button" href="/docs#architecture">Ver arquitetura completa <ArrowRight size={15} /></a></div>
        </section>
      </div>
    );
  }

  const details = foundationDetails[dialog];
  const docsTarget = dialog === "schemas" ? "schemas" : dialog === "tokens" ? "themes" : "accessibility";
  return (
    <div className="info-overlay">
      <button type="button" className="info-backdrop" aria-label={`Fechar ${details.title}`} onClick={onClose} />
      <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="info-dialog-head"><div><span>{details.eyebrow}</span><h2 id="dialog-title">{details.title}</h2></div><button ref={closeRef} onClick={onClose} aria-label="Fechar painel"><X size={18} /></button></div>
        <p>{details.description}</p>
        <ul className="foundation-list">{details.items.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul>
        <div className="foundation-code"><div className="dialog-code-head"><span>EXEMPLO</span><CopyButton value={details.code} /></div><pre><code>{details.code}</code></pre></div>
        <div className="info-dialog-actions"><button className="secondary-button" onClick={onClose}>Fechar</button><a className="primary-button" href={`/docs#${docsTarget}`}>Documentação completa <ArrowRight size={15} /></a></div>
      </section>
    </div>
  );
}

export default function Home() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("gantt");
  const [activeFramework, setActiveFramework] = useState<FrameworkId>("react");
  const [workspaceTab, setWorkspaceTab] = useState<"preview" | "data" | "api">("preview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [liveData, setLiveData] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [playgroundData, setPlaygroundData] = useState<PlaygroundDataMap>(initialPlaygroundData);
  const [editorValues, setEditorValues] = useState<Record<FeatureId, string>>(payloads);
  const [editorErrors, setEditorErrors] = useState<Partial<Record<FeatureId, string>>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogId | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);

  const activeFrameworkData = frameworks.find((item) => item.id === activeFramework)!;
  const activeFeatureData = featureItems.find((item) => item.id === activeFeature)!;
  const activeEditorError = editorErrors[activeFeature];
  const filteredSearch = useMemo(
    () => searchEntries.filter((entry) => entry.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowSearch((value) => !value);
      }
      const target = event.target as HTMLElement | null;
      const isEditing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        setShowSearch(true);
      }
      if (event.key === "Escape") {
        setShowSearch(false);
        setActiveDialog(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    const site = siteRef.current;
    if (!site) return;
    site.dataset.ready = "true";
    return () => { delete site.dataset.ready; };
  }, []);

  useEffect(() => {
    if (!liveData) return;
    const timer = window.setInterval(() => setLiveTick((value) => value + 1), 1500);
    return () => window.clearInterval(timer);
  }, [liveData]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNav(false);
  }

  function selectFeature(id: FeatureId) {
    setActiveFeature(id);
    setWorkspaceTab("preview");
  }

  function openSearchResult(entry: string) {
    setShowSearch(false);
    setQuery("");
    const lower = entry.toLowerCase();
    const target = lower.includes("gantt") ? "gantt"
      : lower.includes("gráfico") ? "charts"
        : lower.includes("topologia") ? "topology"
          : lower.includes("calendário") ? "calendar"
            : lower.includes("token") ? "themes"
              : lower.includes("migração") ? "installation"
                : "overview";
    window.location.assign(`/docs#${target}`);
  }

  function toggleLiveData() {
    if (liveData) {
      setLiveData(false);
      setLiveTick(0);
      return;
    }
    setLiveTick(1);
    setLiveData(true);
  }

  function setFeatureData(feature: "gantt", data: GanttTask[]): void;
  function setFeatureData(feature: "calendar", data: CalendarEvent[]): void;
  function setFeatureData(feature: "charts", data: ChartSeries[]): void;
  function setFeatureData(feature: "topology", data: TopologyData): void;
  function setFeatureData(feature: FeatureId, data: PlaygroundDataMap[FeatureId]) {
    setPlaygroundData((current) => ({ ...current, [feature]: data } as PlaygroundDataMap));
    setEditorValues((current) => ({ ...current, [feature]: JSON.stringify(data, null, 2) }));
    setEditorErrors((current) => ({ ...current, [feature]: undefined }));
  }

  function updateEditor(feature: FeatureId, value: string) {
    setEditorValues((current) => ({ ...current, [feature]: value }));
    try {
      const data = parsePlaygroundData(feature, value);
      setPlaygroundData((current) => ({ ...current, [feature]: data } as PlaygroundDataMap));
      setEditorErrors((current) => ({ ...current, [feature]: undefined }));
    } catch (error) {
      setEditorErrors((current) => ({
        ...current,
        [feature]: error instanceof Error ? error.message : "Não foi possível validar estes dados.",
      }));
    }
  }

  function resetEditor(feature: FeatureId) {
    updateEditor(feature, payloads[feature]);
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const editor = event.currentTarget;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const nextValue = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
    updateEditor(activeFeature, nextValue);
    window.requestAnimationFrame(() => {
      editor.selectionStart = start + 2;
      editor.selectionEnd = start + 2;
    });
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchIndex((value) => Math.min(filteredSearch.length - 1, value + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchIndex((value) => Math.max(0, value - 1));
    }
    if (event.key === "Enter" && filteredSearch[searchIndex]) {
      event.preventDefault();
      openSearchResult(filteredSearch[searchIndex]);
    }
  }

  return (
    <div ref={siteRef} className="site" data-theme={theme}>
      <header className="site-header">
        <button className="brand" onClick={() => scrollTo("inicio")} aria-label="Nodara, início">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>NODARA</span>
          <sup>BETA</sup>
        </button>
        <nav className={mobileNav ? "main-nav is-open" : "main-nav"} aria-label="Navegação principal">
          <a href="/catalog">Catálogo</a>
          <a href="/docs">Documentação</a>
          <button onClick={() => scrollTo("arquitetura")}>Arquitetura</button>
          <button onClick={() => scrollTo("enterprise")}>Enterprise</button>
        </nav>
        <div className="header-actions">
          <button className="header-search" onClick={() => setShowSearch(true)} aria-label="Pesquisar documentação">
            <Search size={15} /><span>Pesquisar</span><kbd>⌘ K</kbd>
          </button>
          <button className="icon-button theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Alternar tema">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <a className="github-button" href="https://github.com/gftsantos/nodara" target="_blank" rel="noreferrer"><Code2 size={16} /><span>GitHub</span><b>ALPHA</b></a>
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-expanded={mobileNav} aria-label={mobileNav ? "Fechar menu" : "Abrir menu"}>
            {mobileNav ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-grid" />
          <div className="hero-copy">
            <div className="eyebrow"><span /> VISUAL INFRASTRUCTURE FOR THE WEB <b>v0.2 alpha</b></div>
            <h1>Dados complexos.<br /><em>Clareza instantânea.</em></h1>
            <p>Uma biblioteca TypeScript com 48 visualizações prontas, construídas sobre quatro motores consistentes para produtos ambiciosos.</p>
            <div className="hero-actions">
              <a className="primary-button" href="/catalog"><Play size={16} fill="currentColor" /> Explorar 48 visualizações</a>
              <CopyButton value="npm i @nodara/react" label="npm i @nodara/react" />
            </div>
            <div className="framework-proof">
              <span>Funciona onde trabalhas</span>
              <div><b>⚛</b> React</div><div><b>△</b> Angular</div><div><b>V</b> Vue</div><div><b>JS</b> Vanilla</div>
            </div>
          </div>
          <div className="hero-visual" aria-label="Pré-visualização da biblioteca Nodara">
            <div className="visual-window">
              <div className="window-bar">
                <span className="window-dots"><i /><i /><i /></span>
                <div><span className="status-dot" /> LIVE / ROADMAP_26</div>
                <Settings2 size={15} />
              </div>
              <div className="visual-body">
                <div className="mini-sidebar"><span /><span /><span /><span /></div>
                <div className="visual-content">
                  <div className="visual-title"><div><small>PRODUCT / Q3</small><strong>Release plan</strong></div><span>+ 6.2%</span></div>
                  <div className="mini-gantt-months"><span>JUN</span><span>JUL</span><span>AGO</span><span>SET</span></div>
                  {[0, 1, 2, 3].map((row) => (
                    <div className="mini-gantt-row" key={row}>
                      <i style={{ width: `${24 + row * 9}%` }} />
                      <b style={{ left: `${8 + row * 13}%`, width: `${34 - row * 2}%` }}><span /></b>
                    </div>
                  ))}
                  <div className="mini-stats">
                    <div><small>VELOCIDADE</small><strong>+24%</strong><i><span /></i></div>
                    <div><small>ENTREGAS</small><strong>38</strong><i><span /></i></div>
                    <div className="mini-donut"><span>84<small>%</small></span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="float-card float-a"><CheckCircle2 size={17} /><div><strong>200+ testes verdes</strong><small>core + adaptadores + E2E</small></div></div>
            <div className="float-card float-b"><Gauge size={17} /><div><strong>10.000 nós testados</strong><small>Canvas / WebGL adaptativo</small></div></div>
          </div>
          <div className="hero-foot">
            <div><strong>5</strong><span>pacotes alpha</span></div>
            <div><strong>48</strong><span>demos reais no catálogo</span></div>
            <div><strong>4</strong><span>adaptadores</span></div>
            <div><strong>200+</strong><span>testes automatizados</span></div>
          </div>
        </section>

        <section className="explorer-section" id="componentes">
          <div className="section-heading">
            <div><span className="section-number">01</span><p>O MESMO MOTOR. TODAS AS FORMAS.</p></div>
            <h2>Um playground para<br />dados do mundo real.</h2>
            <p>Experimenta aqui os quatro motores ou abre o catálogo para explorar 48 receitas com demo, dados e integração próprias.</p>
          </div>

          <div className={sidebarCollapsed ? "product-shell sidebar-collapsed" : "product-shell"}>
            <aside className="component-sidebar">
              <div className="sidebar-title"><span>EXPLORADOR</span><button onClick={() => setSidebarCollapsed((value) => !value)} aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"} title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}><PanelLeftClose size={15} /></button></div>
              <button className="sidebar-search" onClick={() => setShowSearch(true)}><Search size={14} /><span>Procurar componente</span><kbd>/</kbd></button>
              <p className="sidebar-label">48 RECEITAS · 4 MOTORES</p>
              <div className="feature-nav">
                {featureItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} className={activeFeature === item.id ? "active" : ""} onClick={() => selectFeature(item.id)}>
                      <span className="feature-icon" style={{ "--feature-accent": item.accent } as React.CSSProperties}><Icon size={16} /></span>
                      <span><strong>{item.name}</strong><small>{item.description}</small></span>
                      <b>{String(item.count).padStart(2, "0")}</b>
                    </button>
                  );
                })}
              </div>
              <p className="sidebar-label">FUNDAÇÕES</p>
              <button className="foundation-link" onClick={() => setActiveDialog("schemas")}><Braces size={15} /><span>Tipos & schemas</span><ChevronRight size={14} /></button>
              <button className="foundation-link" onClick={() => setActiveDialog("tokens")}><Sparkles size={15} /><span>Temas & tokens</span><ChevronRight size={14} /></button>
              <button className="foundation-link" onClick={() => setActiveDialog("accessibility")}><ShieldCheck size={15} /><span>Acessibilidade</span><ChevronRight size={14} /></button>
              <button className="sidebar-help" onClick={() => setActiveDialog("help")}><CircleHelp size={17} /><span><strong>Precisas de ajuda?</strong><small>Fala com um engenheiro</small></span><ArrowRight size={15} /></button>
            </aside>

            <div className="workspace">
              <div className="workspace-header">
                <div>
                  <span className="workspace-eyebrow" style={{ color: activeFeatureData.accent }}>{featureCopy[activeFeature].eyebrow}</span>
                  <h3>{featureCopy[activeFeature].title}</h3>
                  <p>{featureCopy[activeFeature].description}</p>
                </div>
                <div className="workspace-action-stack">
                  <div className="workspace-actions">
                    <button className={liveData ? "active" : ""} aria-pressed={liveData} aria-describedby="live-data-description" onClick={toggleLiveData} title="Simula atualizações dos dados a cada 1,5 segundos"><Zap size={14} /> Simular stream</button>
                    <button onClick={() => setActiveDialog("example")}><ExternalLink size={14} /> Abrir exemplo</button>
                  </div>
                  <span className={liveData ? "live-explainer is-live" : "live-explainer"} id="live-data-description">{liveData ? `Stream simulado · ciclo ${liveTick} · JSON intacto` : "Varia o preview a cada 1,5 s; não altera o JSON"}</span>
                </div>
              </div>
              <div className="workspace-tabs" role="tablist">
                <button role="tab" aria-selected={workspaceTab === "preview"} className={workspaceTab === "preview" ? "active" : ""} onClick={() => setWorkspaceTab("preview")}><Play size={13} /> Preview</button>
                <button role="tab" aria-selected={workspaceTab === "data"} className={workspaceTab === "data" ? "active" : ""} onClick={() => setWorkspaceTab("data")}><FileJson size={13} /> Dados</button>
                <button role="tab" aria-selected={workspaceTab === "api"} className={workspaceTab === "api" ? "active" : ""} onClick={() => setWorkspaceTab("api")}><Braces size={13} /> API</button>
                <div className="tab-meta"><span className="status-dot" /> 60 FPS <i /> {liveData ? `streaming · ciclo ${liveTick}` : `${activeFeatureData.name} · ${activeFeatureData.count} receitas`}</div>
              </div>
              <div className="workspace-canvas">
                {workspaceTab === "preview" && <FeaturePreview data={playgroundData} feature={activeFeature} liveTick={liveTick} theme={theme} onGanttChange={(data) => setFeatureData("gantt", data)} onCalendarChange={(data) => setFeatureData("calendar", data)} />}
                {workspaceTab === "data" && (
                  <div className="live-editor-layout">
                    <section className="data-inspector live-editor" aria-label={`Editor de dados de ${activeFeatureData.name}`}>
                      <div className="data-inspector-head">
                        <span><FileJson size={14} /> data.json <i>EDITÁVEL</i></span>
                        <div className="editor-actions">
                          <button className="editor-reset" onClick={() => resetEditor(activeFeature)} title="Repor os dados iniciais"><RotateCcw size={13} /> Repor</button>
                          <CopyButton value={editorValues[activeFeature]} />
                        </div>
                      </div>
                      <textarea
                        className="json-editor"
                        value={editorValues[activeFeature]}
                        onChange={(event) => updateEditor(activeFeature, event.target.value)}
                        onKeyDown={onEditorKeyDown}
                        aria-label={`Editar JSON de ${activeFeatureData.name}`}
                        aria-invalid={Boolean(activeEditorError)}
                        aria-describedby="editor-validation-status"
                        spellCheck={false}
                      />
                      <div className={activeEditorError ? "schema-success schema-error" : "schema-success"} id="editor-validation-status" role={activeEditorError ? "alert" : "status"}>
                        {activeEditorError ? <X size={16} /> : <CheckCircle2 size={16} />}
                        <span>
                          <strong>{activeEditorError ? "Corrige o JSON" : "Render atualizado automaticamente"}</strong>
                          <small>{activeEditorError ?? "O componente real está a usar estes dados."}</small>
                        </span>
                        <b>{activeEditorError ? "ÚLTIMO VÁLIDO" : "LIVE"}</b>
                      </div>
                    </section>
                    <section className="live-output" aria-label={`Output ao vivo de ${activeFeatureData.name}`}>
                      <div className="live-output-head"><span><span className="status-dot" /> OUTPUT AO VIVO</span><small>{activeEditorError ? "A mostrar o último JSON válido" : "Sincronizado"}</small></div>
                      <FeaturePreview data={playgroundData} feature={activeFeature} liveTick={liveTick} theme={theme} onGanttChange={(data) => setFeatureData("gantt", data)} onCalendarChange={(data) => setFeatureData("calendar", data)} />
                    </section>
                  </div>
                )}
                {workspaceTab === "api" && (
                  <div className="api-table">
                    <div className="api-row api-head"><span>PROPRIEDADE</span><span>TIPO</span><span>DEFAULT</span><span>DESCRIÇÃO</span></div>
                    <div className="api-row"><code>data</code><span className="type-pill">T[]</span><code>[]</code><span>Itens normalizados da visualização.</span></div>
                    <div className="api-row"><code>renderer</code><span className="type-pill">auto | dom | canvas | webgl</span><code>auto</code><span>Seleciona o motor de renderização.</span></div>
                    <div className="api-row"><code>interactive</code><span className="type-pill">boolean | options</span><code>true</code><span>Controla ponteiro, teclado, pan e zoom.</span></div>
                    <div className="api-row"><code>onChange</code><span className="type-pill">(event) =&gt; void</span><code>—</code><span>Emite alterações com tipagem estrita.</span></div>
                  </div>
                )}
              </div>
              <div className="workspace-footer"><span className={activeEditorError ? "has-error" : ""}>{activeEditorError ? <X size={14} /> : <CheckCircle2 size={14} />} {activeEditorError ? "JSON com erro · último válido preservado" : "Dados validados"}</span><span>Motor real Nodara</span><span><ShieldCheck size={14} /> Teclado + leitor de ecrã</span><span>Zoom interativo</span></div>
            </div>
          </div>
        </section>

        <section className="integration-section" id="integrar">
          <div className="section-heading integration-heading">
            <div><span className="section-number">02</span><p>INTEGRAÇÃO SEM ATRITO</p></div>
            <h2>A tua stack.<br />A mesma API.</h2>
            <p>Core agnóstico, adaptadores oficiais e tipos que acompanham cada decisão. Começa em menos de cinco minutos.</p>
          </div>

          <div className="integration-lab">
            <div className="framework-tabs" role="tablist" aria-label="Selecionar framework">
              {frameworks.map((framework) => (
                <button key={framework.id} role="tab" aria-selected={activeFramework === framework.id} className={activeFramework === framework.id ? "active" : ""} onClick={() => setActiveFramework(framework.id)}>
                  <span>{framework.id === "react" ? "⚛" : framework.id === "angular" ? "△" : framework.id === "vue" ? "V" : "JS"}</span>
                  {framework.label}
                  {framework.id === "react" && <b>POPULAR</b>}
                </button>
              ))}
            </div>
            <div className="integration-body">
              <div className="integration-steps">
                <div className="step-block">
                  <span className="step-number">01</span>
                  <div><p>INSTALA O ADAPTADOR</p><h3>Uma dependência.<br />Zero configuração.</h3></div>
                </div>
                <div className="install-command"><TerminalSquare size={17} /><code>{activeFrameworkData.install}</code><CopyButton value={activeFrameworkData.install} /></div>
                <div className="step-block step-two">
                  <span className="step-number">02</span>
                  <div><p>LIGA OS TEUS DADOS</p><h3>Tipado de ponta a ponta.</h3></div>
                </div>
                <div className="integration-checks">
                  <span><Check size={14} /> TypeScript strict</span>
                  <span><Check size={14} /> SSR ready</span>
                  <span><Check size={14} /> Tree-shakeable</span>
                  <span><Check size={14} /> Sem vendor lock-in</span>
                </div>
              </div>
              <div className="code-window">
                <div className="code-window-head"><span><i /><i /><i /></span><p>ProductPlan.{activeFramework === "vue" ? "vue" : "tsx"}</p><CopyButton value={snippets[activeFramework]} /></div>
                <pre><code>{snippets[activeFramework]}</code></pre>
                <div className="code-status"><span><CheckCircle2 size={14} /> Compilado sem erros</span><b>16.6 kB core + React</b></div>
              </div>
            </div>
          </div>

          <div className="data-contract">
            <div className="contract-copy">
              <span className="mini-label">CONTRATO UNIVERSAL</span>
              <h3>Os teus dados entram.<br />A Nodara trata do resto.</h3>
              <p>Validação em runtime, inferência de tipos e mensagens de erro que dizem exatamente o que corrigir.</p>
              <a href="#arquitetura">Ver referência do schema <ArrowRight size={15} /></a>
            </div>
            <div className="contract-flow">
              <div className="flow-card flow-input"><span>INPUT</span><FileJson size={22} /><strong>JSON / REST / Stream</strong><small>Qualquer fonte de dados</small></div>
              <div className="flow-arrow"><i /><Zap size={17} /></div>
              <div className="flow-card flow-core"><span>NODARA CORE</span><div className="brand-mark"><i /><i /><i /><i /></div><strong>Normalize + Render</strong><small>Schema validado · 8.4ms</small></div>
              <div className="flow-arrow"><i /><Check size={17} /></div>
              <div className="flow-card flow-output"><span>OUTPUT</span><Sparkles size={22} /><strong>Canvas acessível</strong><small>Interativo e responsivo</small></div>
            </div>
          </div>
        </section>

        <section className="architecture-section" id="arquitetura">
          <div className="architecture-copy">
            <span className="section-number">03</span>
            <p className="mini-label">FEITA PARA ESCALAR</p>
            <h2>Bonita por fora.<br /><em>Séria por dentro.</em></h2>
            <p>Um core independente, renderização adaptativa e contratos públicos estáveis. O tipo de fundação que não obriga a reescrever o produto daqui a dois anos.</p>
            <button className="secondary-button" onClick={() => setActiveDialog("architecture")}>Explorar arquitetura <ArrowRight size={15} /></button>
          </div>
          <div className="architecture-grid">
            <article className="arch-card arch-wide">
              <div className="arch-icon"><Gauge /></div><span>RENDER ENGINE</span>
              <h3>Do DOM ao WebGL.<br />Automaticamente.</h3>
              <p>A Nodara escolhe o renderer certo de acordo com o volume e a interação.</p>
              <div className="performance-bars"><i><span style={{ width: "24%" }} /></i><i><span style={{ width: "56%" }} /></i><i><span style={{ width: "88%" }} /></i></div>
              <div className="performance-labels"><span>DOM</span><span>CANVAS</span><span>WEBGL</span></div>
            </article>
            <article className="arch-card"><div className="arch-icon"><PackageCheck /></div><span>MODULAR</span><h3>Importa só o que usas.</h3><p>Cinco pacotes independentes e tree-shaking real.</p><strong className="metric">16.1 <small>kB CORE GZIP</small></strong></article>
            <article className="arch-card"><div className="arch-icon"><ShieldCheck /></div><span>ACCESSIBLE</span><h3>Acessível de raiz.</h3><p>Teclado, leitores de ecrã e contraste testados.</p><strong className="metric">5.9:1 <small>CONTRASTE CLARO</small></strong></article>
            <article className="arch-card arch-community"><div className="arch-icon"><Code2 /></div><span>ENGINEERING</span><h3>Validada de forma contínua.</h3><p>Contratos estáveis, testes automatizados e releases controladas.</p><div className="community-row"><span>200+ <small>testes</small></span><span>5 <small>pacotes</small></span><span>4 <small>adaptadores</small></span></div></article>
          </div>
        </section>

        <section className="enterprise-section" id="enterprise">
          <div className="enterprise-orbit"><i /><i /><i /><span className="brand-mark"><i /><i /><i /><i /></span></div>
          <p className="mini-label">ALPHA VALIDADA</p>
          <h2>Os teus dados já têm uma história.<br /><em>Vamos torná-la visível.</em></h2>
          <p>Começa com a comunidade. Cresce com suporte, colaboração e segurança enterprise.</p>
          <div className="enterprise-actions"><a className="primary-button" href="/docs#installation">Explorar integração <ArrowRight size={16} /></a><a className="secondary-button" href="/docs#architecture">Ver arquitetura</a></div>
          <div className="enterprise-note"><span><Check size={14} /> MIT core</span><span><Check size={14} /> Sem cartão</span><span><Check size={14} /> Suporte TypeScript</span></div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><div className="brand"><span className="brand-mark"><i /><i /><i /><i /></span><span>NODARA</span></div><p>Visual infrastructure for the web.</p></div>
          <div className="footer-links"><div><strong>PRODUTO</strong><a href="/catalog">48 visualizações</a><a href="/docs#installation">Frameworks</a><a href="/docs#architecture">Arquitetura</a></div><div><strong>RECURSOS</strong><a href="/docs">Documentação</a><a href="#componentes">Playground</a><a href="https://github.com/gftsantos/nodara/releases" target="_blank" rel="noreferrer">Changelog</a></div><div><strong>EMPRESA</strong><a href="#enterprise">Enterprise</a><a href="/docs#accessibility">Acessibilidade</a><a href="https://github.com/gftsantos/nodara/issues/new" target="_blank" rel="noreferrer">Contacto</a></div></div>
        <div className="footer-bottom"><span>© 2026 Nodara Labs</span><span>Feito com precisão em Portugal.</span><div><a href="https://github.com/gftsantos/nodara" target="_blank" rel="noreferrer">GitHub</a><a href="/docs">Documentação</a><a href="/docs#architecture">Arquitetura</a></div></div>
      </footer>

      {showSearch && (
        <div className="search-overlay">
          <button type="button" className="search-backdrop" aria-label="Fechar pesquisa" onClick={() => setShowSearch(false)} />
          <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Pesquisa da documentação">
            <div className="search-input-wrap"><Search size={19} /><input ref={searchInputRef} value={query} onChange={(event) => { setQuery(event.target.value); setSearchIndex(0); }} onKeyDown={onSearchKeyDown} placeholder="Pesquisar componentes, APIs e guias…" aria-activedescendant={filteredSearch[searchIndex] ? `search-result-${searchIndex}` : undefined} /><kbd>ESC</kbd></div>
            <p>SUGESTÕES</p>
            <div className="search-results">
              {filteredSearch.map((entry, index) => <button id={`search-result-${index}`} className={searchIndex === index ? "selected" : ""} key={entry} onMouseEnter={() => setSearchIndex(index)} onClick={() => openSearchResult(entry)}><span><Command size={14} />{entry}</span><ChevronRight size={14} /></button>)}
              {filteredSearch.length === 0 && <div className="no-results">Nenhum resultado. Experimenta “Gantt” ou “schema”.</div>}
            </div>
            <div className="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span></div>
          </div>
        </div>
      )}

      {activeDialog && <PortalDialog dialog={activeDialog} feature={activeFeature} onClose={() => setActiveDialog(null)} />}
    </div>
  );
}
