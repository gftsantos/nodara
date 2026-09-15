import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import type { AuditWindow } from "./browser-fixture";
import { demoPlan } from "../../app/operations/demo-plan";

async function expectUtcStart(page: import("@playwright/test").Page, value: string) {
  // Windows WebKit falls back to text and preserves .000; Chromium normalizes
  // zero seconds away. Compare exact UTC milliseconds, not native serialization.
  await expect.poll(() => page.getByLabel("Início · UTC", { exact: true }).evaluate((input: HTMLInputElement) => Date.parse(`${input.value}Z`))).toBe(Date.parse(`${value}Z`));
}

async function importPlan(page: import("@playwright/test").Page, value: unknown) {
  const editor = page.getByLabel("Plano completo", { exact: true });
  const panel = page.locator("details").filter({ has: editor });
  if (!await editor.isVisible()) await panel.locator("summary").click();
  await editor.fill(JSON.stringify(value));
  await page.getByRole("button", { name: "Validar e importar", exact: true }).click();
}

test("saving an untouched task does not create a phantom history entry", async ({ page }) => {
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desfazer", exact: true })).toBeDisabled();
});

test("editing only a label preserves seconds, milliseconds and a sub-hour duration", async ({ page }) => {
  const start = Date.parse("2026-09-14T09:00:42.123Z");
  await importPlan(page, { schemaVersion: 1, timeBasis: "elapsed", projectStartMs: start, tasks: [{ id: "precise", label: "Precisão", startMs: start, durationMs: 1001, progress: 0 }], resources: [], assignments: [], dependencies: [], locations: [] });
  await expect(page.getByLabel("Nome da tarefa", { exact: true })).toHaveValue("Precisão");
  await page.getByLabel("Nome da tarefa", { exact: true }).fill("Só mudou o nome");
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await page.getByRole("button", { name: "Carregar estado atual", exact: true }).click();
  const value = JSON.parse(await page.getByLabel("Plano completo", { exact: true }).inputValue());
  expect(value.tasks[0]).toMatchObject({ label: "Só mudou o nome", startMs: start, durationMs: 1001 });
});

test("unsupported extreme dates are rejected before any projection crashes", async ({ page }) => {
  const start = 8.64e15 - 1000;
  await importPlan(page, { schemaVersion: 1, timeBasis: "elapsed", projectStartMs: start, tasks: [{ id: "edge", label: "Edge", startMs: start, durationMs: 1000, progress: 0 }], resources: [], assignments: [], dependencies: [], locations: [] });
  await expect(page.getByRole("alert")).toContainText("1900 e 2199");
  await expect(page.getByTestId("task-count")).toHaveText("6 / 1 concluídas");
  await expect(page.locator(".nd-gantt__bar")).toHaveCount(6);
});

test("rejecting a keyboard change preserves focus on the same task", async ({ page }) => {
  await page.getByLabel("Reagendar sucessoras automaticamente").uncheck();
  const bar = page.locator('.nd-gantt__bar[data-task-id="core"]');
  await bar.focus(); await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("alert")).toContainText("Nenhuma alteração");
  await expect(bar).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("task-core")).toHaveAttribute("aria-pressed", "true");
});

test("workspace tabs implement roving keyboard focus", async ({ page }) => {
  await page.getByRole("tab", { name: "Gantt", exact: true }).focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Calendário", exact: true })).toBeFocused();
  await expect(page.locator("#operation-view .nd-calendar")).toBeVisible();
  await page.keyboard.press("End"); await expect(page.getByRole("tab", { name: "Locais", exact: true })).toBeFocused();
  await page.keyboard.press("Home"); await expect(page.getByRole("tab", { name: "Gantt", exact: true })).toBeFocused();
});

test("the load chart selects a task in the selected time bucket", async ({ page }) => {
  const control = page.locator('.nd-chart tr').filter({ has: page.getByRole("rowheader", { name: "Platform" }) }).locator("button").filter({ hasText: String(Date.parse("2026-09-21")) });
  await control.focus(); await page.keyboard.press("Enter");
  await expect(page.getByTestId("task-staging")).toHaveAttribute("aria-pressed", "true");
});

test("importing a distant location fits the map around the actual data", async ({ page }) => {
  const plan = { ...structuredClone(demoPlan), locations: [{ id: "tokyo", label: "Tokyo", longitude: 139.69, latitude: 35.68 }], tasks: demoPlan.tasks.map(task => ({ ...task, locationId: "tokyo" })) };
  await importPlan(page, plan); await page.getByRole("tab", { name: "Locais", exact: true }).click();
  const surface = page.locator(".nd-geo-map canvas"); await expect(surface).toBeVisible();
  const canvas = (await surface.boundingBox())!;
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await expect(page.getByTestId("task-architecture")).toHaveAttribute("aria-pressed", "true");
});

test("the exported filename matches the integration snippet", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON", exact: true }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toBe("nodara-plan.json");
  await expect(page.getByLabel("Código de integração operacional")).toContainText("fetch('./nodara-plan.json')");
});

test.beforeEach(async ({ page }) => {
  await page.goto("/operations");
  await expect(page.locator('[data-operations-ready="true"]')).toBeVisible({ timeout: 20_000 });
});

