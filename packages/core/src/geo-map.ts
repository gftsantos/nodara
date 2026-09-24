import { validateMapOptions } from "./visual-options";
import { createController } from "./controller";
import { isInteractionEnabled } from "./render-mode";
import { applyTheme } from "./theme";
import type {
  GeoCoordinate,
  GeoMapData,
  GeoMapOptions,
  GeoPointEvent,
  GeoViewportEvent,
  NodaraController,
} from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeGeoMap } from "./validation";
import { trackPointer } from "./interaction";

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export function createGeoMap(
  target: string | Element,
  options: GeoMapOptions,
): NodaraController<GeoMapData, GeoMapOptions> {
  const container = resolveElement(target);
  const viewport = { zoom: options.initialZoom ?? 1, x: 0, y: 0 };
  let previousInitialZoom = options.initialZoom;
  return createController(container, options.data, options, ({ container: root, data, options: currentOptions, emit }) => {
    let active = true;
    const cleanups: Array<() => void> = [];
    empty(root);
    root.className = `nd-root nd-geo-map ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    if (root.getAttribute("aria-label") !== (currentOptions.ariaLabel ?? "Geographic map")) root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Geographic map");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const projection = currentOptions.projection ?? "mercator";
    const mode = currentOptions.mode ?? "points";
    root.dataset.ndProjection = projection;
    root.dataset.ndMode = mode;
    root.dataset.ndRenderer = "canvas";

    const canvas = createElement("canvas", "nd-geo-map__canvas");
    const width = Math.max(root.clientWidth, 360);
    const height = Math.max(root.clientHeight, 300);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);

    const center = currentOptions.center ?? { longitude: 0, latitude: 12 };
    const minimumZoom = Math.max(0.2, currentOptions.minZoom ?? 0.6);
    const maximumZoom = Math.max(minimumZoom, currentOptions.maxZoom ?? 12);
    if (currentOptions.initialZoom !== previousInitialZoom) { viewport.zoom = currentOptions.initialZoom ?? 1; previousInitialZoom = currentOptions.initialZoom; }
    viewport.zoom = clamp(viewport.zoom, minimumZoom, maximumZoom);
    const pointRadius = Math.max(2, currentOptions.pointRadius ?? 6);
    const pointById = mode === "routes" ? new Map(data.points.map(point => [point.id, point])) : undefined;
    const values = data.points.map((point) => point.value ?? 1);
    const maximumValue = values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 1);

    const projectBase = (coordinate: GeoCoordinate): ProjectedPoint => {
      const longitude = coordinate.longitude - center.longitude;
      if (projection === "orthographic") {
        const lambda = longitude * Math.PI / 180;
        const phi = coordinate.latitude * Math.PI / 180;
        const phi0 = center.latitude * Math.PI / 180;
        const cosine = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
        const radius = Math.min(width, height) * 0.43;
        return {
          x: width / 2 + radius * Math.cos(phi) * Math.sin(lambda),
          y: height / 2 - radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda)),
          visible: cosine >= 0,
        };
      }
      const x = ((longitude + 180) % 360 + 360) % 360 / 360 * width;
      if (projection === "equirectangular") {
        return { x, y: height / 2 - (coordinate.latitude - center.latitude) / 180 * height, visible: true };
      }
      const latitude = clamp(coordinate.latitude, -85, 85) * Math.PI / 180;
      const mercator = Math.log(Math.tan(Math.PI / 4 + latitude / 2));
      const centerMercator = Math.log(Math.tan(Math.PI / 4 + clamp(center.latitude, -85, 85) * Math.PI / 360));
      return { x, y: height / 2 - (mercator - centerMercator) * height / (2 * Math.PI), visible: true };
    };
    const projectScreen = (coordinate: GeoCoordinate) => {
      const projected = projectBase(coordinate);
      return {
        x: (projected.x - width / 2) * viewport.zoom + width / 2 + viewport.x,
        y: (projected.y - height / 2) * viewport.zoom + height / 2 + viewport.y,
        visible: projected.visible,
      };
    };
    const resolveRouteEnd = (value: string | GeoCoordinate) => typeof value === "string"
      ? pointById?.get(value)
      : value;

    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = tokens.background;
      context.fillRect(0, 0, width, height);

      if (projection === "orthographic") {
        context.beginPath();
        context.arc(width / 2 + viewport.x, height / 2 + viewport.y, Math.min(width, height) * 0.43 * viewport.zoom, 0, Math.PI * 2);
        context.fillStyle = tokens.surface;
        context.fill();
        context.strokeStyle = tokens.border;
        context.stroke();
      }
      if (currentOptions.showGraticule !== false) {
        context.strokeStyle = tokens.border;
        context.lineWidth = 1;
        for (let longitude = -180; longitude <= 180; longitude += 30) {
          context.beginPath();
          let started = false;
          for (let latitude = -80; latitude <= 80; latitude += 4) {
            const projected = projectScreen({ longitude, latitude });
            if (!projected.visible) { started = false; continue; }
            if (!started) context.moveTo(projected.x, projected.y);
            else context.lineTo(projected.x, projected.y);
            started = true;
          }
          context.stroke();
        }
        for (let latitude = -60; latitude <= 60; latitude += 30) {
          context.beginPath();
          let started = false;
          for (let longitude = -180; longitude <= 180; longitude += 4) {
            const projected = projectScreen({ longitude, latitude });
            if (!projected.visible) { started = false; continue; }
            if (!started) context.moveTo(projected.x, projected.y);
            else context.lineTo(projected.x, projected.y);
            started = true;
          }
          context.stroke();
        }
      }

      data.regions?.forEach((region) => {
        const coordinates = region.coordinates.map(projectScreen).filter((point) => point.visible);
        if (coordinates.length < 3) return;
        context.beginPath();
        context.moveTo(coordinates[0]!.x, coordinates[0]!.y);
        coordinates.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.closePath();
        context.fillStyle = region.color ?? (mode === "choropleth" ? tokens.primary : tokens.surface);
        context.globalAlpha = mode === "choropleth" ? clamp(0.2 + (region.value ?? 1) / 10, 0.25, 0.85) : 0.45;
        context.fill();
        context.globalAlpha = 1;
        context.strokeStyle = tokens.border;
        context.stroke();
      });

      (mode === "routes" ? data.routes : [])?.forEach((route) => {
        const fromValue = resolveRouteEnd(route.from);
        const toValue = resolveRouteEnd(route.to);
        if (!fromValue || !toValue) return;
        const from = projectScreen(fromValue);
        const to = projectScreen(toValue);
        if (!from.visible || !to.visible) return;
        context.beginPath();
        context.moveTo(from.x, from.y);
        const lift = Math.min(90, Math.hypot(to.x - from.x, to.y - from.y) * 0.18);
        context.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - lift, to.x, to.y);
        context.strokeStyle = route.color ?? tokens.primary;
        context.globalAlpha = 0.72;
        context.lineWidth = Math.max(1.5, Math.sqrt(Math.abs(route.value ?? 1)));
        context.stroke();
        context.globalAlpha = 1;
        if (route.directed) {
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          context.beginPath();
          context.moveTo(to.x, to.y);
          context.lineTo(to.x - Math.cos(angle - 0.5) * 9, to.y - Math.sin(angle - 0.5) * 9);
          context.lineTo(to.x - Math.cos(angle + 0.5) * 9, to.y - Math.sin(angle + 0.5) * 9);
          context.closePath();
          context.fillStyle = route.color ?? tokens.primary;
          context.fill();
        }
      });

      data.points.forEach((point) => {
        const screen = projectScreen(point);
        if (!screen.visible) return;
        const proportionalRadius = pointRadius + Math.sqrt(Math.abs(point.value ?? 1) / maximumValue) * 14;
        const radius = mode === "bubbles" ? proportionalRadius : pointRadius;
        const extent = mode === "heatmap" ? proportionalRadius * 2.5 : radius + 1;
        if (data.points.length > 80 && (screen.x + extent < 0 || screen.x - extent > width || screen.y + extent < 0 || screen.y - extent > height)) return;
        if (mode === "heatmap") {
          const gradient = context.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, proportionalRadius * 2.5);
          gradient.addColorStop(0, point.color ?? tokens.danger);
          gradient.addColorStop(1, "transparent");
          context.fillStyle = gradient;
          context.globalAlpha = 0.55;
          context.beginPath();
          context.arc(screen.x, screen.y, proportionalRadius * 2.5, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
          return;
        }
        context.beginPath();
        context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        context.fillStyle = point.color ?? tokens.primary;
        context.fill();
        context.strokeStyle = tokens.background;
        context.lineWidth = 2;
        context.stroke();
        if (data.points.length <= 80) {
          context.font = `600 10px ${tokens.fontFamily}`;
          context.textAlign = "center";
          context.fillStyle = tokens.foreground;
          context.fillText(point.label, screen.x, screen.y - radius - 7);
        }
      });
    };
    draw();

    const selectPoint = (payload: GeoPointEvent) => {
      if (!active || !isInteractionEnabled(currentOptions.interactive, payload.source === "keyboard" ? "keyboard" : "pointer")) return;
      currentOptions.onPointSelect?.(payload);
      emit("point:select", payload);
    };
    const list = createElement("ul", "nd-sr-only nd-accessible-data");
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    data.points.slice(0, accessibilityLimit).forEach((point) => {
      const item = createElement("li");
      const button = createElement("button", "", `${point.label}, latitude ${point.latitude}, longitude ${point.longitude}`);
      button.type = "button";
      button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
      button.dataset.ndFocus = point.id;
      const select = () => selectPoint({ point, source: "keyboard" });
      button.addEventListener("click", select); cleanups.push(() => button.removeEventListener("click", select));
      item.append(button);
      list.append(item);
    });
    if (data.points.length > accessibilityLimit) list.append(createElement("li", "", `${data.points.length - accessibilityLimit} additional geographic points are available through the data API.`));
    root.dataset.ndAccessibleItems = String(Math.min(data.points.length, accessibilityLimit));
    root.append(list);

    const pointAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return data.points.find((point) => {
        const screen = projectScreen(point);
        return screen.visible && Math.hypot(screen.x - (clientX - rect.left) * width / (rect.width || width), screen.y - (clientY - rect.top) * height / (rect.height || height)) <= pointRadius + 10;
      });
    };
    const emitViewport = () => {
      const payload = { ...viewport, source: "pointer" } satisfies GeoViewportEvent;
      currentOptions.onViewportChange?.(payload);
      emit("viewport:change", payload);
    };
    let moved = false;
    let endGesture: (() => void) | undefined;
    const onClick = (event: MouseEvent) => {
      if (moved) { moved = false; return; }
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const point = pointAt(event.clientX, event.clientY);
      if (point) selectPoint({ point, source: "pointer" });
    };
    const onWheel = (event: WheelEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "zoom")) return;
      event.preventDefault();
      viewport.zoom = clamp(viewport.zoom * (event.deltaY > 0 ? 0.9 : 1.1), minimumZoom, maximumZoom);
      draw();
      emitViewport();
    };
    const onPointerDown = (event: PointerEvent) => {
      moved = false;
      if (event.button !== 0 || !isInteractionEnabled(currentOptions.interactive, "pan") || pointAt(event.clientX, event.clientY)) return;
      endGesture?.();
      moved = false;
      const panOrigin = { x: event.clientX, y: event.clientY, viewportX: viewport.x, viewportY: viewport.y };
      const panRect = canvas.getBoundingClientRect();
      endGesture = trackPointer(event, () => {
        if (moved) emitViewport();
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
    return () => {
      active = false; endGesture?.(); cleanups.forEach(cleanup => cleanup());
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, { normalize: normalizeGeoMap, validate: validateMapOptions });
}
