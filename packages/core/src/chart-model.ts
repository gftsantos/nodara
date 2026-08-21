import type { ChartSeries } from "./types";

export interface ChartDatum {
  series: ChartSeries;
  seriesIndex: number;
  pointIndex: number;
  value: number;
  baseline: number;
}

export function buildChartData(series: ChartSeries[], stacked = false): ChartDatum[] {
  const positive = new Map<number, number>();
  const negative = new Map<number, number>();
  return series.flatMap((entry, seriesIndex) => entry.data.map((point, pointIndex) => {
    const baselines = point.y >= 0 ? positive : negative;
    const baseline = stacked ? baselines.get(pointIndex) ?? 0 : 0;
    const value = stacked ? baseline + point.y : point.y;
    if (stacked) baselines.set(pointIndex, value);
    return { series: entry, seriesIndex, pointIndex, value, baseline };
  }));
}

export function chartDomain(data: ChartDatum[]): { minimum: number; maximum: number; range: number } {
  const values = data.flatMap((item) => [item.value, item.baseline]);
  const maximum = Math.max(...values, 1);
  const minimum = Math.min(...values, 0);
  return { minimum, maximum, range: maximum - minimum || 1 };
}

export function chartPointCount(series: ChartSeries[]): number {
  return series.reduce((total, entry) => total + entry.data.length, 0);
}
