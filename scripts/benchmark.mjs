import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cpus, platform, release, totalmem } from "node:os";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { normalizeOperationalPlan, operationalCriticalPath, operationalCapacity, gaussianKDE, marchingSquares } from "../packages/core/dist/index.js";

const output = resolve("outputs/technical-confidence"); mkdirSync(output, { recursive: true });
const samples = 9, warmup = 2;
const summarize = values => { const sorted = [...values].sort((a, b) => a - b); return { samplesMs: values, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], maxMs: sorted.at(-1) }; };
const cpuResults = [];
function measure(name, size, run) { const values = []; for (let index = -warmup; index < samples; index++) { const start = performance.now(); run(); if (index >= 0) values.push(performance.now() - start); } cpuResults.push({ name, size, ...summarize(values) }); }
const startMs = Date.UTC(2026, 0, 1);
const plan = { schemaVersion: 1, timeBasis: "elapsed", projectStartMs: startMs, tasks: Array.from({ length: 10_000 }, (_, index) => ({ id: `t${index}`, label: `Task ${index}`, startMs: startMs + index * 1000, durationMs: 1000, progress: 0 })), resources: [{ id: "r", label: "Resource", capacityUnits: 1 }], assignments: Array.from({ length: 10_000 }, (_, index) => ({ taskId: `t${index}`, resourceId: "r", units: 1 })), dependencies: Array.from({ length: 9999 }, (_, index) => ({ id: `d${index}`, fromTaskId: `t${index}`, toTaskId: `t${index + 1}`, kind: "FS", lagMs: 0 })), locations: [] };
measure("normalize-operational-chain", 10_000, () => normalizeOperationalPlan(plan));
measure("critical-path-elapsed-chain", 10_000, () => operationalCriticalPath(plan));
measure("capacity-half-open-sequential", 10_000, () => operationalCapacity(plan));
const densitySamples = Array.from({ length: 10_000 }, (_, index) => Math.sin(index * 0.13) * 3 + Math.cos(index * 0.71));
measure("gaussian-kde-128-evaluations", 10_000, () => gaussianKDE(densitySamples, { bandwidth: "scott", evaluationPoints: Array.from({ length: 128 }, (_, index) => -6 + index * 12 / 127) }));
const coordinates = Array.from({ length: 100 }, (_, index) => index);
const grid = { x: coordinates, y: coordinates, values: coordinates.flatMap(y => coordinates.map(x => Math.sin(x / 10) + Math.cos(y / 10))) };
measure("marching-squares-5-levels", 10_000, () => marchingSquares(grid, [-1.5, -0.75, 0, 0.75, 1.5]));

