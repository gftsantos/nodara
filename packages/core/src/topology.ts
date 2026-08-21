import { createController } from "./controller";
import { calculateTopologyLayout } from "./layouts";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import type { NodaraController, TopologyData, TopologyNodeEvent, TopologyOptions, TopologyViewportEvent } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeTopology } from "./validation";
import { renderWebGLPoints } from "./webgl";

export function createTopology(
  target: string | Element,
  options: TopologyOptions,
): NodaraController<TopologyData, TopologyOptions> {
  const container = resolveElement(target);
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit }) => {
    empty(root);
    root.className = `nd-root nd-topology ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Network topology");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const requestedMode = resolveRenderMode(currentOptions.renderer, data.nodes.length, currentOptions.performance);
    const mode = requestedMode === "dom" ? "canvas" : requestedMode;
    root.dataset.ndRenderer = mode;
    root.dataset.ndLayout = currentOptions.layout ?? "auto";

    const canvas = createElement("canvas", "nd-topology__canvas");
    const width = Math.max(root.clientWidth, 360);
    const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);
    const radius = Math.max(4, currentOptions.nodeRadius ?? (data.nodes.length > 300 ? 4 : 25));
    const positions = calculateTopologyLayout(data, currentOptions.layout, width, height, currentOptions.layoutIterations);
    const minimumZoom = Math.max(0.1, currentOptions.minZoom ?? 0.25);
    const maximumZoom = Math.max(minimumZoom, currentOptions.maxZoom ?? 4);
    const viewport = { zoom: clamp(currentOptions.initialZoom ?? 1, minimumZoom, maximumZoom), x: 0, y: 0 };
    const statusColors = { healthy: tokens.positive, warning: tokens.warning, critical: tokens.danger, unknown: tokens.muted };

    const screenPosition = (item: { x: number; y: number }) => ({ x: item.x * viewport.zoom + viewport.x, y: item.y * viewport.zoom + viewport.y });
    const draw = () => {
      if (mode === "webgl") {
        const points = [...positions.values()].map((item) => {
          const screen = screenPosition(item);
          return { x: screen.x, y: screen.y, size: Math.max(3, radius * 1.5 * viewport.zoom) };
        });
        if (renderWebGLPoints(canvas, points, width, height)) return;
        root.dataset.ndRenderer = "canvas";
      }
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
      currentOptions.onNodeSelect?.(payload);
      emit("node:select", payload);
    };
    const list = createElement("ul", "nd-sr-only");
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    data.nodes.slice(0, accessibilityLimit).forEach((node) => {
      const item = createElement("li");
      const button = createElement("button", "", `${node.label}, status ${node.status ?? "unknown"}`);
      button.type = "button";
      button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      button.addEventListener("click", () => selectNode({ node, source: "keyboard" }));
      item.append(button);
      list.append(item);
    });
    if (data.nodes.length > accessibilityLimit) list.append(createElement("li", "", `${data.nodes.length - accessibilityLimit} additional nodes are available through the data API.`));
    root.dataset.ndAccessibleItems = String(Math.min(data.nodes.length, accessibilityLimit));
    root.append(list);

    const nodeAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
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
    let panning = false;
    let moved = false;
    let panOrigin = { x: 0, y: 0, viewportX: 0, viewportY: 0 };
    const onClick = (event: MouseEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pointer") || moved) return;
      const hit = nodeAt(event.clientX, event.clientY);
      if (hit) selectNode({ node: hit.node, source: "pointer" });
    };
    const onWheel = (event: WheelEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "zoom")) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const previous = viewport.zoom;
      viewport.zoom = clamp(viewport.zoom * (event.deltaY > 0 ? 0.9 : 1.1), minimumZoom, maximumZoom);
      viewport.x = cursorX - ((cursorX - viewport.x) / previous) * viewport.zoom;
      viewport.y = cursorY - ((cursorY - viewport.y) / previous) * viewport.zoom;
      draw();
      emitViewport("pointer");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pan") || nodeAt(event.clientX, event.clientY)) return;
      panning = true;
      moved = false;
      panOrigin = { x: event.clientX, y: event.clientY, viewportX: viewport.x, viewportY: viewport.y };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!panning) return;
      moved = Math.abs(event.clientX - panOrigin.x) + Math.abs(event.clientY - panOrigin.y) > 2;
      viewport.x = panOrigin.viewportX + event.clientX - panOrigin.x;
      viewport.y = panOrigin.viewportY + event.clientY - panOrigin.y;
      draw();
    };
    const onPointerUp = () => {
      if (!panning) return;
      panning = false;
      if (moved) emitViewport("pointer");
      setTimeout(() => { moved = false; }, 0);
    };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, { normalize: normalizeTopology });
}
