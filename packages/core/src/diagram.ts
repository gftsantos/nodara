import { createController } from "./controller";
import { isInteractionEnabled } from "./render-mode";
import { applyTheme } from "./theme";
import type { DiagramData, DiagramNode, DiagramNodeEvent, DiagramOptions, NodaraController } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeDiagram } from "./validation";

interface NodeBox {
  node: DiagramNode;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

export function createDiagram(
  target: string | Element,
  options: DiagramOptions,
): NodaraController<DiagramData, DiagramOptions> {
  const container = resolveElement(target);
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit }) => {
    empty(root);
    root.className = `nd-root nd-diagram ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Data diagram");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const type = currentOptions.type ?? "flowchart";
    root.dataset.ndType = type;
    root.dataset.ndRenderer = "canvas";

    const canvas = createElement("canvas", "nd-diagram__canvas");
    const width = Math.max(root.clientWidth, 360);
    const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);

    const boxes = new Map<string, NodeBox>();
    const values = data.nodes.map((node) => Math.max(0, node.value ?? 1));
    const totalValue = Math.max(1, values.reduce((sum, value) => sum + value, 0));
    const nodeWidth = Math.max(22, currentOptions.nodeWidth ?? 92);
    const nodeGap = Math.max(4, currentOptions.nodeGap ?? 18);
    const palette = [tokens.primary, tokens.positive, tokens.warning, tokens.danger, "#40c9c6", "#b978ff", "#ff8d55"];
    const colorFor = (node: DiagramNode, index = data.nodes.indexOf(node)) => node.color ?? palette[index % palette.length] ?? tokens.primary;
    const levels = new Map<string, number>();
    data.nodes.forEach((node) => levels.set(node.id, 0));
    for (let pass = 0; pass < data.nodes.length; pass += 1) {
      data.links.forEach((link) => levels.set(link.to, Math.max(levels.get(link.to) ?? 0, (levels.get(link.from) ?? 0) + 1)));
      data.nodes.forEach((node) => {
        if (node.parentId) levels.set(node.id, Math.max(levels.get(node.id) ?? 0, (levels.get(node.parentId) ?? 0) + 1));
      });
    }

    const buildHierarchicalBoxes = (radial = false) => {
      const maximumLevel = Math.max(0, ...levels.values());
      if (radial) {
        const radius = Math.min(width, height) * 0.37;
        data.nodes.forEach((node, index) => {
          const angle = -Math.PI / 2 + index / Math.max(1, data.nodes.length) * Math.PI * 2;
          const level = levels.get(node.id) ?? 0;
          const distance = maximumLevel === 0 ? radius : 45 + level / maximumLevel * (radius - 45);
          boxes.set(node.id, { node, x: width / 2 + Math.cos(angle) * distance - 36, y: height / 2 + Math.sin(angle) * distance - 18, width: 72, height: 36 });
        });
        return;
      }
      const vertical = currentOptions.orientation === "vertical";
      for (let level = 0; level <= maximumLevel; level += 1) {
        const members = data.nodes.filter((node) => (levels.get(node.id) ?? 0) === level);
        members.forEach((node, index) => {
          const primary = (level + 1) / (maximumLevel + 2);
          const secondary = (index + 1) / (members.length + 1);
          boxes.set(node.id, vertical
            ? { node, x: secondary * width - nodeWidth / 2, y: primary * height - 20, width: nodeWidth, height: 40 }
            : { node, x: primary * width - nodeWidth / 2, y: secondary * height - 20, width: nodeWidth, height: 40 });
        });
      }
    };

    const context = canvas.getContext("2d");
    if (context) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = tokens.background;
      context.fillRect(0, 0, width, height);
      context.font = `600 10px ${tokens.fontFamily}`;

      if (type === "treemap") {
        let offset = 0;
        data.nodes.forEach((node, index) => {
          const share = Math.max(0.025, (node.value ?? 1) / totalValue);
          const itemWidth = index === data.nodes.length - 1 ? width - offset : width * share;
          boxes.set(node.id, { node, x: offset + 2, y: 2, width: Math.max(10, itemWidth - 4), height: height - 4 });
          offset += itemWidth;
        });
      } else if (type === "icicle") {
        const maximumLevel = Math.max(0, ...levels.values());
        for (let level = 0; level <= maximumLevel; level += 1) {
          const members = data.nodes.filter((node) => (levels.get(node.id) ?? 0) === level);
          const rowHeight = height / (maximumLevel + 1);
          const rowTotal = Math.max(1, members.reduce((sum, node) => sum + (node.value ?? 1), 0));
          let offset = 0;
          members.forEach((node) => {
            const itemWidth = width * (node.value ?? 1) / rowTotal;
            boxes.set(node.id, { node, x: offset + 2, y: level * rowHeight + 2, width: Math.max(12, itemWidth - 4), height: rowHeight - 4 });
            offset += itemWidth;
          });
        }
      } else if (type === "circle-pack") {
        const columns = Math.max(1, Math.ceil(Math.sqrt(data.nodes.length)));
        const cellWidth = width / columns;
        const rows = Math.ceil(data.nodes.length / columns);
        const cellHeight = height / Math.max(1, rows);
        data.nodes.forEach((node, index) => {
          const radius = clamp(Math.sqrt((node.value ?? 1) / Math.max(...values, 1)) * Math.min(cellWidth, cellHeight) * 0.38, 12, 70);
          boxes.set(node.id, { node, x: index % columns * cellWidth + cellWidth / 2 - radius, y: Math.floor(index / columns) * cellHeight + cellHeight / 2 - radius, width: radius * 2, height: radius * 2, radius });
        });
      } else if (type === "sunburst") {
        const maximumLevel = Math.max(0, ...levels.values());
        const outerRadius = Math.min(width, height) * 0.44;
        const ringWidth = outerRadius / Math.max(1, maximumLevel + 1);
        for (let level = 0; level <= maximumLevel; level += 1) {
          const members = data.nodes.filter((node) => (levels.get(node.id) ?? 0) === level);
          const levelTotal = Math.max(1, members.reduce((sum, node) => sum + Math.max(0, node.value ?? 1), 0));
          let angle = -Math.PI / 2;
          members.forEach((node, index) => {
            const slice = Math.PI * 2 * Math.max(0, node.value ?? 1) / levelTotal;
            const end = angle + slice;
            const inner = level * ringWidth;
            const outer = (level + 1) * ringWidth - 2;
            context.beginPath();
            context.arc(width / 2, height / 2, outer, angle, end);
            context.arc(width / 2, height / 2, inner, end, angle, true);
            context.closePath();
            context.fillStyle = colorFor(node, index);
            context.globalAlpha = 0.82;
            context.fill();
            context.globalAlpha = 1;
            context.strokeStyle = tokens.background;
            context.stroke();
            const middle = angle + slice / 2;
            const middleRadius = (inner + outer) / 2;
            boxes.set(node.id, { node, x: width / 2 + Math.cos(middle) * middleRadius - 12, y: height / 2 + Math.sin(middle) * middleRadius - 12, width: 24, height: 24, radius: 12 });
            angle = end;
          });
        }
      } else if (type === "chord") {
        const radius = Math.min(width, height) * 0.36;
        data.nodes.forEach((node, index) => {
          const angle = -Math.PI / 2 + index / Math.max(1, data.nodes.length) * Math.PI * 2;
          const itemRadius = 17;
          boxes.set(node.id, { node, x: width / 2 + Math.cos(angle) * radius - itemRadius, y: height / 2 + Math.sin(angle) * radius - itemRadius, width: itemRadius * 2, height: itemRadius * 2, radius: itemRadius });
        });
      } else if (type === "sankey" || type === "alluvial") {
        const maximumLevel = Math.max(1, ...levels.values());
        const thicknessByNode = new Map<string, number>();
        data.nodes.forEach((node) => {
          const linkedValue = data.links.filter((link) => link.from === node.id || link.to === node.id).reduce((sum, link) => sum + (link.value ?? 1), 0);
          thicknessByNode.set(node.id, Math.max(node.value ?? 1, linkedValue));
        });
        for (let level = 0; level <= maximumLevel; level += 1) {
          const members = data.nodes.filter((node) => (levels.get(node.id) ?? 0) === level);
          const levelTotal = Math.max(1, members.reduce((sum, node) => sum + (thicknessByNode.get(node.id) ?? 1), 0));
          let y = nodeGap;
          members.forEach((node) => {
            const available = height - nodeGap * (members.length + 1);
            const itemHeight = Math.max(18, available * (thicknessByNode.get(node.id) ?? 1) / levelTotal);
            boxes.set(node.id, { node, x: 22 + level / maximumLevel * (width - 66), y, width: 22, height: itemHeight });
            y += itemHeight + nodeGap;
          });
        }
      } else {
        buildHierarchicalBoxes(type === "radial-tree" || type === "mindmap");
      }

      data.links.forEach((link) => {
        if (type === "sunburst") return;
        const from = boxes.get(link.from);
        const to = boxes.get(link.to);
        if (!from || !to) return;
        const fromX = from.x + from.width / 2;
        const fromY = from.y + from.height / 2;
        const toX = to.x + to.width / 2;
        const toY = to.y + to.height / 2;
        context.beginPath();
        context.moveTo(fromX, fromY);
        if (type === "sankey" || type === "alluvial" || type === "chord") {
          const controlX = (fromX + toX) / 2;
          context.bezierCurveTo(controlX, fromY, controlX, toY, toX, toY);
        } else {
          context.lineTo(toX, toY);
        }
        context.strokeStyle = link.color ?? tokens.primary;
        context.globalAlpha = currentOptions.linkOpacity ?? (type === "sankey" || type === "alluvial" ? 0.42 : 0.58);
        context.lineWidth = type === "sankey" || type === "alluvial" ? clamp((link.value ?? 1) * 2.2, 2, 36) : 1.5;
        context.stroke();
        context.globalAlpha = 1;
        if (link.directed && type !== "sankey" && type !== "alluvial") {
          const angle = Math.atan2(toY - fromY, toX - fromX);
          context.beginPath();
          context.moveTo(toX, toY);
          context.lineTo(toX - Math.cos(angle - 0.5) * 8, toY - Math.sin(angle - 0.5) * 8);
          context.lineTo(toX - Math.cos(angle + 0.5) * 8, toY - Math.sin(angle + 0.5) * 8);
          context.closePath();
          context.fillStyle = link.color ?? tokens.primary;
          context.fill();
        }
      });

      boxes.forEach((box, id) => {
        if (type === "sunburst") return;
        const index = data.nodes.findIndex((node) => node.id === id);
        context.beginPath();
        if (box.radius) context.arc(box.x + box.width / 2, box.y + box.height / 2, box.radius, 0, Math.PI * 2);
        else context.rect(box.x, box.y, box.width, box.height);
        context.fillStyle = colorFor(box.node, index);
        context.globalAlpha = type === "treemap" || type === "icicle" ? 0.78 : 0.92;
        context.fill();
        context.globalAlpha = 1;
        context.strokeStyle = tokens.background;
        context.lineWidth = 2;
        context.stroke();
        if (box.width >= 34 && box.height >= 22) {
          context.fillStyle = tokens.foreground;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = `600 ${box.width < 55 ? 8 : 10}px ${tokens.fontFamily}`;
          context.fillText(box.node.label.slice(0, Math.max(4, Math.floor(box.width / 7))), box.x + box.width / 2, box.y + box.height / 2);
        }
      });
    }

    const selectNode = (payload: DiagramNodeEvent) => {
      currentOptions.onNodeSelect?.(payload);
      emit("node:select", payload);
    };
    const list = createElement("ul", "nd-sr-only");
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    data.nodes.slice(0, accessibilityLimit).forEach((node) => {
      const item = createElement("li");
      const button = createElement("button", "", `${node.label}${node.value === undefined ? "" : `, value ${node.value}`}`);
      button.type = "button";
      button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      button.addEventListener("click", () => selectNode({ node, source: "keyboard" }));
      item.append(button);
      list.append(item);
    });
    if (data.nodes.length > accessibilityLimit) list.append(createElement("li", "", `${data.nodes.length - accessibilityLimit} additional diagram nodes are available through the data API.`));
    root.dataset.ndAccessibleItems = String(Math.min(data.nodes.length, accessibilityLimit));
    root.append(list);

    const onClick = (event: MouseEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = [...boxes.values()].reverse().find((box) => {
        if (box.radius) return Math.hypot(x - (box.x + box.radius), y - (box.y + box.radius)) <= box.radius;
        return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
      });
      if (hit) selectNode({ node: hit.node, source: "pointer" });
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, { normalize: normalizeDiagram });
}
