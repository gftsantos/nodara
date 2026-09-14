import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { docsPages } from "../../app/docs/content";
import { visualCatalog } from "@nodara/core";
import type { AuditWindow } from "./browser-fixture";

for (const route of ["/", "/catalog", "/docs"]) {
  for (const theme of ["dark", "light"]) {
    test(`${route}: automated accessibility scan in ${theme}`, async ({ page }, testInfo) => {
      await page.goto(route);
      await expect(page.locator('[data-ready="true"], [data-catalog-ready="true"], [data-docs-ready="true"]').first()).toBeVisible({ timeout: 20_000 });
      if (theme === "light") await page.getByRole("button", { name: route === "/catalog" ? "Ativar modo claro" : "Alternar tema" }).click();
      await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
      const result = await page.evaluate(async () => (window as AuditWindow).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
      await testInfo.attach("axe.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
      expect(result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    });
  }
  test(`${route}: root-font scaling does not widen the page (not browser zoom)`, async ({ page }, testInfo) => {
    await page.goto(route);
    await expect(page.locator('[data-ready="true"], [data-catalog-ready="true"], [data-docs-ready="true"]').first()).toBeVisible({ timeout: 20_000 });
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const sizing = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    await testInfo.attach("200-percent-text.png", { body: await page.screenshot(), contentType: "image/png" });
    expect(sizing.scroll).toBeLessThanOrEqual(sizing.client);
  });
}

test("all documentation pages resolve their title and internal deep link", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs"); await expect(page.locator('[data-docs-ready="true"]')).toBeVisible({ timeout: 20_000 });
  for (const doc of docsPages) {
    await page.goto(`/docs#${doc.id}`);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(doc.title);
  }
  expect(errors).toEqual([]);
});

test("modal traps focus, Escape closes it and focus returns to trigger", async ({ page }) => {
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const trigger = page.getByRole("button", { name: "Tipos & schemas", exact: true }); await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Tipos & schemas" }); await expect(dialog).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
});

for (const available of [true, false]) test(`documentation copy reports ${available ? "success only after clipboard write" : "a manual fallback when both copy APIs fail"}`, async ({ page }) => {
  await page.goto("/docs"); await expect(page.locator('[data-docs-ready="true"]')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(available => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { if (!available) throw new Error("Blocked by browser policy"); (window as unknown as { copiedCode: string }).copiedCode = text; } } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
  }, available);
  const button = page.getByRole("button", { name: "Copiar código", exact: true }).first();
  const expectedCode = await page.locator("pre code").first().textContent();
  await button.click();
  if (available) {
    await expect(button).toHaveText("Copiado");
    expect(await page.evaluate(() => (window as unknown as { copiedCode: string }).copiedCode)).toBe(expectedCode);
  } else {
    await expect(page.getByRole("status")).toContainText("A cópia foi bloqueada");
    await expect(button).toHaveText("Copiar");
    // Firefox/Windows serializes a DOM selection using CRLF. Preserve all other
    // whitespace (including indentation) and verify the actual selected nodes.
    const selected = await page.evaluate(() => ({ text: window.getSelection()?.toString(), contents: window.getSelection()?.getRangeAt(0).cloneContents().textContent }));
    expect(selected.text?.replace(/\r\n/g, "\n")).toBe(expectedCode?.replace(/\r\n/g, "\n"));
    expect(selected.contents).toBe(expectedCode);
    await expect(page.locator("pre").first()).toBeFocused();
  }
});

test("modal code supports keyboard scrolling without opening a covered search dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const trigger = page.getByRole("button", { name: "Abrir exemplo", exact: true }); await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Gantt", exact: true });
  const code = dialog.getByRole("region", { name: "Código: Dados de entrada", exact: true });
  for (let index = 0; index < 8 && !await code.evaluate(element => element === document.activeElement); index++) await page.keyboard.press("Tab");
  await expect(code).toBeFocused();
  await page.keyboard.press("PageDown"); await expect.poll(() => code.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Control+k"); await expect(page.getByRole("dialog")).toHaveCount(1); await expect(dialog).toBeVisible();
  await page.keyboard.press("/"); await expect(page.getByRole("dialog", { name: "Pesquisa da documentação" })).toHaveCount(0); await expect(code).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});

