import { createController } from "./controller";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import {
  buildTimeScale,
  dependencyPairs,
  replaceTask,
  resizeTask,
  resolveGanttRange,
  resolveSnap,
  shiftTask,
  timestampToPercent,
} from "./time-scale";
import type { GanttChangeKind, GanttOptions, GanttTask, GanttTaskEvent, NodaraController } from "./types";
import { createElement, empty, formatDate, resolveElement, toTimestamp } from "./utils";
import { normalizeGanttTasks } from "./validation";
import { renderWebGLPoints } from "./webgl";

function tickFormat(timestamp: number, locale: string, zoom: NonNullable<GanttOptions["zoom"]>): string {
  if (zoom === "day") return formatDate(timestamp, locale, { hour: "2-digit", minute: "2-digit" });
  if (zoom === "week") return formatDate(timestamp, locale, { weekday: "short", day: "2-digit" });
  if (zoom === "quarter") return formatDate(timestamp, locale, { month: "short", year: "numeric" });
  return formatDate(timestamp, locale, { month: "short", year: "2-digit" });
}

function renderAccessibleTaskList(root: HTMLElement, data: GanttTask[], locale: string, limit: number, select?: (task: GanttTask, source: "keyboard") => void): void {
  const list = createElement("ul", "nd-sr-only");
  const accessibleLimit = Math.max(1, Math.floor(limit));
  data.slice(0, accessibleLimit).forEach((task) => {
    const item = createElement("li");
    const button = createElement("button", "", `${task.label}, ${formatDate(toTimestamp(task.start), locale)} to ${formatDate(toTimestamp(task.end), locale)}, ${task.progress ?? 0}% complete`);
    button.type = "button";
    button.disabled = task.disabled === true;
    if (select) button.addEventListener("click", () => select(task, "keyboard"));
    item.append(button);
    list.append(item);
  });
  if (data.length > accessibleLimit) {
    list.append(createElement("li", "", `${data.length - accessibleLimit} additional tasks are available through the data API.`));
  }
  root.append(list);
}

function renderLargeGantt(
  root: HTMLElement,
  data: GanttTask[],
  options: GanttOptions,
  mode: "canvas" | "webgl",
  select: (task: GanttTask, source: "pointer" | "keyboard") => void,
): () => void {
  const locale = options.locale ?? "en";
  const range = resolveGanttRange(data, options.start, options.end);
  const scale = buildTimeScale(range.start, range.end, options.zoom ?? "month");
  const canvas = createElement("canvas", "nd-gantt__density-canvas");
  const width = Math.max(root.clientWidth, 640);
  const height = Math.max(root.clientHeight - 44, 300);
  const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, options.performance?.maxDevicePixelRatio ?? 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.setAttribute("aria-hidden", "true");
  root.append(canvas);
  const points = data.map((task, index) => ({
    x: (timestampToPercent(toTimestamp(task.start), scale) / 100) * width,
    y: 18 + (index % Math.max(1, Math.floor((height - 36) / 8))) * 8,
    size: 5,
  }));
  const usedWebGL = mode === "webgl" && renderWebGLPoints(canvas, points, width, height);
  if (!usedWebGL) {
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(pixelRatio, pixelRatio);
      context.fillStyle = "#7884ff";
      context.globalAlpha = 0.72;
      data.forEach((task, index) => {
        const x = (timestampToPercent(toTimestamp(task.start), scale) / 100) * width;
        const end = (timestampToPercent(toTimestamp(task.end), scale) / 100) * width;
        const y = 12 + (index % Math.max(1, Math.floor((height - 24) / 7))) * 7;
        context.fillRect(x, y, Math.max(1, end - x), 3);
      });
    }
  }
  renderAccessibleTaskList(root, data, locale, options.performance?.accessibilityLimit ?? 300, isInteractionEnabled(options.interactive, "keyboard") ? select : undefined);
  const onClick = (event: MouseEvent) => {
    if (!isInteractionEnabled(options.interactive, "pointer")) return;
    const rect = canvas.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const nearest = data.reduce<GanttTask | undefined>((best, task) => {
      if (!best) return task;
      const taskDistance = Math.abs(timestampToPercent(toTimestamp(task.start), scale) - percent);
      const bestDistance = Math.abs(timestampToPercent(toTimestamp(best.start), scale) - percent);
      return taskDistance < bestDistance ? task : best;
    }, undefined);
    if (nearest) select(nearest, "pointer");
  };
  canvas.addEventListener("click", onClick);
  return () => canvas.removeEventListener("click", onClick);
}

