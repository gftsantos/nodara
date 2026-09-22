import "../e2e/resource-planning.spec";
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("expanded resource controls pass automated accessibility in both themes at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/operations"); await page.getByRole("button", { name: "Planeamento laboral · impacto", exact: true }).click();
  const scope = page.getByRole("region", { name: "Planeamento laboral integrado", exact: true });
  await scope.getByText("Calendário do recurso · Equipa de entrega", { exact: true }).click();
  await scope.getByLabel("Calendário próprio · Equipa de entrega", { exact: true }).check();
  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") });
  for (const theme of ["claro", "escuro"]) {
    const toggle = page.getByRole("button", { name: `Ativar modo ${theme}`, exact: true }); if (await toggle.isVisible()) await toggle.click();
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
      return (await axe.run(document.querySelector('[aria-label="Planeamento laboral integrado"]')!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }));
    });
    expect(violations).toEqual([]);
  }
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
  await scope.getByLabel("Propor nivelamento de recursos").focus(); await page.keyboard.press("Space"); await expect(scope.getByLabel("Propor nivelamento de recursos")).toBeChecked();
});
