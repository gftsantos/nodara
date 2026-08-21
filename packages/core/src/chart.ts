import { buildChartData, chartDomain, chartPointCount } from "./chart-model";
import { createController } from "./controller";
import { isInteractionEnabled, resolveRenderMode } from "./render-mode";
import { applyTheme } from "./theme";
import type { ChartOptions, ChartPointEvent, ChartSeries, NodaraController } from "./types";
import { createElement, empty, resolveElement } from "./utils";
import { normalizeChartSeries } from "./validation";
import { renderWebGLPoints } from "./webgl";

const palette = ["#7884ff", "#ff7657", "#52d6c7", "#c8fa63", "#f5c451"];

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
    const requestedMode = resolveRenderMode(currentOptions.renderer, chartPointCount(data), currentOptions.performance);
    const mode = requestedMode === "dom" ? "canvas" : requestedMode;
    root.dataset.ndRenderer = mode;
    root.dataset.ndStacked = String(currentOptions.stacked === true);

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
        if (currentOptions.showGrid !== false) {
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
        if (currentOptions.showAxes !== false) {
          const labels = data[0]?.data ?? [];
          context.fillStyle = tokens.muted;
          context.textAlign = "center";
          const stride = Math.max(1, Math.ceil(labels.length / 8));
          labels.forEach((point, index) => {
            if (index % stride === 0) context.fillText(labelFormatter(point.x), xFor(index), height - 10);
          });
        }

        data.forEach((series, seriesIndex) => {
          const color = series.color ?? palette[seriesIndex % palette.length] ?? tokens.primary;
          const entries = chartData.filter((item) => item.seriesIndex === seriesIndex);
          const coordinates = entries.map((item) => ({ ...item, x: xFor(item.pointIndex), y: yFor(item.value), baselineY: yFor(item.baseline) }));
          if ((currentOptions.type ?? "line") === "bar") {
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
            if (currentOptions.type === "area" && coordinates.length > 0) {
              context.beginPath();
              coordinates.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
              [...coordinates].reverse().forEach((item) => context.lineTo(item.x, item.baselineY));
              context.closePath();
              context.globalAlpha = 0.18;
              context.fillStyle = color;
              context.fill();
            }
            if (currentOptions.type !== "scatter") {
              context.globalAlpha = 1;
              context.beginPath();
              coordinates.forEach((item, index) => index === 0 ? context.moveTo(item.x, item.y) : context.lineTo(item.x, item.y));
              context.strokeStyle = color;
              context.lineWidth = 2;
              context.stroke();
            }
            coordinates.forEach((item) => {
              context.beginPath();
              context.fillStyle = tokens.surface;
              context.strokeStyle = color;
              context.arc(item.x, item.y, currentOptions.type === "scatter" ? 5 : 3.5, 0, Math.PI * 2);
              context.fill();
              context.stroke();
              hitAreas.push({ x: item.x, y: item.y, radius: 14, event: { point: item.series.data[item.pointIndex]!, series, source: "pointer" } });
            });
          }
        });
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
