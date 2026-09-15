"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable code and table have keyboard access */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Calendar, Chart, Gantt, GeoMap, Topology } from "@nodara/react";
import { createWorkingPlanStore, workingPlanViews, type WorkingPlan, type WorkingPreview } from "@nodara/core/working-time";
import { workingDemo } from "./working-demo";
import { workingIntegrationExample } from "./working-example";
import styles from "./operations.module.css";

export default function WorkingWorkspace({ theme }: { theme: "dark" | "light" }) {
  const [store] = useState(() => createWorkingPlanStore(workingDemo));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [draft, setDraft] = useState(() => store.exportJSON()), [preview, setPreview] = useState<WorkingPreview>();
  const [error, setError] = useState(""), [notice, setNotice] = useState("Altera o calendário e calcula o impacto antes de aplicar.");
  const [allowConflicts, setAllowConflicts] = useState(false), [selectedId, setSelected] = useState("a"), [view, setView] = useState("Gantt");
  const evaluation = preview?.evaluation ?? snapshot.evaluation, views = useMemo(() => workingPlanViews(evaluation), [evaluation]);
  const selected = evaluation.plan.tasks.some(task => task.id === selectedId) ? selectedId : evaluation.plan.tasks[0]?.id ?? "";
  const mapViewport = useMemo(() => {
    if (!views.map.points.length) return { center: { longitude: 0, latitude: 0 }, zoom: 1 };
    const longitudes = views.map.points.map(point => point.longitude), latitudes = views.map.points.map(point => point.latitude);
    const west = Math.min(...longitudes), east = Math.max(...longitudes), south = Math.min(...latitudes), north = Math.max(...latitudes);
    const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, latitude)) * Math.PI / 360));
    const bottom = mercator(south), top = mercator(north);
    return { center: { longitude: (west + east) / 2, latitude: (2 * Math.atan(Math.exp((bottom + top) / 2)) - Math.PI / 2) * 180 / Math.PI }, zoom: Math.max(0.5, Math.min(12, 0.7 * 360 / Math.max(1, east - west), 0.7 * 2 * Math.PI / Math.max(0.01, top - bottom))) };
  }, [views.map]);
  const format = (ms: number) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: evaluation.plan.calendar.timeZone }).format(ms);
  let parsed: WorkingPlan | undefined;
  try {
    const value = JSON.parse(draft) as WorkingPlan;
    if (value && Array.isArray(value.tasks) && Array.isArray(value.resources) && value.calendar && typeof value.calendar === "object" && !Array.isArray(value.calendar) && (value.calendar.exceptions === undefined || value.calendar.exceptions && typeof value.calendar.exceptions === "object" && !Array.isArray(value.calendar.exceptions)) && value.tasks.every(task => task && typeof task.id === "string" && typeof task.label === "string" && Number.isSafeInteger(task.startMs) && Math.abs(task.startMs) <= 8640000000000000 && Number.isFinite(task.workingMs)) && value.resources.every(resource => resource && typeof resource.id === "string" && typeof resource.label === "string" && Number.isFinite(resource.capacityUnits))) parsed = value;
  } catch { /* Invalid drafts never reach controls or overwrite the rendered plan. */ }
  const edit = (next: string) => { setDraft(next); setPreview(undefined); setError(""); setNotice("Rascunho alterado; calcula uma nova prévia."); };
  const change = (update: (plan: WorkingPlan) => WorkingPlan) => { if (parsed) edit(JSON.stringify(update(parsed), null, 2)); };
  const calculate = () => { try { const result = store.preview(JSON.parse(draft)); setPreview(result); setError(""); setNotice("Prévia calculada. O plano guardado ainda não mudou."); } catch (cause) { setPreview(undefined); setError(cause instanceof Error ? cause.message : String(cause)); } };
  const history = (direction: "undo" | "redo") => { store[direction](); setDraft(store.exportJSON()); setPreview(undefined); setError(""); setNotice(direction === "undo" ? "Plano, calendário e capacidade restaurados." : "Alteração refeita em todas as vistas."); };
  const selectedTask = parsed?.tasks?.find(task => task.id === selected);
  const selectedWindow = evaluation.windows.find(window => window.taskId === selected);
  const snippet = workingIntegrationExample(snapshot.evaluation.plan);
  return <section className={styles.working} aria-label="Planeamento laboral integrado">
    <h2>Calendário, entregas e capacidade — numa decisão</h2>
    <p>Exemplo independente do plano contínuo. Um calendário de projeto partilhado por todos os recursos; horas úteis preservadas e lags decorridos. Fecha 26 de outubro para veres o impacto nas entregas e na equipa.</p>
    <div className={styles.toolbar}><div><strong data-testid="working-revision">REV {snapshot.revision}</strong><button onClick={() => history("undo")} disabled={!snapshot.canUndo}>Desfazer plano laboral</button><button onClick={() => history("redo")} disabled={!snapshot.canRedo}>Refazer plano laboral</button></div><div><span data-testid="working-state">{preview ? "PRÉVIA — não aplicada" : "PLANO GUARDADO"}</span><strong>{evaluation.plan.calendar.timeZone}</strong></div></div>
    <div className={styles.labGrid}><div className={styles.lab}>
      <h3>Preparar alteração</h3>
      <label className={styles.workField}><input type="checkbox" checked={Boolean(parsed?.calendar?.exceptions?.["2026-10-26"]?.length === 0)} onChange={event => change(plan => { const exceptions = { ...plan.calendar.exceptions }; if (event.target.checked) exceptions["2026-10-26"] = []; else delete exceptions["2026-10-26"]; return { ...plan, calendar: { ...plan.calendar, exceptions } }; })} /> Feriado em 26 de outubro</label>
      {parsed?.resources?.map(resource => <label className={styles.workField} key={resource.id}>Capacidade · {resource.label}<input type="number" min="0" step="1" value={resource.capacityUnits} onChange={event => change(plan => ({ ...plan, resources: plan.resources.map(item => item.id === resource.id ? { ...item, capacityUnits: Number(event.target.value) } : item) }))} /></label>)}
      <label className={styles.workField}>Tarefa<select value={selected} onChange={event => setSelected(event.target.value)}>{evaluation.plan.tasks.map(task => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label>
      {selectedTask && <><label className={styles.workField}>Trabalho útil · horas<input type="number" min="0" step="any" value={selectedTask.workingMs / 3600000} onChange={event => change(plan => ({ ...plan, tasks: plan.tasks.map(task => task.id === selected ? { ...task, workingMs: Math.round(Number(event.target.value) * 3600000) } : task) }))} /></label><label className={styles.workField}>Início solicitado · UTC<input type="datetime-local" step="0.001" value={Number.isFinite(selectedTask.startMs) ? new Date(selectedTask.startMs).toISOString().slice(0, -1) : ""} onChange={event => { const startMs = Date.parse(event.target.value + "Z"); if (Number.isFinite(startMs)) change(plan => ({ ...plan, tasks: plan.tasks.map(task => task.id === selected ? { ...task, startMs } : task) })); }} /></label></>}
      <p>Seleciona nas vistas; edita aqui ou no JSON. O Gantt mostra o intervalo total; a agenda e a carga usam apenas segmentos de trabalho. Não há nivelamento automático nem CPM laboral.</p>
      <button className={styles.primary} onClick={calculate}>Calcular impacto</button>
    </div><div className={styles.lab}><h3>Impacto antes de aplicar</h3><p data-testid="working-conflicts">{evaluation.conflicts.length} conflitos de capacidade · {preview?.changes.length ?? 0} tarefas alteradas</p>
      <div className={styles.workTable} tabIndex={0}><table><caption>Datas em {evaluation.plan.calendar.timeZone}</caption><thead><tr><th>Tarefa</th><th>Fim guardado</th><th>Fim proposto</th><th>Trabalho útil</th></tr></thead><tbody>{evaluation.windows.map(window => <tr key={window.taskId} data-testid={`working-row-${window.taskId}`}><td><button onClick={() => setSelected(window.taskId)} aria-pressed={selected === window.taskId}>{evaluation.plan.tasks.find(task => task.id === window.taskId)?.label}</button></td><td>{snapshot.evaluation.windows.find(old => old.taskId === window.taskId) ? format(snapshot.evaluation.windows.find(old => old.taskId === window.taskId)!.endMs) : "Nova"}</td><td>{format(window.endMs)}</td><td>{window.workingMs / 3600000}h</td></tr>)}</tbody></table></div>
      {evaluation.conflicts.map((conflict, index) => <p key={index}>{conflict.message} · {format(conflict.startMs!)} → {format(conflict.endMs!)}</p>)}
      <label className={styles.workField}><input type="checkbox" checked={allowConflicts} onChange={event => setAllowConflicts(event.target.checked)} /> Permitir aplicar com conflitos visíveis</label>
      <div className={styles.toolbar}><button className={styles.primary} disabled={!preview} onClick={() => { if (!preview) return; try { store.apply(preview.evaluation.plan, preview.expectedRevision, allowConflicts); setDraft(store.exportJSON()); setPreview(undefined); setError(""); setNotice("Alteração aplicada numa transação a todas as vistas."); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }}>Aplicar a todas as vistas</button><button onClick={() => { setDraft(store.exportJSON()); setPreview(undefined); setError(""); setNotice("Rascunho cancelado; plano guardado preservado."); }}>Cancelar rascunho</button></div>
    </div></div>
    <p role="status">{notice}</p>{error && <p className={styles.error} role="alert">{error}</p>}{!parsed && <p role="alert">O JSON está incompleto ou tem uma estrutura inválida. O plano guardado foi preservado; corrige o editor.</p>}
    <div className={styles.canvasPanel}><div className={styles.tabs} role="group" aria-label="Vistas do plano laboral">{["Gantt", "Calendário", "Dependências", "Locais"].map(name => <button key={name} aria-pressed={view === name} onClick={() => setView(name)}>{name}</button>)}</div>
      <div className={styles.visual} data-testid="working-view">
        {view === "Gantt" && <Gantt data={views.gantt.map(task => ({ ...task, color: task.id === selected ? theme === "dark" ? "#c8fa63" : "#4d6b0c" : "#7884ff" }))} editable={false} locale="pt-PT" theme={theme} zoom="day" start={evaluation.plan.projectStartMs} end={evaluation.finishMs + 86400000} onTaskSelect={({ task }) => setSelected(task.id)} style={{ height: 350 }} />}
        {view === "Calendário" && <Calendar events={views.calendar} expandRecurrence={false} date={selectedWindow?.endMs ?? evaluation.finishMs} view="agenda" locale="pt-PT" timeZone={evaluation.plan.calendar.timeZone} theme={theme} onEventSelect={({ event }) => setSelected(String(event.meta?.taskId))} style={{ height: 350 }} />}
        {view === "Dependências" && <Topology data={{ ...views.topology, nodes: views.topology.nodes.map(node => ({ ...node, color: node.id === selected ? "#7884ff" : "#40c9c6" })) }} layout="hierarchical" theme={theme} onNodeSelect={({ node }) => setSelected(node.id)} style={{ height: 350 }} />}
        {view === "Locais" && <GeoMap data={views.map} mode="bubbles" center={mapViewport.center} initialZoom={mapViewport.zoom} minZoom={0.5} maxZoom={30} theme={theme} onPointSelect={({ point }) => { const ids = point.meta?.taskIds as string[]; if (ids?.length) setSelected(ids[0]!); }} style={{ height: 350 }} />}
      </div><p className={styles.viewHint}>Selecionada: {evaluation.plan.tasks.find(task => task.id === selected)?.label} · {selectedWindow ? `${format(selectedWindow.startMs)} → ${format(selectedWindow.endMs)}` : ""}</p>
    </div>
    <div className={styles.lab}><h3>Capacidade nos períodos realmente trabalhados</h3><Chart series={views.load} type="step-line" theme={theme} labelFormatter={value => format(Number(value))} valueFormatter={value => `${value}u`} onPointSelect={({ point }) => { const ids = point.meta?.taskIds as string[]; if (ids?.length) setSelected(ids[0]!); }} style={{ height: 260 }} /><p>100u = uma pessoa. Noites, pausas e dias encerrados não consomem capacidade.</p></div>
    <details className={styles.lab}><summary>Calendário, tarefas, recursos e dependências em JSON</summary><label className={styles.workField}>Plano laboral JSON<textarea value={draft} onChange={event => edit(event.target.value)} spellCheck={false} /></label><button onClick={calculate}>Validar JSON e calcular impacto</button><button onClick={() => { const url = URL.createObjectURL(new Blob([store.exportJSON()], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nodara-working-plan.json"; anchor.click(); URL.revokeObjectURL(url); }}>Exportar plano laboral guardado</button></details>
    <details className={styles.lab}><summary>Integração copiável · schema 2</summary><pre className={styles.labOutput} tabIndex={0}><code>{snippet}</code></pre><button onClick={async () => { try { await navigator.clipboard.writeText(snippet); setNotice("Código laboral copiado com o plano guardado atual."); } catch { setError("Seleciona e copia o código apresentado."); } }}>Copiar integração laboral</button><p>Estado apenas nesta sessão. Exporta antes de sair. O calendário é partilhado; calendários por recurso e execução de processos não estão incluídos.</p></details>
  </section>;
}
