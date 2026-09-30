import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { cpus, platform, release, totalmem } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { evaluateWorkingPlan } from "../packages/core/dist/working-time.js";

const samples = 9, warmups = 2;
const summarize = values => { const sorted = [...values].sort((a, b) => a - b); return { samples: values, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1], max: sorted.at(-1) }; };
const digest = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const report = {
  measuredAt: new Date().toISOString(), source: { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()), coreSha256: digest("packages/core/dist/index.js"), workingSha256: digest("packages/core/dist/working-time.js"), lockSha256: digest("package-lock.json") },
  environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem() },
  method: { samples, warmups, data: "Deterministic; all records change each full update; generation excluded. One retained controller per scenario.", mount: "One cold synchronous mount per scenario (not a statistical estimate).", updates: "CPU normalization/render and two-requestAnimationFrame response measured separately. RAF is not a GPU fence or FPS.", interaction: "Trusted Playwright Enter on the first semantic data item; keydown-to-selection and two-RAF latency. Not a physical device/screen reader measurement.", memory: "Chromium CDP used heap after explicit GC, before mount and after destroy; DOM cleanup asserted. Heap delta is not proof of a leak or GPU memory consumption.", limits: "Synthetic sample sizes are tested workloads, not guaranteed maximum capacities. No competitor comparison. p95 with n=9 equals the maximum. Run without other test workloads." },
  cpu: [], browser: [], errors: [],
};
const start = Date.UTC(2026, 9, 19, 9), H = 3600000;
for (const size of [50, 200, 500]) for (const leveling of ["none", "serial"]) {
  const plan = { schemaVersion: 2, timeBasis: "working", projectStartMs: start, horizon: { startDate: "2026-10-01", endDate: "2027-02-01" }, calendar: { id: "project", timeZone: "UTC", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "08:00", end: "20:00" }] })) },
    resources: Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, label: `Team ${i}`, capacityUnits: 100, calendar: { id: `shift${i % 2}`, timeZone: i % 2 ? "Europe/Lisbon" : "America/New_York", week: [1, 2, 3, 4, 5].map(day => ({ day, periods: [{ start: "09:00", end: "17:00" }] })), exceptions: { "2026-10-26": [] } } })),
    tasks: Array.from({ length: size }, (_, i) => ({ id: `t${i}`, label: `Task ${i}`, startMs: start, workingMs: H, progress: 0 })), assignments: Array.from({ length: size }, (_, i) => ({ taskId: `t${i}`, resourceId: `r${i % 10}`, units: 100 })), dependencies: [], locations: [], resourceLeveling: leveling };
  const times = []; let evaluation;
  for (let run = -warmups; run < samples; run++) { const before = performance.now(); evaluation = evaluateWorkingPlan(plan); if (run >= 0) times.push(performance.now() - before); }
  if (leveling === "serial" && evaluation.conflicts.length) throw new Error("Leveled benchmark retains conflicts");
  report.cpu.push({ scenario: "joint-resource-working-plan", size, resources: 10, leveling, evaluationMs: summarize(times), workSegments: evaluation.windows.reduce((sum, window) => sum + window.segments.length, 0), conflicts: evaluation.conflicts.length });
  console.log(`[beta benchmark] working plan ${size} / ${leveling}: ${Math.round(report.cpu.at(-1).evaluationMs.median)}ms median`);
}
const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
try {
  report.environment.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: "UTC", reducedMotion: "reduce" });
  page.on("pageerror", error => report.errors.push(error.message));
  await page.setContent('<!doctype html><html lang="en"><body><div id="host" style="width:1000px;height:500px"></div></body></html>');
  await page.addStyleTag({ path: resolve("packages/core/src/styles.css") });
  await page.addScriptTag({ type: "module", content: `${readFileSync("packages/core/dist/index.js", "utf8")}\nwindow.__beta={createChart,createGantt,createTopology,createGeoMap,createDiagram,createCalendar};` });
  await page.waitForFunction(() => Boolean(window.__beta));
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => { await cdp.send("HeapProfiler.collectGarbage"); return (await cdp.send("Runtime.getHeapUsage")).usedSize; };
  const scenarios = [
    ...[1000, 10000, 100000].map(size => ({ engine: "createChart", size, type: "scatter", renderer: size >= 100000 ? "webgl" : "canvas" })),
    ...[100, 1000, 10000].map(size => ({ engine: "createGantt", size, renderer: "auto" })),
    ...[100, 500, 1000].map(size => ({ engine: "createTopology", size, renderer: "canvas", layout: "grid" })),
    ...[1000, 10000, 50000].map(size => ({ engine: "createGeoMap", size, renderer: "canvas" })),
    ...[100, 1000, 5000].map(size => ({ engine: "createDiagram", size, type: "treemap", renderer: "canvas" })),
    ...[100, 500, 2000].map(size => ({ engine: "createCalendar", size, renderer: "dom", view: "agenda" })),
  ];
  for (const scenario of scenarios) {
    console.log(`[beta benchmark] ${scenario.engine}: ${scenario.size}`);
    const heapBefore = await heap();
    const mounted = await page.evaluate(({ scenario, start }) => {
      const host = document.getElementById("host"), indexes = Array.from({ length: scenario.size }, (_, i) => i);
      const generate = tick => scenario.engine === "createChart" ? [{ id: "signal", label: "Signal", data: indexes.map(i => ({ x: i, y: 50 + 40 * Math.sin(i * .03 + tick * .1) })) }]
        : scenario.engine === "createGantt" ? indexes.map(i => ({ id: `t${i}`, label: `Task ${i}`, start: start + (i % 20) * 86400000 + tick * 1000, end: start + (i % 20 + 3) * 86400000 + tick * 1000 }))
        : scenario.engine === "createTopology" ? { nodes: indexes.map(i => ({ id: `n${i}`, label: `Node ${i} v${tick}` })), edges: indexes.slice(1).map(i => ({ from: `n${i - 1}`, to: `n${i}` })) }
        : scenario.engine === "createGeoMap" ? { points: indexes.map(i => ({ id: `p${i}`, label: `Point ${i}`, longitude: (i * 137.5 + tick * .01) % 360 - 180, latitude: i * 43.7 % 150 - 75 })) }
        : scenario.engine === "createDiagram" ? { nodes: indexes.map(i => ({ id: `n${i}`, label: `Node ${i}`, value: 1 + (i + tick) % 10 })), links: [] }
        : indexes.map(i => ({ id: `e${i}`, title: `Event ${i}`, start: start + (i % 28) * 86400000 + tick * 1000, end: start + (i % 28) * 86400000 + 3600000 + tick * 1000 }));
      const selected = () => { window.__selection = performance.now(); };
      const dataKey = scenario.engine === "createChart" ? "series" : scenario.engine === "createCalendar" ? "events" : "data";
      const data = generate(0), options = { ...scenario, [dataKey]: data, date: start, expandRecurrence: false, theme: "dark", performance: { maxDevicePixelRatio: 1, accessibilityLimit: 300 }, onPointSelect: selected, onNodeSelect: selected, onTaskSelect: selected, onEventSelect: selected };
      const before = performance.now(), controller = window.__beta[scenario.engine](host, options), mountMs = performance.now() - before;
      window.__benchmark = { controller, generate };
      return { mountMs, actualRenderer: host.dataset.ndRenderer ?? host.firstElementChild?.getAttribute("data-nd-renderer") ?? (scenario.engine === "createCalendar" ? "dom" : "unknown"), domAfterMount: host.querySelectorAll("*").length };
    }, { scenario, start });
    const cpuMs = [], responseMs = [], selectionMs = [], inputFrameMs = [], domCounts = [];
    for (let run = -warmups; run < samples; run++) {
      const update = await page.evaluate(async tick => {
        const { controller, generate } = window.__benchmark, next = generate(tick), before = performance.now(); controller.update(next); const cpu = performance.now() - before;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const response = performance.now() - before, host = document.getElementById("host"), item = host.querySelector("[data-nd-focus]");
        if (!item) throw new Error("Missing semantic data interaction target"); item.focus();
        window.__selection = null; window.__input = null; window.__inputFrame = null;
        // Capture runs before the component's own keydown handler, which may
        // synchronously emit selection (not every renderer waits for click).
        item.addEventListener("keydown", () => { window.__input = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__inputFrame = performance.now(); })); }, { once: true, capture: true });
        return { cpu, response, dom: host.querySelectorAll("*").length };
      }, run + warmups + 1);
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => window.__selection !== null && window.__inputFrame !== null, undefined, { timeout: 5000 });
      const input = await page.evaluate(() => ({ selection: window.__selection - window.__input, frame: window.__inputFrame - window.__input }));
      if (!Number.isFinite(input.selection) || input.selection < 0 || !Number.isFinite(input.frame) || input.frame < input.selection) throw new Error("Invalid keyboard timing order");
      if (run >= 0) { cpuMs.push(update.cpu); responseMs.push(update.response); selectionMs.push(input.selection); inputFrameMs.push(input.frame); domCounts.push(update.dom); }
    }
    await page.evaluate(() => { window.__benchmark.controller.destroy(); window.__benchmark = null; if (document.getElementById("host").childElementCount) throw new Error("Destroy retained DOM"); });
    const heapAfterDestroy = await heap();
    report.browser.push({ ...scenario, ...mounted, fullUpdateCPUms: summarize(cpuMs), fullUpdateTwoRAFms: summarize(responseMs), keyboardSelectionMs: summarize(selectionMs), keyboardTwoRAFms: summarize(inputFrameMs), domMin: Math.min(...domCounts), domMax: Math.max(...domCounts), heapBefore, heapAfterDestroy, heapDeltaBytes: heapAfterDestroy - heapBefore });
  }
} finally {
  await browser.close(); mkdirSync("outputs/technical-confidence", { recursive: true });
  writeFileSync("outputs/technical-confidence/beta-benchmark.json", JSON.stringify(report, null, 2));
}
if (report.errors.length) throw new Error(report.errors.join("\n"));
console.log(`Recorded ${report.cpu.length} planning and ${report.browser.length} browser workloads in outputs/technical-confidence/beta-benchmark.json`);
