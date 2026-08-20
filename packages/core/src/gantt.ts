import { createController } from "./controller";
import { applyTheme } from "./theme";
import type { GanttOptions, GanttTask, GanttTaskEvent, NodaraController } from "./types";
import { createElement, empty, formatDate, percentage, resolveElement, toTimestamp } from "./utils";
import { normalizeGanttTasks } from "./validation";

export function createGantt(
  target: string | Element,
  options: GanttOptions,
): NodaraController<GanttTask[]> {
  const container = resolveElement(target);
  const locale = options.locale ?? "en";

  const controller = createController(container, normalizeGanttTasks(options.data), ({ container: root, data, emit }) => {
    empty(root);
    root.className = `nd-root nd-gantt ${options.className ?? ""}`.trim();
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", options.ariaLabel ?? "Gantt chart");
    applyTheme(root, options.theme, options.tokens);

    const timestamps = data.flatMap((task) => [toTimestamp(task.start), toTimestamp(task.end)]);
    const minimum = options.start === undefined ? Math.min(...timestamps) : toTimestamp(options.start);
    const maximum = options.end === undefined ? Math.max(...timestamps) : toTimestamp(options.end);
    const safeMinimum = Number.isFinite(minimum) ? minimum : Date.now();
    const safeMaximum = Number.isFinite(maximum) && maximum > safeMinimum ? maximum : safeMinimum + 86_400_000;

    const header = createElement("div", "nd-gantt__header");
    header.append(createElement("strong", "", `${data.length} tasks`));
    header.append(createElement("span", "", `${formatDate(safeMinimum, locale)} — ${formatDate(safeMaximum, locale)}`));
    root.append(header);

    const body = createElement("div", "nd-gantt__body");
    const labels = createElement("div", "nd-gantt__labels");
    const timeline = createElement("div", "nd-gantt__timeline");
    const rowHeight = options.rowHeight ?? 58;
    labels.style.setProperty("--nd-row-height", `${rowHeight}px`);
    timeline.style.setProperty("--nd-row-height", `${rowHeight}px`);

    const labelsHead = createElement("div", "nd-gantt__labels-head", "Task");
    labels.append(labelsHead);
    const scale = createElement("div", "nd-gantt__scale");
    for (let index = 0; index < 4; index += 1) {
      const timestamp = safeMinimum + ((safeMaximum - safeMinimum) * index) / 4;
      scale.append(createElement("span", "", formatDate(timestamp, locale, { month: "short", year: "2-digit" })));
    }
    timeline.append(scale);

    data.forEach((task) => {
      const label = createElement("div", "nd-gantt__label");
      label.style.height = `${rowHeight}px`;
      const owner = createElement("span", "nd-gantt__owner", task.owner?.name.slice(0, 2).toUpperCase() ?? "—");
      if (task.owner?.color) owner.style.background = task.owner.color;
      const labelText = createElement("span", "nd-gantt__label-text");
      labelText.append(createElement("strong", "", task.label));
      labelText.append(createElement("small", "", `${Math.round(task.progress ?? 0)}% complete`));
      label.append(owner, labelText);
      labels.append(label);

      const row = createElement("div", "nd-gantt__row");
      row.style.height = `${rowHeight}px`;
      const start = percentage(toTimestamp(task.start), safeMinimum, safeMaximum);
      const end = percentage(toTimestamp(task.end), safeMinimum, safeMaximum);
      const bar = createElement("button", "nd-gantt__bar");
      bar.type = "button";
      bar.style.left = `${start}%`;
      bar.style.width = `${Math.max(1.5, end - start)}%`;
      if (task.color) bar.style.setProperty("--nd-task-color", task.color);
      bar.disabled = task.disabled === true;
      bar.setAttribute("aria-label", `${task.label}, ${formatDate(toTimestamp(task.start), locale)} to ${formatDate(toTimestamp(task.end), locale)}, ${task.progress ?? 0}% complete`);
      const progress = createElement("span", "nd-gantt__progress");
      progress.style.width = `${task.progress ?? 0}%`;
      bar.append(progress);
      const selectTask = (source: GanttTaskEvent["source"]) => emit("task:select", { task, source } satisfies GanttTaskEvent);
      bar.addEventListener("click", () => selectTask("pointer"));
      bar.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") selectTask("keyboard");
      });
      row.append(bar);
      timeline.append(row);
    });

    body.append(labels, timeline);
    root.append(body);
  });

  if (options.onTaskSelect) controller.on<GanttTaskEvent>("task:select", options.onTaskSelect);
  if (options.onTaskChange) controller.on<GanttTaskEvent>("task:change", options.onTaskChange);
  return controller;
}