export function createGantt(
  target: string | Element,
  options: GanttOptions,
): NodaraController<GanttTask[], GanttOptions> {
  const container = resolveElement(target);
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit, commit }) => {
    empty(root);
    root.className = `nd-root nd-gantt ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Gantt chart");
    const locale = currentOptions.locale ?? "en";
    const zoom = currentOptions.zoom ?? "month";
    const mode = resolveRenderMode(currentOptions.renderer, data.length, currentOptions.performance);
    root.dataset.ndRenderer = mode;
    root.dataset.ndZoom = zoom;
    applyTheme(root, currentOptions.theme, currentOptions.tokens);

    const selectTask = (task: GanttTask, source: "pointer" | "keyboard") => {
      const payload = { task, source } satisfies GanttTaskEvent;
      currentOptions.onTaskSelect?.(payload);
      emit("task:select", payload);
    };

    const header = createElement("div", "nd-gantt__header");
    header.append(createElement("strong", "", `${data.length} tasks`));
    const range = resolveGanttRange(data, currentOptions.start, currentOptions.end);
    header.append(createElement("span", "", `${formatDate(range.start, locale)} — ${formatDate(range.end, locale)} · ${zoom}`));
    root.append(header);

    if (mode !== "dom") return renderLargeGantt(root, data, currentOptions, mode, selectTask);

    const scaleModel = buildTimeScale(range.start, range.end, zoom);
    const body = createElement("div", "nd-gantt__body");
    const labels = createElement("div", "nd-gantt__labels");
    const timeline = createElement("div", "nd-gantt__timeline");
    const rowHeight = Math.max(36, currentOptions.rowHeight ?? 58);
    labels.style.setProperty("--nd-row-height", `${rowHeight}px`);
    timeline.style.setProperty("--nd-row-height", `${rowHeight}px`);
    timeline.style.setProperty("--nd-tick-count", String(scaleModel.ticks.length - 1));

    labels.append(createElement("div", "nd-gantt__labels-head", "Task"));
    const scale = createElement("div", "nd-gantt__scale");
    scale.style.gridTemplateColumns = `repeat(${scaleModel.ticks.length - 1}, minmax(56px, 1fr))`;
    scaleModel.ticks.slice(0, -1).forEach((tick) => scale.append(createElement("span", "", tickFormat(tick.timestamp, locale, zoom))));
    timeline.append(scale);

    const listenerCleanups: Array<() => void> = [];
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
      row.dataset.taskId = task.id;
      const start = timestampToPercent(toTimestamp(task.start), scaleModel);
      const end = timestampToPercent(toTimestamp(task.end), scaleModel);
      const bar = createElement("button", "nd-gantt__bar");
      bar.type = "button";
      bar.style.left = `${start}%`;
      bar.style.width = `${Math.max(1.5, end - start)}%`;
      bar.dataset.taskId = task.id;
      if (task.color) bar.style.setProperty("--nd-task-color", task.color);
      bar.disabled = task.disabled === true;
      bar.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      bar.setAttribute("aria-label", `${task.label}, ${formatDate(toTimestamp(task.start), locale)} to ${formatDate(toTimestamp(task.end), locale)}, ${task.progress ?? 0}% complete`);
      const progress = createElement("span", "nd-gantt__progress");
      progress.style.width = `${task.progress ?? 0}%`;
      bar.append(progress);
      const startHandle = createElement("span", "nd-gantt__resize nd-gantt__resize--start");
      startHandle.dataset.resize = "start";
      const endHandle = createElement("span", "nd-gantt__resize nd-gantt__resize--end");
      endHandle.dataset.resize = "end";
      if (isInteractionEnabled(currentOptions.interactive, "pointer") && !task.disabled) bar.append(startHandle, endHandle);

      const changeTask = (nextTask: GanttTask, change: GanttChangeKind, source: "pointer" | "keyboard") => {
        const payload = { task: nextTask, previousTask: task, change, source } satisfies GanttTaskEvent;
        currentOptions.onTaskChange?.(payload);
        commit(replaceTask(data, nextTask), "task:change", payload);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (!isInteractionEnabled(currentOptions.interactive, "keyboard") || task.disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectTask(task, "keyboard");
          return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const delta = (event.key === "ArrowRight" ? 1 : -1) * resolveSnap(currentOptions.snap);
        if (event.shiftKey) changeTask(resizeTask(task, "end", delta), "resize-end", "keyboard");
        else if (event.altKey) changeTask(resizeTask(task, "start", delta), "resize-start", "keyboard");
        else changeTask(shiftTask(task, delta), "move", "keyboard");
      };
      const onClick = () => { if (isInteractionEnabled(currentOptions.interactive, "pointer")) selectTask(task, "pointer"); };
      const onPointerDown = (event: PointerEvent) => {
        if (!isInteractionEnabled(currentOptions.interactive, "pointer") || task.disabled || event.button !== 0) return;
        event.preventDefault();
        const targetElement = event.target instanceof HTMLElement ? event.target : bar;
        const edge = targetElement.dataset.resize;
        const change: GanttChangeKind = edge === "start" ? "resize-start" : edge === "end" ? "resize-end" : "move";
        const originX = event.clientX;
        const width = Math.max(1, timeline.getBoundingClientRect().width);
        const onPointerUp = (upEvent: PointerEvent) => {
          const rawDelta = ((upEvent.clientX - originX) / width) * scaleModel.duration;
          const step = resolveSnap(currentOptions.snap);
          const delta = Math.round(rawDelta / step) * step;
          if (delta !== 0) {
            const nextTask = change === "move" ? shiftTask(task, delta) : resizeTask(task, change === "resize-start" ? "start" : "end", delta);
            changeTask(nextTask, change, "pointer");
          }
          document.removeEventListener("pointerup", onPointerUp);
        };
        document.addEventListener("pointerup", onPointerUp, { once: true });
        listenerCleanups.push(() => document.removeEventListener("pointerup", onPointerUp));
      };
      bar.addEventListener("click", onClick);
      bar.addEventListener("keydown", onKeyDown);
      bar.addEventListener("pointerdown", onPointerDown);
      listenerCleanups.push(() => {
        bar.removeEventListener("click", onClick);
        bar.removeEventListener("keydown", onKeyDown);
        bar.removeEventListener("pointerdown", onPointerDown);
      });
      row.append(bar);
      timeline.append(row);
    });

    const dependencies = dependencyPairs(data);
    if (dependencies.length) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "nd-gantt__dependencies");
      const height = 35 + data.length * rowHeight;
      svg.setAttribute("viewBox", `0 0 100 ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      dependencies.forEach(({ from, to }) => {
        const fromIndex = data.findIndex((task) => task.id === from.id);
        const toIndex = data.findIndex((task) => task.id === to.id);
        const x1 = timestampToPercent(toTimestamp(from.end), scaleModel);
        const x2 = timestampToPercent(toTimestamp(to.start), scaleModel);
        const y1 = 35 + fromIndex * rowHeight + rowHeight / 2;
        const y2 = 35 + toIndex * rowHeight + rowHeight / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const middle = x1 + Math.max(1, (x2 - x1) / 2);
        path.setAttribute("d", currentOptions.dependencyRouting === "straight" ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`);
        path.dataset.from = from.id;
        path.dataset.to = to.id;
        svg.append(path);
      });
      timeline.append(svg);
    }

    body.append(labels, timeline);
    root.append(body);
    return () => listenerCleanups.forEach((cleanup) => cleanup());
  }, { normalize: normalizeGanttTasks });
}