test("search dialog keeps keyboard focus and restores its visible opener", async ({ page }) => {
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const trigger = page.locator(".header-search:visible, .sidebar-search:visible").first(); await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Pesquisa da documentação" });
  await expect(dialog.getByLabel("Pesquisar na documentação", { exact: true })).toBeFocused();
  for (let index = 0; index < 16; index++) { await page.keyboard.press("Tab"); expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});

test("search dialog has accessible labels, contrast and a working close button", async ({ page }) => {
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const trigger = page.locator(".header-search:visible, .sidebar-search:visible").first(); await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Pesquisa da documentação" });
  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
  const result = await dialog.evaluate(element => (window as AuditWindow).axe.run(element, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }));
  expect(result.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
  await dialog.getByRole("button", { name: "Fechar pesquisa", exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});

test("open example exports current valid data and complete React code, with honest clipboard fallback", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const families = ["Gantt", "Gráficos", "Grafos & topologias", "Calendários"];
  for (const [index, family] of families.entries()) {
    await page.locator(".component-sidebar").getByRole("button", { name: new RegExp(family) }).click();
    await page.getByRole("tab", { name: "Dados", exact: true }).click();
    const editor = page.getByRole("textbox", { name: `Editar JSON de ${family}`, exact: true });
    const data = JSON.parse(await editor.inputValue()); const marker = `Edited export ${index}`;
    if (index === 2) data.nodes[0].label = marker;
    else data[0][index === 3 ? "title" : "label"] = marker;
    await editor.fill(JSON.stringify(data)); await expect(page.getByRole("status")).toContainText("Render atualizado automaticamente");
    await editor.fill("{invalid"); await expect(page.getByRole("alert")).toContainText("JSON inválido");
    await page.getByRole("button", { name: "Abrir exemplo", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const payload = dialog.getByRole("region", { name: "Código: Dados de entrada", exact: true });
    await expect(payload).toContainText(marker);
    const code = await dialog.getByRole("region", { name: "Código: Integração React", exact: true }).textContent();
    expect(code).toContain(marker); expect(code).toContain('import "@nodara/core/styles.css"'); expect(code).toContain("export default function NodaraExample");
    expect(code).not.toContain("syncTask"); expect(code).not.toContain("syncEvent");
    await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copiedCode: string }).copiedCode = text; } } }); });
    await dialog.getByRole("button", { name: "Copiar integração React", exact: true }).click();
    expect(await page.evaluate(() => (window as unknown as { copiedCode: string }).copiedCode)).toBe(code);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Blocked"); } } });
      Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
    });
    const copy = dialog.getByRole("button", { name: "Copiar dados", exact: true }); await copy.click();
    await expect(copy).toContainText("Cópia manual"); await expect(copy).not.toContainText("Copiado");
    expect(await page.evaluate(() => window.getSelection()?.getRangeAt(0).cloneContents().textContent)).toBe(await payload.textContent());
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("catalog: all 100 recipes paint on the additional browser engines", async ({ page }, testInfo) => {
  test.skip(["audit-chromium", "audit-mobile"].includes(testInfo.project.name), "The baseline suite already sweeps all 100 recipes on these profiles.");
  test.setTimeout(360_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/catalog"); await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Todas as receitas/ }).click();
  const selectors = { gantt: ".nd-gantt", charts: ".nd-chart", topology: ".nd-topology", calendar: ".nd-calendar", maps: ".nd-geo-map", diagrams: ".nd-diagram" };
  const visited: string[] = [];
  for (const item of visualCatalog) {
    await page.locator(`[data-catalog-id="${item.id}"]`).click();
    const root = page.locator(`aside[data-active-id="${item.id}"] ${selectors[item.family]}`);
    await expect(root).toBeVisible();
    if (["charts", "topology", "maps", "diagrams"].includes(item.family)) {
      const colors = await root.locator("canvas").evaluate(element => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        const palette = new Set<string>();
        for (let offset = 0; offset < pixels.length; offset += 64) palette.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${pixels[offset + 3]}`);
        return palette.size;
      });
      expect(colors, item.id).toBeGreaterThan(4);
    } else if (item.family === "gantt") await expect(root.locator(".nd-gantt__bar")).toHaveCount(6);
    else expect(await root.locator("button, .nd-calendar__year > *").count(), item.id).toBeGreaterThan(0);
    visited.push(item.id);
  }
  await testInfo.attach("visited-recipes.json", { body: JSON.stringify(visited), contentType: "application/json" });
  expect(visited).toHaveLength(100); expect(errors).toEqual([]);
});
