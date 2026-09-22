import "../e2e/resource-planning.spec";
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("expanded resource controls pass automated accessibility in both themes at narrow width", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Planeamento laboral · impacto", exact: true }).click();
  const scope = page.getByRole("region", { name: "Planeamento laboral integrado", exact: true });
  await scope.getByText("Calendário do recurso · Equipa de entrega", { exact: true }).click();
  await scope.getByLabel("Calendário próprio · Equipa de entrega", { exact: true }).check();
  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
  for (const theme of ["claro", "escuro"]) {
    const toggle = page.getByRole("button", { name: `Ativar modo ${theme}`, exact: true }); if (await toggle.isVisible()) await toggle.click();
    await expect(page.locator("main")).toHaveAttribute("data-theme", theme === "claro" ? "light" : "dark");
    // Do not let axe cache old foregrounds while React commits a new theme.
    // Check an inherited foreground inside the expanded panels as well.
    await expect(scope.getByRole("heading", { name: "Preparar alteração" })).toHaveCSS("color", theme === "claro" ? "rgb(20, 32, 25)" : "rgb(238, 241, 233)");
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    const result = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
      return axe.run(document.querySelector('[aria-label="Planeamento laboral integrado"]')!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    });
    await testInfo.attach(`resource-axe-${theme}.json`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
    expect(result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
  }
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
  await scope.getByLabel("Propor nivelamento de recursos").focus(); await page.keyboard.press("Space"); await expect(scope.getByLabel("Propor nivelamento de recursos")).toBeChecked();
});
