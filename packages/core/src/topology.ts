import { createController } from "./controller";
import { applyTheme } from "./theme";
import type { NodaraController, TopologyData, TopologyNodeEvent, TopologyOptions } from "./types";
import { createElement, empty, resolveElement } from "./utils";
import { normalizeTopology } from "./validation";

export function createTopology(
  target: string | Element,
  options: TopologyOptions,
): NodaraController<TopologyData> {
  const container = resolveElement(target);
  const controller = createController(container, normalizeTopology(options.data), ({ container: root, data, emit }) => {
    empty(root);
    root.className = `nd-root nd-topology ${options.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    root.setAttribute("aria-label", options.ariaLabel ?? "Network topology");
    const tokens = applyTheme(root, options.theme, options.tokens);
    const canvas = createElement("canvas", "nd-topology__canvas");
    const width = Math.max(root.clientWidth, 360);
    const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    root.append(canvas);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(pixelRatio, pixelRatio);

    const radius = options.nodeRadius ?? 25;
    const centerX = width / 2;
    const centerY = height / 2;
    const orbit = Math.max(70, Math.min(width, height) * 0.32);
    const positions = new Map(data.nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(data.nodes.length, 1);
      return [node.id, {
        x: node.x === undefined ? centerX + Math.cos(angle) * orbit : node.x,
        y: node.y === undefined ? centerY + Math.sin(angle) * orbit : node.y,
        node,
      }] as const;
    }));

    context.strokeStyle = tokens.border;
    context.lineWidth = 1.5;
    data.edges.forEach((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      if (edge.directed) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowX = to.x - Math.cos(angle) * (radius + 3);
        const arrowY = to.y - Math.sin(angle) * (radius + 3);
        context.fillStyle = tokens.muted;
        context.beginPath();
        context.moveTo(arrowX, arrowY);
        context.lineTo(arrowX - Math.cos(angle - 0.55) * 7, arrowY - Math.sin(angle - 0.55) * 7);
        context.lineTo(arrowX - Math.cos(angle + 0.55) * 7, arrowY - Math.sin(angle + 0.55) * 7);
        context.closePath();
        context.fill();
      }
    });

    const statusColors = { healthy: tokens.positive, warning: tokens.warning, critical: tokens.danger, unknown: tokens.muted };
    positions.forEach(({ x, y, node }) => {
      context.fillStyle = tokens.surface;
      context.strokeStyle = statusColors[node.status ?? "unknown"];
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = tokens.foreground;
      context.textAlign = "center";
      context.font = `600 10px ${tokens.fontFamily}`;
      context.fillText(node.label.slice(0, 16), x, y + radius + 17);
      if (node.value !== undefined) {
        context.fillStyle = tokens.muted;
        context.font = `9px ${tokens.fontFamily}`;
        context.fillText(String(node.value), x, y + 3);
      }
    });

    const list = createElement("ul", "nd-sr-only");
    data.nodes.forEach((node) => {
      const item = createElement("li", "", `${node.label}, status ${node.status ?? "unknown"}`);
      list.append(item);
    });
    root.append(list);

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = [...positions.values()].find((item) => Math.hypot(item.x - x, item.y - y) <= radius + 5);
      if (hit) emit("node:select", { node: hit.node, source: "pointer" } satisfies TopologyNodeEvent);
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  });

  if (options.onNodeSelect) controller.on<TopologyNodeEvent>("node:select", options.onNodeSelect);
  return controller;
}
