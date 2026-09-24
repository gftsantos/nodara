"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- portable Vinext routes use standard anchors */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the scrollable code sample needs a keyboard focus target */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Calendar, Chart, Gantt, GeoMap, Topology } from "@nodara/react";
import { createOperationalStore, NodaraError, operationalCalendar, operationalCapacity, operationalCriticalPath, operationalGantt, operationalLoadChart, operationalMap, operationalTopology, type OperationalCommand, type OperationalTask, type OperationalTransaction } from "@nodara/core";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Code2, Copy, Download, GitBranch, Layers3, MapPin, Moon, Redo2, RotateCcw, Sun, Undo2 } from "lucide-react";
import { demoPlan, OPERATIONAL_DAY } from "./demo-plan";
import styles from "./operations.module.css";
import { DependencyEditor, DiagramRoutingLab, WorkingTimeLab } from "./advanced-labs";
import WorkingWorkspace from "./working-workspace";
import { parsePortalJSON } from "../safe-json";

type View = "gantt" | "calendar" | "topology" | "map";
const viewLabels: Record<View, string> = { gantt: "Gantt", calendar: "Calendário", topology: "Dependências", map: "Locais" };
const date = (timestamp: number) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "UTC" }).format(timestamp);
const timestamp = (value: string | number | Date) => new Date(value).getTime();

