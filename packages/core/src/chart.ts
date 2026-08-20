import { createController } from "./controller";
import { applyTheme } from "./theme";
import type { ChartOptions, ChartPointEvent, ChartSeries, NodaraController } from "./types";
import { createElement, empty, resolveElement } from "./utils";
import { normalizeChartSeries } from "./validation";

const palette = ["#7884ff", "#ff7657", "#52d6c7", "#c8fa63", "#f5c451"];

export function createChart(
  target: string | Element,
  options: ChartOptions,
): NodaraController<ChartSeries[]> {
  const container = resolveElement(target);
  const controller = createController(container, normalizeChartSeries(options.series), ({ container: root, data, emit }) => {
    empty(root);
    root.className = `nd-root nd-chart ${options.className ?? ""}`.trim();
    root.setAttribute("role", "figure");
    root.setAttribute("aria-label", options.ariaLabel ?? "Data chart");
    const tokens = applyTheme(root, options.theme, options.tokens);

    if (options.showLegend !== false) {
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

    const canvas = createElement("canvas", "nd-chart__canvas");
    const width = Math.max(root.clientWidth, 320);
    const height = Math.max(root.clientHeight - (options.showLegend === false ? 0 : 38), 220);
    const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    root.append(canvas);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(pixelRatio, pixelRatio);

    const allValues = data.flatMap((series) => series.data.map((point) => point.y));
    const maximum = Math.max(...allValues, 1);
    const minimum = Math.min(...allValues, 0);
    const range = maximum - minimum || 1;
    const padding = { top: 24, right: 22, bottom: 34, left: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const formatter = options.valueFormatter ?? ((value: number) => Intl.NumberFormat(options.locale).format(value));

    context.strokeStyle = tokens.border;
    context.fillStyle = tokens.muted;
    context.lineWidth = 1;
    context.font = `10px ${tokens.fontFamily}`;
    for (let line = 0; line <= 4; line += 1) {
      const y = padding.top + (plotHeight * line) / 4;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      const value = maximum - (range * line) / 4;
      context.fillText(formatter(value), 4, y + 3);
    }

    const maxPoints = Math.max(...data.map((series) => series.data.length), 1);
    const hitAreas: Array<{ x: number; y: number; radius: number; event: ChartPointEvent }> = [];
    data.forEach((series, seriesIndex) => {
      const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
      const points = series.data.map((point, index) => ({
        x: padding.left + (maxPoints === 1 ? plotWidth / 2 : (plotWidth * index) / (maxPoints - 1)),
        y: padding.top + plotHeight - ((point.y - minimum) / range) * plotHeight,
        point,
      }));

      if ((options.type ?? "line") === "bar") {
        const groupWidth = plotWidth / maxPoints;
        const barWidth = Math.max(3, (groupWidth * 0.72) / Math.max(data.length, 1));
        points.forEach((item, index) => {
          const x = padding.left + index * groupWidth + (groupWidth - barWidth * data.length) / 2 + seriesIndex * barWidth;
          context.fillStyle = color;
          context.globalAlpha = 0.82;
          context.fillRect(x, item.y, Math.max(2, barWidth - 2), padding.top + plotHeight - item.y);
          hitAreas.push({ x: x + barWidth / 2, y: item.y, radius: Math.max(12, barWidth), event: { point: item.point, series, source: "pointer" } });
        });
      } else {
        context.beginPath();
        points.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
        if (options.type === "area" && points.length > 0) {
          const last = points[points.length - 1]!;
          const first = points[0]!;
          context.lineTo(last.x, padding.top + plotHeight);
          context.lineTo(first.x, padding.top + plotHeight);
          context.closePath();
          context.globalAlpha = 0.18;
          context.fillStyle = color;
          context.fill();
          context.globalAlpha = 1;
          context.beginPath();
          points.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
        }
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        points.forEach((item) => {
          context.beginPath();
          context.fillStyle = tokens.surface;
          context.strokeStyle = color;
          context.arc(item.x, item.y, 3.5, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          hitAreas.push({ x: item.x, y: item.y, radius: 14, event: { point: item.point, series, source: "pointer" } });
        });
      }
    });
    context.globalAlpha = 1;

    const table = createElement("table", "nd-sr-only");
    table.append(createElement("caption", "", options.ariaLabel ?? "Chart data"));
    data.forEach((series) => {
      const row = createElement("tr");
      row.append(createElement("th", "", series.label));
      series.data.forEach((point) => row.append(createElement("td", "", `${String(point.x)}: ${formatter(point.y)}`)));
      table.append(row);
    });
    root.append(table);

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = hitAreas.find((area) => Math.hypot(area.x - x, area.y - y) <= area.radius);
      if (hit) emit("point:select", hit.event);
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  });

  if (options.onPointSelect) controller.on<ChartPointEvent>("point:select", options.onPointSelect);
  return controller;
}