const browser = await chromium.launch({ headless: true });
const browserResults = []; const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: "UTC" });
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent('<!doctype html><html lang="en"><head><title>Nodara benchmark</title></head><body><div id="host" style="width:1000px;height:500px"></div></body></html>');
  await page.addStyleTag({ path: resolve("packages/core/src/styles.css") });
  const bundle = readFileSync("packages/core/dist/index.js", "utf8");
  await page.addScriptTag({ type: "module", content: `${bundle}\nwindow.__bench = { createGantt, createChart, createCalendar, createTopology, createGeoMap, createDiagram };` });
  await page.waitForFunction(() => Boolean(window.__bench));
  for (const scenario of [
    { engine: "createChart", type: "line", size: 1000, renderer: "canvas" },
    { engine: "createChart", type: "line", size: 10_000, renderer: "canvas" },
    { engine: "createChart", type: "scatter", size: 100_000, renderer: "webgl" },
    { engine: "createGantt", size: 10_000, renderer: "auto" },
    { engine: "createTopology", size: 1000, layout: "grid", renderer: "canvas" },
    { engine: "createTopology", size: 100, layout: "force", renderer: "canvas" },
    { engine: "createGeoMap", size: 10_000, renderer: "canvas" },
    { engine: "createDiagram", type: "treemap", size: 1000, renderer: "canvas" },
    { engine: "createCalendar", size: 500, renderer: "dom" },
  ]) {
    console.log(`[benchmark] ${scenario.engine} ${scenario.type ?? scenario.layout ?? ""}: ${scenario.size}`);
    const runs = await page.evaluate(async ({ scenario, samples, warmup }) => {
      const host = document.getElementById("host"); const create = window.__bench[scenario.engine]; const start = Date.UTC(2026, 0, 1); const items = Array.from({ length: scenario.size }, (_, index) => index);
      const data = scenario.engine === "createChart" ? [{ id: "s", label: "Deterministic signal", data: items.map(index => ({ x: index, y: 50 + 40 * Math.sin(index * 0.03) })) }]
        : scenario.engine === "createGantt" ? items.map(index => ({ id: `t${index}`, label: `Task ${index}`, start: start + index % 20 * 86400000, end: start + (index % 20 + 3) * 86400000 }))
        : scenario.engine === "createTopology" ? { nodes: items.map(index => ({ id: `n${index}`, label: `Node ${index}` })), edges: items.slice(1).map(index => ({ from: `n${index - 1}`, to: `n${index}` })) }
        : scenario.engine === "createGeoMap" ? { points: items.map(index => ({ id: `p${index}`, label: `Point ${index}`, longitude: index * 137.5 % 360 - 180, latitude: index * 43.7 % 150 - 75 })) }
        : scenario.engine === "createDiagram" ? { nodes: items.map(index => ({ id: `n${index}`, label: `Node ${index}`, value: 1 + index % 10 })), links: [] }
        : items.map(index => ({ id: `e${index}`, title: `Event ${index}`, start: start + index % 28 * 86400000 + index % 12 * 3600000, end: start + index % 28 * 86400000 + (index % 12 + 1) * 3600000 }));
      const dataKey = scenario.engine === "createChart" ? "series" : scenario.engine === "createCalendar" ? "events" : "data";
      const options = { [dataKey]: data, renderer: scenario.renderer, theme: "dark", ...(scenario.type ? { type: scenario.type } : {}), ...(scenario.layout ? { layout: scenario.layout, layoutIterations: 30 } : {}), ...(scenario.engine === "createCalendar" ? { date: start, view: "month" } : {}) };
      const result = [];
      for (let index = -warmup; index < samples; index++) {
        await new Promise(requestAnimationFrame);
        let began = performance.now(); const controller = create(host, options); const mountMs = performance.now() - began;
        const actualRenderer = host.dataset.ndRenderer; const domNodes = host.querySelectorAll("*").length; const accessibleItems = host.dataset.ndAccessibleItems ?? null;
        began = performance.now(); controller.update(data); const updateMs = performance.now() - began;
        began = performance.now(); controller.destroy(); const destroyMs = performance.now() - began;
        if (host.childElementCount !== 0) throw new Error("Destroy leaked DOM");
        if (index >= 0) result.push({ mountMs, updateMs, destroyMs, actualRenderer, domNodes, accessibleItems });
      }
      return result;
    }, { scenario, samples, warmup });
    browserResults.push({ ...scenario, actualRenderer: runs[0].actualRenderer, domNodes: runs[0].domNodes, accessibleItems: runs[0].accessibleItems, mount: summarize(runs.map(run => run.mountMs)), fullDataUpdate: summarize(runs.map(run => run.updateMs)), destroy: summarize(runs.map(run => run.destroyMs)) });
  }
  const version = browser.version(); const hardware = await page.evaluate(() => ({ hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio, userAgent: navigator.userAgent }));
  const artifact = readFileSync("packages/core/dist/index.js");
  const report = { measuredAt: new Date().toISOString(), method: "2 warmups; 9 sequential samples; p95 nearest rank (for n=9 this is the maximum). Synchronous mount/update/destroy only: NOT end-to-end paint, FPS, interaction latency or a competitor comparison. Synthetic deterministic data; accessible item cap defaults to 300. Run without concurrent tests for a baseline.", environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), browser: version, headless: true, ...hardware }, artifact: { path: "packages/core/dist/index.js", sha256: createHash("sha256").update(artifact).digest("hex"), rawBytes: artifact.length, gzipBytes: gzipSync(artifact).length, brotliBytes: brotliCompressSync(artifact).length }, cpuResults, browserResults, errors };
  writeFileSync(resolve(output, "benchmark.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ cpu: cpuResults.map(({ name, medianMs, p95Ms }) => ({ name, medianMs, p95Ms })), browser: browserResults.map(({ engine, size, actualRenderer, mount, fullDataUpdate }) => ({ engine, size, actualRenderer, mountP95Ms: mount.p95Ms, updateP95Ms: fullDataUpdate.p95Ms })), errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
