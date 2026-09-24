"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable code samples */
import { useMemo, useState, type FormEvent } from "react";
import { Diagram } from "@nodara/react";
import { normalizeDiagram, type OperationalCommand, type OperationalPlan, type OperationalDependencyKind } from "@nodara/core";
import { createWorkingClock, type WorkingCalendar } from "@nodara/core/working-time";
import styles from "./operations.module.css";
import { workingTimeExample } from "./advanced-examples";
import { parsePortalJSON } from "../safe-json";

const calendar: WorkingCalendar = { id: "office", timeZone: "Europe/Lisbon", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }] })), exceptions: {}, disambiguation: "reject" };
const diagram = { nodes: [{ id: "request", label: "Pedido", ports: [{ id: "out", side: "bottom" }] }, { id: "review", label: "Revisão", ports: [{ id: "in", side: "top" }, { id: "out", side: "bottom" }] }, { id: "done", label: "Concluído", ports: [{ id: "in", side: "top" }] }], links: [{ from: "request", to: "review", fromPort: "out", toPort: "in", directed: true }, { from: "review", to: "done", fromPort: "out", toPort: "in", directed: true }] };
function CopyCode({ code, label }: { code: string; label: string }) {
  const [notice, setNotice] = useState({ code: "", text: "" });
  return <div className={styles.codePanel}><div><span>{label}</span><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setNotice({ code, text: "Código copiado." }); } catch { setNotice({ code, text: "Seleciona e copia o código abaixo." }); } }}>Copiar exemplo</button></div><pre tabIndex={0} aria-label={label}><code>{code}</code></pre><p role="status">{notice.code === code ? notice.text : ""}</p></div>;
}
export function WorkingTimeLab() {
  const [json, setJson] = useState(JSON.stringify(calendar, null, 2)); const [local, setLocal] = useState("2026-10-23T16:00"); const [hours, setHours] = useState("3");
  const result = useMemo(() => { try {
    const year = Number(local.slice(0, 4)); if (year < 1900 || year > 2198 || !Number.isInteger(year)) throw new Error("Escolhe um ano entre 1900 e 2198.");
    const horizon = { startDate: `${year}-01-01`, endDate: `${year + 1}-01-01` }; const c = createWorkingClock(parsePortalJSON(json), horizon);
    const amount = Number(hours) * 3_600_000; if (!hours.trim() || !Number.isSafeInteger(amount)) throw new Error("A duração deve corresponder a milissegundos inteiros.");
    const window = c.add(c.fromLocal(local), amount);
    return { value: { inicioLocal: c.toLocal(window.startMs), fimLocal: c.toLocal(window.endMs), horasTrabalhadas: window.workingMs / 3_600_000, horasDecorridas: (window.endMs - window.startMs) / 3_600_000, segmentos: window.segments.map(segment => ({ inicio: c.toLocal(segment.startMs), fim: c.toLocal(segment.endMs) })) }, code: workingTimeExample(c.calendar, horizon, local, amount) };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; } }, [json, local, hours]);
  return <details className={styles.lab} id="working-time-lab"><summary>Calendários laborais e fusos <span>Horários, feriados e mudanças de hora</span></summary>
    <p>Edita o calendário ou a duração: o resultado é recalculado imediatamente. No exemplo, três horas úteis atravessam o fim de semana da mudança de hora em Lisboa.</p>
    <div className={styles.labGrid}><div className={styles.form}><label>Início local<input type="datetime-local" step="0.001" value={local} onChange={event => setLocal(event.target.value)} /></label><label>Horas de trabalho<input type="number" min="0" step="any" value={hours} onChange={event => setHours(event.target.value)} /></label><label>Calendário laboral JSON<textarea value={json} onChange={event => setJson(event.target.value)} spellCheck={false} /></label><p>ISO: segunda-feira = 1, domingo = 7. Para fechar um dia, acrescenta <code>{'"2026-10-26": []'}</code> em <code>exceptions</code>. Usa um fuso IANA, por exemplo Europe/Lisbon ou America/New_York.</p></div>
    <div>{result.error ? <p role="alert">{result.error}</p> : <><h3>Resultado calculado</h3><pre className={styles.labOutput} data-testid="working-time-output" tabIndex={0}>{JSON.stringify(result.value, null, 2)}</pre><CopyCode code={result.code!} label="Integração · calendário laboral" /></>}</div></div>
    <p>São horas reais dentro dos turnos, não horas nominais de processamento salarial. As regras de fuso vêm do sistema. Horizonte limitado a um ano neste laboratório; a API aceita até 3660 dias. Este cálculo é independente do plano acima: não ativa CPM laboral, calendários por recurso ou nivelamento automático.</p>
  </details>;
}
export function DependencyEditor({ plan, transact }: { plan: OperationalPlan; transact: (commands: OperationalCommand[], label: string) => boolean }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    transact([{ type: "addDependency", dependency: { id: crypto.randomUUID(), fromTaskId: String(fields.get("from")), toTaskId: String(fields.get("to")), kind: String(fields.get("kind")) as OperationalDependencyKind, lagMs: Number(fields.get("lag")) * 3_600_000 } }], "Dependência adicionada");
  };
  return <details className={styles.lab} id="dependency-editor"><summary>Editar dependências <span>FS · SS · FF · SF · antecipações e atrasos</span></summary>
    <p>S = início, F = fim. FS liga fim a início; SS liga inícios; FF liga fins; SF exige que a sucessora termine depois do início da predecessora. Lag positivo atrasa o limite; negativo permite antecipação. A cascata só avança tarefas.</p>
    <form className={styles.form} onSubmit={submit}><div className={styles.labGrid}><label>Predecessora<select name="from">{plan.tasks.map(task => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label><label>Sucessora<select name="to" defaultValue={plan.tasks[1]?.id}>{plan.tasks.map(task => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label><label>Relação<select name="kind"><option>FS</option><option>SS</option><option>FF</option><option>SF</option></select></label><label>Lag · horas decorridas<input name="lag" type="number" defaultValue="0" step="any" required /></label></div><button type="submit" className={styles.primary} disabled={plan.tasks.length < 2}>Adicionar dependência</button></form>
    <ul className={styles.dependencyList}>{plan.dependencies.map(edge => <li key={edge.id}><span>{plan.tasks.find(task => task.id === edge.fromTaskId)?.label} → {plan.tasks.find(task => task.id === edge.toTaskId)?.label} · {edge.kind} · {edge.lagMs / 3_600_000}h</span><button type="button" onClick={() => transact([{ type: "removeDependency", dependencyId: edge.id }], "Dependência removida")} aria-label={`Remover dependência ${edge.id}`}>Remover</button></li>)}</ul>
    <p>Alterações usam a mesma validação, política de conflitos e histórico do plano. Pares com tipos diferentes podem coexistir; duplicados do mesmo tipo e ciclos são rejeitados. Datas e lag mantêm a base elapsed, mesmo quando existe um calendário no laboratório abaixo.</p>
  </details>;
}
export function DiagramRoutingLab({ theme }: { theme: "dark" | "light" }) {
  const [json, setJson] = useState(JSON.stringify(diagram, null, 2)); const [clearance, setClearance] = useState(8);
  const parsed = useMemo(() => { try { const data = normalizeDiagram(parsePortalJSON(json)); if (data.nodes.length > 60 || data.links.length > 120) throw new Error("O laboratório admite até 60 nós e 120 ligações."); return { data }; } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; } }, [json]);
  const code = `import { createDiagram } from '@nodara/core';\nimport '@nodara/core/styles.css';\n\nconst diagram = createDiagram('#diagram', {\n  type: 'flowchart', orientation: 'vertical', linkRouting: 'orthogonal', routingClearance: ${clearance},\n  data: ${parsed.data ? JSON.stringify(parsed.data, null, 2) : '{}'}\n});\n// HTML: <div id="diagram" style="height:360px"></div>\n// Ao desmontar: diagram.destroy();`;
  return <details className={styles.lab} id="diagram-routing-lab"><summary>Portas e percursos de diagramas <span>Componentes reais · JSON editável</span></summary><p>As ligações saem de portas nomeadas e contornam os retângulos dos nós. A posição das portas acompanha o layout. Edita os dados e observa o resultado.</p><div className={styles.labGrid}><div className={styles.form}><label>Dados do diagrama<textarea value={json} spellCheck={false} onChange={event => setJson(event.target.value)} /></label><label>Distância aos nós · px<input type="range" min="0" max="24" step="1" value={clearance} onChange={event => setClearance(Number(event.target.value))} /><output>{clearance}px</output></label></div><div>{parsed.error ? <p role="alert">{parsed.error}</p> : <Diagram data={parsed.data!} type="flowchart" orientation="vertical" linkRouting="orthogonal" routingClearance={clearance} theme={theme} style={{ height: 360 }} ariaLabel="Diagrama com portas e percursos ortogonais" />}</div></div>{parsed.data && <CopyCode code={code} label="Integração · portas e percursos" />}<p>Disponível nos diagramas de caixas, não em Sankey ou hierarquias de áreas. Não evita cruzamentos entre ligações nem resolve nós sobrepostos. Ligações sem percurso, auto-ligações e limites de pesquisa geram avisos; não são desenhadas por cima dos obstáculos.</p></details>;
}
