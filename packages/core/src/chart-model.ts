import type { ChartPoint, ChartSeries, ChartType } from "./types";

export function chartNumericX(x: ChartPoint["x"]): number { return typeof x === "number" ? x : x instanceof Date ? x.getTime() : /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(x) ? Date.parse(x) : NaN; }
export function chartXIdentity(x: ChartPoint["x"]): string { const numeric = chartNumericX(x); return Number.isFinite(numeric) ? `number:${numeric}` : `string:${x}`; }
/** First appearance defines category order, shared by every series. */
export function chartCategories(series: ChartSeries[]): ChartPoint[] { const points = new Map<string, ChartPoint>(); for (const entry of series) for (const point of entry.data) { const key = chartXIdentity(point.x); if (!points.has(key)) points.set(key, point); } return [...points.values()]; }

export interface ChartDatum {
  series: ChartSeries;
  seriesIndex: number;
  pointIndex: number;
  value: number;
  baseline: number;
}

export function buildChartData(series: ChartSeries[], stacked = false): ChartDatum[] {
  const positive = new Map<string | number, number>();
  const negative = new Map<string | number, number>();
  return series.flatMap((entry, seriesIndex) => entry.data.map((point, pointIndex) => {
    const baselines = point.y >= 0 ? positive : negative;
    const key = stacked ? chartXIdentity(point.x) : "";
    const baseline = stacked ? baselines.get(key) ?? 0 : 0;
    const value = stacked ? baseline + point.y : point.y;
    if (stacked) baselines.set(key, value);
    return { series: entry, seriesIndex, pointIndex, value, baseline };
  }));
}

export function chartDomain(data: ChartDatum[], type?: ChartType): { minimum: number; maximum: number; range: number } {
  let maximum = 1;
  let minimum = 0;
  const include = (value: unknown) => { if (typeof value === "number" && Number.isFinite(value)) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); } };
  for (const item of data) {
    include(item.value); include(item.baseline);
    const point = item.series.data[item.pointIndex]!;
    const keys = type === "boxplot" ? ["min", "q1", "median", "q3", "max"] : ["range-area", "error-bar", "candlestick", "ohlc"].includes(type ?? "") ? ["low", "high", "open", "close"] : [];
    keys.forEach(key => include(point.meta?.[key]));
    if (type === "error-bar") {
      const error = typeof point.meta?.error === "number" ? point.meta.error : 1;
      include(point.meta?.low ?? point.y - error); include(point.meta?.high ?? point.y + error);
    }
  }
  return { minimum, maximum, range: maximum - minimum || 1 };
}

export function chartXScale(series: ChartSeries[], left: number, width: number): (point: ChartPoint, index: number) => number {
  const numeric = chartNumericX;
  let minimum = Infinity; let maximum = -Infinity; let continuous = true;
  for (const entry of series) {
    for (const point of entry.data) {
      const x = numeric(point.x);
      if (!Number.isFinite(x)) continuous = false;
      else { minimum = Math.min(minimum, x); maximum = Math.max(maximum, x); }
    }
  }
  const categories = continuous ? new Map<string, number>() : new Map(chartCategories(series).map((point, index) => [chartXIdentity(point.x), index]));
  const count = Math.max(1, categories.size);
  return (point, index) => left + (continuous && Number.isFinite(minimum) ? maximum === minimum ? width / 2 : (numeric(point.x) - minimum) / (maximum - minimum) * width : count === 1 ? width / 2 : (categories.get(chartXIdentity(point.x)) ?? index) / (count - 1) * width);
}

export function chartPointCount(series: ChartSeries[]): number {
  return series.reduce((total, entry) => total + entry.data.length, 0);
}
