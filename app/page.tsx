"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  Braces,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Command,
  Copy,
  Database,
  ExternalLink,
  FileJson,
  Gauge,
  Layers3,
  Menu,
  Moon,
  Network,
  PackageCheck,
  PanelLeftClose,
  Play,
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
    count: 14,
  },
  {
    id: "charts",
    name: "Gráficos",
    description: "Dashboards e análise em tempo real",
    icon: BarChart3,
    accent: "#ff7657",
    count: 42,
  },
  {
    id: "topology",
    name: "Grafos & topologias",
    description: "Sistemas, redes e relações",
    icon: Network,
    accent: "#c8fa63",
    count: 18,
  },
  {
    id: "calendar",
    name: "Calendários",
    description: "Agenda, recursos e recorrências",
    icon: CalendarDays,
    accent: "#52d6c7",
    count: 11,
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

const payloads: Record<FeatureId, string> = {
  gantt: `{
  "id": "ND-104",
  "label": "Motor de permissões",
  "start": "2026-02-03",
  "end": "2026-03-18",
  "progress": 72,
  "dependsOn": ["ND-096"],
  "owner": { "name": "Inês", "color": "#6E7DFF" }
}`,
  charts: `{
  "series": "Receita recorrente",
  "points": [
    { "x": "Jan", "y": 128400 },
    { "x": "Fev", "y": 164200 },
    { "x": "Mar", "y": 191800 }
  ],
  "format": "EUR",
  "animate": true
}`,
  topology: `{
  "nodes": [
    { "id": "gateway", "type": "service", "health": 99.99 },
    { "id": "billing", "type": "service", "health": 99.97 }
  ],
  "edges": [
    { "from": "gateway", "to": "billing", "traffic": 1240 }
  ]
}`,
  calendar: `{
  "id": "evt_92",
  "title": "Design critique",
  "start": "2026-08-20T10:00:00Z",
  "duration": 45,
  "resourceId": "studio-01",
  "recurrence": "FREQ=WEEKLY;COUNT=6"
}`,
};

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

function GanttPreview() {
  const tasks = [
    { name: "Discovery", owner: "MB", start: 4, width: 23, color: "#6e7dff", progress: 100 },
    { name: "Design system", owner: "IR", start: 19, width: 35, color: "#ff7657", progress: 82 },
    { name: "Core renderer", owner: "LA", start: 40, width: 39, color: "#c8fa63", progress: 64 },
    { name: "Acessibilidade", owner: "SF", start: 58, width: 27, color: "#52d6c7", progress: 38 },
    { name: "Release 1.0", owner: "EQ", start: 81, width: 15, color: "#f5c451", progress: 12 },
  ];

  return (
    <div className="gantt-shell">
      <div className="gantt-toolbar">
        <div className="avatar-stack" aria-label="5 colaboradores">
          <span>MB</span><span>IR</span><span>LA</span><span>+2</span>
        </div>
        <div className="gantt-toolbar-right">
          <button>Hoje</button>
          <button className="select-button">Trimestre <ChevronDown size={13} /></button>
        </div>
      </div>
      <div className="gantt-chart" role="img" aria-label="Cronograma do roadmap de produto">
        <div className="gantt-labels">
          <div className="gantt-label-head">Tarefa</div>
          {tasks.map((task) => (
            <div className="gantt-label" key={task.name}>
              <span className="task-avatar" style={{ background: task.color }}>{task.owner}</span>
              <div><strong>{task.name}</strong><small>{task.progress}% concluído</small></div>
            </div>
          ))}
        </div>
        <div className="gantt-timeline">
          <div className="gantt-months"><span>JAN</span><span>FEV</span><span>MAR</span><span>ABR</span></div>
          {tasks.map((task, index) => (
            <div className="gantt-row" key={task.name}>
              <div
                className="gantt-bar"
                style={{ left: `${task.start}%`, width: `${task.width}%`, background: task.color }}
                title={`${task.name}: ${task.progress}%`}
              >
                <span style={{ width: `${task.progress}%` }} />
                {index === 2 && <i className="gantt-milestone" />}
              </div>
            </div>
          ))}
          <div className="today-line"><span>HOJE</span></div>
        </div>
      </div>
    </div>
  );
}

function ChartsPreview({ dense }: { dense: boolean }) {
  const values = dense ? [38, 55, 46, 71, 62, 84, 73, 94, 81, 100] : [31, 46, 42, 68, 58, 77, 70, 90, 76, 96];
  return (
    <div className="charts-shell">
      <div className="chart-summary">
        <div><small>MRR TOTAL</small><strong>€ 482.8k</strong><span className="positive">↗ 18,4%</span></div>
        <div><small>RETENÇÃO</small><strong>94,2%</strong><span>+2,1 pp</span></div>
        <div><small>FORECAST</small><strong>€ 521k</strong><span>Setembro</span></div>
      </div>
      <div className="bar-chart" role="img" aria-label="Gráfico de receita mensal crescente">
        <div className="chart-axis"><span>500k</span><span>250k</span><span>0</span></div>
        <div className="chart-grid-lines"><i /><i /><i /></div>
        <div className="chart-bars">
          {values.map((value, index) => (
            <div className="bar-column" key={index}>
              <div className="bar-tooltip">€ {Math.round(value * 4.82)}k</div>
              <div className="bar" style={{ height: `${value}%` }}><span /></div>
              <small>{["NOV", "DEZ", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO"][index]}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopologyPreview() {
  const edges = [
    { left: "19%", top: "27%", width: "25%", rotate: "18deg" },
    { left: "42%", top: "40%", width: "22%", rotate: "-20deg" },
    { left: "42%", top: "49%", width: "28%", rotate: "22deg" },
    { left: "20%", top: "70%", width: "26%", rotate: "-22deg" },
    { left: "67%", top: "39%", width: "14%", rotate: "52deg" },
  ];
  return (
    <div className="topology-shell">
      <div className="topology-board" role="img" aria-label="Topologia de cinco serviços conectados">
        {edges.map((edge, index) => (
          <span className="topology-edge" key={index} style={{ left: edge.left, top: edge.top, width: edge.width, transform: `rotate(${edge.rotate})` }}><i /></span>
        ))}
        <div className="topology-node gateway"><span><Zap size={15} /></span><div><strong>API Gateway</strong><small>2.4k req/s</small></div><i /></div>
        <div className="topology-node auth"><span><ShieldCheck size={15} /></span><div><strong>Auth</strong><small>99.99%</small></div><i /></div>
        <div className="topology-node billing"><span><Database size={15} /></span><div><strong>Billing</strong><small>99.97%</small></div><i /></div>
        <div className="topology-node events"><span><Layers3 size={15} /></span><div><strong>Events</strong><small>8.1k msg/s</small></div><i /></div>
        <div className="topology-node warehouse"><span><Blocks size={15} /></span><div><strong>Warehouse</strong><small>12.8 TB</small></div><i /></div>
      </div>
      <div className="topology-legend"><span><i /> Saudável</span><span><i /> 5 serviços</span><span><i /> 0 incidentes</span></div>
    </div>
  );
}

function CalendarPreview() {
  const days = ["SEG 17", "TER 18", "QUA 19", "QUI 20", "SEX 21"];
  const events = [
    { day: 0, top: 19, height: 25, title: "Planning", meta: "09:30 · Produto", color: "violet" },
    { day: 1, top: 47, height: 30, title: "Research", meta: "13:00 · Studio 2", color: "mint" },
    { day: 2, top: 28, height: 36, title: "API review", meta: "10:30 · Platform", color: "coral" },
    { day: 3, top: 15, height: 27, title: "Design critique", meta: "09:00 · Equipa", color: "yellow" },
    { day: 3, top: 57, height: 24, title: "1:1 · Rita", meta: "15:00 · Meet", color: "violet" },
    { day: 4, top: 37, height: 32, title: "Release 1.0", meta: "12:00 · All hands", color: "mint" },
  ];
  return (
    <div className="calendar-shell">
      <div className="calendar-heading"><button>‹</button><strong>17 – 21 agosto, 2026</strong><button>›</button><span>Semana</span></div>
      <div className="calendar-grid" role="img" aria-label="Calendário semanal com seis eventos">
        <div className="time-column"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
        {days.map((day, dayIndex) => (
          <div className={`calendar-day ${dayIndex === 3 ? "is-today" : ""}`} key={day}>
            <strong>{day}</strong>
            {events.filter((event) => event.day === dayIndex).map((event) => (
              <div className={`calendar-event ${event.color}`} key={event.title} style={{ top: `${event.top}%`, height: `${event.height}%` }}>
                <strong>{event.title}</strong><small>{event.meta}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePreview({ feature, dense }: { feature: FeatureId; dense: boolean }) {
  if (feature === "charts") return <ChartsPreview dense={dense} />;
  if (feature === "topology") return <TopologyPreview />;
  if (feature === "calendar") return <CalendarPreview />;
  return <GanttPreview />;
}

export default function Home() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("gantt");
  const [activeFramework, setActiveFramework] = useState<FrameworkId>("react");
  const [workspaceTab, setWorkspaceTab] = useState<"preview" | "data" | "api">("preview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dense, setDense] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const activeFrameworkData = frameworks.find((item) => item.id === activeFramework)!;
  const activeFeatureData = featureItems.find((item) => item.id === activeFeature)!;
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
      if (event.key === "Escape") setShowSearch(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNav(false);
  }

  function selectFeature(id: FeatureId) {
    setActiveFeature(id);
    setWorkspaceTab("preview");
  }

  return (
    <div className="site" data-theme={theme}>
      <header className="site-header">
        <button className="brand" onClick={() => scrollTo("inicio")} aria-label="Nodara, início">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>NODARA</span>
          <sup>BETA</sup>
        </button>
        <nav className={mobileNav ? "main-nav is-open" : "main-nav"} aria-label="Navegação principal">
          <button onClick={() => scrollTo("componentes")}>Componentes</button>
          <button onClick={() => scrollTo("integrar")}>Documentação</button>
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
          <button className="github-button"><Code2 size={16} /><span>GitHub</span><b>12.8k</b></button>
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu">
            {mobileNav ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-grid" />
          <div className="hero-copy">
            <div className="eyebrow"><span /> VISUAL INFRASTRUCTURE FOR THE WEB <b>v0.8</b></div>
            <h1>Dados complexos.<br /><em>Clareza instantânea.</em></h1>
            <p>Uma biblioteca TypeScript, quatro ecossistemas e todas as visualizações de que um produto ambicioso precisa.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => scrollTo("componentes")}><Play size={16} fill="currentColor" /> Explorar playground</button>
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
            <div className="float-card float-a"><CheckCircle2 size={17} /><div><strong>Render concluído</strong><small>8.4ms · 60 FPS</small></div></div>
            <div className="float-card float-b"><Gauge size={17} /><div><strong>10.000 nós</strong><small>WebGL renderer</small></div></div>
          </div>
          <div className="hero-foot">
            <div><strong>5</strong><span>pacotes alpha</span></div>
            <div><strong>6.2 kB</strong><span>core gzipped</span></div>
            <div><strong>4</strong><span>adaptadores</span></div>
            <div><strong>AA</strong><span>WCAG 2.2</span></div>
          </div>
        </section>

        <section className="explorer-section" id="componentes">
          <div className="section-heading">
            <div><span className="section-number">01</span><p>O MESMO MOTOR. TODAS AS FORMAS.</p></div>
            <h2>Um playground para<br />dados do mundo real.</h2>
            <p>Troca de componente, inspeciona o contrato de dados e leva o código contigo. Tudo sem sair da página.</p>
          </div>

          <div className="product-shell">
            <aside className="component-sidebar">
              <div className="sidebar-title"><span>EXPLORADOR</span><button aria-label="Recolher menu"><PanelLeftClose size={15} /></button></div>
              <button className="sidebar-search" onClick={() => setShowSearch(true)}><Search size={14} /> Procurar componente <kbd>/</kbd></button>
              <p className="sidebar-label">VISUALIZAÇÕES</p>
              <div className="feature-nav">
                {featureItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} className={activeFeature === item.id ? "active" : ""} onClick={() => selectFeature(item.id)}>
                      <span className="feature-icon" style={{ "--feature-accent": item.accent } as React.CSSProperties}><Icon size={16} /></span>
                      <span><strong>{item.name}</strong><small>{item.description}</small></span>
                      <b>{item.count}</b>
                    </button>
                  );
                })}
              </div>
              <p className="sidebar-label">FUNDAÇÕES</p>
              <button className="foundation-link"><Braces size={15} /> Tipos & schemas <ChevronRight size={14} /></button>
              <button className="foundation-link"><Sparkles size={15} /> Temas & tokens <ChevronRight size={14} /></button>
              <button className="foundation-link"><ShieldCheck size={15} /> Acessibilidade <ChevronRight size={14} /></button>
              <div className="sidebar-help"><CircleHelp size={17} /><div><strong>Precisas de ajuda?</strong><small>Fala com um engenheiro</small></div><ArrowRight size={15} /></div>
            </aside>

            <div className="workspace">
              <div className="workspace-header">
                <div>
                  <span className="workspace-eyebrow" style={{ color: activeFeatureData.accent }}>{featureCopy[activeFeature].eyebrow}</span>
                  <h3>{featureCopy[activeFeature].title}</h3>
                  <p>{featureCopy[activeFeature].description}</p>
                </div>
                <div className="workspace-actions">
                  <button className={dense ? "active" : ""} onClick={() => setDense(!dense)}><Zap size={14} /> Live data</button>
                  <button><ExternalLink size={14} /> Abrir exemplo</button>
                </div>
              </div>
              <div className="workspace-tabs" role="tablist">
                <button role="tab" aria-selected={workspaceTab === "preview"} className={workspaceTab === "preview" ? "active" : ""} onClick={() => setWorkspaceTab("preview")}><Play size={13} /> Preview</button>
                <button role="tab" aria-selected={workspaceTab === "data"} className={workspaceTab === "data" ? "active" : ""} onClick={() => setWorkspaceTab("data")}><FileJson size={13} /> Dados</button>
                <button role="tab" aria-selected={workspaceTab === "api"} className={workspaceTab === "api" ? "active" : ""} onClick={() => setWorkspaceTab("api")}><Braces size={13} /> API</button>
                <div className="tab-meta"><span className="status-dot" /> 60 FPS <i /> {dense ? "streaming" : "1.240 items"}</div>
              </div>
              <div className="workspace-canvas">
                {workspaceTab === "preview" && <FeaturePreview feature={activeFeature} dense={dense} />}
                {workspaceTab === "data" && (
                  <div className="data-inspector">
                    <div className="data-inspector-head"><span><FileJson size={14} /> data.json</span><CopyButton value={payloads[activeFeature]} /></div>
                    <pre><code>{payloads[activeFeature]}</code></pre>
                    <div className="schema-success"><CheckCircle2 size={16} /><span><strong>Schema válido</strong><small>Todos os campos obrigatórios estão presentes.</small></span><b>8.4 ms</b></div>
                  </div>
                )}
                {workspaceTab === "api" && (
                  <div className="api-table">
                    <div className="api-row api-head"><span>PROPRIEDADE</span><span>TIPO</span><span>DEFAULT</span><span>DESCRIÇÃO</span></div>
                    <div className="api-row"><code>data</code><span className="type-pill">T[]</span><code>[]</code><span>Itens normalizados da visualização.</span></div>
                    <div className="api-row"><code>renderer</code><span className="type-pill">auto | svg | webgl</span><code>auto</code><span>Seleciona o motor de renderização.</span></div>
                    <div className="api-row"><code>interactive</code><span className="type-pill">boolean</span><code>true</code><span>Ativa zoom, seleção e teclado.</span></div>
                    <div className="api-row"><code>onChange</code><span className="type-pill">(event) =&gt; void</span><code>—</code><span>Emite alterações com tipagem estrita.</span></div>
                  </div>
                )}
              </div>
              <div className="workspace-footer"><span><CheckCircle2 size={14} /> Dados validados</span><span>Canvas 1.240 × 620</span><span><ShieldCheck size={14} /> WCAG AA</span><span>Zoom 100%</span></div>
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
                <div className="code-status"><span><CheckCircle2 size={14} /> Compilado sem erros</span><b>6.8 kB core + adapter</b></div>
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
            <button className="secondary-button">Explorar arquitetura <ArrowRight size={15} /></button>
          </div>
          <div className="architecture-grid">
            <article className="arch-card arch-wide">
              <div className="arch-icon"><Gauge /></div><span>RENDER ENGINE</span>
              <h3>Do DOM ao WebGL.<br />Automaticamente.</h3>
              <p>A Nodara escolhe o renderer certo de acordo com o volume e a interação.</p>
              <div className="performance-bars"><i><span style={{ width: "24%" }} /></i><i><span style={{ width: "56%" }} /></i><i><span style={{ width: "88%" }} /></i></div>
              <div className="performance-labels"><span>DOM</span><span>CANVAS</span><span>WEBGL</span></div>
            </article>
            <article className="arch-card"><div className="arch-icon"><PackageCheck /></div><span>MODULAR</span><h3>Importa só o que usas.</h3><p>Cinco pacotes independentes e tree-shaking real.</p><strong className="metric">6.2 <small>kB CORE</small></strong></article>
            <article className="arch-card"><div className="arch-icon"><ShieldCheck /></div><span>ACCESSIBLE</span><h3>Acessível de raiz.</h3><p>Teclado, leitores de ecrã e contraste testados.</p><strong className="metric">AA <small>WCAG 2.2</small></strong></article>
            <article className="arch-card arch-community"><div className="arch-icon"><Code2 /></div><span>OPEN CORE</span><h3>Construída em público.</h3><p>Roadmap aberto, RFCs e releases previsíveis.</p><div className="community-row"><span>12.8k <small>stars</small></span><span>84 <small>contributors</small></span><span>99.9% <small>uptime</small></span></div></article>
          </div>
        </section>

        <section className="enterprise-section" id="enterprise">
          <div className="enterprise-orbit"><i /><i /><i /><span className="brand-mark"><i /><i /><i /><i /></span></div>
          <p className="mini-label">PRONTO PARA PRODUÇÃO</p>
          <h2>Os teus dados já têm uma história.<br /><em>Vamos torná-la visível.</em></h2>
          <p>Começa com a comunidade. Cresce com suporte, colaboração e segurança enterprise.</p>
          <div className="enterprise-actions"><button className="primary-button">Começar gratuitamente <ArrowRight size={16} /></button><button className="secondary-button">Falar com engenharia</button></div>
          <div className="enterprise-note"><span><Check size={14} /> MIT core</span><span><Check size={14} /> Sem cartão</span><span><Check size={14} /> Suporte TypeScript</span></div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><div className="brand"><span className="brand-mark"><i /><i /><i /><i /></span><span>NODARA</span></div><p>Visual infrastructure for the web.</p></div>
        <div className="footer-links"><div><strong>PRODUTO</strong><a href="#componentes">Componentes</a><a href="#integrar">Frameworks</a><a href="#arquitetura">Roadmap</a></div><div><strong>RECURSOS</strong><a href="#integrar">Documentação</a><a href="#componentes">Exemplos</a><a href="#arquitetura">Changelog</a></div><div><strong>EMPRESA</strong><a href="#enterprise">Enterprise</a><a href="#enterprise">Segurança</a><a href="#enterprise">Contacto</a></div></div>
        <div className="footer-bottom"><span>© 2026 Nodara Labs</span><span>Feito com precisão em Portugal.</span><div><a href="#">GitHub</a><a href="#">Discord</a><a href="#">X / Twitter</a></div></div>
      </footer>

      {showSearch && (
        <div className="search-overlay" role="presentation" onMouseDown={() => setShowSearch(false)}>
          <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Pesquisa da documentação" onMouseDown={(event) => event.stopPropagation()}>
            <div className="search-input-wrap"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar componentes, APIs e guias…" /><kbd>ESC</kbd></div>
            <p>SUGESTÕES</p>
            <div className="search-results">
              {filteredSearch.map((entry, index) => <button key={entry} onClick={() => { setShowSearch(false); scrollTo(index < 8 ? "componentes" : "integrar"); }}><span><Command size={14} />{entry}</span><ChevronRight size={14} /></button>)}
              {filteredSearch.length === 0 && <div className="no-results">Nenhum resultado. Experimenta “Gantt” ou “schema”.</div>}
            </div>
            <div className="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
