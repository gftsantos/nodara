import { validateTopologyOptions } from "./visual-options";
import { createController } from "./controller";
import { calculateTopologyLayout } from "./layouts";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import type { NodaraController, TopologyData, TopologyNodeEvent, TopologyOptions, TopologyViewportEvent } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeTopology } from "./validation";
import { renderWebGLPoints, replaceWebGLCanvas, webGLColor, type WebGLSegment } from "./webgl";
import { trackPointer } from "./interaction";

export function createTopology(
  target: string | Element,
  options: TopologyOptions,
): NodaraController<TopologyData, TopologyOptions> {
  const container = resolveElement(target);
  const viewport = { zoom: options.initialZoom ?? 1, x: 0, y: 0 };
  let previousInitialZoom = options.initialZoom;
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit }) => {
    let active = true;
    const cleanups: Array<() => void> = [];
    empty(root);
    root.className = `nd-root nd-topology ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    if (root.getAttribute("aria-label") !== (currentOptions.ariaLabel ?? "Network topology")) root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Network topology");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const requestedMode = resolveRenderMode(currentOptions.renderer, data.nodes.length, currentOptions.performance);
    const mode = requestedMode === "dom" ? "canvas" : requestedMode;
    root.dataset.ndRenderer = mode;
    root.dataset.ndLayout = currentOptions.layout ?? "auto";

    let canvas = createElement("canvas", "nd-topology__canvas");
    let webglFailed = false;
    let rebindCanvas: (previous: HTMLCanvasElement) => void = () => {};
    const width = Math.max(root.clientWidth, 360);
    const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);
    const availableAreaPerNode = (width * height) / Math.max(data.nodes.length, 1);
    const adaptiveRadius = Math.min(25, Math.sqrt(availableAreaPerNode) * 0.16);
    const radius = Math.max(4, currentOptions.nodeRadius ?? adaptiveRadius);
    const positions = calculateTopologyLayout(data, currentOptions.layout, width, height, currentOptions.layoutIterations);
    const minimumZoom = Math.max(0.1, currentOptions.minZoom ?? 0.25);
    const maximumZoom = Math.max(minimumZoom, currentOptions.maxZoom ?? 4);
    if (currentOptions.initialZoom !== previousInitialZoom) { viewport.zoom = currentOptions.initialZoom ?? 1; previousInitialZoom = currentOptions.initialZoom; }
    viewport.zoom = clamp(viewport.zoom, minimumZoom, maximumZoom);
    const statusColors = { healthy: tokens.positive, warning: tokens.warning, critical: tokens.danger, unknown: tokens.muted };
    const labels = createElement("div", "nd-topology__labels"); labels.setAttribute("aria-hidden", "true");
    const nodeLabels = data.nodes.length < 300 ? [...positions.values()].map(item => {
      const label = createElement("span", "nd-topology__label", item.node.label); labels.append(label);
      const value = item.node.value === undefined ? undefined : createElement("span", "nd-topology__value", String(item.node.value)); if (value) labels.append(value);
      return { item, label, value };
    }) : [];
    const edgeLabels = data.nodes.length < 250 ? data.edges.filter(edge => edge.label).map(edge => { const label = createElement("span", "nd-topology__edge-label", edge.label); labels.append(label); return { edge, label }; }) : [];
    root.append(labels);

    const screenPosition = (item: { x: number; y: number }) => ({ x: item.x * viewport.zoom + viewport.x, y: item.y * viewport.zoom + viewport.y });
    const draw = () => {
      if (mode === "webgl" && !webglFailed) {
        labels.hidden = false;
        for (const { item, label, value } of nodeLabels) { const screen = screenPosition(item); label.style.left = `${screen.x}px`; label.style.top = `${screen.y + radius * viewport.zoom + 4}px`; if (value) { value.style.left = `${screen.x}px`; value.style.top = `${screen.y - 7}px`; } }
        for (const { edge, label } of edgeLabels) { const from = positions.get(edge.from)!; const to = positions.get(edge.to)!; const screen = screenPosition({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); label.style.left = `${screen.x}px`; label.style.top = `${screen.y - 16}px`; }
        labels.style.width = `${width}px`; labels.style.height = `${height}px`;
        const rect = canvas.getBoundingClientRect(); labels.style.transformOrigin = "top left"; labels.style.transform = `scale(${(rect.width || width) / width}, ${(rect.height || height) / height})`;
        const points = [...positions.values()].map((item) => {
          const screen = screenPosition(item);
          return { x: screen.x, y: screen.y, size: Math.max(3, radius * 2 * viewport.zoom), color: webGLColor(item.node.color ?? statusColors[item.node.status ?? "unknown"]) };
        });
        const segments: WebGLSegment[] = [];
        for (const edge of data.edges) {
          const source = positions.get(edge.from); const target = positions.get(edge.to); if (!source || !target) continue;
          const from = screenPosition(source); const to = screenPosition(target); const color = webGLColor(edge.color ?? tokens.border);
          segments.push({ from, to, color });
          if (edge.directed) { const angle = Math.atan2(to.y - from.y, to.x - from.x); const tip = { x: to.x - Math.cos(angle) * (radius * viewport.zoom + 3), y: to.y - Math.sin(angle) * (radius * viewport.zoom + 3) }; for (const direction of [-0.55, 0.55]) segments.push({ from: tip, to: { x: tip.x - Math.cos(angle + direction) * 7, y: tip.y - Math.sin(angle + direction) * 7 }, color }); }
        }
        if (renderWebGLPoints(canvas, points, width, height, webGLColor(tokens.primary), segments)) return;
        webglFailed = true;
        const previousCanvas = canvas; canvas = replaceWebGLCanvas(canvas); rebindCanvas(previousCanvas);
        root.dataset.ndRenderer = "canvas";
      }
      labels.hidden = true;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(viewport.x, viewport.y);
      context.scale(viewport.zoom, viewport.zoom);
      context.strokeStyle = tokens.border;
      context.lineWidth = 1.5 / viewport.zoom;
      data.edges.forEach((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = edge.color ?? tokens.border;
        context.stroke();
        if (edge.directed) {
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const arrowX = to.x - Math.cos(angle) * (radius + 3);
          const arrowY = to.y - Math.sin(angle) * (radius + 3);
          context.fillStyle = edge.color ?? tokens.muted;
          context.beginPath();
          context.moveTo(arrowX, arrowY);
          context.lineTo(arrowX - Math.cos(angle - 0.55) * 7, arrowY - Math.sin(angle - 0.55) * 7);
          context.lineTo(arrowX - Math.cos(angle + 0.55) * 7, arrowY - Math.sin(angle + 0.55) * 7);
          context.closePath();
          context.fill();
        }
        if (edge.label && data.nodes.length < 250) {
          context.fillStyle = tokens.muted;
          context.font = `${9 / viewport.zoom}px ${tokens.fontFamily}`;
          context.textAlign = "center";
          context.fillText(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 4);
        }
      });
      positions.forEach(({ x, y, node }) => {
        context.fillStyle = node.color ?? tokens.surface;
        context.strokeStyle = statusColors[node.status ?? "unknown"];
        context.lineWidth = 2 / viewport.zoom;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        if (data.nodes.length < 300) {
          context.fillStyle = tokens.foreground;
          context.textAlign = "center";
          context.font = `600 ${10 / viewport.zoom}px ${tokens.fontFamily}`;
          context.fillText(node.label.slice(0, 18), x, y + radius + 17 / viewport.zoom);
          if (node.value !== undefined) {
            context.fillStyle = tokens.muted;
            context.font = `${9 / viewport.zoom}px ${tokens.fontFamily}`;
            context.fillText(String(node.value), x, y + 3 / viewport.zoom);
          }
        }
      });
      context.restore();
    };
    draw();

    const selectNode = (payload: TopologyNodeEvent) => {
      if (!active || !isInteractionEnabled(currentOptions.interactive, payload.source === "keyboard" ? "keyboard" : "pointer")) return;
      currentOptions.onNodeSelect?.(payload);
      emit("node:select", payload);
    };
    const list = createElement("ul", "nd-sr-only nd-accessible-data");
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    data.nodes.slice(0, accessibilityLimit).forEach((node) => {
      const item = createElement("li");
      const button = createElement("button", "", `${node.label}, status ${node.status ?? "unknown"}`);
      button.type = "button";
      button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      button.dataset.ndFocus = node.id;
      const select = () => selectNode({ node, source: "keyboard" });
      button.addEventListener("click", select); cleanups.push(() => button.removeEventListener("click", select));
      item.append(button);
      list.append(item);
    });
    if (data.nodes.length > accessibilityLimit) list.append(createElement("li", "", `${data.nodes.length - accessibilityLimit} additional nodes are available through the data API.`));
    root.dataset.ndAccessibleItems = String(Math.min(data.nodes.length, accessibilityLimit));
    root.append(list);

    const nodeAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * width / (rect.width || width);
      const y = (clientY - rect.top) * height / (rect.height || height);
      return [...positions.values()].find((item) => {
        const screen = screenPosition(item);
        return Math.hypot(screen.x - x, screen.y - y) <= radius * viewport.zoom + 6;
      });
    };
    const emitViewport = (source: "pointer" | "keyboard") => {
      const payload = { ...viewport, source } satisfies TopologyViewportEvent;
      currentOptions.onViewportChange?.(payload);
      emit("viewport:change", payload);
    };
    let moved = false;
    let endGesture: (() => void) | undefined;
    const onClick = (event: MouseEvent) => {
      if (moved) { moved = false; return; }
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const hit = nodeAt(event.clientX, event.clientY);
      if (hit) selectNode({ node: hit.node, source: "pointer" });
    };
    const onWheel = (event: WheelEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "zoom")) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cursorX = (event.clientX - rect.left) * width / (rect.width || width);
      const cursorY = (event.clientY - rect.top) * height / (rect.height || height);
      const previous = viewport.zoom;
      viewport.zoom = clamp(viewport.zoom * (event.deltaY > 0 ? 0.9 : 1.1), minimumZoom, maximumZoom);
      viewport.x = cursorX - ((cursorX - viewport.x) / previous) * viewport.zoom;
      viewport.y = cursorY - ((cursorY - viewport.y) / previous) * viewport.zoom;
      draw();
      emitViewport("pointer");
    };
    const onPointerDown = (event: PointerEvent) => {
      moved = false;
      if (event.button !== 0 || !isInteractionEnabled(currentOptions.interactive, "pan") || nodeAt(event.clientX, event.clientY)) return;
      endGesture?.();
      moved = false;
      const panOrigin = { x: event.clientX, y: event.clientY, viewportX: viewport.x, viewportY: viewport.y };
      const panRect = canvas.getBoundingClientRect();
      endGesture = trackPointer(event, () => {
        if (moved) emitViewport("pointer");
      }, move => {
        moved ||= Math.abs(move.clientX - panOrigin.x) + Math.abs(move.clientY - panOrigin.y) > 2;
        viewport.x = panOrigin.viewportX + (move.clientX - panOrigin.x) * width / (panRect.width || width);
        viewport.y = panOrigin.viewportY + (move.clientY - panOrigin.y) * height / (panRect.height || height);
        draw();
      }, () => { viewport.x = panOrigin.viewportX; viewport.y = panOrigin.viewportY; moved = false; draw(); });
    };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    const onContextLost = (event: Event) => { event.preventDefault(); draw(); };
    canvas.addEventListener("webglcontextlost", onContextLost);
    rebindCanvas = previous => {
      previous.removeEventListener("click", onClick); previous.removeEventListener("wheel", onWheel); previous.removeEventListener("pointerdown", onPointerDown); previous.removeEventListener("webglcontextlost", onContextLost);
      canvas.addEventListener("click", onClick); canvas.addEventListener("wheel", onWheel, { passive: false }); canvas.addEventListener("pointerdown", onPointerDown); canvas.addEventListener("webglcontextlost", onContextLost);
    };
    return () => {
      active = false; endGesture?.(); cleanups.forEach(cleanup => cleanup());
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("webglcontextlost", onContextLost);
    };
  }, { normalize: normalizeTopology, validate: validateTopologyOptions });
}
