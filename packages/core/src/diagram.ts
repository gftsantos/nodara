import { createController } from "./controller";
import { validateDiagramOptions } from "./visual-options";
import { isInteractionEnabled } from "./render-mode";
import { applyTheme } from "./theme";
import { readableTextColor } from "./color";
import { calculateTopologyLayout } from "./layouts";
import { containsPoint, type HitRegion } from "./geometry";
import { layoutDiagramHierarchy, layoutDiagramSankey, validateDiagramLayout, type HierarchyDiagramType, type SankeyLayoutLink } from "./diagram-model";
import type { DiagramData, DiagramLink, DiagramNode, DiagramNodeEvent, DiagramOptions, NodaraController } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeDiagram } from "./validation";
import { diagramPortPoint, routeDiagramLinks, validateDiagramRouting } from "./diagram-routing";
import { layoutDiagramChord, layoutDiagramTree, stateConnection } from "./diagram-specialized";

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
    let width = Math.max(root.clientWidth, 360), height = Math.max(root.clientHeight, 300);
    const treeBoxes = type === "mindmap" || type === "radial-tree" ? layoutDiagramTree(data, type, width, height, currentOptions.nodeWidth ?? 92) : undefined;
    if (treeBoxes) { width = Math.max(width, ...treeBoxes.map(box => box.x + box.width + 16)); height = Math.max(height, ...treeBoxes.map(box => box.y + box.height + 16)); }
    const erWidth = Math.min(width - 32, currentOptions.nodeWidth ?? 170), erColumns = Math.max(1, Math.floor((width - 32) / (erWidth + 72)));
    const erRows: number[] = [];
    if (type === "er") { for (const [i, node] of data.nodes.entries()) { const row = Math.floor(i / erColumns); erRows[row] = Math.max(erRows[row] ?? 0, 34 + (node.attributes?.length ?? 0) * 22); } height = Math.max(height, erRows.reduce((sum, h) => sum + h + 72, 32)); }
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio; canvas.height = height * pixelRatio;
    canvas.style.width = width + "px"; canvas.style.height = height + "px";
    canvas.setAttribute("aria-hidden", "true"); root.append(canvas);

    const boxes = new Map<string, NodeBox>();
    const hierarchyType = ["treemap", "icicle", "circle-pack", "sunburst"].includes(type);
    const flowType = type === "sankey" || type === "alluvial";
    const nodeWidth = clamp(currentOptions.nodeWidth ?? (flowType ? 22 : type === "er" ? 170 : 92), 4, width);
    const nodeGap = Math.max(0, currentOptions.nodeGap ?? 18);
    const palette = [tokens.primary, tokens.positive, tokens.warning, tokens.danger, "#40c9c6", "#b978ff", "#ff8d55"];
    const colors = new Map(data.nodes.map((node, index) => [node.id, node.color ?? palette[index % palette.length] ?? tokens.primary]));
    const parents = new Set(data.nodes.flatMap(node => node.parentId ? [node.parentId] : []));
    let flowLinks: SankeyLayoutLink[] = [];

    const chord = type === "chord" ? layoutDiagramChord(data) : undefined;
    const chordRadius = Math.max(20, Math.min(width - 140, height - 110) / 2);
    if (chord) {
      for (const group of chord.groups) boxes.set(group.node.id, { node: group.node, x: width / 2 - chordRadius, y: height / 2 - chordRadius, width: chordRadius * 2, height: chordRadius * 2, region: { kind: "sector", x: width / 2, y: height / 2, innerRadius: chordRadius - 14, outerRadius: chordRadius, start: group.start, end: group.end } });
    } else if (type === "er") {
      for (const [index, node] of data.nodes.entries()) { const row = Math.floor(index / erColumns), x = 24 + index % erColumns * (erWidth + 72), y = 32 + erRows.slice(0, row).reduce((sum, h) => sum + h + 72, 0), h = 34 + (node.attributes?.length ?? 0) * 22; boxes.set(node.id, { node, x, y, width: erWidth, height: h, region: { kind: "rect", x, y, width: erWidth, height: h } }); }
    } else if (type === "radial-tree" || type === "mindmap") {
      for (const box of treeBoxes!) boxes.set(box.node.id, box);
    } else if (hierarchyType) {
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
      const radial = false;
      const vertical = currentOptions.orientation === "vertical";
      const edges = data.links.length ? data.links.map(link => ({ from: link.from, to: link.to })) : data.nodes.flatMap(node => node.parentId ? [{ from: node.parentId, to: node.id }] : []);
      const positions = calculateTopologyLayout({ nodes: data.nodes, edges }, radial ? "radial" : "hierarchical", !radial && !vertical ? height : width, !radial && !vertical ? width : height);
      for (const node of data.nodes) {
        const position = positions.get(node.id)!;
        const centerX = !radial && !vertical ? position.y : position.x; const centerY = !radial && !vertical ? position.x : position.y;
        const terminal = type === "state" && ["initial", "final"].includes(node.stateKind ?? "normal");
        const boxWidth = terminal ? 24 : nodeWidth; const boxHeight = terminal ? 24 : 40;
        const x = centerX - boxWidth / 2; const y = centerY - boxHeight / 2;
        boxes.set(node.id, { node, x, y, width: boxWidth, height: boxHeight, region: terminal ? { kind: "circle", x: centerX, y: centerY, radius: 12 } : { kind: "rect", x, y, width: boxWidth, height: boxHeight } });
      }
    }

    const parentLinks = data.nodes.flatMap(node => node.parentId ? [{ from: node.parentId, to: node.id, directed: true }] : []);
    const links: DiagramLink[] = type === "radial-tree" || type === "mindmap" ? [...data.links, ...parentLinks.filter(parent => !data.links.some(link => link.from === parent.from && link.to === parent.to))] : data.links.length ? data.links : parentLinks;
    const routes = currentOptions.linkRouting === "orthogonal" ? routeDiagramLinks([...boxes.values()], links, { width, height }, currentOptions.routingClearance ?? 8) : [];
    const failedRoutes = routes.filter(route => route.status !== "routed");
    root.dataset.ndRoutedLinks = String(routes.length - failedRoutes.length); root.dataset.ndUnroutableLinks = String(failedRoutes.length);
    if (failedRoutes.length) {
      const warning = createElement("p", "nd-diagram__routing-warning", `${failedRoutes.length} connection(s) could not be routed. ` + failedRoutes.slice(0, 5).map(route => `${route.link.from} → ${route.link.to}: ${route.reason}`).join("; "));
      warning.setAttribute("role", "status"); warning.tabIndex = 0; root.append(warning);
    }
    const context = canvas.getContext("2d");
    if (context) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height); context.fillStyle = tokens.background; context.fillRect(0, 0, width, height);
      context.font = "500 12px " + tokens.fontFamily;
      if (chord) {
        const radius = chordRadius - 14, cx = width / 2, cy = height / 2;
        const point = (angle: number, r = radius) => ({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        for (const ribbon of chord.ribbons) {
          const a = point(ribbon.source.start), b = point(ribbon.target.start, ribbon.link.directed ? radius - 8 : radius), back = point(ribbon.source.start);
          context.beginPath(); context.moveTo(a.x, a.y); context.arc(cx, cy, radius, ribbon.source.start, ribbon.source.end);
          context.bezierCurveTo(cx, cy, cx, cy, b.x, b.y);
          if (ribbon.link.directed) { const tip = point((ribbon.target.start + ribbon.target.end) / 2, radius), end = point(ribbon.target.end, radius - 8); context.lineTo(tip.x, tip.y); context.lineTo(end.x, end.y); }
          else context.arc(cx, cy, radius, ribbon.target.start, ribbon.target.end);
          context.bezierCurveTo(cx, cy, cx, cy, back.x, back.y); context.closePath(); context.fillStyle = ribbon.link.color ?? colors.get(ribbon.link.from)!; context.globalAlpha = currentOptions.linkOpacity ?? 0.55; context.fill();
        }
        context.globalAlpha = 1; root.dataset.ndChordRibbons = String(chord.ribbons.length);
        if (!chord.total) { context.fillStyle = tokens.foreground; context.textAlign = "center"; context.fillText("Sem fluxos / No flow", cx, cy); }
      } else if (flowType) {
        for (const link of flowLinks) {
          context.beginPath();
          if (currentOptions.orientation === "vertical") { context.moveTo(link.y0, link.x0); const control = (link.x0 + link.x1) / 2; context.bezierCurveTo(link.y0, control, link.y1, control, link.y1, link.x1); }
          else { context.moveTo(link.x0, link.y0); const control = (link.x0 + link.x1) / 2; context.bezierCurveTo(control, link.y0, control, link.y1, link.x1, link.y1); }
          context.strokeStyle = link.link.color ?? colors.get(link.link.from) ?? tokens.primary;
          context.globalAlpha = clamp(currentOptions.linkOpacity ?? 0.42, 0, 1); context.lineWidth = link.width; context.stroke();
        }
        context.globalAlpha = 1;
      } else if (!hierarchyType) {
        for (const [index, link] of links.entries()) {
          const from = boxes.get(link.from); const to = boxes.get(link.to); if (!from || !to) continue;
          const route = routes[index]; if (route && route.status !== "routed") continue;
          const statePath = type === "state" && !route ? stateConnection(from, to, links.some(other => other.from === link.to && other.to === link.from)) : undefined;
          const fromX = from.x + from.width / 2; const fromY = from.y + from.height / 2; const toX = to.x + to.width / 2; const toY = to.y + to.height / 2;
          context.beginPath();
          if (route?.status === "routed") route.points.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
          else if (statePath) { context.moveTo(statePath.start.x, statePath.start.y); if (statePath.control2) context.bezierCurveTo(statePath.control1.x, statePath.control1.y, statePath.control2.x, statePath.control2.y, statePath.end.x, statePath.end.y); else context.quadraticCurveTo(statePath.control1.x, statePath.control1.y, statePath.end.x, statePath.end.y); }
          else { context.moveTo(fromX, fromY); context.lineTo(toX, toY); }
          context.strokeStyle = "color" in link && link.color ? link.color : tokens.primary; context.globalAlpha = clamp(currentOptions.linkOpacity ?? 0.58, 0, 1); context.lineWidth = 1.5; context.stroke(); context.globalAlpha = 1;
          if ((link.directed || type === "state") && type !== "er") {
            const points = route?.status === "routed" ? route.points : undefined;
            const last = points?.at(-1), before = points?.at(-2);
            const angle = statePath?.angle ?? (last && before ? Math.atan2(last.y - before.y, last.x - before.x) : Math.atan2(toY - fromY, toX - fromX)); const distance = to.region.kind === "circle" ? to.region.radius + 2 : Math.min(to.width / 2 / Math.max(0.001, Math.abs(Math.cos(angle))), to.height / 2 / Math.max(0.001, Math.abs(Math.sin(angle)))) + 2;
            const tipX = statePath?.end.x ?? last?.x ?? toX - Math.cos(angle) * distance; const tipY = statePath?.end.y ?? last?.y ?? toY - Math.sin(angle) * distance;
            context.beginPath(); context.moveTo(tipX, tipY); context.lineTo(tipX - Math.cos(angle - 0.5) * 8, tipY - Math.sin(angle - 0.5) * 8); context.lineTo(tipX - Math.cos(angle + 0.5) * 8, tipY - Math.sin(angle + 0.5) * 8); context.closePath(); context.fillStyle = context.strokeStyle; context.fill();
          }
          const text = link.label ?? ""; context.fillStyle = tokens.foreground; context.font = "500 14px " + tokens.fontFamily; context.textAlign = "center";
          if (text) { const x = statePath?.label.x ?? (fromX + toX) / 2, y = statePath?.label.y ?? (fromY + toY) / 2 - (type === "er" ? 26 : 10); context.fillStyle = tokens.background; context.fillRect(x - context.measureText(text).width / 2 - 4, y - 13, context.measureText(text).width + 8, 18); context.fillStyle = tokens.foreground; context.fillText(text, x, y); }
          if (type === "er") {
            const dx = toX - fromX, dy = toY - fromY, length = Math.max(1, Math.hypot(dx, dy)), ux = dx / length, uy = dy / length;
            const cardinality = (box: NodeBox, value: string | undefined, direction: number) => { if (!value) return; const distance = Math.min(box.width / 2 / Math.max(0.001, Math.abs(ux)), box.height / 2 / Math.max(0.001, Math.abs(uy))) + 14; context.fillText(value, box.x + box.width / 2 + ux * distance * direction - uy * 14, box.y + box.height / 2 + uy * distance * direction + ux * 14); };
            cardinality(from, link.fromCardinality, 1); cardinality(to, link.toCardinality, -1);
          }
        }
      }
      for (const box of boxes.values()) {
        const region = box.region;
        if ((region.kind === "circle" && region.radius <= 0) || (region.kind === "rect" && (region.width <= 0 || region.height <= 0)) || (region.kind === "sector" && region.end <= region.start)) continue;
        context.beginPath();
        if (region.kind === "circle") context.arc(region.x, region.y, region.radius, 0, Math.PI * 2);
        else if (region.kind === "sector") { context.arc(region.x, region.y, region.outerRadius, region.start, region.end); context.arc(region.x, region.y, region.innerRadius, region.end, region.start, true); context.closePath(); }
        else if (type === "state" && typeof context.roundRect === "function") context.roundRect(box.x, box.y, box.width, box.height, 10);
        else context.rect(box.x, box.y, box.width, box.height);
        const fill = colors.get(box.node.id)!; context.fillStyle = fill; context.fill(); context.strokeStyle = tokens.background; context.lineWidth = 2; context.stroke();
        context.fillStyle = readableTextColor(fill); context.textAlign = "center"; context.textBaseline = "middle"; context.font = "500 14px " + tokens.fontFamily;
        if (type === "state" && box.node.stateKind === "final" && region.kind === "circle") { context.beginPath(); context.arc(region.x, region.y, 7, 0, Math.PI * 2); context.strokeStyle = tokens.background; context.stroke(); }
        if (chord && region.kind === "sector") { const angle = (region.start + region.end) / 2, x = region.x + Math.cos(angle) * (chordRadius + 12), y = region.y + Math.sin(angle) * (chordRadius + 12); context.fillStyle = tokens.foreground; context.textAlign = Math.cos(angle) < -0.2 ? "right" : Math.cos(angle) > 0.2 ? "left" : "center"; context.fillText(box.node.label.slice(0, 18), x, y); }
        else if (type === "er") { context.fillText(box.node.label, box.x + box.width / 2, box.y + 17, box.width - 10); context.textAlign = "left"; for (const [i, attribute] of (box.node.attributes ?? []).entries()) context.fillText(`${attribute.key ? attribute.key + " " : ""}${attribute.name}${attribute.type ? ": " + attribute.type : ""}`, box.x + 7, box.y + 45 + i * 22, box.width - 14); }
        else if (type === "state" && region.kind === "circle") { context.fillStyle = tokens.foreground; context.fillText(box.node.label, region.x, region.y + 28); }
        else if (flowType) {
          context.fillStyle = tokens.foreground;
          if (currentOptions.orientation === "vertical") { context.textAlign = "center"; if (box.width >= 35) context.fillText(box.node.label.slice(0, Math.max(3, Math.floor(box.width / 7))), box.x + box.width / 2, box.y + box.height >= height - 1 ? box.y - 12 : box.y + box.height + 12); }
          else { const last = box.x + box.width > width - 1; context.textAlign = last ? "right" : "left"; if (box.height >= 16) context.fillText(box.node.label.slice(0, 24), last ? box.x - 6 : box.x + box.width + 6, box.y + box.height / 2); }
        } else if (region.kind === "sector") {
          const middle = (region.start + region.end) / 2; const radius = (region.innerRadius + region.outerRadius) / 2; const length = (region.end - region.start) * radius;
          if (length >= 32 && region.outerRadius - region.innerRadius >= 18) context.fillText(box.node.label.slice(0, Math.floor(length / 8)), region.x + Math.cos(middle) * radius, region.y + Math.sin(middle) * radius);
        } else if (type === "treemap" && parents.has(box.node.id)) {
          context.textAlign = "left"; if (box.width >= 40) context.fillText(box.node.label.slice(0, Math.floor((box.width - 12) / 7)), box.x + 7, box.y + 12);
        } else if (box.width >= 38 && box.height >= 20) context.fillText(box.node.label.slice(0, Math.max(3, Math.floor((box.width - 10) / 7))), box.x + box.width / 2, box.y + box.height / 2);
        for (const port of box.node.ports ?? []) { const point = diagramPortPoint(box, port); context.beginPath(); context.arc(point.x, point.y, 3, 0, Math.PI * 2); context.fillStyle = tokens.foreground; context.fill(); }
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
      if (node.attributes?.length) button.append(document.createTextNode(". " + node.attributes.map(attribute => `${attribute.key ?? ""} ${attribute.name}: ${attribute.type ?? ""}`).join("; ")));
      if (node.stateKind) button.append(document.createTextNode(` (${node.stateKind})`));
      if (node.ports?.length) button.append(document.createTextNode(". Ports: " + node.ports.map(port => `${port.label ?? port.id} (${port.side})`).join(", ")));
      button.type = "button"; button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1; button.dataset.ndFocus = node.id;
      const select = () => selectNode({ node, source: "keyboard" }); button.addEventListener("click", select); cleanups.push(() => button.removeEventListener("click", select)); item.append(button); list.append(item);
    }
    if (data.nodes.length > limit) list.append(createElement("li", "", (data.nodes.length - limit) + " additional diagram nodes are available through the data API."));
    root.dataset.ndAccessibleItems = String(Math.min(data.nodes.length, limit)); root.append(list);
    const relations = createElement("ul", "nd-sr-only nd-diagram__relations");
    for (const link of links.slice(0, limit)) relations.append(createElement("li", "", `${boxes.get(link.from)?.node.label} ${link.fromCardinality ?? ""} ${link.directed || type === "state" ? "→" : "—"} ${boxes.get(link.to)?.node.label} ${link.toCardinality ?? ""}${link.label ? ": " + link.label : ""}${type === "chord" ? ` (${link.value ?? 1})` : ""}`)); root.append(relations);
    if (routes.length) {
      const endpoint = (id: string, portId?: string) => { const node = boxes.get(id)!.node; return node.label + (portId ? `, port ${node.ports?.find(port => port.id === portId)?.label ?? portId}` : ""); };
      const connections = createElement("ul", "nd-sr-only nd-diagram__connections"); connections.setAttribute("aria-label", "Diagram connections");
      for (const route of routes.slice(0, limit)) connections.append(createElement("li", "", `${endpoint(route.link.from, route.link.fromPort)} ${route.link.directed ? "directed to" : "connected with"} ${endpoint(route.link.to, route.link.toPort)}${route.link.label ? `: ${route.link.label}` : ""}. ${route.status === "routed" ? `${route.bends} bends` : route.reason}.`));
      if (routes.length > limit) connections.append(createElement("li", "", `${routes.length - limit} additional connections are available through the data API.`)); root.append(connections);
    }
    const onClick = (event: MouseEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const rect = canvas.getBoundingClientRect(); const point = { x: (event.clientX - rect.left) * width / (rect.width || width), y: (event.clientY - rect.top) * height / (rect.height || height) };
      const hit = [...boxes.values()].reverse().find(box => containsPoint(box.region, point)); if (hit) selectNode({ node: hit.node, source: "pointer" });
    };
    canvas.addEventListener("click", onClick);
    return () => { active = false; cleanups.forEach(cleanup => cleanup()); canvas.removeEventListener("click", onClick); };
  }, { normalize: normalizeDiagram, validate: (data, options) => { validateDiagramOptions(options); validateDiagramLayout(data, options.type); validateDiagramRouting(data, options); } });
}
