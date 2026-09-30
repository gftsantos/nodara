import type { WorkingPlan } from "@nodara/core/working-time";
export function workingIntegrationExample(plan: WorkingPlan): string {
  return `import { createGantt, createCalendar, createChart, createTopology, createGeoMap } from '@nodara/core';
import { createWorkingPlanStore, workingPlanViews } from '@nodara/core/working-time';
import '@nodara/core/styles.css';

// Adiciona <div id="nodara-working"></div> ao HTML.
const host = document.querySelector('#nodara-working');
if (!host) throw new Error('Falta o elemento #nodara-working');
const panel = () => { const element = document.createElement('div'); element.style.height = '360px'; host.append(element); return element; };
const store = createWorkingPlanStore(${JSON.stringify(plan, null, 2)});
const initial = workingPlanViews(store.getSnapshot().evaluation);
const gantt = createGantt(panel(), { data: initial.gantt, editable: false, locale: 'pt-PT' });
const calendar = createCalendar(panel(), { events: initial.calendar, expandRecurrence: false, view: 'agenda', date: store.getSnapshot().evaluation.finishMs, timeZone: store.getSnapshot().evaluation.plan.calendar.timeZone });
const chart = createChart(panel(), { series: initial.load, type: 'step-line' });
const topology = createTopology(panel(), { data: initial.topology, layout: 'hierarchical' });
const map = createGeoMap(panel(), { data: initial.map, mode: 'bubbles' });
const unsubscribe = store.subscribe(() => {
  const evaluation = store.getSnapshot().evaluation;
  const views = workingPlanViews(evaluation);
  gantt.update(views.gantt); calendar.update(views.calendar);
  calendar.setOptions({ date: evaluation.finishMs, timeZone: evaluation.plan.calendar.timeZone });
  chart.update(views.load); topology.update(views.topology); map.update(views.map);
});
// Para aplicar um rascunho completo schema 2:
// const preview = store.preview(candidatePlan);
// store.apply(candidatePlan, preview.expectedRevision); // rejeita sobrecarga
// Nivelamento opcional, sem alterar o plano guardado:
// const candidate = { ...store.getSnapshot().evaluation.plan, resourceLeveling: 'serial' as const };
// const leveled = store.preview(candidate);
// store.apply(leveled.evaluation.plan, leveled.expectedRevision);
// Cada resource.calendar é opcional; os seus turnos/exceções intersectam o projeto.
// Ao desmontar:
// unsubscribe(); [gantt, calendar, chart, topology, map].forEach(view => view.destroy()); store.destroy();`;
}
