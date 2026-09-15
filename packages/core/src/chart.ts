import { prepareContours, prepareViolinDensity, seriesScalarGrid } from "./statistics";
import { validateChartOptions } from "./visual-options";
import { buildChartData, chartCategories, chartDomain, chartPointCount, chartXIdentity, chartXScale } from "./chart-model";
import { createController } from "./controller";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import type { ChartOptions, ChartPoint, ChartPointEvent, ChartSeries, ChartType, NodaraController } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeChartSeries } from "./validation";
import { createWebGLSurface, replaceWebGLCanvas, webGLColor } from "./webgl";
import { containsPoint, type HitRegion } from "./geometry";

let tooltipSequence = 0;

const palette = ["#7884ff", "#ff7657", "#52d6c7", "#c8fa63", "#f5c451", "#bf7cff", "#43a9ff", "#ff5fa2", "#76e38a", "#ff9f43"];
const canvasOnlyTypes = new Set<ChartType>([
  "bubble", "pie", "donut", "radar", "polar-area", "heatmap", "waterfall", "funnel", "gauge", "candlestick",
  "histogram", "boxplot", "error-bar", "range-area", "step-line", "spline", "lollipop", "bullet", "radial-bar", "ohlc", "violin", "contour",
]);

function metaNumber(point: ChartPoint, key: string, fallback: number): number {
  const value = point.meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createChart(
  target: string | Element,
  options: ChartOptions,
): NodaraController<ChartSeries[], ChartOptions> {
  const container = resolveElement(target);
  const tooltipId = `nd-chart-tooltip-${++tooltipSequence}`;
  let gpuLost = false;
  const gpu = createWebGLSurface();
  const controller = createController(container, options.series, options, ({ container: root, data, options: currentOptions, emit }) => {
    let active = true;
    const cleanups: Array<() => void> = [];
    const accessibleControls: Array<{ button: HTMLButtonElement; event: ChartPointEvent }> = [];
    empty(root);
    root.className = `nd-root nd-chart ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    if (root.getAttribute("aria-label") !== (currentOptions.ariaLabel ?? "Data chart")) root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Data chart");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const chartType = currentOptions.type ?? "line";
    const requestedMode = resolveRenderMode(currentOptions.renderer, chartPointCount(data), currentOptions.performance, true);
    const mode = !gpuLost && requestedMode === "webgl" && chartType === "scatter" && !canvasOnlyTypes.has(chartType) ? "webgl" : "canvas";
    root.dataset.ndRenderer = mode;
    root.dataset.ndStacked = String(currentOptions.stacked === true);
    root.dataset.ndType = chartType;

    if (currentOptions.showLegend !== false) {
      const legend = createElement("div", "nd-chart__legend");
      data.forEach((series, index) => {
        const item = createElement("span");
        const marker = createElement("i");
        marker.style.background = series.color ?? palette[index % palette.length] ?? tokens.primary;
        item.append(marker, document.createTextNode(series.label));
        legend.append(item);
      });
      root.append(legend);
    }

    const selectPoint = (payload: ChartPointEvent) => {
      if (!active || !isInteractionEnabled(currentOptions.interactive, payload.source === "keyboard" ? "keyboard" : "pointer")) return;
      currentOptions.onPointSelect?.(payload);
      emit("point:select", payload);
    };

    const accessibleTable = createElement("table", "nd-sr-only nd-accessible-data");
    accessibleTable.append(createElement("caption", "", currentOptions.ariaLabel ?? "Chart data"));
    const totalPoints = chartPointCount(data);
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    let accessiblePoints = 0;
    for (const series of data) {
      if (accessiblePoints >= accessibilityLimit) break;
      const row = createElement("tr");
      row.append(createElement("th", "", series.label));
      const duplicateOrdinals = new Map<string, number>();
      for (const point of series.data) {
        if (accessiblePoints >= accessibilityLimit) break;
        const cell = createElement("td");
        const button = createElement("button", "", `${String(point.x)}: ${(currentOptions.valueFormatter ?? String)(point.y)}`);
        button.type = "button";
        button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
        const xIdentity = point.x instanceof Date ? `date:${point.x.getTime()}` : `${typeof point.x}:${point.x}`;
        const ordinal = duplicateOrdinals.get(xIdentity) ?? 0;
        duplicateOrdinals.set(xIdentity, ordinal + 1);
        button.dataset.ndFocus = JSON.stringify([series.id, xIdentity, ordinal]);
        const event: ChartPointEvent = { point, series, source: "keyboard" };
        const select = () => selectPoint(event);
        button.addEventListener("click", select);
        cleanups.push(() => button.removeEventListener("click", select));
        accessibleControls.push({ button, event });
        cell.append(button);
        row.append(cell);
        accessiblePoints += 1;
      }
      if (row.children.length > 1) accessibleTable.append(row);
    }
    root.append(accessibleTable);
    root.dataset.ndAccessibleItems = String(accessiblePoints);
    if (totalPoints > accessiblePoints) root.append(createElement("p", "nd-sr-only", `${totalPoints - accessiblePoints} additional chart points are available through the data API.`));

    let canvas = gpu.acquire(mode, "nd-chart__canvas");
    const width = Math.max(root.clientWidth, 320);
    const height = Math.max(root.clientHeight - (currentOptions.showLegend === false ? 0 : 38), 220);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    if (canvas.width !== Math.floor(width * pixelRatio)) canvas.width = width * pixelRatio;
    if (canvas.height !== Math.floor(height * pixelRatio)) canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.tabIndex = -1;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);

    const chartData = buildChartData(data, currentOptions.stacked === true);
    let domain = chartDomain(chartData, chartType);
    const contourGrid = chartType === "contour" ? seriesScalarGrid(data) : undefined;
    if (contourGrid?.y.length) { const minimum = contourGrid.y[0]!; const maximum = contourGrid.y.at(-1)!; domain = { minimum, maximum, range: maximum - minimum || 1 }; }
    const densities = chartType === "violin" ? data.map(series => prepareViolinDensity(series.data.map(point => point.y), currentOptions.violinBandwidth)) : [];
    for (const density of densities) if (density?.points.length) { domain.minimum = Math.min(domain.minimum, density.points[0]!.value); domain.maximum = Math.max(domain.maximum, density.points.at(-1)!.value); }
    domain.range = domain.maximum - domain.minimum || 1;
    const padding = { top: 24, right: 22, bottom: currentOptions.showAxes === false ? 12 : 38, left: currentOptions.showAxes === false ? 12 : 52 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const categories = chartCategories(data);
    const categoryIndices = new Map(categories.map((point, index) => [chartXIdentity(point.x), index]));
    const categoryIndex = (point: ChartPoint) => categoryIndices.get(chartXIdentity(point.x)) ?? 0;
    const maxPoints = Math.max(1, categories.length);
    const valueFormatter = currentOptions.valueFormatter ?? ((value: number) => Intl.NumberFormat(currentOptions.locale).format(value));
    const labelFormatter = currentOptions.labelFormatter ?? ((value: unknown) => String(value));
    const yFor = (value: number) => padding.top + plotHeight - ((value - domain.minimum) / domain.range) * plotHeight;
    const baseXFor = chartXScale(data, padding.left, plotWidth);
    let binMinimum = Infinity; let binMaximum = -Infinity;
    if (chartType === "histogram") for (const series of data) for (const point of series.data) if (typeof point.meta?.binStart === "number" && typeof point.meta?.binEnd === "number") { binMinimum = Math.min(binMinimum, point.meta.binStart); binMaximum = Math.max(binMaximum, point.meta.binEnd); }
    const binX = (value: number) => padding.left + (value - binMinimum) / (binMaximum - binMinimum) * plotWidth;
    const xFor = (point: ChartPoint, index: number) => Number.isFinite(binMinimum) ? binX(Number(point.x)) : baseXFor(point, index);
    const seriesColors = mode === "webgl" ? data.map((series, index) => webGLColor(series.color ?? palette[index % palette.length] ?? tokens.primary)) : [];
    const pointsForWebGL = mode === "webgl" ? chartData.map((item) => ({ x: xFor(item.series.data[item.pointIndex]!, item.pointIndex), y: yFor(item.value), size: 6, color: seriesColors[item.seriesIndex]! })) : [];
    const usedWebGL = mode === "webgl" && gpu.draw(pointsForWebGL, width, height);
    if (mode === "webgl" && !usedWebGL) { gpu.dispose(); canvas = replaceWebGLCanvas(canvas); root.dataset.ndRenderer = "canvas"; }
    if (usedWebGL) {
      const onLost = (event: Event) => { event.preventDefault(); if (active) { gpuLost = true; controller.resize(); } };
      canvas.addEventListener("webglcontextlost", onLost);
      const gpuCanvas = canvas; cleanups.push(() => gpuCanvas.removeEventListener("webglcontextlost", onLost));
    }
    const hitAreas: Array<{ x: number; y: number; radius: number; region?: HitRegion; event: ChartPointEvent }> = [];

    if (!usedWebGL) {
      const context = canvas.getContext("2d");
      if (context) {
        context.scale(pixelRatio, pixelRatio);
        context.font = `12px ${tokens.fontFamily}`;
        context.lineWidth = 1;
        const cartesian = ["line", "area", "bar", "scatter", "bubble", "histogram", "boxplot", "error-bar", "range-area", "step-line", "spline", "lollipop", "bullet", "candlestick", "ohlc", "violin", "contour"].includes(chartType);

        if (cartesian) {
          context.strokeStyle = tokens.border;
          context.fillStyle = tokens.muted;
          for (let line = 0; line <= 4; line += 1) {
            const y = padding.top + (plotHeight * line) / 4;
            if (currentOptions.showGrid !== false) {
              context.beginPath();
              context.moveTo(padding.left, y);
              context.lineTo(width - padding.right, y);
              context.stroke();
            }
            if (currentOptions.showAxes !== false) context.fillText(valueFormatter(domain.maximum - (domain.range * line) / 4), 4, y + 3);
          }
        }
        if (cartesian && currentOptions.showAxes !== false) {
          const labels = chartType === "violin" ? [] : categories;
          context.fillStyle = tokens.muted;
          context.textAlign = "center";
          const stride = Math.max(1, Math.ceil(labels.length / 8));
          labels.forEach((point, index) => {
            if (index % stride === 0) context.fillText(labelFormatter(point.x), ["bar", "histogram", "boxplot", "candlestick", "ohlc"].includes(chartType) && !Number.isFinite(binMinimum) ? padding.left + (index + 0.5) * plotWidth / maxPoints : xFor(point, index), height - 10);
          });
        }

        if (chartType === "pie" || chartType === "donut" || chartType === "polar-area") {
          const entries = data.flatMap((series, seriesIndex) => series.data.map((point, pointIndex) => ({ series, seriesIndex, point, pointIndex })));
          const total = entries.reduce((sum, entry) => sum + Math.abs(entry.point.y), 0) || 1;
          const maximum = entries.reduce((maximum, entry) => Math.max(maximum, Math.abs(entry.point.y)), 1);
          const centerX = width / 2;
          const centerY = height / 2;
          const maximumRadius = Math.max(30, Math.min(plotWidth, plotHeight) * 0.42);
          let angle = -Math.PI / 2;
          entries.forEach((entry, index) => {
            const slice = chartType === "polar-area" ? (Math.PI * 2) / Math.max(entries.length, 1) : (Math.abs(entry.point.y) / total) * Math.PI * 2;
            const radius = chartType === "polar-area" ? maximumRadius * Math.sqrt(Math.abs(entry.point.y) / maximum) : maximumRadius;
            const end = angle + slice;
            const color = entry.series.color ?? palette[index % palette.length] ?? tokens.primary;
            context.beginPath();
            context.moveTo(centerX, centerY);
            context.arc(centerX, centerY, radius, angle, end);
            context.closePath();
            context.fillStyle = color;
            context.globalAlpha = 0.88;
            context.fill();
            const hitRadius = chartType === "donut" ? radius * 0.72 : radius * 0.58;
            const middle = angle + slice / 2;
            hitAreas.push({ x: centerX + Math.cos(middle) * hitRadius, y: centerY + Math.sin(middle) * hitRadius, radius, region: { kind: "sector", x: centerX, y: centerY, innerRadius: chartType === "donut" ? maximumRadius * 0.5 : 0, outerRadius: radius, start: angle, end }, event: { point: entry.point, series: entry.series, source: "pointer" } });
            angle = end;
          });
          if (chartType === "donut") {
            context.globalAlpha = 1;
            context.beginPath();
            context.arc(centerX, centerY, maximumRadius * 0.5, 0, Math.PI * 2);
            context.fillStyle = tokens.background;
            context.fill();
          }
        } else if (chartType === "radar") {
          const axes = Math.max(maxPoints, 3);
          const maximum = data.reduce((maximum, series) => series.data.reduce((maximum, point) => Math.max(maximum, Math.abs(point.y)), maximum), 1);
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.max(40, Math.min(plotWidth, plotHeight) * 0.38);
          context.strokeStyle = tokens.border;
          for (let ring = 1; currentOptions.showGrid !== false && ring <= 4; ring += 1) {
            context.beginPath();
            for (let index = 0; index < axes; index += 1) {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes;
              const x = centerX + Math.cos(angle) * radius * (ring / 4);
              const y = centerY + Math.sin(angle) * radius * (ring / 4);
              if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
            }
            context.closePath();
            context.stroke();
          }
          data.forEach((series, seriesIndex) => {
            const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
            context.beginPath();
            [...series.data].sort((a, b) => categoryIndex(a) - categoryIndex(b)).forEach((point, pointIndex) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * categoryIndex(point)) / axes;
              const pointRadius = radius * (Math.abs(point.y) / maximum);
              const x = centerX + Math.cos(angle) * pointRadius;
              const y = centerY + Math.sin(angle) * pointRadius;
              if (pointIndex === 0) context.moveTo(x, y); else context.lineTo(x, y);
              hitAreas.push({ x, y, radius: 14, event: { point, series, source: "pointer" } });
            });
            context.closePath();
            context.fillStyle = color;
            context.globalAlpha = 0.18;
            context.fill();
            context.globalAlpha = 1;
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.stroke();
          });
        } else if (chartType === "heatmap") {
          const rows = Math.max(data.length, 1);
          const columns = maxPoints;
          const cellWidth = plotWidth / columns;
          const cellHeight = plotHeight / rows;
          const maximum = data.reduce((maximum, series) => series.data.reduce((maximum, point) => Math.max(maximum, Math.abs(point.y)), maximum), 1);
          data.forEach((series, row) => series.data.forEach((point) => {
            const x = padding.left + categoryIndex(point) * cellWidth;
            const y = padding.top + row * cellHeight;
            context.fillStyle = series.color ?? palette[row % palette.length] ?? tokens.primary;
            context.globalAlpha = 0.16 + 0.84 * (Math.abs(point.y) / maximum);
            context.fillRect(x + 1, y + 1, Math.max(1, cellWidth - 2), Math.max(1, cellHeight - 2));
            hitAreas.push({ x: x + cellWidth / 2, y: y + cellHeight / 2, radius: 0, region: { kind: "rect", x: x + 1, y: y + 1, width: Math.max(1, cellWidth - 2), height: Math.max(1, cellHeight - 2) }, event: { point, series, source: "pointer" } });
          }));
        } else if (chartType === "funnel") {
          const series = data[0];
          const entries = series?.data ?? [];
          const maximum = entries.reduce((maximum, point) => Math.max(maximum, Math.abs(point.y)), 1);
          const rowHeight = plotHeight / Math.max(entries.length, 1);
          entries.forEach((point, index) => {
            const currentWidth = plotWidth * (Math.abs(point.y) / maximum);
            const nextPoint = entries[index + 1];
            const nextWidth = nextPoint ? plotWidth * (Math.abs(nextPoint.y) / maximum) : currentWidth * 0.72;
            const y = padding.top + index * rowHeight;
            context.beginPath();
            context.moveTo(width / 2 - currentWidth / 2, y);
            context.lineTo(width / 2 + currentWidth / 2, y);
            context.lineTo(width / 2 + nextWidth / 2, y + rowHeight - 2);
            context.lineTo(width / 2 - nextWidth / 2, y + rowHeight - 2);
            context.closePath();
            context.fillStyle = palette[index % palette.length] ?? tokens.primary;
            context.globalAlpha = 0.88;
            context.fill();
            if (series) hitAreas.push({ x: width / 2, y: y + rowHeight / 2, radius: 0, region: { kind: "polygon", points: [{ x: width / 2 - currentWidth / 2, y }, { x: width / 2 + currentWidth / 2, y }, { x: width / 2 + nextWidth / 2, y: y + rowHeight - 2 }, { x: width / 2 - nextWidth / 2, y: y + rowHeight - 2 }] }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "gauge") {
          const series = data[0];
          const point = series?.data[0];
          if (series && point) {
            const minimum = metaNumber(point, "min", 0);
            const maximum = Math.max(minimum + 1, metaNumber(point, "max", Math.max(100, point.y)));
            const ratio = clamp((point.y - minimum) / (maximum - minimum), 0, 1);
            const centerX = width / 2;
            const centerY = height * 0.72;
            const radius = Math.max(40, Math.min(plotWidth * 0.42, plotHeight * 0.72));
            context.lineWidth = Math.max(12, radius * 0.18);
            context.strokeStyle = tokens.border;
            context.beginPath();
            context.arc(centerX, centerY, radius, Math.PI, Math.PI * 2);
            context.stroke();
            context.strokeStyle = series.color ?? tokens.primary;
            context.beginPath();
            context.arc(centerX, centerY, radius, Math.PI, Math.PI + Math.PI * ratio);
            context.stroke();
            context.fillStyle = tokens.foreground;
            context.textAlign = "center";
            context.font = `700 28px ${tokens.fontFamily}`;
            context.fillText(valueFormatter(point.y), centerX, centerY - 8);
            hitAreas.push({ x: centerX, y: centerY - radius * 0.55, radius: radius * 0.8, event: { point, series, source: "pointer" } });
          }
        } else if (chartType === "waterfall") {
          const series = data[0];
          const entries = series?.data ?? [];
          const totals = [0]; for (const point of entries) totals.push(totals[totals.length - 1]! + point.y);
          const localMinimum = totals.reduce((minimum, value) => Math.min(minimum, value), 0);
          const localMaximum = totals.reduce((maximum, value) => Math.max(maximum, value), 1);
          const localRange = localMaximum - localMinimum || 1;
          const localY = (value: number) => padding.top + plotHeight - ((value - localMinimum) / localRange) * plotHeight;
          const groupWidth = plotWidth / Math.max(entries.length, 1);
          entries.forEach((point, index) => {
            const previous = totals[index] ?? 0;
            const next = totals[index + 1] ?? previous;
            const x = padding.left + index * groupWidth + groupWidth * 0.16;
            const top = Math.min(localY(previous), localY(next));
            const color = point.y >= 0 ? tokens.positive : tokens.danger;
            context.fillStyle = color;
            context.globalAlpha = 0.88;
            context.fillRect(x, top, groupWidth * 0.68, Math.max(2, Math.abs(localY(previous) - localY(next))));
            if (index > 0) {
              context.strokeStyle = tokens.border;
              context.beginPath();
              context.moveTo(x - groupWidth * 0.32, localY(previous));
              context.lineTo(x, localY(previous));
              context.stroke();
            }
            if (series) hitAreas.push({ x: x + groupWidth * 0.34, y: top + Math.abs(localY(previous) - localY(next)) / 2, radius: 0, region: { kind: "rect", x, y: top, width: groupWidth * 0.68, height: Math.max(2, Math.abs(localY(previous) - localY(next))) }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "candlestick" || chartType === "ohlc") {
          const records = data.flatMap((series, seriesIndex) => series.data.map(point => ({ series, seriesIndex, point })));
          const localY = yFor;
          const groupWidth = plotWidth / maxPoints / Math.max(1, data.length);
          records.forEach(({ point, series, seriesIndex }) => {
            const open = metaNumber(point, "open", point.y);
            const close = metaNumber(point, "close", point.y);
            const high = metaNumber(point, "high", Math.max(open, close));
            const low = metaNumber(point, "low", Math.min(open, close));
            const x = padding.left + categoryIndex(point) * groupWidth * data.length + (seriesIndex + 0.5) * groupWidth;
            const color = close >= open ? tokens.positive : tokens.danger;
            context.strokeStyle = color;
            context.beginPath();
            context.moveTo(x, localY(high));
            context.lineTo(x, localY(low));
            context.stroke();
            if (chartType === "ohlc") {
              context.beginPath();
              context.moveTo(x - groupWidth * 0.22, localY(open));
              context.lineTo(x, localY(open));
              context.moveTo(x, localY(close));
              context.lineTo(x + groupWidth * 0.22, localY(close));
              context.stroke();
            } else {
              context.fillStyle = color;
              context.fillRect(x - groupWidth * 0.22, Math.min(localY(open), localY(close)), groupWidth * 0.44, Math.max(2, Math.abs(localY(open) - localY(close))));
            }
            if (series) hitAreas.push({ x, y: (localY(open) + localY(close)) / 2, radius: 0, region: { kind: "union", regions: [
              { kind: "segment", from: { x, y: localY(high) }, to: { x, y: localY(low) }, tolerance: 3 },
              ...(chartType === "candlestick" ? [{ kind: "rect" as const, x: x - groupWidth * 0.22, y: Math.min(localY(open), localY(close)), width: groupWidth * 0.44, height: Math.max(2, Math.abs(localY(open) - localY(close))) }] : [
                { kind: "segment" as const, from: { x: x - groupWidth * 0.22, y: localY(open) }, to: { x, y: localY(open) }, tolerance: 3 },
                { kind: "segment" as const, from: { x, y: localY(close) }, to: { x: x + groupWidth * 0.22, y: localY(close) }, tolerance: 3 }
              ])
            ] }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "boxplot") {
          const records = data.flatMap((series, seriesIndex) => series.data.map(point => ({ series, seriesIndex, point })));
          const localY = yFor;
          const groupWidth = plotWidth / maxPoints / Math.max(1, data.length);
          records.forEach(({ point, series, seriesIndex }) => {
            const minimum = metaNumber(point, "min", point.y);
            const q1 = metaNumber(point, "q1", point.y);
            const median = metaNumber(point, "median", point.y);
            const q3 = metaNumber(point, "q3", point.y);
            const maximum = metaNumber(point, "max", point.y);
            const x = padding.left + categoryIndex(point) * groupWidth * data.length + (seriesIndex + 0.5) * groupWidth;
            const boxWidth = groupWidth * 0.5;
            context.strokeStyle = series?.color ?? tokens.primary;
            context.fillStyle = series?.color ?? tokens.primary;
            context.globalAlpha = 0.22;
            context.fillRect(x - boxWidth / 2, localY(q3), boxWidth, Math.max(2, localY(q1) - localY(q3)));
            context.globalAlpha = 1;
            context.strokeRect(x - boxWidth / 2, localY(q3), boxWidth, Math.max(2, localY(q1) - localY(q3)));
            context.beginPath();
            context.moveTo(x, localY(maximum));
            context.lineTo(x, localY(q3));
            context.moveTo(x, localY(q1));
            context.lineTo(x, localY(minimum));
            context.moveTo(x - boxWidth / 2, localY(median));
            context.lineTo(x + boxWidth / 2, localY(median));
            context.stroke();
            if (series) hitAreas.push({ x, y: localY(median), radius: 0, region: { kind: "union", regions: [
              { kind: "rect", x: x - boxWidth / 2, y: localY(q3), width: boxWidth, height: Math.max(2, localY(q1) - localY(q3)) },
              { kind: "segment", from: { x, y: localY(maximum) }, to: { x, y: localY(minimum) }, tolerance: 3 }
            ] }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "bullet") {
          const records = data.flatMap((series, seriesIndex) => series.data.map(point => ({ series, seriesIndex, point })));
          const entries = records.map(record => record.point);
          const maximum = entries.reduce((maximum, point) => Math.max(maximum, metaNumber(point, "max", Math.max(100, point.y))), 1);
          const rowHeight = plotHeight / Math.max(entries.length, 1);
          records.forEach(({ point, series }, index) => {
            const y = padding.top + index * rowHeight;
            const target = metaNumber(point, "target", point.y);
            context.fillStyle = tokens.border;
            context.fillRect(padding.left, y + rowHeight * 0.18, plotWidth, rowHeight * 0.64);
            context.fillStyle = series?.color ?? tokens.primary;
            context.fillRect(padding.left, y + rowHeight * 0.32, plotWidth * clamp(point.y / maximum, 0, 1), rowHeight * 0.36);
            context.strokeStyle = tokens.foreground;
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(padding.left + plotWidth * clamp(target / maximum, 0, 1), y + rowHeight * 0.2);
            context.lineTo(padding.left + plotWidth * clamp(target / maximum, 0, 1), y + rowHeight * 0.8);
            context.stroke();
            if (series) hitAreas.push({ x: padding.left + plotWidth * clamp(point.y / maximum, 0, 1), y: y + rowHeight / 2, radius: 0, region: { kind: "rect", x: padding.left, y: y + rowHeight * 0.18, width: plotWidth, height: rowHeight * 0.64 }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "radial-bar") {
          const records = data.flatMap((series, seriesIndex) => series.data.map(point => ({ series, seriesIndex, point })));
          const entries = records.map(record => record.point);
          const centerX = width / 2;
          const centerY = height / 2;
          const availableRadius = Math.min(plotWidth, plotHeight) * 0.46;
          const ringWidth = availableRadius / Math.max(entries.length * 1.65, 1);
          records.forEach(({ point, series }, index) => {
            const maximum = Math.max(1, metaNumber(point, "max", 100));
            const radius = Math.max(ringWidth / 2, availableRadius - ringWidth / 2 - index * ringWidth * 1.55);
            context.lineWidth = ringWidth;
            context.strokeStyle = tokens.border;
            context.beginPath();
            context.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI * 1.5);
            context.stroke();
            context.strokeStyle = palette[index % palette.length] ?? tokens.primary;
            context.beginPath();
            context.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(point.y / maximum, 0, 1));
            context.stroke();
            if (series) hitAreas.push({ x: centerX, y: centerY - radius, radius: 0, region: { kind: "sector", x: centerX, y: centerY, innerRadius: Math.max(0, radius - ringWidth / 2), outerRadius: radius + ringWidth / 2, start: -Math.PI / 2, end: Math.PI * 1.5 }, event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "violin") {
          const laneWidth = plotWidth / Math.max(1, data.length);
          const maximumDensity = densities.reduce((maximum, density) => density ? density.points.reduce((current, point) => Math.max(current, point.density), maximum) : maximum, 0) || 1;
          root.dataset.ndDensity = densities.some(Boolean) ? "gaussian-kde" : "samples-only";
          data.forEach((series, seriesIndex) => {
            const centerX = padding.left + (seriesIndex + 0.5) * laneWidth;
            const density = densities[seriesIndex];
            const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
            if (density?.points.length) {
              const sides = density.points.map(point => ({ x: centerX - laneWidth * 0.42 * point.density / maximumDensity, y: yFor(point.value) }));
              sides.push(...[...density.points].reverse().map(point => ({ x: centerX + laneWidth * 0.42 * point.density / maximumDensity, y: yFor(point.value) })));
              context.beginPath(); sides.forEach((point, index) => { if (!index) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); }); context.closePath();
              context.fillStyle = color; context.globalAlpha = 0.32; context.fill(); context.globalAlpha = 1; context.strokeStyle = color; context.stroke();
              // A density has no unique source sample. Width selects the closest observed value.
              for (let index = 0; index + 1 < density.points.length; index++) {
                const a = density.points[index]!; const b = density.points[index + 1]!;
                const sample = series.data.reduce((nearest, point) => Math.abs(point.y - a.value) < Math.abs(nearest.y - a.value) ? point : nearest, series.data[0]!);
                const halfWidth = laneWidth * 0.42 * Math.max(a.density, b.density) / maximumDensity;
                hitAreas.push({ x: centerX, y: yFor(a.value), radius: 0, region: { kind: "rect", x: centerX - halfWidth, y: yFor(b.value), width: halfWidth * 2, height: Math.abs(yFor(a.value) - yFor(b.value)) }, event: { point: sample, series, source: "pointer" } });
              }
            }
            context.strokeStyle = color;
            for (const point of series.data) {
              const y = yFor(point.y); context.beginPath(); context.moveTo(centerX - 4, y); context.lineTo(centerX + 4, y); context.stroke();
              hitAreas.push({ x: centerX, y, radius: 6, event: { point, series, source: "pointer" } });
            }
            if (currentOptions.showAxes !== false) { context.fillStyle = tokens.muted; context.textAlign = "center"; context.fillText(series.label, centerX, height - 10); }
          });
        } else if (chartType === "contour" && contourGrid) {
          const { levels, segments } = prepareContours(contourGrid, currentOptions.contourLevels); root.dataset.ndContours = String(segments.length);
          const gridX = (value: number) => contourGrid.x.length <= 1 ? padding.left + plotWidth / 2 : padding.left + (value - contourGrid.x[0]!) / (contourGrid.x.at(-1)! - contourGrid.x[0]!) * plotWidth;
          segments.forEach(segment => {
            context.strokeStyle = palette[levels.indexOf(segment.level) % palette.length] ?? tokens.primary;
            context.lineWidth = 1.8; context.beginPath(); context.moveTo(gridX(segment.a.x), yFor(segment.a.y)); context.lineTo(gridX(segment.b.x), yFor(segment.b.y)); context.stroke();
          });
          data.forEach(series => series.data.forEach(point => {
            const x = gridX(Number(point.x)); const y = yFor(series.gridY!);
            context.fillStyle = tokens.foreground; context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fill();
            hitAreas.push({ x, y, radius: 12, event: { point, series, source: "pointer" } });
          }));
        } else {
          data.forEach((series, seriesIndex) => {
            const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
            const entries = chartData.filter((item) => item.seriesIndex === seriesIndex);
            const coordinates = entries.map((item) => ({ ...item, x: xFor(item.series.data[item.pointIndex]!, item.pointIndex), y: yFor(item.value), baselineY: yFor(item.baseline) }));
            if (chartType === "bar" || chartType === "histogram") {
              const groupWidth = plotWidth / maxPoints;
              const barWidth = currentOptions.stacked ? groupWidth * 0.64 : (groupWidth * 0.72) / Math.max(data.length, 1);
              coordinates.forEach((item) => {
                let x = currentOptions.stacked ? padding.left + categoryIndex(item.series.data[item.pointIndex]!) * groupWidth + (groupWidth - barWidth) / 2 : padding.left + categoryIndex(item.series.data[item.pointIndex]!) * groupWidth + (groupWidth - barWidth * data.length) / 2 + seriesIndex * barWidth;
                let actualWidth = Math.max(2, barWidth - 2);
                const point = item.series.data[item.pointIndex]!;
                if (Number.isFinite(binMinimum)) {
                  const left = binX(Number(point.meta!.binStart)); const fullWidth = binX(Number(point.meta!.binEnd)) - left;
                  const groupedWidth = fullWidth / (currentOptions.stacked ? 1 : Math.max(1, data.length));
                  x = left + (currentOptions.stacked ? 0 : seriesIndex * groupedWidth); actualWidth = Math.max(0, groupedWidth - 1);
                }
                const top = Math.min(item.y, item.baselineY);
                context.fillStyle = color;
                context.globalAlpha = 0.84;
                context.fillRect(x, top, actualWidth, Math.max(1, Math.abs(item.baselineY - item.y)));
                hitAreas.push({ x: x + barWidth / 2, y: item.y, radius: 0, region: { kind: "rect", x, y: top, width: actualWidth, height: Math.max(1, Math.abs(item.baselineY - item.y)) }, event: { point: item.series.data[item.pointIndex]!, series, source: "pointer" } });
              });
            } else {
              if ((chartType === "area" || chartType === "range-area") && coordinates.length > 0) {
                context.beginPath();
                coordinates.forEach((item, index) => {
                  const point = item.series.data[item.pointIndex]!;
                  const y = chartType === "range-area" ? yFor(metaNumber(point, "high", point.y)) : item.y;
                  if (index === 0) context.moveTo(item.x, y); else context.lineTo(item.x, y);
                });
                [...coordinates].reverse().forEach((item) => {
                  const point = item.series.data[item.pointIndex]!;
                  context.lineTo(item.x, chartType === "range-area" ? yFor(metaNumber(point, "low", 0)) : item.baselineY);
                });
                context.closePath();
                context.globalAlpha = 0.18;
                context.fillStyle = color;
                context.fill();
              }
              if (chartType !== "scatter" && chartType !== "bubble" && chartType !== "lollipop" && chartType !== "error-bar") {
                context.globalAlpha = 1;
                context.beginPath();
                coordinates.forEach((item, index) => {
                  if (index === 0) context.moveTo(item.x, item.y);
                  else if (chartType === "step-line") {
                    const previous = coordinates[index - 1]!;
                    context.lineTo(item.x, previous.y);
                    context.lineTo(item.x, item.y);
                  } else if (chartType === "spline") {
                    const previous = coordinates[index - 1]!;
                    context.quadraticCurveTo((previous.x + item.x) / 2, previous.y, item.x, item.y);
                  } else context.lineTo(item.x, item.y);
                });
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
              }
              coordinates.forEach((item) => {
                const point = item.series.data[item.pointIndex]!;
                if (chartType === "lollipop") {
                  context.strokeStyle = color;
                  context.beginPath();
                  context.moveTo(item.x, yFor(0));
                  context.lineTo(item.x, item.y);
                  context.stroke();
                }
                if (chartType === "error-bar") {
                  const low = yFor(metaNumber(point, "low", point.y - metaNumber(point, "error", 1)));
                  const high = yFor(metaNumber(point, "high", point.y + metaNumber(point, "error", 1)));
                  context.strokeStyle = color;
                  context.beginPath();
                  context.moveTo(item.x, low);
                  context.lineTo(item.x, high);
                  context.moveTo(item.x - 5, low);
                  context.lineTo(item.x + 5, low);
                  context.moveTo(item.x - 5, high);
                  context.lineTo(item.x + 5, high);
                  context.stroke();
                  hitAreas.push({ x: item.x, y: item.y, radius: 0, region: { kind: "union", regions: [
                    { kind: "segment", from: { x: item.x, y: low }, to: { x: item.x, y: high }, tolerance: 3 },
                    { kind: "segment", from: { x: item.x - 5, y: low }, to: { x: item.x + 5, y: low }, tolerance: 3 },
                    { kind: "segment", from: { x: item.x - 5, y: high }, to: { x: item.x + 5, y: high }, tolerance: 3 }
                  ] }, event: { point, series, source: "pointer" } });
                }
                const pointRadius = chartType === "bubble" ? clamp(metaNumber(point, "size", Math.abs(point.y) / 8), 4, 28) : chartType === "scatter" ? 5 : 3.5;
                context.beginPath();
                context.fillStyle = chartType === "bubble" ? color : tokens.surface;
                context.globalAlpha = chartType === "bubble" ? 0.62 : 1;
                context.strokeStyle = color;
                context.arc(item.x, item.y, pointRadius, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                hitAreas.push({ x: item.x, y: item.y, radius: Math.max(14, pointRadius), event: { point, series, source: "pointer" } });
              });
            }
          });
        }
        context.globalAlpha = 1;
      }
    } else {
      chartData.forEach((item) => hitAreas.push({ x: xFor(item.series.data[item.pointIndex]!, item.pointIndex), y: yFor(item.value), radius: 12, event: { point: item.series.data[item.pointIndex]!, series: item.series, source: "pointer" } }));
    }

    const tooltip = createElement("div", "nd-chart__tooltip");
    tooltip.id = tooltipId;
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    root.append(tooltip);
    const hitAt = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * width / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) * height / Math.max(1, rect.height);
      return [...hitAreas].reverse().find(area => containsPoint(area.region ?? { kind: "circle", x: area.x, y: area.y, radius: area.radius }, { x, y }));
    };
    const showTooltip = (event: ChartPointEvent, clientX: number, clientY: number) => {
      if (!active || currentOptions.showTooltip === false || !isInteractionEnabled(currentOptions.interactive, event.source === "keyboard" ? "keyboard" : "pointer")) return;
      tooltip.textContent = `${event.series.label} · ${labelFormatter(event.point.x)}: ${valueFormatter(event.point.y)}`;
      tooltip.hidden = false;
      const rect = root.getBoundingClientRect();
      const x = (clientX - rect.left) * root.clientWidth / Math.max(1, rect.width) + 10;
      const y = (clientY - rect.top) * root.clientHeight / Math.max(1, rect.height) + 10;
      tooltip.style.left = `${clamp(x, 4, Math.max(4, root.clientWidth - tooltip.offsetWidth - 4))}px`;
      tooltip.style.top = `${clamp(y, 4, Math.max(4, root.clientHeight - tooltip.offsetHeight - 4))}px`;
    };
    const onClick = (event: MouseEvent) => {
      if (!isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const hit = hitAt(event);
      if (hit) selectPoint(hit.event);
    };
    const onMove = (event: MouseEvent) => {
      if (currentOptions.showTooltip === false || !isInteractionEnabled(currentOptions.interactive, "pointer")) return;
      const hit = hitAt(event);
      tooltip.hidden = !hit;
      if (!hit) return;
      showTooltip(hit.event, event.clientX, event.clientY);
    };
    const onLeave = () => { tooltip.hidden = true; };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onLeave(); };
    for (const { button, event } of accessibleControls) {
      button.setAttribute("aria-describedby", tooltipId);
      const onFocus = () => { const rect = button.getBoundingClientRect(); showTooltip(event, rect.left, rect.bottom); };
      button.addEventListener("focus", onFocus); button.addEventListener("blur", onLeave);
      cleanups.push(() => { button.removeEventListener("focus", onFocus); button.removeEventListener("blur", onLeave); });
    }
    document.addEventListener("keydown", onEscape);
    // A controller may restore focus before the focus handlers are attached on the next render.
    const focused = accessibleControls.find(({ button }) => button === document.activeElement);
    if (focused) { const rect = focused.button.getBoundingClientRect(); showTooltip(focused.event, rect.left, rect.bottom); }
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    return () => {
      active = false;
      cleanups.forEach(cleanup => cleanup());
      document.removeEventListener("keydown", onEscape);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, { normalize: normalizeChartSeries, validate: validateChartOptions, dispose: gpu.dispose });
  return controller;
}
