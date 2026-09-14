import type { ChartSeries } from "./types";
import { NodaraError } from "./utils";

export interface DensityPoint { value: number; density: number }
export interface DensityEstimate { bandwidth: number | null; sampleCount: number; points: DensityPoint[] }
export interface HistogramBin { start: number; end: number; count: number; density: number }
export interface Histogram { bins: HistogramBin[]; includedCount: number; underflowCount: number; overflowCount: number }
export interface ScalarGrid { x: readonly number[]; y: readonly number[]; values: readonly number[] }
export interface ContourSegment { level: number; a: { x: number; y: number }; b: { x: number; y: number } }
const invalid = (message: string): never => { throw new NodaraError("ND_INVALID_STATISTICS", message); };
function finite(values: readonly number[], name: string) { if (!Array.isArray(values)) invalid(`${name} requires finite numbers.`); for (const value of values) if (typeof value !== "number" || !Number.isFinite(value)) invalid(`${name} requires finite numbers.`); }
function increasing(values: readonly number[], name: string) { finite(values, name); if (values.some((value, index) => index > 0 && value <= values[index - 1]!)) invalid(`${name} must be strictly increasing.`); }
function budget(work: number) { if (!Number.isSafeInteger(work) || work > 10_000_000) throw new NodaraError("ND_STATISTICS_LIMIT", "Statistical calculation exceeds 10000000 sample evaluations/cell-level pairs."); }

/** Gaussian KDE. Numeric bandwidth is absolute, Scott uses sample SD (n-1). No window renormalization. */
export function gaussianKDE(samples: readonly number[], options: { bandwidth: number | "scott"; evaluationPoints: readonly number[] }): DensityEstimate {
  finite(samples, "samples"); finite(options.evaluationPoints, "evaluationPoints"); budget(samples.length * options.evaluationPoints.length);
  if (options.bandwidth !== "scott" && (typeof options.bandwidth !== "number" || !Number.isFinite(options.bandwidth) || options.bandwidth <= 0)) invalid("bandwidth must be positive or scott.");
  if (!samples.length) return { bandwidth: options.bandwidth === "scott" ? null : options.bandwidth, sampleCount: 0, points: options.evaluationPoints.map(value => ({ value, density: 0 })) };
  let bandwidth: number;
  if (options.bandwidth === "scott") {
    if (samples.length < 2) invalid("Scott bandwidth needs at least two samples; supply an explicit bandwidth.");
    let mean = 0; let squared = 0; let count = 0;
    for (const sample of samples) { count++; const delta = sample - mean; mean += delta / count; squared += delta * (sample - mean); }
    bandwidth = Math.sqrt(squared / (samples.length - 1)) * samples.length ** -0.2;
    if (!Number.isFinite(bandwidth) || bandwidth <= 0) invalid("Scott bandwidth requires finite, nonzero variance; supply an explicit bandwidth.");
  } else bandwidth = options.bandwidth;
  const points = options.evaluationPoints.map(value => {
    let total = 0;
    for (const sample of samples) { const difference = value - sample; const z = Number.isFinite(difference) ? difference / bandwidth : value / bandwidth - sample / bandwidth; total += Math.exp(-0.5 * z * z); }
    const density = (total / samples.length) / bandwidth / Math.sqrt(2 * Math.PI);
    if (!Number.isFinite(density)) invalid("Density exceeds floating-point range; rescale the data/bandwidth.");
    return { value, density };
  });
  return { bandwidth, sampleCount: samples.length, points };
}