export default function OperationsPage() {
  const [store] = useState(() => createOperationalStore(demoPlan));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [selectedId, setSelectedId] = useState("core");
  const [view, setView] = useState<View>("gantt");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cascade, setCascade] = useState(true);
  const [allowConflicts, setAllowConflicts] = useState(false);
  const [planningMode, setPlanningMode] = useState<"elapsed" | "working">("elapsed");
  const [workingVisited, setWorkingVisited] = useState(false);
  const [notice, setNotice] = useState("Seleciona uma tarefa ou arrasta uma barra. As cinco vistas partilham o mesmo plano.");
  const [error, setError] = useState("");
  const [rollback, setRollback] = useState(0);
  const [json, setJson] = useState(() => JSON.stringify(demoPlan, null, 2));
  const [copied, setCopied] = useState(false);
  const ready = useRef<HTMLElement>(null);
  const rejectedFocus = useRef<{ previous: HTMLElement; key?: string; name?: string; submit: boolean } | null>(null);
  useEffect(() => {
    const focus = rejectedFocus.current; rejectedFocus.current = null;
    if (!focus || focus.previous.isConnected) return;
    const controls = [...(ready.current?.querySelectorAll<HTMLElement>("button, input, select, textarea") ?? [])];
    controls.find(control => focus.key ? control.dataset.ndFocus === focus.key : focus.name ? control.getAttribute("name") === focus.name : focus.submit && control.getAttribute("type") === "submit")?.focus({ preventScroll: true });
  }, [rollback]);
  useEffect(() => { if (ready.current) ready.current.dataset.operationsReady = "true"; }, []);

  const plan = snapshot.plan;
  const selected = plan.tasks.find(task => task.id === selectedId) ?? plan.tasks[0];
  const critical = useMemo(() => operationalCriticalPath(plan), [plan]);
  const capacity = useMemo(() => operationalCapacity(plan), [plan]);
  const end = plan.tasks.reduce((end, task) => Math.max(end, task.startMs + task.durationMs), plan.projectStartMs) + OPERATIONAL_DAY;
  const rangeDays = Math.max(1, Math.ceil((end - plan.projectStartMs) / OPERATIONAL_DAY));
  // At most 120 load buckets regardless of imported project length.
  const load = useMemo(() => operationalLoadChart(plan, plan.projectStartMs, end, Math.max(1, Math.ceil(rangeDays / 120)) * OPERATIONAL_DAY), [plan, end, rangeDays]);
  const gantt = useMemo(() => operationalGantt(plan).map(task => ({ ...task, color: task.id === selected?.id ? theme === "dark" ? "#c8fa63" : "#4d6b0c" : task.color! })), [plan, selected?.id, theme]);
  const calendar = useMemo(() => operationalCalendar(plan), [plan]);
  const topology = useMemo(() => { const data = operationalTopology(plan); const criticalEdges = new Set(critical.criticalDependencyIds); return { nodes: data.nodes.map(node => ({ ...node, color: node.id === selected?.id ? "#6570d4" : "#242a31" })), edges: data.edges.map(edge => ({ ...edge, color: criticalEdges.has(edge.id!) ? "#d46d50" : "#78828a" })) }; }, [plan, selected?.id, critical]);
  const map = useMemo(() => operationalMap(plan), [plan]);
  const mapViewport = useMemo(() => {
    if (!map.points.length) return { center: { longitude: 0, latitude: 0 }, zoom: 1 };
    const longitudes = map.points.map(point => point.longitude); const latitudes = map.points.map(point => point.latitude);
    const west = Math.min(...longitudes); const east = Math.max(...longitudes); const south = Math.min(...latitudes); const north = Math.max(...latitudes);
    const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, latitude)) * Math.PI / 360));
    const bottom = mercator(south); const top = mercator(north);
    return { center: { longitude: (west + east) / 2, latitude: (2 * Math.atan(Math.exp((bottom + top) / 2)) - Math.PI / 2) * 180 / Math.PI }, zoom: Math.max(0.5, Math.min(12, 0.7 * 360 / Math.max(1, east - west), 0.7 * 2 * Math.PI / Math.max(0.01, top - bottom))) };
  }, [map]);

  const transact = (commands: OperationalCommand[], label: string, overrides: Partial<OperationalTransaction> = {}) => {
    const transaction: OperationalTransaction = { id: `${snapshot.revision}:${label}`, expectedRevision: snapshot.revision, label, commands, scheduling: cascade ? "cascade-forward" : "manual", conflicts: allowConflicts ? "report" : "reject", ...overrides };
    try {
      const preview = store.preview(transaction);
      const lastEnd = preview.plan.tasks.reduce((end, task) => Math.max(end, task.startMs + task.durationMs), preview.plan.projectStartMs);
      if (preview.plan.tasks.length > 500 || lastEnd - preview.plan.projectStartMs > 730 * OPERATIONAL_DAY) throw new Error("Este workspace admite até 500 tarefas e um horizonte de 730 dias.");
      const first = Math.min(preview.plan.projectStartMs, ...preview.plan.tasks.map(task => task.startMs));
      if (first < Date.UTC(1900, 0, 1) || lastEnd + OPERATIONAL_DAY >= Date.UTC(2200, 0, 1)) throw new Error("O workspace suporta datas entre 1900 e 2199, incluindo o dia de margem da vista.");
      if (preview.plan.resources.length > 500 || preview.plan.locations.length > 500 || preview.plan.assignments.length > 5000 || preview.plan.dependencies.length > 5000) throw new Error("Este workspace admite até 500 recursos/locais e 5000 alocações/dependências.");
      operationalCriticalPath(preview.plan);
      store.transact(transaction);
      setError(""); setNotice(`${label}. ${preview.moves.length ? `${preview.moves.length} tarefa(s) reagendada(s): ${preview.moves.map(move => plan.tasks.find(task => task.id === move.taskId)?.label ?? move.taskId).join(", ")}.` : "Plano validado."}`);
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const details = cause instanceof NodaraError ? cause.details as { conflicts?: { message: string }[] } | undefined : undefined;
      setError(`${message}${details?.conflicts?.[0] ? ` ${details.conflicts[0].message}` : ""} Nenhuma alteração foi guardada.`);
      if (document.activeElement instanceof HTMLElement && ready.current?.contains(document.activeElement)) {
        const previous = document.activeElement; rejectedFocus.current = { previous, key: previous.dataset.ndFocus, name: previous.getAttribute("name") ?? undefined, submit: previous.getAttribute("type") === "submit" };
      }
      setRollback(value => value + 1);
      return false;
    }
  };
  const changeWindow = (taskId: string, startMs: number, durationMs: number) => transact([{ type: "updateTask", taskId, changes: { startMs, durationMs } }], "Datas atualizadas");
  const select = (taskId: string) => { setSelectedId(taskId); setNotice(`Seleção partilhada: ${plan.tasks.find(task => task.id === taskId)?.label ?? taskId}.`); };
  const navigateHistory = (direction: "undo" | "redo") => { store[direction](); setError(""); setNotice(direction === "undo" ? "Operação desfeita em todas as vistas." : "Operação refeita em todas as vistas."); };
  const exportPlan = () => {
    const contents = store.exportJSON(); setJson(contents);
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nodara-plan.json"; anchor.click(); URL.revokeObjectURL(url);
    setNotice("Plano exportado. O ficheiro inclui o plano completo e regras; não inclui o histórico.");
  };
  const snippet = `import { createOperationalStore, createGantt, operationalGantt } from '@nodara/core';\nimport '@nodara/core/styles.css';\n\n// nodara-plan.json: exportado neste workspace, schemaVersion: 1.\nconst response = await fetch('./nodara-plan.json');\nif (!response.ok) throw new Error('Não foi possível ler o plano');\nconst store = createOperationalStore(await response.json());\nconst gantt = createGantt('#gantt', {\n  data: operationalGantt(store.getSnapshot().plan),\n  onTaskChange({ task }) {\n    try {\n      store.transact({\n        id: crypto.randomUUID(),\n        commands: [{ type: 'updateTask', taskId: task.id, changes: {\n          startMs: new Date(task.start).getTime(),\n          durationMs: new Date(task.end).getTime() - new Date(task.start).getTime()\n        }}],\n        scheduling: 'cascade-forward', conflicts: 'reject'\n      });\n    } catch (error) {\n      console.error('Plano rejeitado:', error);\n    } finally {\n      // O callback antecede o commit local do renderer.\n      queueMicrotask(() => gantt.update(operationalGantt(store.getSnapshot().plan)));\n    }\n  }\n});\nconst unsubscribe = store.subscribe(({ plan }) => {\n  gantt.update(operationalGantt(plan));\n  // Atualiza também calendário, mapa, métricas e topologia.\n});\n\n// Ao desmontar:\n// unsubscribe(); gantt.destroy(); store.destroy();`;

  return <main ref={ready} className={styles.page} data-theme={theme}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><Layers3 size={24} /><strong>NODARA</strong><span>OPERATIONS</span></a>
      <nav aria-label="Navegação operacional"><a href="/catalog">Catálogo</a><a href="/docs#operations">Documentação</a><button aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button></nav>
    </header>
    <div className={styles.content}>
      <a className={styles.back} href="/"><ArrowLeft size={14} /> Voltar ao portal</a>
      <section className={styles.intro} aria-labelledby="plan-title">
        <div><p className={styles.eyebrow}>UM PLANO. TODAS AS PERSPETIVAS.</p><h1 id="plan-title">Planeamento operacional<span> integrado.</span></h1><p>Edita uma vez. Vê o impacto nas datas, nas equipas e nos locais.</p></div>
        <div className={styles.planBadge}><span className={styles.dot} /> WORKSPACE DEMONSTRATIVO<strong>Portugal · entrega técnica</strong><small>Dados fictícios · estado local à sessão</small></div>
      </section>
      <div className={styles.tabs} role="group" aria-label="Modelo de planeamento"><button aria-pressed={planningMode === "elapsed"} onClick={() => setPlanningMode("elapsed")}>Planeamento contínuo · CPM</button><button aria-pressed={planningMode === "working"} onClick={() => { setWorkingVisited(true); setPlanningMode("working"); }}>Planeamento laboral · impacto</button></div>
      {workingVisited && <div hidden={planningMode !== "working"}><WorkingWorkspace theme={theme} /></div>}
      <div hidden={planningMode !== "elapsed"}>
      <section className={styles.metrics} aria-label="Resumo do plano">
        <div><span>TAREFAS NO PLANO</span><strong data-testid="task-count">{plan.tasks.length}<small> / {plan.tasks.filter(task => task.progress === 100).length} concluídas</small></strong><p>Identidade comum em todas as vistas</p></div>
        <div><span>CAMINHO CRÍTICO</span><strong>{critical.criticalTaskIds.length}<small> tarefas · CPM</small></strong><p>Precedências, sem nivelamento de recursos</p></div>
        <div><span>FIM DO PLANO ATUAL</span><strong data-testid="plan-end">{date(end - OPERATIONAL_DAY)}</strong><p>Fim mínimo por precedências: {date(critical.finishMs)}</p></div>
        <div className={snapshot.conflicts.length ? styles.hasConflict : ""}><span>CONFLITOS DETETADOS</span><strong data-testid="conflict-count">{snapshot.conflicts.length}<small> / {plan.resources.length} recursos</small></strong><p>{snapshot.conflicts.length ? "Revê os intervalos antes de executar" : "Datas e capacidade sem conflitos"}</p></div>
      </section>
      <div className={styles.toolbar}>
        <div><span className={styles.revision}>REV {String(snapshot.revision).padStart(3, "0")}</span><button onClick={() => navigateHistory("undo")} disabled={!snapshot.canUndo}><Undo2 size={16} /> Desfazer</button><button onClick={() => navigateHistory("redo")} disabled={!snapshot.canRedo}><Redo2 size={16} /> Refazer</button></div>
        <div><button onClick={() => transact([{ type: "replacePlan", plan: demoPlan }], "Exemplo reposto")}><RotateCcw size={15} /> Repor exemplo</button><button onClick={exportPlan}><Download size={15} /> Exportar JSON</button></div>
      </div>
      <div className={styles.workspace}>
        <section className={styles.canvasPanel} aria-label="Vistas sincronizadas">
          <div className={styles.panelHeader}><div><span className={styles.eyebrow}>EXPLORAR O MESMO PLANO</span><h2>{viewLabels[view]}</h2></div><span className={styles.sync}><span className={styles.dot} /> Sincronizado</span></div>
          <div className={styles.tabs} role="tablist" aria-label="Vista operacional">
            {(Object.keys(viewLabels) as View[]).map(item => <button key={item} id={`tab-${item}`} role="tab" tabIndex={view === item ? 0 : -1} onKeyDown={event => { const ids = Object.keys(viewLabels) as View[]; const index = ids.indexOf(item); const next = event.key === "Home" ? ids[0] : event.key === "End" ? ids.at(-1) : event.key === "ArrowRight" ? ids[(index + 1) % ids.length] : event.key === "ArrowLeft" ? ids[(index + ids.length - 1) % ids.length] : undefined; if (next) { event.preventDefault(); setView(next); document.getElementById(`tab-${next}`)?.focus(); } }} aria-selected={view === item} aria-controls="operation-view" onClick={() => setView(item)}>{viewLabels[item]}</button>)}
          </div>
          <div className={styles.visual} id="operation-view" role="tabpanel" aria-labelledby={`tab-${view}`} key={`${view}:${rollback}`}>
            {view === "gantt" && <Gantt data={gantt} theme={theme} start={plan.projectStartMs} end={end} zoom="week" snap="day" ariaLabel="Gantt do plano operacional" onTaskSelect={({ task }) => select(task.id)} onTaskChange={({ task }) => changeWindow(task.id, timestamp(task.start), timestamp(task.end) - timestamp(task.start))} style={{ height: 420 }} />}
            {view === "calendar" && <Calendar events={calendar} theme={theme} date={selected?.startMs ?? plan.projectStartMs} view="week" timeZone="UTC" ariaLabel="Calendário do plano operacional" onEventSelect={({ event }) => select(String(event.meta?.taskId ?? event.id))} onEventChange={({ event }) => changeWindow(String(event.meta?.taskId ?? event.id), timestamp(event.start), timestamp(event.end ?? event.start) - timestamp(event.start))} style={{ height: 420 }} />}
            {view === "topology" && <Topology data={topology} theme={theme} layout="hierarchical" ariaLabel="Dependências do plano operacional" onNodeSelect={({ node }) => select(node.id)} style={{ height: 420 }} />}
            {view === "map" && <GeoMap data={map} theme={theme} center={mapViewport.center} initialZoom={mapViewport.zoom} minZoom={0.5} maxZoom={30} mode="bubbles" ariaLabel="Locais do plano operacional" onPointSelect={({ point }) => { const taskIds = point.meta?.taskIds as string[] | undefined; if (taskIds?.length) select(taskIds[0]!); }} style={{ height: 420 }} />}
          </div>
          <div className={styles.viewHint}><GitBranch size={14} />{view === "gantt" ? "Verde: seleção · Coral: tarefa crítica · Arrasta ou usa ← / → para editar." : view === "calendar" ? "Seleciona ou move eventos. As datas do plano são UTC; a grelha atual segue o fuso do browser." : view === "topology" ? "As ligações coral pertencem ao caminho crítico. Usa scroll para zoom." : "Cada ponto agrupa as tarefas do local. O mapa mostra coordenadas, não rotas rodoviárias."}</div>
        </section>
        <aside className={styles.inspector} aria-label="Editor da tarefa selecionada">
          <div className={styles.panelHeader}><div><span className={styles.eyebrow}>INSPECTOR</span><h2>Tarefa selecionada</h2></div><ChevronRight size={18} /></div>
          {selected ? <TaskEditor key={`${selected.id}:${snapshot.revision}:${rollback}`} task={selected} locations={plan.locations} critical={critical.tasks.find(task => task.taskId === selected.id)?.totalFloatMs ?? 0} onSave={changes => transact([{ type: "updateTask", taskId: selected.id, changes }], "Tarefa guardada")} /> : <p className={styles.empty}>Importa um plano com tarefas para começar.</p>}
          <div className={styles.policies}><label><input type="checkbox" checked={cascade} onChange={event => setCascade(event.target.checked)} /> Reagendar sucessoras automaticamente</label><label><input type="checkbox" checked={allowConflicts} onChange={event => setAllowConflicts(event.target.checked)} /> Permitir guardar com conflitos visíveis</label><p>A cascata avança datas; não antecipa tarefas nem resolve sobrecargas. Tarefas bloqueadas nunca são movidas pela cascata.</p></div>
        </aside>
      </div>
      <div className={styles.notice} role="status" aria-live="polite"><Check size={16} /> {notice}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <section className={styles.lowerGrid}>
        <div className={styles.taskPanel}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>IDENTIDADES PARTILHADAS</span><h2>Tarefas e alocações</h2></div><span>{plan.tasks.length} registos</span></div><div className={styles.taskList}>
          {plan.tasks.map(task => <button data-testid={`task-${task.id}`} className={styles.taskRow} key={task.id} onClick={() => select(task.id)} aria-pressed={selected?.id === task.id}><span className={styles.taskMarker} data-critical={critical.criticalTaskIds.includes(task.id)} /><span><strong>{task.label}</strong><small>{plan.assignments.filter(assignment => assignment.taskId === task.id).map(assignment => `${plan.resources.find(resource => resource.id === assignment.resourceId)?.label}: ${assignment.units}u`).join(" · ") || "Sem alocação"}</small></span><span>{date(task.startMs)}<small>{task.durationMs ? `${task.durationMs / OPERATIONAL_DAY} dias` : "Marco"}</small></span><ChevronRight size={15} /></button>)}
        </div></div>
        <div className={styles.loadPanel}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>CAPACIDADE POR INTERVALO</span><h2>Carga das equipas</h2></div><span>100u = uma pessoa</span></div><Chart type="step-line" theme={theme} series={load} ariaLabel="Carga de recursos do plano operacional" labelFormatter={value => date(Number(value))} valueFormatter={value => `${value}u`} onPointSelect={({ series, point }) => { const start = Number(point.x); const end = Number(point.meta?.endMs ?? start + OPERATIONAL_DAY); const assignment = plan.assignments.find(assignment => { const task = plan.tasks.find(task => task.id === assignment.taskId); return assignment.resourceId === series.id && task && task.startMs < end && task.startMs + task.durationMs > start; }); if (assignment) select(assignment.taskId); }} style={{ height: 290 }} /><p className={styles.viewHint}>Pico concorrente por intervalo. Capacidade: {plan.resources.map(resource => `${resource.label} ${resource.capacityUnits}u`).join(" · ") || "sem recursos"}.</p></div>
      </section>
      <section className={styles.diagnostics} aria-labelledby="diagnostics-title"><div className={styles.panelHeader}><div><span className={styles.eyebrow}>REGRAS EXPLICÁVEIS</span><h2 id="diagnostics-title">Diagnósticos do plano</h2></div><button disabled={!plan.tasks.some(task => task.id === "portal") || !plan.resources.some(resource => resource.id === "platform") || plan.assignments.some(assignment => assignment.taskId === "portal" && assignment.resourceId === "platform")} onClick={() => transact([{ type: "assign", assignment: { taskId: "portal", resourceId: "platform", units: 100 } }], "Cenário de conflito criado", { conflicts: "report" })}>Criar cenário de conflito <ArrowRight size={15} /></button></div>
        {snapshot.conflicts.length ? <ul className={styles.conflicts}>{snapshot.conflicts.map((conflict, index) => <li key={index}><strong>{conflict.code}</strong><span>{conflict.message}{conflict.startMs !== undefined ? ` ${date(conflict.startMs)} → ${date(conflict.endMs!)}` : ""}</span><button onClick={() => select(conflict.taskIds.at(-1)!)}>Ver tarefa</button></li>)}</ul> : <p className={styles.empty}><Check size={17} /> Sem conflitos no estado atual. Foram avaliados {plan.dependencies.length} vínculos e {capacity.length} intervalos de carga.</p>}
      </section>
      <section className={styles.developer} aria-labelledby="developer-title"><div><p className={styles.eyebrow}>DO PLAYGROUND PARA O TEU PRODUTO</p><h2 id="developer-title">O plano é teu.<br /><span>A integração também.</span></h2><p>O motor de domínio funciona sem DOM. Usa as mesmas transações em React, Vue, Angular, Web Components ou JavaScript.</p><a href="/docs#operations">Contratos, pressupostos e limitações <ArrowRight size={16} /></a><p className={styles.persistence}>Sem conta ou persistência cloud. Exporta o JSON antes de fechar ou recarregar esta página.</p></div><div className={styles.codePanel}><div><span><Code2 size={16} /> JavaScript · motor real</span><button onClick={async () => { try { await navigator.clipboard.writeText(snippet); setCopied(true); setNotice("Código copiado. Inclui no teu HTML um elemento #gantt e coloca o JSON exportado ao lado da página."); } catch { setError("Não foi possível copiar automaticamente. Seleciona e copia o código apresentado."); } }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copiado" : "Copiar código"}</button></div><pre tabIndex={0} aria-label="Código de integração operacional"><code>{snippet}</code></pre><p>Instala os pacotes disponíveis em <a href="/docs#installation">Instalação</a> e adiciona <code>{'<div id="gantt"></div>'}</code> ao HTML.</p></div></section>
      <details className={styles.jsonPanel}><summary>Editar / importar plano JSON <span>Schema 1 · validação atómica</span></summary><label htmlFor="plan-json">Plano completo</label><textarea id="plan-json" value={json} onChange={event => setJson(event.target.value)} spellCheck={false} /><div><button onClick={() => { setJson(store.exportJSON()); setNotice("Editor atualizado com o plano atual."); }}>Carregar estado atual</button><button className={styles.primary} onClick={() => { try { transact([{ type: "replacePlan", plan: parsePortalJSON(json) }], "Plano importado"); } catch { setError("JSON inválido ou demasiado complexo. O plano atual foi preservado."); } }}>Validar e importar</button></div></details>
      <section className={styles.labs} aria-label="Ferramentas avançadas"><h2>Experimentar regras e integração</h2><DependencyEditor plan={plan} transact={transact} /><WorkingTimeLab /><DiagramRoutingLab theme={theme} /></section>
      <footer className={styles.footer}><span>NODARA / OPERATIONS</span><p>Elapsed time · FS/SS/FF/SF · CPM · capacidade · transações · undo/redo</p><a href="/catalog">Explorar componentes <ArrowRight size={14} /></a></footer>
      </div>
    </div>
  </main>;
}

