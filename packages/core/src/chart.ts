import { buildChartData, chartDomain, chartPointCount } from "./chart-model";
import { createController } from "./controller";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import type { ChartOptions, ChartPoint, ChartPointEvent, ChartSeries, ChartType, NodaraController } from "./types";
import { clamp, createElement, empty, resolveElement } from "./utils";
import { normalizeChartSeries } from "./validation";
import { renderWebGLPoints } from "./webgl";

const palette = ["#7884ff", "#ff7657", "#52d6c7", "#c8fa63", "#f5c451", "#bf7cff", "#43a9ff", "#ff5fa2", "#76e38a", "#ff9f43"];
const canvasOnlyTypes = new Set<ChartType>(["bubble", "pie", "donut", "radar", "polar-area", "heatmap", "waterfall", "funnel", "gauge", "candlestick"]);

function metaNumber(point: ChartPoint, key: string, fallback: number): number {
  const value = point.meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createChart(
  target: string | Element,
  options: ChartOptions,
): NodaraController<ChartSeries[], ChartOptions> {
  const container = resolveElement(target);
  return createController(container, options.series, options, ({ container: root, data, options: currentOptions, emit }) => {
    empty(root);
    root.className = `nd-root nd-chart ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Data chart");
    const tokens = applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const chartType = currentOptions.type ?? "line";
    const requestedMode = resolveRenderMode(currentOptions.renderer, chartPointCount(data), currentOptions.performance);
    const mode = requestedMode === "dom" || canvasOnlyTypes.has(chartType) ? "canvas" : requestedMode;
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
      currentOptions.onPointSelect?.(payload);
      emit("point:select", payload);
    };

    const accessibleTable = createElement("table", "nd-sr-only");
    accessibleTable.append(createElement("caption", "", currentOptions.ariaLabel ?? "Chart data"));
    const totalPoints = chartPointCount(data);
    const accessibilityLimit = Math.max(1, Math.floor(currentOptions.performance?.accessibilityLimit ?? 300));
    let accessiblePoints = 0;
    data.forEach((series) => {
      const row = createElement("tr");
      row.append(createElement("th", "", series.label));
      series.data.forEach((point) => {
        if (accessiblePoints >= accessibilityLimit) return;
        const cell = createElement("td");
        const button = createElement("button", "", `${String(point.x)}: ${(currentOptions.valueFormatter ?? String)(point.y)}`);
        button.type = "button";
        button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
        button.addEventListener("click", () => selectPoint({ point, series, source: "keyboard" }));
        cell.append(button);
        row.append(cell);
        accessiblePoints += 1;
      });
      if (row.children.length > 1) accessibleTable.append(row);
    });
    root.append(accessibleTable);
    root.dataset.ndAccessibleItems = String(accessiblePoints);
    if (totalPoints > accessiblePoints) root.append(createElement("p", "nd-sr-only", `${totalPoints - accessiblePoints} additional chart points are available through the data API.`));

    const canvas = createElement("canvas", "nd-chart__canvas");
    const width = Math.max(root.clientWidth, 320);
    const height = Math.max(root.clientHeight - (currentOptions.showLegend === false ? 0 : 38), 220);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, currentOptions.performance?.maxDevicePixelRatio ?? 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.tabIndex = -1;
    canvas.setAttribute("aria-hidden", "true");
    root.append(canvas);

    const chartData = buildChartData(data, currentOptions.stacked === true);
    const domain = chartDomain(chartData);
    const padding = { top: 24, right: 22, bottom: currentOptions.showAxes === false ? 12 : 38, left: currentOptions.showAxes === false ? 12 : 52 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const maxPoints = Math.max(...data.map((series) => series.data.length), 1);
    const valueFormatter = currentOptions.valueFormatter ?? ((value: number) => Intl.NumberFormat(currentOptions.locale).format(value));
    const labelFormatter = currentOptions.labelFormatter ?? ((value: unknown) => String(value));
    const yFor = (value: number) => padding.top + plotHeight - ((value - domain.minimum) / domain.range) * plotHeight;
    const xFor = (index: number) => padding.left + (maxPoints === 1 ? plotWidth / 2 : (plotWidth * index) / (maxPoints - 1));
    const pointsForWebGL = chartData.map((item) => ({ x: xFor(item.pointIndex), y: yFor(item.value), size: 6 }));
    const usedWebGL = mode === "webgl" && renderWebGLPoints(canvas, pointsForWebGL, width, height);
    const hitAreas: Array<{ x: number; y: number; radius: number; event: ChartPointEvent }> = [];

    if (!usedWebGL) {
      const context = canvas.getContext("2d");
      if (context) {
        context.scale(pixelRatio, pixelRatio);
        context.font = `10px ${tokens.fontFamily}`;
        context.lineWidth = 1;
        const cartesian = chartType === "line" || chartType === "area" || chartType === "bar" || chartType === "scatter" || chartType === "bubble";

        if (cartesian && currentOptions.showGrid !== false) {
          context.strokeStyle = tokens.border;
          context.fillStyle = tokens.muted;
          for (let line = 0; line <= 4; line += 1) {
            const y = padding.top + (plotHeight * line) / 4;
            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(width - padding.right, y);
            context.stroke();
            if (currentOptions.showAxes !== false) context.fillText(valueFormatter(domain.maximum - (domain.range * line) / 4), 4, y + 3);
          }
        }
        if (cartesian && currentOptions.showAxes !== false) {
          const labels = data[0]?.data ?? [];
          context.fillStyle = tokens.muted;
          context.textAlign = "center";
          const stride = Math.max(1, Math.ceil(labels.length / 8));
          labels.forEach((point, index) => {
            if (index % stride === 0) context.fillText(labelFormatter(point.x), xFor(index), height - 10);
          });
        }

        if (chartType === "pie" || chartType === "donut" || chartType === "polar-area") {
          const entries = data.flatMap((series, seriesIndex) => series.data.map((point, pointIndex) => ({ series, seriesIndex, point, pointIndex })));
          const total = entries.reduce((sum, entry) => sum + Math.abs(entry.point.y), 0) || 1;
          const maximum = Math.max(...entries.map((entry) => Math.abs(entry.point.y)), 1);
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
            hitAreas.push({ x: centerX + Math.cos(middle) * hitRadius, y: centerY + Math.sin(middle) * hitRadius, radius: Math.max(14, radius * Math.sin(Math.min(Math.PI / 2, slice / 2))), event: { point: entry.point, series: entry.series, source: "pointer" } });
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
          const axes = Math.max(...data.map((series) => series.data.length), 3);
          const maximum = Math.max(...data.flatMap((series) => series.data.map((point) => Math.abs(point.y))), 1);
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.max(40, Math.min(plotWidth, plotHeight) * 0.38);
          context.strokeStyle = tokens.border;
          for (let ring = 1; ring <= 4; ring += 1) {
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
            series.data.forEach((point, pointIndex) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * pointIndex) / axes;
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
          const maximum = Math.max(...data.flatMap((series) => series.data.map((point) => Math.abs(point.y))), 1);
          data.forEach((series, row) => series.data.forEach((point, column) => {
            const x = padding.left + column * cellWidth;
            const y = padding.top + row * cellHeight;
            context.fillStyle = series.color ?? palette[row % palette.length] ?? tokens.primary;
            context.globalAlpha = 0.16 + 0.84 * (Math.abs(point.y) / maximum);
            context.fillRect(x + 1, y + 1, Math.max(1, cellWidth - 2), Math.max(1, cellHeight - 2));
            hitAreas.push({ x: x + cellWidth / 2, y: y + cellHeight / 2, radius: Math.max(12, Math.min(cellWidth, cellHeight) / 2), event: { point, series, source: "pointer" } });
          }));
        } else if (chartType === "funnel") {
          const series = data[0];
          const entries = series?.data ?? [];
          const maximum = Math.max(...entries.map((point) => Math.abs(point.y)), 1);
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
            if (series) hitAreas.push({ x: width / 2, y: y + rowHeight / 2, radius: Math.max(16, rowHeight / 2), event: { point, series, source: "pointer" } });
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
          const totals = entries.reduce<number[]>((values, point) => [...values, (values.at(-1) ?? 0) + point.y], [0]);
          const localMinimum = Math.min(...totals, 0);
          const localMaximum = Math.max(...totals, 1);
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
            if (series) hitAreas.push({ x: x + groupWidth * 0.34, y: top + Math.abs(localY(previous) - localY(next)) / 2, radius: Math.max(12, groupWidth * 0.34), event: { point, series, source: "pointer" } });
          });
        } else if (chartType === "candlestick") {
          const series = data[0];
          const entries = series?.data ?? [];
          const values = entries.flatMap((point) => [metaNumber(point, "low", point.y), metaNumber(point, "high", point.y), metaNumber(point, "open", point.y), metaNumber(point, "close", point.y)]);
          const localMinimum = Math.min(...values, 0);
          const localMaximum = Math.max(...values, 1);
          const localRange = localMaximum - localMinimum || 1;
          const localY = (value: number) => padding.top + plotHeight - ((value - localMinimum) / localRange) * plotHeight;
          const groupWidth = plotWidth / Math.max(entries.length, 1);
          entries.forEach((point, index) => {
            const open = metaNumber(point, "open", point.y);
            const close = metaNumber(point, "close", point.y);
            const high = metaNumber(point, "high", Math.max(open, close));
            const low = metaNumber(point, "low", Math.min(open, close));
            const x = padding.left + index * groupWidth + groupWidth / 2;
            const color = close >= open ? tokens.positive : tokens.danger;
            context.strokeStyle = color;
            context.beginPath();
            context.moveTo(x, localY(high));
            context.lineTo(x, localY(low));
            context.stroke();
            context.fillStyle = color;
            context.fillRect(x - groupWidth * 0.22, Math.min(localY(open), localY(close)), groupWidth * 0.44, Math.max(2, Math.abs(localY(open) - localY(close))));
            if (series) hitAreas.push({ x, y: (localY(open) + localY(close)) / 2, radius: Math.max(12, groupWidth * 0.3), event: { point, series, source: "pointer" } });
          });
        } else {
          data.forEach((series, seriesIndex) => {
            const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
            const entries = chartData.filter((item) => item.seriesIndex === seriesIndex);
            const coordinates = entries.map((item) => ({ ...item, x: xFor(item.pointIndex), y: yFor(item.value), baselineY: yFor(item.baseline) }));
            if (chartType === "bar") {
              const groupWidth = plotWidth / maxPoints;
              const barWidth = currentOptions.stacked ? groupWidth * 0.64 : (groupWidth * 0.72) / Math.max(data.length, 1);
              coordinates.forEach((item) => {
                const x = currentOptions.stacked ? padding.left + item.pointIndex * groupWidth + (groupWidth - barWidth) / 2 : padding.left + item.pointIndex * groupWidth + (groupWidth - barWidth * data.length) / 2 + seriesIndex * barWidth;
                const top = Math.min(item.y, item.baselineY);
                context.fillStyle = color;
                context.globalAlpha = 0.84;
                context.fillRect(x, top, Math.max(2, barWidth - 2), Math.max(1, Math.abs(item.baselineY - item.y)));
                hitAreas.push({ x: x + barWidth / 2, y: item.y, radius: Math.max(12, barWidth), event: { point: item.series.data[item.pointIndex]!, series, source: "pointer" } });
              });
            } else {
              if (chartType === "area" && coordinates.length > 0) {
                context.beginPath();
                coordinates.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
                [...coordinates].reverse().forEach((item) => context.lineTo(item.x, item.baselineY));
                context.closePath();
                context.globalAlpha = 0.18;
                context.fillStyle = color;
                context.fill();
              }
              if (chartType !== "scatter" && chartType !== "bubble") {
                context.globalAlpha = 1;
                context.beginPath();
                coordinates.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
              }
              coordinates.forEach((item) => {
                const point = item.series.data[item.pointIndex]!;
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
      chartData.forEach((item) => hitAreas.push({ x: xFor(item.pointIndex), y: yFor(item.value), radius: 12, event: { point: item.series.data[item.pointIndex]!, series: item.series, source: "pointer" } }));
    }

    const tooltip = createElement("div", "nd-chart__tooltip");
    tooltip.hidden = true;
    root.append(tooltip);
    const hitAt = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return hitAreas.find((area) => Math.hypot(area.x - x, area.y - y) <= area.radius);
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
      tooltip.textContent = `${hit.event.series.label}: ${valueFormatter(hit.event.point.y)}`;
      const rect = canvas.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 10}px`;
      tooltip.style.top = `${event.clientY - rect.top + 10}px`;
    };
    const onLeave = () => { tooltip.hidden = true; };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, { normalize: normalizeChartSeries });
}