/** [start,end) bins, final right edge inclusive. Density integrates to one over included samples. */
export function histogram(samples: readonly number[], options: { edges: readonly number[] }): Histogram {
  finite(samples, "samples"); increasing(options.edges, "edges");
  if (options.edges.length < 2) invalid("Histogram requires at least two edges.");
  const bins = options.edges.slice(0, -1).map((start, index) => ({ start, end: options.edges[index + 1]!, count: 0, density: 0 }));
  if (bins.some(bin => !Number.isFinite(bin.end - bin.start))) invalid("Bin width exceeds floating-point range.");
  let underflowCount = 0; let overflowCount = 0; let includedCount = 0;
  for (const sample of samples) {
    if (sample < options.edges[0]!) { underflowCount++; continue; }
    if (sample > options.edges.at(-1)!) { overflowCount++; continue; }
    let low = 0; let high = bins.length;
    while (low < high) { const middle = Math.floor((low + high) / 2); if (sample < options.edges[middle + 1]!) high = middle; else low = middle + 1; }
    bins[Math.min(low, bins.length - 1)]!.count++; includedCount++;
  }
  for (const bin of bins) { bin.density = includedCount ? bin.count / includedCount / (bin.end - bin.start) : 0; if (!Number.isFinite(bin.density)) invalid("Histogram density exceeds floating-point range."); }
  return { bins, includedCount, underflowCount, overflowCount };
}

export function histogramSeries(result: Histogram, options: { id: string; label: string; measure?: "count" | "density" }): ChartSeries {
  return { id: options.id, label: options.label, data: result.bins.map(bin => ({ x: bin.start + (bin.end - bin.start) / 2, y: options.measure === "density" ? bin.density : bin.count, meta: { binStart: bin.start, binEnd: bin.end, count: bin.count, density: bin.density } })) };
}

export function validateScalarGrid(grid: ScalarGrid): void {
  if (!grid || typeof grid !== "object") invalid("Scalar grid requires an object.");
  increasing(grid.x, "grid.x"); increasing(grid.y, "grid.y"); finite(grid.values, "grid.values");
  if (grid.values.length !== grid.x.length * grid.y.length || (!grid.x.length !== !grid.y.length)) invalid("Grid dimensions do not match row-major values.");
}

/** Explicit bridge: each row has gridY; x is a coordinate and point.y is the scalar value. */
export function scalarGridSeries(grid: ScalarGrid): ChartSeries[] {
  validateScalarGrid(grid);
  return grid.y.map((gridY, row) => ({ id: `row:${gridY}`, label: `y = ${gridY}`, gridY, data: grid.x.map((x, column) => ({ x, y: grid.values[row * grid.x.length + column]! })) }));
}

export function seriesScalarGrid(series: ChartSeries[]): ScalarGrid {
  if (!series.length) return { x: [], y: [], values: [] };
  const x = series[0]!.data.map(point => typeof point.x === "number" ? point.x : NaN);
  const y = series.map(row => row.gridY ?? NaN);
  if (series.some(row => row.data.length !== x.length || row.data.some((point, index) => point.x !== x[index]))) invalid("Contour rows must share identical numeric x coordinates; use scalarGridSeries(grid).");
  const grid = { x, y, values: series.flatMap(row => row.data.map(point => point.y)) }; validateScalarGrid(grid); return grid;
}

/** Shared by pre-commit validation and rendering, including derived tails and work limits. */
export function prepareViolinDensity(samples: readonly number[], bandwidth: number | "scott" = "scott"): DensityEstimate | null {
  finite(samples, "samples"); budget(samples.length * 128);
  if (!samples.length || bandwidth === "scott" && samples.every(value => value === samples[0])) return null;
  const seed = gaussianKDE(samples, { bandwidth, evaluationPoints: [] });
  const minimum = samples.reduce((value, sample) => Math.min(value, sample), Infinity) - seed.bandwidth! * 3;
  const maximum = samples.reduce((value, sample) => Math.max(value, sample), -Infinity) + seed.bandwidth! * 3;
  if (![minimum, maximum, maximum - minimum].every(Number.isFinite)) invalid("Violin evaluation range exceeds numeric limits; rescale samples/bandwidth.");
  return gaussianKDE(samples, { bandwidth: seed.bandwidth!, evaluationPoints: Array.from({ length: 128 }, (_, index) => (1 - index / 127) * minimum + index / 127 * maximum) });
}

