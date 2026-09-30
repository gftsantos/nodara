import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const artifact = readFileSync("packages/core/dist/index.js");
const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
const results = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }); page.on("pageerror", error => errors.push(error.message));
  await page.setContent('<!doctype html><html><body><div id="host" style="width:1000px;height:500px"></div></body></html>');
  await page.addStyleTag({ path: resolve("packages/core/src/styles.css") });
  await page.addScriptTag({ type: "module", content: `${artifact}\nwindow.__updates={createChart,createGantt};` });
  await page.waitForFunction(() => !!window.__updates);
  for (const [engine, size] of [["chart", 100_000], ["gantt", 10_000]]) {
    console.log(`[retained updates] ${engine}: ${size}, 30 successive changed datasets`);
    results.push(await page.evaluate(async ({ engine, size }) => {
      const host = document.getElementById("host"), start = Date.UTC(2026, 0, 1), day = 86_400_000;
      const data = index => engine === "chart" ? [{ id: "s", label: "Changed signal", data: Array.from({ length: size }, (_, i) => ({ x: i, y: 50 + 40 * Math.sin(i * 0.03 + index * 0.1) })) }] : Array.from({ length: size }, (_, i) => ({ id: `t${i}`, label: `Task ${i}`, start: start + (i % 20) * day + index * 1000, end: start + (i % 20 + 3) * day + index * 1000 }));
      const counts = { programs: 0, buffers: 0, deletedPrograms: 0, deletedBuffers: 0 }, restore = [];
      for (const constructor of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) if (constructor) for (const [method, key] of [["createProgram", "programs"], ["createBuffer", "buffers"], ["deleteProgram", "deletedPrograms"], ["deleteBuffer", "deletedBuffers"]]) {
        const proto = constructor.prototype, original = proto[method]; proto[method] = function (...args) { counts[key]++; return original.apply(this, args); }; restore.push(() => { proto[method] = original; });
      }
      let controller;
      try {
        controller = engine === "chart" ? window.__updates.createChart(host, { series: data(0), type: "scatter", renderer: "webgl", performance: { maxDevicePixelRatio: 1 } }) : window.__updates.createGantt(host, { data: data(0), renderer: "webgl", start, end: start + 25 * day, performance: { maxDevicePixelRatio: 1 } });
        const canvas = host.querySelector("canvas"), mode = host.dataset.ndRenderer, samples = [], domCounts = []; let retained = true;
        const heapStart = performance.memory?.usedJSHeapSize ?? null;
        for (let i = -2; i < 30; i++) {
          await new Promise(requestAnimationFrame); const next = data(i + 3), began = performance.now(); controller.update(next); const elapsed = performance.now() - began;
          retained &&= host.querySelector("canvas") === canvas; if (i >= 0) { samples.push(elapsed); domCounts.push(host.querySelectorAll("*").length); }
        }
        const heapEnd = performance.memory?.usedJSHeapSize ?? null; controller.destroy(); controller = undefined;
        const sorted = [...samples].sort((a, b) => a - b), result = { engine, size, actualRenderer: mode, samplesMs: samples, medianMs: (sorted[14] + sorted[15]) / 2, p95Ms: sorted[28], retainedCanvas: retained, counts, domMin: Math.min(...domCounts), domMax: Math.max(...domCounts), remainingDOM: host.childElementCount, heapStart, heapEnd };
        if (mode === "webgl" && (!retained || counts.programs !== 1 || counts.buffers !== 1 || counts.deletedPrograms !== 1 || counts.deletedBuffers !== 1)) throw new Error("Retained GPU resource invariant failed");
        if (host.childElementCount) throw new Error("Destroyed widget retained DOM"); return result;
      } finally { controller?.destroy(); restore.reverse().forEach(fn => fn()); }
    }, { engine, size }));
  }
  mkdirSync("outputs/technical-confidence", { recursive: true });
  const report = { measuredAt: new Date().toISOString(), browser: browser.version(), headless: true, artifactSha256: createHash("sha256").update(artifact).digest("hex"), method: "One mounted component per scenario; 2 warmups and 30 changed full datasets. Dataset generation excluded; normalization/render included. Synchronous CPU timings, not completed GPU paint/FPS/input latency. Resource counts instrument public WebGL methods. JS heap samples are uncollected and not a leak proof; no physical GPU-memory claim.", results, errors };
  writeFileSync("outputs/technical-confidence/retained-updates.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
