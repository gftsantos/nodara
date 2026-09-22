import { expect, test } from "@playwright/test";

test("resource absence and leveling preview, apply and undo without changing capacity", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/operations"); await page.getByRole("button", { name: "Planeamento laboral · impacto", exact: true }).click();
  const scope = page.getByRole("region", { name: "Planeamento laboral integrado", exact: true });
  await scope.getByText("Calendário do recurso · Equipa de entrega", { exact: true }).click();
  await scope.getByRole("button", { name: "Adicionar ausência · Equipa de entrega", exact: true }).click();
  await expect(scope.getByLabel("Calendário próprio · Equipa de entrega", { exact: true })).toBeChecked();
  await expect(scope.getByLabel("Feriado em 26 de outubro")).not.toBeChecked();
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByTestId("working-conflicts")).toContainText("2 conflitos");
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 0");
  await scope.getByLabel("Propor nivelamento de recursos").check();
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByTestId("working-conflicts")).toContainText("0 conflitos");
  await expect(scope.getByLabel("Capacidade · Equipa de entrega", { exact: true })).toHaveValue("100");
  await scope.getByRole("button", { name: "Aplicar a todas as vistas", exact: true }).click();
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 1");
  await scope.getByText("Calendário, tarefas, recursos e dependências em JSON", { exact: true }).click();
  const saved = JSON.parse(await scope.getByLabel("Plano laboral JSON").inputValue());
  expect(saved.resourceLeveling).toBe("serial"); expect(saved.resources[0].calendar.exceptions["2026-10-26"]).toEqual([]);
  for (const view of ["Calendário", "Dependências", "Locais", "Gantt"]) { await scope.getByRole("group", { name: "Vistas do plano laboral" }).getByRole("button", { name: view, exact: true }).click(); await expect(scope.getByTestId("working-view")).not.toBeEmpty(); }
  await scope.getByRole("button", { name: "Desfazer plano laboral", exact: true }).click();
  await expect(scope.getByLabel("Propor nivelamento de recursos")).not.toBeChecked();
  await expect(scope.getByLabel("Calendário próprio · Equipa de entrega", { exact: true })).not.toBeChecked();
  await scope.getByRole("button", { name: "Refazer plano laboral", exact: true }).click();
  await expect(scope.getByLabel("Propor nivelamento de recursos")).toBeChecked();
  expect(errors).toEqual([]);
});

test("shift and absence forms validate, split overnight shifts and preserve saved plan", async ({ page }) => {
  await page.goto("/operations"); await page.getByRole("button", { name: "Planeamento laboral · impacto", exact: true }).click();
  const scope = page.getByRole("region", { name: "Planeamento laboral integrado", exact: true });
  await scope.getByText("Calendário do recurso · Equipa de entrega", { exact: true }).click();
  await scope.getByLabel("Ausência até · Equipa de entrega").fill("2026-10-25");
  await scope.getByRole("button", { name: "Adicionar ausência · Equipa de entrega" }).click();
  await expect(scope.getByRole("alert")).toContainText("intervalo válido");
  await scope.getByLabel("Início do turno · Equipa de entrega").fill("22:00");
  await scope.getByLabel("Fim do turno · Equipa de entrega").fill("06:00");
  await scope.getByRole("button", { name: "Usar turno · Equipa de entrega" }).click();
  await scope.getByText("Calendário, tarefas, recursos e dependências em JSON", { exact: true }).click();
  const draft = JSON.parse(await scope.getByLabel("Plano laboral JSON").inputValue());
  expect(draft.resources[0].calendar.week[0].periods).toEqual([{ start: "22:00", end: "24:00" }]);
  expect(draft.resources[0].calendar.week[1].periods).toEqual([{ start: "00:00", end: "06:00" }, { start: "22:00", end: "24:00" }]);
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByRole("alert")).toContainText("joint working time");
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 0");
  await scope.getByRole("button", { name: "Cancelar rascunho", exact: true }).click();
  await expect(scope.getByRole("alert")).toHaveCount(0);
});