test("integrated workspace mounts real components and has no page errors", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await expect(page.getByTestId("task-count")).toHaveText("6 / 1 concluídas");
  await expect(page.getByTestId("conflict-count")).toHaveText("0 / 3 recursos");
  const selectors = { Gantt: ".nd-gantt", "Calendário": ".nd-calendar", "Dependências": ".nd-topology", Locais: ".nd-geo-map" };
  for (const [name, selector] of Object.entries(selectors)) { await page.getByRole("tab", { name, exact: true }).click(); await expect(page.locator(`#operation-view ${selector}`)).toBeVisible(); }
  await expect(page.locator('.nd-chart')).toBeVisible();
  expect(errors).toEqual([]);
  await page.getByRole("tab", { name: "Gantt", exact: true }).click();
  await testInfo.attach("workspace.png", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("editing a task cascades once, then undo/redo restores all projections", async ({ page }) => {
  await page.getByLabel("Início · UTC", { exact: true }).fill("2026-09-17T00:00");
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("3 tarefa(s) reagendada(s)");
  await expect(page.getByTestId("plan-end")).toContainText("23");
  await page.getByTestId("task-validation").click();
  await expectUtcStart(page, "2026-09-20T00:00");
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expectUtcStart(page, "2026-09-19T00:00");
  await expect(page.getByTestId("plan-end")).toContainText("22");
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await expectUtcStart(page, "2026-09-20T00:00");
  await page.getByRole("tab", { name: "Calendário", exact: true }).click();
  await expect(page.locator(".nd-calendar")).toBeVisible();
});

test("conflict scenario is explicit, inspectable and undoable", async ({ page }) => {
  await page.getByRole("button", { name: "Criar cenário de conflito" }).click();
  await expect(page.getByTestId("conflict-count")).toHaveText("1 / 3 recursos");
  await expect(page.getByText("CAPACITY", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver tarefa", exact: true }).click();
  await expect(page.getByLabel("Nome da tarefa", { exact: true })).toHaveValue("Experiência do developer");
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(page.getByTestId("conflict-count")).toHaveText("0 / 3 recursos");
});

test("a rejected manual edit preserves the source of truth and the visible Gantt", async ({ page }) => {
  await page.getByLabel("Reagendar sucessoras automaticamente").uncheck();
  await page.getByLabel("Início · UTC", { exact: true }).fill("2026-09-14T00:00");
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Nenhuma alteração foi guardada");
  await expect(page.getByRole("button", { name: "Desfazer", exact: true })).toBeDisabled();
  await expectUtcStart(page, "2026-09-16T00:00");
  await page.getByTestId("task-portal").click(); await page.getByTestId("task-core").click();
  await expectUtcStart(page, "2026-09-16T00:00");
  await expect(page.locator(".nd-gantt__bar")).toHaveCount(6);
});

test("locked task can be explicitly unlocked without submitting disabled dates as null", async ({ page }) => {
  await page.getByLabel("Bloquear datas", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await expect(page.getByLabel("Início · UTC", { exact: true })).toBeDisabled();
  await page.getByLabel("Bloquear datas", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Guardar tarefa", exact: true }).click();
  await expect(page.getByLabel("Início · UTC", { exact: true })).toBeEnabled();
  await expectUtcStart(page, "2026-09-16T00:00");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("selection is shared from topology to the task inspector and Gantt", async ({ page }) => {
  await page.getByRole("tab", { name: "Dependências", exact: true }).click();
  const control = page.locator('.nd-topology button[data-nd-focus="portal"]'); await control.focus(); await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nome da tarefa", { exact: true })).toHaveValue("Experiência do developer");
  await page.getByRole("tab", { name: "Gantt", exact: true }).click();
  await expect(page.getByTestId("task-portal")).toHaveAttribute("aria-pressed", "true");
});

test("invalid JSON is rejected and current plan can be loaded into the editor", async ({ page }) => {
  await page.getByText("Editar / importar plano JSON", { exact: false }).click();
  await page.getByLabel("Plano completo", { exact: true }).fill("{oops");
  await page.getByRole("button", { name: "Validar e importar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JSON inválido");
  await expect(page.getByTestId("task-count")).toHaveText("6 / 1 concluídas");
  await page.getByRole("button", { name: "Carregar estado atual", exact: true }).click();
  expect(JSON.parse(await page.getByLabel("Plano completo", { exact: true }).inputValue()).schemaVersion).toBe(1);
});

test("copy integration uses the actual store and public component API", async ({ page }) => {
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as unknown as { copiedCode: string }).copiedCode = value; } } }); });
  await page.getByRole("button", { name: "Copiar código", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copiado", exact: true })).toBeVisible();
  const code = await page.evaluate(() => (window as unknown as { copiedCode: string }).copiedCode);
  expect(code).toContain("createOperationalStore"); expect(code).toContain("queueMicrotask"); expect(code).toContain("gantt.destroy()");
});

for (const theme of ["dark", "light"]) test(`operations accessibility, control contrast and visual layout in ${theme}`, async ({ page }, testInfo) => {
  if (theme === "light") await page.getByRole("button", { name: "Ativar modo claro" }).click();
  const lock = page.getByLabel("Bloquear datas", { exact: true });
  const border = await lock.evaluate(input => {
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
    const style = getComputedStyle(input);
    let ancestor = input.parentElement!; let background = getComputedStyle(ancestor).backgroundColor;
    while (background === "rgba(0, 0, 0, 0)" && ancestor.parentElement) { ancestor = ancestor.parentElement; background = getComputedStyle(ancestor).backgroundColor; }
    const a = luminance(style.borderTopColor); const b = luminance(background);
    return { contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), width: parseFloat(style.borderTopWidth) };
  });
  expect(border.width).toBeGreaterThanOrEqual(1); expect(border.contrast).toBeGreaterThanOrEqual(3);
  await lock.focus(); await page.keyboard.press("Space"); await expect(lock).toBeChecked(); await expect(lock).toBeFocused();
  await page.keyboard.press("Space"); await expect(lock).not.toBeChecked();
  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
  const result = await page.evaluate(() => (window as AuditWindow).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }));
  await testInfo.attach(`operations-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([]);
});