function TaskEditor({ task, locations, critical, onSave }: { task: OperationalTask; locations: readonly { id: string; label: string }[]; critical: number; onSave: (changes: Partial<Omit<OperationalTask, "id">>) => boolean }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    onSave({ label: String(fields.get("label")), startMs: fields.has("start") ? Date.parse(`${fields.get("start")}Z`) : task.startMs, durationMs: fields.has("duration") ? Math.round(Number(fields.get("duration")) * 3_600_000) : task.durationMs, progress: Number(fields.get("progress")), ...(task.locked !== undefined || fields.has("locked") ? { locked: fields.has("locked") } : {}), locationId: fields.get("location") ? String(fields.get("location")) : undefined });
  };
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.taskIdentity}><code>{task.id}</code><span>{critical === 0 ? "Caminho crítico" : `${critical / 3_600_000}h de folga CPM`}</span></div>
    <label>Nome da tarefa<input name="label" defaultValue={task.label} required /></label>
    <label>Início · UTC<input name="start" type="datetime-local" step="0.001" min="1900-01-01T00:00" max="2199-12-31T23:59" defaultValue={new Date(task.startMs).toISOString().slice(0, -1)} disabled={task.locked} required /></label>
    <div className={styles.formColumns}><label>Duração · horas<input name="duration" type="number" min="0" step="any" defaultValue={task.durationMs / 3_600_000} disabled={task.locked} required /></label><label>Progresso · %<input name="progress" type="number" min="0" max="100" step="1" defaultValue={task.progress} required /></label></div>
    <label>Local<select name="location" defaultValue={task.locationId ?? ""}><option value="">Sem local</option>{locations.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
    <label className={styles.lock}><input type="checkbox" name="locked" defaultChecked={task.locked} /> Bloquear datas</label>
    {task.locked && <p className={styles.formNote}>Desbloqueia e guarda antes de alterar as datas.</p>}
    <button className={styles.primary} type="submit">Guardar tarefa <Check size={16} /></button>
    <p className={styles.formNote}><MapPin size={12} /> Mudanças aplicadas a todas as vistas, numa só transação.</p>
  </form>;
}