export function prepareContours(grid: ScalarGrid, requested?: readonly number[]): { levels: readonly number[]; segments: ContourSegment[] } {
  validateScalarGrid(grid);
  for (const axis of [grid.x, grid.y]) if (axis.length && !Number.isFinite(axis.at(-1)! - axis[0]!)) invalid("Contour coordinate range exceeds numeric limits.");
  const minimum = grid.values.reduce((value, current) => Math.min(value, current), Infinity);
  const maximum = grid.values.reduce((value, current) => Math.max(value, current), -Infinity);
  // Weighted interpolation avoids overflowing max-min for valid extreme scalar values.
  const levels = requested ?? (maximum > minimum ? Array.from({ length: 5 }, (_, index) => { const t = (index + 1) / 6; return (1 - t) * minimum + t * maximum; }) : []);
  return { levels, segments: marchingSquares(grid, levels) };
}

/** Isolines of a rectangular scalar grid, not scattered-data interpolation or filled polygons. */
export function marchingSquares(grid: ScalarGrid, levels: readonly number[]): ContourSegment[] {
  validateScalarGrid(grid); finite(levels, "levels"); budget(Math.max(0, grid.x.length - 1) * Math.max(0, grid.y.length - 1) * levels.length);
  const result: ContourSegment[] = []; const seen = new Set<string>();
  const add = (level: number, a: ContourSegment["a"], b: ContourSegment["b"]) => {
    if (a.x === b.x && a.y === b.y) return;
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) invalid("Contour geometry exceeds floating-point range.");
    const endpoints = [JSON.stringify(a), JSON.stringify(b)].sort(); const key = `${level}:${endpoints.join(":")}`;
    if (!seen.has(key)) { seen.add(key); result.push({ level, a, b }); }
  };
  for (const level of [...new Set(levels)]) for (let row = 0; row + 1 < grid.y.length; row++) for (let column = 0; column + 1 < grid.x.length; column++) {
    const w = grid.x.length;
    // a=bottom-left, b=bottom-right, c=top-right, d=top-left; model y grows upward.
    const values = [grid.values[row * w + column]!, grid.values[row * w + column + 1]!, grid.values[(row + 1) * w + column + 1]!, grid.values[(row + 1) * w + column]!];
    const corners = [{ x: grid.x[column]!, y: grid.y[row]! }, { x: grid.x[column + 1]!, y: grid.y[row]! }, { x: grid.x[column + 1]!, y: grid.y[row + 1]! }, { x: grid.x[column]!, y: grid.y[row + 1]! }];
    const scale = Math.max(Math.abs(level), ...values.map(Math.abs)) || 1;
    const signed = values.map(value => value / scale - level / scale);
    const mask = signed.reduce((mask, value, index) => mask | (value >= 0 ? 1 << index : 0), 0);
    if (mask === 0 || mask === 15) continue;
    const crossings = new Map<number, ContourSegment["a"]>();
    for (let edge = 0; edge < 4; edge++) {
      const next = (edge + 1) % 4;
      if ((signed[edge]! >= 0) === (signed[next]! >= 0)) continue;
      const t = signed[edge]! / (signed[edge]! - signed[next]!);
      const a = corners[edge]!; const b = corners[next]!;
      crossings.set(edge, { x: (1 - t) * a.x + t * b.x, y: (1 - t) * a.y + t * b.y });
    }
    if (crossings.size === 2) { const points = [...crossings.values()]; add(level, points[0]!, points[1]!); }
    else if (crossings.size === 4) {
      const [a, b, c, d] = signed as [number, number, number, number]; const determinant = a * c - b * d;
      if (determinant === 0) {
        const denominator = a - b + c - d; const sx = (a - d) / denominator; const sy = (a - b) / denominator;
        const saddle = { x: (1 - sx) * corners[0]!.x + sx * corners[1]!.x, y: (1 - sy) * corners[0]!.y + sy * corners[3]!.y };
        for (const point of crossings.values()) add(level, point, saddle);
      } else for (const [from, to] of determinant > 0 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]]) add(level, crossings.get(from!)!, crossings.get(to!)!);
    }
  }
  return result;
}
