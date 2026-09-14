import { createController } from "./controller";
import { validateDiagramOptions } from "./visual-options";
import { isInteractionEnabled } from "./render-mode";
import { applyTheme } from "./theme";
import { readableTextColor } from "./color";
import { calculateTopologyLayout } from "./layouts";
import { containsPoint, type HitRegion } from "./geometry";
import { layoutDiagramHierarchy, layoutDiagramSankey, validateDiagramLayout, type HierarchyDiagramType, type SankeyLayoutLink } from "./diagram-model";
import type { DiagramData, DiagramNode, DiagramNodeEvent, DiagramOptions, NodaraController } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeDiagram } from "./validation";

interface NodeBox { node: DiagramNode; x: number; y: number; width: number; height: number; region: HitRegion; depth?: number }

export function createDiagram(target: string | Element, options: DiagramOptions): NodaraController<DiagramData, DiagramOptions> {
  const container = resolveElement(target);
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit }) => {
    let active = true; const cleanups: Array<() => void> = [];
    empty(root);
    root.className = ("nd-root nd-diagram " + (currentOptions.className ?? "")).trim();
    root.setAttribute("role", "figure");
    if (root.getAttribute("aria-label") !== (currentOptions.ariaLabel ?? "Data diagram")) root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Data diagram");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const type = currentOptions.type ?? "flowchart";
    root.dataset.ndType = type; root.dataset.ndRenderer = "canvas";
    const canvas = createElement("canvas", "nd-diagram__canvas");
    const width = Math.max(root.clientWidth, 360); const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio; canvas.height = height * pixelRatio;
    canvas.style.width = width + "px"; canvas.style.height = height + "px";
    canvas.setAttribute("aria-hidden", "true"); root.append(canvas);

    const boxes = new Map<string, NodeBox>();
    const hierarchyType = ["treemap", "icicle", "circle-pack", "sunburst"].includes(type);
    const flowType = type === "sankey" || type === "alluvial";
    const nodeWidth = clamp(currentOptions.nodeWidth ?? (flowType ? 22 : 92), 4, width);
    const nodeGap = Math.max(0, currentOptions.nodeGap ?? 18);
    const palette = [tokens.primary, tokens.positive, tokens.warning, tokens.danger, "#40c9c6", "#b978ff", "#ff8d55"];
    const colors = new Map(data.nodes.map((node, index) => [node.id, node.color ?? palette[index % palette.length] ?? tokens.primary]));
    const parents = new Set(data.nodes.flatMap(node => node.parentId ? [node.parentId] : []));
    let flowLinks: SankeyLayoutLink[] = [];

    if (hierarchyType) {
      for (const box of layoutDiagramHierarchy(data, type as HierarchyDiagramType, width, height, { padding: type === "circle-pack" ? 4 : type === "treemap" ? 3 : 0, labelHeight: type === "treemap" ? 22 : 0 })) boxes.set(box.node.id, box);
    } else if (flowType) {
      const vertical = currentOptions.orientation === "vertical";
      const layout = layoutDiagramSankey(data, vertical ? height : width, vertical ? width : height, { nodeWidth: Math.min(nodeWidth, vertical ? height : width), nodeGap });
      for (const box of layout.nodes) {
        const mapped: NodeBox = vertical ? { ...box, x: box.y, y: box.x, width: box.height, height: box.width, region: { kind: "rect", x: box.y, y: box.x, width: box.height, height: box.width } } : box;
        boxes.set(box.node.id, mapped);
      }
      flowLinks = layout.links;
    } else {
      const radial = ["radial-tree", "mindmap", "chord"].includes(type);
      const vertical = currentOptions.orientation === "vertical";
      const edges = data.links.length ? data.links.map(link => ({ from: link.from, to: link.to })) : data.nodes.flatMap(node => node.parentId ? [{ from: node.parentId, to: node.id }] : []);
      const positions = calculateTopologyLayout({ nodes: data.nodes, edges }, radial ? "radial" : "hierarchical", !radial && !vertical ? height : width, !radial && !vertical ? width : height);
      for (const node of data.nodes) {
        const position = positions.get(node.id)!;
        const centerX = !radial && !vertical ? position.y : position.x; const centerY = !radial && !vertical ? position.x : position.y;
        const boxWidth = type === "chord" ? 36 : nodeWidth; const boxHeight = type === "chord" ? 36 : 40;
        const x = centerX - boxWidth / 2; const y = centerY - boxHeight / 2;
        boxes.set(node.id, { node, x, y, width: boxWidth, height: boxHeight, region: type === "chord" ? { kind: "circle", x: centerX, y: centerY, radius: 18 } : { kind: "rect", x, y, width: boxWidth, height: boxHeight } });
      }
    }

    const context = canvas.getContext("2d");
    if (context) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height); context.fillStyle = tokens.background; context.fillRect(0, 0, width, height);
      context.font = "500 12px " + tokens.fontFamily;
      if (flowType) {
        for (const link of flowLinks) {
          context.beginPath();
          if (currentOptions.orientation === "vertical") { context.moveTo(link.y0, link.x0); const control = (link.x0 + link.x1) / 2; context.bezierCurveTo(link.y0, control, link.y1, control, link.y1, link.x1); }
          else { context.moveTo(link.x0, link.y0); const control = (link.x0 + link.x1) / 2; context.bezierCurveTo(control, link.y0, control, link.y1, link.x1, link.y1); }
          context.strokeStyle = link.link.color ?? colors.get(link.link.from) ?? tokens.primary;
          context.globalAlpha = clamp(currentOptions.linkOpacity ?? 0.42, 0, 1); context.lineWidth = link.width; context.stroke();
        }
        context.globalAlpha = 1;
      } else if (!hierarchyType) {
        const links = data.links.length ? data.links : data.nodes.flatMap(node => node.parentId ? [{ from: node.parentId, to: node.id, directed: true }] : []);
        for (const link of links) {
          const from = boxes.get(link.from); const to = boxes.get(link.to); if (!from || !to) continue;
          const fromX = from.x + from.width / 2; const fromY = from.y + from.height / 2; const toX = to.x + to.width / 2; const toY = to.y + to.height / 2;
          context.beginPath(); context.moveTo(fromX, fromY);
          if (type === "chord") context.bezierCurveTo(width / 2, height / 2, width / 2, height / 2, toX, toY); else context.lineTo(toX, toY);
          context.strokeStyle = "color" in link && link.color ? link.color : tokens.primary; context.globalAlpha = clamp(currentOptions.linkOpacity ?? 0.58, 0, 1); context.lineWidth = 1.5; context.stroke(); context.globalAlpha = 1;
          if (link.directed) {
            const angle = Math.atan2(toY - fromY, toX - fromX); const distance = Math.min(to.width / 2 / Math.max(0.001, Math.abs(Math.cos(angle))), to.height / 2 / Math.max(0.001, Math.abs(Math.sin(angle)))) + 2;
            const tipX = toX - Math.cos(angle) * distance; const tipY = toY - Math.sin(angle) * distance;
            context.beginPath(); context.moveTo(tipX, tipY); context.lineTo(tipX - Math.cos(angle - 0.5) * 8, tipY - Math.sin(angle - 0.5) * 8); context.lineTo(tipX - Math.cos(angle + 0.5) * 8, tipY - Math.sin(angle + 0.5) * 8); context.closePath(); context.fillStyle = context.strokeStyle; context.fill();
          }
        }
      }
      for (const box of boxes.values()) {
        const region = box.region;
        if ((region.kind === "circle" && region.radius <= 0) || (region.kind === "rect" && (region.width <= 0 || region.height <= 0)) || (region.kind === "sector" && region.end <= region.start)) continue;
        context.beginPath();
        if (region.kind === "circle") context.arc(region.x, region.y, region.radius, 0, Math.PI * 2);
        else if (region.kind === "sector") { context.arc(region.x, region.y, region.outerRadius, region.start, region.end); context.arc(region.x, region.y, region.innerRadius, region.end, region.start, true); context.closePath(); }
        else context.rect(box.x, box.y, box.width, box.height);
        const fill = colors.get(box.node.id)!; context.fillStyle = fill; context.fill(); context.strokeStyle = tokens.background; context.lineWidth = 2; context.stroke();
        context.fillStyle = readableTextColor(fill); context.textAlign = "center"; context.textBaseline = "middle"; context.font = "500 12px " + tokens.fontFamily;
        if (flowType) {
          context.fillStyle = tokens.foreground;
          if (currentOptions.orientation === "vertical") { context.textAlign = "center"; if (box.width >= 35) context.fillText(box.node.label.slice(0, Math.max(3, Math.floor(box.width / 7))), box.x + box.width / 2, box.y + box.height >= height - 1 ? box.y - 12 : box.y + box.height + 12); }
          else { const last = box.x + box.width > width - 1; context.textAlign = last ? "right" : "left"; if (box.height >= 16) context.fillText(box.node.label.slice(0, 24), last ? box.x - 6 : box.x + box.width + 6, box.y + box.height / 2); }
        } else if (region.kind === "sector") {
          const middle = (region.start + region.end) / 2; const radius = (region.innerRadius + region.outerRadius) / 2; const length = (region.end - region.start) * radius;
          if (length >= 32 && region.outerRadius - region.innerRadius >= 18) context.fillText(box.node.label.slice(0, Math.floor(length / 8)), region.x + Math.cos(middle) * radius, region.y + Math.sin(middle) * radius);
        } else if (type === "treemap" && parents.has(box.node.id)) {
          context.textAlign = "left"; if (box.width >= 40) context.fillText(box.node.label.slice(0, Math.floor((box.width - 12) / 7)), box.x + 7, box.y + 12);
        } else if (box.width >= 38 && box.height >= 20) context.fillText(box.node.label.slice(0, Math.max(3, Math.floor((box.width - 10) / 7))), box.x + box.width / 2, box.y + box.height / 2);
      }
    }
    const selectNode = (payload: DiagramNodeEvent) => {
      if (!active || !isInteractionEnabled(currentOptions.interactive, payload.source === "keyboard" ? "keyboard" : "pointer")) return;
      currentOptions.onNodeSelect?.(payload); emit("node:select", payload);
    };
    const list = createElement("ul", "nd-sr-only nd-accessible-data");
    const limit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    for (const node of data.nodes.slice(0, limit)) {
      const item = createElement("li"); const button = createElement("button", "", node.label + (node.value === undefined ? "" : ": " + node.value));
      button.type = "button"; button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1; button.dataset.ndFocus = node.id;
      const select = () => selectNode({ node, source: "keyboard" }); button.addEventListener("click", select); cleanups.push(() => button.removeEventListener("click", select)); item.append(button); list.append(item);
    }
    if (data.nodes.length > limit) list.append(createElement("li", "", (data.nodes.length - limit) + " additional diagram nodes are available through the data API."));
    root.dataset.ndAccessibleItems = String(Math.min(data.nodes.length, limit)); root.append(list);
    const onClick = (event: MouseEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const rect = canvas.getBoundingClientRect(); const point = { x: (event.clientX - rect.left) * width / (rect.width || width), y: (event.clientY - rect.top) * height / (rect.height || height) };
      const hit = [...boxes.values()].reverse().find(box => containsPoint(box.region, point)); if (hit) selectNode({ node: hit.node, source: "pointer" });
    };
    canvas.addEventListener("click", onClick);
    return () => { active = false; cleanups.forEach(cleanup => cleanup()); canvas.removeEventListener("click", onClick); };
  }, { normalize: normalizeDiagram, validate: (data, options) => { validateDiagramOptions(options); validateDiagramLayout(data, options.type); } });
}
