import { validateGanttOptions } from "./visual-options";
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
import { createWebGLSurface, replaceWebGLCanvas, webGLColor } from "./webgl";
import { trackPointer } from "./interaction";

function tickFormat(timestamp: number, locale: string, zoom: NonNullable<GanttOptions["zoom"]>): string {
  if (zoom === "day" || zoom === "week") return formatDate(timestamp, locale, { day: "2-digit", month: "short", timeZone: "UTC" });
  if (zoom === "quarter") return formatDate(timestamp, locale, { month: "short", year: "numeric", timeZone: "UTC" });
  return formatDate(timestamp, locale, { month: "short", year: "2-digit", timeZone: "UTC" });
}

function taskDescription(task: GanttTask, locale: string): string {
  const portuguese = locale.toLowerCase().startsWith("pt");
  const date = (value: GanttTask["start"]) => formatDate(toTimestamp(value), locale, { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${task.label}, ${date(task.start)} ${portuguese ? "até" : "to"} ${date(task.end)}, ${task.progress ?? 0}% ${portuguese ? "concluído" : "complete"}`;
}

function renderAccessibleTaskList(root: HTMLElement, data: GanttTask[], locale: string, limit: number, select?: (task: GanttTask, source: "keyboard") => void): () => void {
  const list = createElement("ul", "nd-sr-only nd-accessible-data");
  const cleanups: Array<() => void> = [];
  const accessibleLimit = Math.max(1, Math.floor(limit));
  data.slice(0, accessibleLimit).forEach((task) => {
    const item = createElement("li");
    const button = createElement("button", "", taskDescription(task, locale));
    button.type = "button";
    button.disabled = task.disabled === true;
    button.tabIndex = select ? 0 : -1;
    button.dataset.ndFocus = task.id;
    if (select) { const onClick = () => select(task, "keyboard"); button.addEventListener("click", onClick); cleanups.push(() => button.removeEventListener("click", onClick)); }
    item.append(button);
    list.append(item);
  });
  if (data.length > accessibleLimit) {
    list.append(createElement("li", "", `${data.length - accessibleLimit} ${locale.toLowerCase().startsWith("pt") ? "tarefas adicionais disponíveis através da API de dados." : "additional tasks are available through the data API."}`));
  }
  root.append(list);
  return () => cleanups.forEach(cleanup => cleanup());
}

function renderLargeGantt(
  root: HTMLElement,
  data: GanttTask[],
  options: GanttOptions,
  mode: "canvas" | "webgl",
  select: (task: GanttTask, source: "pointer" | "keyboard") => void,
  onContextLost: () => void,
  gpu: ReturnType<typeof createWebGLSurface>,
): () => void {
  const locale = options.locale ?? "en";
  const range = resolveGanttRange(data, options.start, options.end);
  const scale = buildTimeScale(range.start, range.end, options.zoom ?? "month");
  let canvas = gpu.acquire(mode, "nd-gantt__density-canvas");
  const width = Math.max(root.clientWidth, 640);
  const height = Math.max(root.clientHeight - 44, 300);
  const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, options.performance?.maxDevicePixelRatio ?? 2);
  if (canvas.width !== Math.floor(width * pixelRatio)) canvas.width = width * pixelRatio;
  if (canvas.height !== Math.floor(height * pixelRatio)) canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.setAttribute("aria-hidden", "true");
  root.append(canvas);
  const rectangles = data.map((task, index) => {
    const x = (timestampToPercent(toTimestamp(task.start), scale) / 100) * width;
    const end = (timestampToPercent(toTimestamp(task.end), scale) / 100) * width;
    return { x, y: 12 + (index % Math.max(1, Math.floor((height - 24) / 7))) * 7, width: Math.max(1, end - x), height: 3, color: webGLColor(task.color ?? "#7884ff") };
  });
  const usedWebGL = mode === "webgl" && gpu.draw([], width, height, [0.47, 0.52, 1, 1], [], rectangles);
  if (mode === "webgl" && !usedWebGL) { gpu.dispose(); canvas = replaceWebGLCanvas(canvas); root.dataset.ndRenderer = "canvas"; }
  const hitAreas: Array<{ task: GanttTask; x: number; y: number; width: number; height: number }> = [];
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
        hitAreas.push({ task, x, y, width: Math.max(1, end - x), height: 3 });
      });
    }
  }
  if (usedWebGL) rectangles.forEach((rectangle, index) => hitAreas.push({ task: data[index]!, ...rectangle }));
  const cleanupList = renderAccessibleTaskList(root, data, locale, options.performance?.accessibilityLimit ?? 300, isInteractionEnabled(options.interactive, "keyboard") ? select : undefined);
  const onClick = (event: MouseEvent) => {
    if (!isInteractionEnabled(options.interactive, "pointer")) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * width / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) * height / Math.max(1, rect.height);
    const hit = [...hitAreas].reverse().find(area => !area.task.disabled && x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height);
    if (hit) select(hit.task, "pointer");
  };
  canvas.addEventListener("click", onClick);
  const onLost = (event: Event) => { event.preventDefault(); onContextLost(); };
  if (usedWebGL) canvas.addEventListener("webglcontextlost", onLost);
  return () => { cleanupList(); canvas.removeEventListener("click", onClick); canvas.removeEventListener("webglcontextlost", onLost); };
}

export function createGantt(
  target: string | Element,
  options: GanttOptions,
): NodaraController<GanttTask[], GanttOptions> {
  const container = resolveElement(target);
  let gpuLost = false;
  const gpu = createWebGLSurface();
  const controller = createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit, commit }) => {
    empty(root);
    root.className = `nd-root nd-gantt ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "region");
    if (root.getAttribute("aria-label") !== (currentOptions.ariaLabel ?? "Gantt chart")) root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Gantt chart");
    const locale = currentOptions.locale ?? "en";
    const portuguese = /^pt(?:-|$)/i.test(locale);
    const zoom = currentOptions.zoom ?? "month";
    const requestedMode = resolveRenderMode(currentOptions.renderer, data.length, currentOptions.performance, true);
    const mode = gpuLost && requestedMode === "webgl" ? "canvas" : requestedMode;
    root.dataset.ndRenderer = mode;
    root.dataset.ndZoom = zoom;
    applyTheme(root, currentOptions.theme, currentOptions.tokens);

    const selectTask = (task: GanttTask, source: "pointer" | "keyboard") => {
      if (task.disabled || !isInteractionEnabled(currentOptions.interactive, source)) return;
      const payload = { task, source } satisfies GanttTaskEvent;
      currentOptions.onTaskSelect?.(payload);
      emit("task:select", payload);
    };

    const header = createElement("div", "nd-gantt__header");
    header.append(createElement("strong", "", `${data.length} ${portuguese ? data.length === 1 ? "tarefa" : "tarefas" : "tasks"}`));
    const range = resolveGanttRange(data, currentOptions.start, currentOptions.end);
    header.append(createElement("span", "", `${formatDate(range.start, locale, { day: "2-digit", month: "short", timeZone: "UTC" })} — ${formatDate(range.end, locale, { day: "2-digit", month: "short", timeZone: "UTC" })} · ${portuguese ? ({ day: "Dia", week: "Semana", month: "Mês", quarter: "Trimestre" })[zoom] : zoom}`));
    root.append(header);

    if (mode !== "dom") return renderLargeGantt(root, data, currentOptions, mode, selectTask, () => { gpuLost = true; controller.resize(); }, gpu);
    gpu.dispose();

    const scaleModel = buildTimeScale(range.start, range.end, zoom);
    const body = createElement("div", "nd-gantt__body");
    const labels = createElement("div", "nd-gantt__labels");
    const timeline = createElement("div", "nd-gantt__timeline");
    const rowHeight = Math.max(36, currentOptions.rowHeight ?? 58);
    labels.style.setProperty("--nd-row-height", `${rowHeight}px`);
    timeline.style.setProperty("--nd-row-height", `${rowHeight}px`);
    timeline.style.setProperty("--nd-tick-count", String(scaleModel.ticks.length - 1));
    const stops = scaleModel.ticks.slice(1, -1).flatMap(tick => [`transparent calc(${tick.position}% - 1px)`, `var(--nd-border) calc(${tick.position}% - 1px)`, `var(--nd-border) ${tick.position}%`, `transparent ${tick.position}%`]);
    timeline.style.backgroundImage = stops.length ? `linear-gradient(to right, transparent 0%, ${stops.join(",")}, transparent 100%)` : "none";
    timeline.style.backgroundSize = "100% 100%";

    labels.append(createElement("div", "nd-gantt__labels-head", portuguese ? "Tarefa" : "Task"));
    const scale = createElement("div", "nd-gantt__scale");
    scale.style.gridTemplateColumns = scaleModel.ticks.slice(0, -1).map((tick, index) => `${scaleModel.ticks[index + 1]!.position - tick.position}fr`).join(" ");
    scaleModel.ticks.slice(0, -1).forEach((tick) => { const label = createElement("span", "", tickFormat(tick.timestamp, locale, zoom)); label.title = new Date(tick.timestamp).toISOString(); label.dataset.timestamp = String(tick.timestamp); scale.append(label); });
    timeline.append(scale);

    const listenerCleanups: Array<() => void> = [];
    data.forEach((task) => {
      const label = createElement("div", "nd-gantt__label");
      label.style.height = `${rowHeight}px`;
      const owner = createElement("span", "nd-gantt__owner", task.owner?.name.slice(0, 2).toUpperCase() ?? "—");
      if (task.owner?.color) owner.style.background = task.owner.color;
      const labelText = createElement("span", "nd-gantt__label-text");
      labelText.append(createElement("strong", "", task.label));
      labelText.append(createElement("small", "", `${Math.round(task.progress ?? 0)}% ${portuguese ? "concluído" : "complete"}`));
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
      bar.dataset.ndFocus = task.id;
      if (task.color) bar.style.setProperty("--nd-task-color", task.color);
      bar.disabled = task.disabled === true;
      bar.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      bar.setAttribute("aria-label", taskDescription(task, locale));
      const progress = createElement("span", "nd-gantt__progress");
      progress.style.width = `${task.progress ?? 0}%`;
      bar.append(progress);
      const startHandle = createElement("span", "nd-gantt__resize nd-gantt__resize--start");
      startHandle.dataset.resize = "start";
      const endHandle = createElement("span", "nd-gantt__resize nd-gantt__resize--end");
      endHandle.dataset.resize = "end";
      if (currentOptions.editable !== false && isInteractionEnabled(currentOptions.interactive, "pointer") && !task.disabled) bar.append(startHandle, endHandle);

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
        if (currentOptions.editable === false || event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const delta = (event.key === "ArrowRight" ? 1 : -1) * resolveSnap(currentOptions.snap);
        if (event.shiftKey) changeTask(resizeTask(task, "end", delta), "resize-end", "keyboard");
        else if (event.altKey) changeTask(resizeTask(task, "start", delta), "resize-start", "keyboard");
        else changeTask(shiftTask(task, delta), "move", "keyboard");
      };
      const onClick = () => { if (isInteractionEnabled(currentOptions.interactive, "pointer")) selectTask(task, "pointer"); };
      const onPointerDown = (event: PointerEvent) => {
        if (currentOptions.editable === false || !isInteractionEnabled(currentOptions.interactive, "pointer") || task.disabled || event.button !== 0) return;
        event.preventDefault();
        const targetElement = event.target instanceof HTMLElement ? event.target : bar;
        const edge = targetElement.dataset.resize;
        const change: GanttChangeKind = edge === "start" ? "resize-start" : edge === "end" ? "resize-end" : "move";
        const originX = event.clientX;
        const width = Math.max(1, timeline.getBoundingClientRect().width);
        const restore = () => { bar.style.transform = ""; };
        const cleanupGesture = trackPointer(event, (upEvent) => {
          restore();
          const rawDelta = ((upEvent.clientX - originX) / width) * scaleModel.duration;
          const step = resolveSnap(currentOptions.snap);
          const delta = Math.round(rawDelta / step) * step;
          if (delta !== 0) {
            const nextTask = change === "move" ? shiftTask(task, delta) : resizeTask(task, change === "resize-start" ? "start" : "end", delta);
            changeTask(nextTask, change, "pointer");
          }
        }, moveEvent => { if (change === "move") bar.style.transform = `translateY(-50%) translateX(${moveEvent.clientX - originX}px)`; }, restore);
        listenerCleanups.push(cleanupGesture);
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
      dependencies.forEach(({ from, to, kind = "FS", lagMs = 0 }) => {
        const fromIndex = data.findIndex((task) => task.id === from.id);
        const toIndex = data.findIndex((task) => task.id === to.id);
        const x1 = timestampToPercent(toTimestamp(kind[0] === "F" ? from.end : from.start), scaleModel);
        const x2 = timestampToPercent(toTimestamp(kind[1] === "F" ? to.end : to.start), scaleModel);
        const y1 = 35 + fromIndex * rowHeight + rowHeight / 2;
        const y2 = 35 + toIndex * rowHeight + rowHeight / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const middle = x1 + Math.max(1, (x2 - x1) / 2);
        path.setAttribute("d", currentOptions.dependencyRouting === "straight" ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`);
        path.dataset.from = from.id;
        path.dataset.to = to.id;
        path.dataset.kind = kind; path.dataset.lagMs = String(lagMs);
        svg.append(path);
      });
      timeline.append(svg);
    }

    body.append(labels, timeline);
    root.append(body);
    return () => listenerCleanups.forEach((cleanup) => cleanup());
  }, { normalize: normalizeGanttTasks, validate: validateGanttOptions, dispose: gpu.dispose });
  return controller;
}
