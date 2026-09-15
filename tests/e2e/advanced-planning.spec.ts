import { expect, test } from "@playwright/test";

test("working calendar edits recalculate DST results and recover after invalid JSON", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/operations"); await page.locator("#working-time-lab summary").click();
  const output = page.getByTestId("working-time-output"); await expect(output).toContainText("2026-10-26T11:00:00.000+00:00");
  const editor = page.getByLabel("Calendário laboral JSON"); const original = await editor.inputValue(); const changed = JSON.parse(original); changed.exceptions["2026-10-26"] = [];
  await editor.fill(JSON.stringify(changed)); await expect(output).toContainText("2026-10-27T11:00:00.000+00:00");
  await editor.fill("{"); await expect(page.locator("#working-time-lab [role=alert]")).toBeVisible(); await expect(output).toHaveCount(0);
  await editor.fill(original); await page.getByLabel("Horas de trabalho", { exact: true }).fill("1"); await expect(output).toContainText("2026-10-23T17:00:00.000+01:00");
  await page.locator("#working-time-lab").getByRole("button", { name: "Copiar exemplo" }).click(); await expect(page.locator("#working-time-lab [role=status]")).toHaveText("Código copiado.");
  await page.getByLabel("Horas de trabalho", { exact: true }).fill("2"); await expect(page.locator("#working-time-lab [role=status]")).toBeEmpty();
  expect(errors).toEqual([]);
});

test("dependency editor commits typed links and undo removes the transaction", async ({ page }) => {
  await page.goto("/operations"); await page.locator("#dependency-editor summary").click();
  await page.getByRole("combobox", { name: "Relação", exact: true }).selectOption("SS"); await page.getByLabel("Lag · horas decorridas").fill("-1"); await page.getByRole("button", { name: "Adicionar dependência", exact: true }).click();
  await expect(page.locator("#dependency-editor li").filter({ hasText: "· SS · -1h" })).toHaveCount(1);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click(); await expect(page.locator("#dependency-editor li").filter({ hasText: "· SS · -1h" })).toHaveCount(0);
  await page.getByLabel("Lag · horas decorridas").fill("0.0000001"); await page.getByRole("button", { name: "Adicionar dependência", exact: true }).click();
  await expect(page.locator("#dependency-editor li").filter({ hasText: "· SS ·" })).toHaveCount(0);
});

test("diagram laboratory uses real routing and reflects editable data", async ({ page }, testInfo) => {
  await page.goto("/operations"); await page.locator("#diagram-routing-lab summary").click();
  const view = page.locator("#diagram-routing-lab .nd-diagram"); await expect(view).toHaveAttribute("data-nd-routed-links", "2");
  await view.screenshot({ path: testInfo.outputPath("diagram-dark.png") });
  await page.getByRole("button", { name: "Ativar modo claro", exact: true }).click(); await expect(view).toHaveAttribute("data-nd-theme", "light");
  await view.screenshot({ path: testInfo.outputPath("diagram-light.png") });
  const editor = page.getByLabel("Dados do diagrama"); const input = JSON.parse(await editor.inputValue()); input.nodes[1].label = "Validação alterada"; await editor.fill(JSON.stringify(input)); await expect(view).toContainText("Validação alterada");
  input.links[0].toPort = "unknown"; await editor.fill(JSON.stringify(input)); await expect(page.locator("#diagram-routing-lab [role=alert]")).toContainText("port"); await expect(view).toHaveCount(0);
});
