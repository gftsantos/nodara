"use client";
import { useState } from "react";
import type { WorkingCalendar, WorkingResource } from "@nodara/core/working-time";
import styles from "./operations.module.css";

export function ResourceCalendarEditor({ resource, project, onChange }: { resource: WorkingResource; project: WorkingCalendar; onChange: (calendar?: WorkingCalendar) => void }) {
  const [from, setFrom] = useState("2026-10-26"), [to, setTo] = useState("2026-10-26"), [error, setError] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00"), [shiftEnd, setShiftEnd] = useState("17:00"), [days, setDays] = useState([1, 2, 3, 4, 5]);
  const cal = resource.calendar;
  const shift = () => {
    if (!shiftStart || !shiftEnd || shiftStart === shiftEnd || !days.length) { setError("Escolhe os dias e um turno com início e fim diferentes."); return; }
    const rules = new Map<number, { start: string; end: string }[]>();
    const add = (day: number, start: string, end: string) => { const list = rules.get(day) ?? []; list.push({ start, end }); rules.set(day, list); };
    for (const day of days) {
      if (shiftStart < shiftEnd) add(day, shiftStart, shiftEnd);
      else { add(day, shiftStart, "24:00"); if (shiftEnd !== "00:00") add(day % 7 + 1, "00:00", shiftEnd); }
    }
    onChange({ ...(cal ?? project), id: cal?.id ?? `resource-${resource.id}`, week: [...rules].sort(([a], [b]) => a - b).map(([day, periods]) => ({ day, periods: periods.sort((a, b) => a.start.localeCompare(b.start)) })) }); setError("");
  };
  const absence = () => {
    try {
      const start = Date.parse(from + "T00:00Z"), end = Date.parse(to + "T00:00Z"), days = (end - start) / 86400000 + 1;
      if (!Number.isSafeInteger(days) || days < 1 || days > 3660) throw new Error("Escolhe um intervalo válido de 1 a 3660 dias.");
      const exceptions = { ...(cal ?? project).exceptions };
      for (let day = 0; day < days; day++) exceptions[new Date(start + day * 86400000).toISOString().slice(0, 10)] = [];
      onChange({ ...(cal ?? project), id: cal?.id ?? `resource-${resource.id}`, exceptions }); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return <details className={styles.lab}>
    <summary>Calendário do recurso · {resource.label}</summary>
    <p>Sem calendário próprio, herda o do projeto. Com calendário próprio, só trabalha quando ambos estão abertos. Todos os recursos de uma tarefa têm de estar disponíveis em simultâneo.</p>
    <label className={styles.workField}><input type="checkbox" checked={Boolean(cal)} onChange={event => onChange(event.target.checked ? { ...project, id: `resource-${resource.id}` } : undefined)} /> Calendário próprio · {resource.label}</label>
    {cal && <>
      <label className={styles.workField}>Fuso IANA · {resource.label}<input value={cal.timeZone ?? ""} onChange={event => onChange({ ...cal, timeZone: event.target.value })} /></label>
      <p>Para vários turnos e horários especiais, edita o calendário no JSON completo abaixo.</p>
    </>}
    <fieldset><legend>Substituir turno semanal · {resource.label}</legend>
      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, index) => <label key={day}><input type="checkbox" checked={days.includes(index + 1)} onChange={event => setDays(event.target.checked ? [...days, index + 1] : days.filter(value => value !== index + 1))} /> {day} </label>)}
      <label className={styles.workField}>Início do turno · {resource.label}<input type="time" value={shiftStart} onChange={event => setShiftStart(event.target.value)} /></label>
      <label className={styles.workField}>Fim do turno · {resource.label}<input type="time" value={shiftEnd} onChange={event => setShiftEnd(event.target.value)} /></label>
      <button onClick={shift}>Usar turno · {resource.label}</button><p>Substitui os turnos semanais deste recurso no rascunho; preserva exceções. Turnos noturnos são divididos à meia-noite.</p>
    </fieldset>
    <label className={styles.workField}>Ausência desde · {resource.label}<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
    <label className={styles.workField}>Ausência até · {resource.label}<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
    <button onClick={absence}>Adicionar ausência · {resource.label}</button>
    <p>Dias inclusivos no fuso do recurso. Adicionar uma ausência cria um calendário próprio se necessário; só altera o rascunho.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </details>;
}
