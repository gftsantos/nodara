import { expect, test, type Page } from "@playwright/test";

async function working(page: Page) {
  await page.goto("/operations");
  await page.getByRole("button", { name: "Planeamento laboral · impacto", exact: true }).click();
  const scope = page.getByRole("region", { name: "Planeamento laboral integrado", exact: true });
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 0");
  return scope;
}

test("calendar and capacity changes preview, reject and commit across all five views", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const scope = await working(page);
  await expect(scope.getByTestId("working-row-a")).toContainText("26/10, 11:00");
  await scope.getByLabel("Feriado em 26 de outubro").check();
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByTestId("working-state")).toContainText("PRÉVIA");
  await expect(scope.getByTestId("working-conflicts")).toHaveText("2 conflitos de capacidade · 2 tarefas alteradas");
  await expect(scope.getByTestId("working-row-a")).toContainText("27/10, 11:00");
  await scope.getByRole("button", { name: "Aplicar a todas as vistas", exact: true }).click();
  await expect(scope.getByRole("alert")).toContainText("capacity");
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 0");
  await scope.getByLabel("Capacidade · Equipa de entrega").fill("200");
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByTestId("working-conflicts")).toHaveText("0 conflitos de capacidade · 2 tarefas alteradas");
  await scope.getByRole("button", { name: "Aplicar a todas as vistas", exact: true }).click();
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 1");
  await expect(scope.locator(".nd-gantt__handle")).toHaveCount(0);
  const tabs = scope.getByRole("group", { name: "Vistas do plano laboral" });
  await tabs.getByRole("button", { name: "Calendário", exact: true }).click();
  await expect(scope.locator(".nd-calendar")).toContainText("27/10");
  await expect(scope.locator(".nd-calendar")).toContainText("Validar integração");
  await tabs.getByRole("button", { name: "Dependências", exact: true }).click();
  await expect(scope.locator(".nd-topology")).toContainText("Preparar entrega");
  await tabs.getByRole("button", { name: "Locais", exact: true }).click();
  await expect(scope.locator(".nd-geo-map")).toContainText("Lisboa");
  await expect(scope.locator(".nd-chart")).toHaveAttribute("data-nd-type", "step-line");
  await scope.getByRole("button", { name: "Desfazer plano laboral", exact: true }).click();
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 2");
  await expect(scope.getByLabel("Feriado em 26 de outubro")).not.toBeChecked();
  await expect(scope.getByLabel("Capacidade · Equipa de entrega")).toHaveValue("100");
  await expect(scope.getByTestId("working-row-a")).not.toContainText("27/10");
  await page.getByRole("button", { name: "Planeamento contínuo · CPM" }).click();
  await page.getByRole("button", { name: "Planeamento laboral · impacto" }).click();
  await expect(scope.getByTestId("working-revision")).toHaveText("REV 2");
  await scope.screenshot({ path: testInfo.outputPath("working-integrated.png") });
  expect(errors).toEqual([]);
});

test("working JSON rejects malformed shapes safely and inspector accepts decimal hours", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const scope = await working(page);
  await scope.getByLabel("Trabalho útil · horas").fill("1.1");
  await scope.getByRole("button", { name: "Calcular impacto", exact: true }).click();
  await expect(scope.getByRole("alert")).toHaveCount(0);
  await expect(scope.getByTestId("working-row-a")).toContainText("1.1h");
  await scope.getByRole("button", { name: "Cancelar rascunho", exact: true }).click();
  await scope.getByText("Calendário, tarefas, recursos e dependências em JSON", { exact: true }).click();
  const editor = scope.getByLabel("Plano laboral JSON"), initial = await editor.inputValue(), base = JSON.parse(initial);
  for (const invalid of ["null", "{", JSON.stringify({ ...base, tasks: {} }), JSON.stringify({ ...base, resources: {} }), JSON.stringify({ ...base, tasks: [{ ...base.tasks[0], startMs: 1e20 }] })]) {
    await editor.fill(invalid);
    await scope.getByRole("button", { name: "Validar JSON e calcular impacto", exact: true }).click();
    await expect(scope.getByTestId("working-revision")).toHaveText("REV 0");
    await expect(scope.getByRole("alert").first()).toBeVisible();
    await expect(scope.locator(".nd-gantt__bar")).toHaveCount(3);
  }
  await editor.fill(initial);
  await scope.getByRole("button", { name: "Validar JSON e calcular impacto", exact: true }).click();
  await expect(scope.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("catalog separates components, variants and domain examples with distinct time horizons", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-ready=true]")).toBeVisible();
  await expect(page.getByRole("button", { name: /Componentes.*6 APIs/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-catalog-id]")).toHaveCount(6);
  await page.getByRole("button", { name: /^Variantes/ }).click();
  await expect(page.locator("[data-catalog-id]")).toHaveCount(69);
  await page.getByRole("button", { name: /^Exemplos/ }).click();
  await expect(page.locator("[data-catalog-id]")).toHaveCount(100);
  await page.locator('[data-catalog-id="sprint-board"]').click();
  const sprint = JSON.parse(await page.getByRole("textbox", { name: "Editar dados da demonstração" }).inputValue());
  await expect(page.locator(".nd-gantt")).toHaveAttribute("data-nd-zoom", "day");
  await page.locator('[data-catalog-id="release-train"]').click();
  const release = JSON.parse(await page.getByRole("textbox", { name: "Editar dados da demonstração" }).inputValue());
  expect(sprint.map((task: { label: string }) => task.label)).not.toEqual(release.map((task: { label: string }) => task.label));
  expect(new Date(release.at(-1).end).getTime() - new Date(release[0].start).getTime()).toBe(56 * 86400000);
  await expect(page.locator(".nd-gantt__header")).toContainText("6 tarefas");
  await expect(page.locator(".nd-gantt__header")).toContainText("Semana");
  const ticks = await page.locator(".nd-gantt__scale span").evaluateAll(elements => elements.map(element => ({ time: Number((element as HTMLElement).dataset.timestamp), width: element.getBoundingClientRect().width, font: parseFloat(getComputedStyle(element).fontSize), overflow: getComputedStyle(element).overflow, text: element.textContent })));
  expect(ticks).toHaveLength(8);
  for (let index = 0; index < ticks.length; index++) { expect(new Date(ticks[index]!.time).getUTCDay()).toBe(1); expect(ticks[index]!.font).toBeGreaterThanOrEqual(14); expect(ticks[index]!.overflow).toBe("hidden"); if (index) expect(ticks[index]!.time - ticks[index - 1]!.time).toBe(7 * 86400000); }
});

test("specialized diagram examples paint readable weights, entities and transitions", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const id of ["chord", "er-diagram", "state-diagram", "mindmap", "radial-tree"]) {
    await page.goto(`/catalog#${id}`);
    const view = page.locator("aside .nd-diagram"); await expect(view).toBeVisible();
    const darkSwitch = page.getByRole("button", { name: "Ativar modo escuro", exact: true });
    if (await darkSwitch.isVisible()) await darkSwitch.click();
    if (id === "chord") { await expect(view).toHaveAttribute("data-nd-chord-ribbons", "4"); await expect(view).toContainText("80"); await expect(view).toContainText("Web"); }
    if (id === "er-diagram") { await expect(view).toContainText("PK"); await expect(view).toContainText("FK"); await expect(view).toContainText("0..*"); }
    if (id === "state-diagram") { await expect(view).toContainText("initial"); await expect(view).toContainText("final"); await expect(view).toContainText("tentar novamente"); }
    await view.screenshot({ path: testInfo.outputPath(`${id}-dark.png`) });
    await page.getByRole("button", { name: "Ativar modo claro", exact: true }).click();
    await expect(view).toHaveAttribute("data-nd-theme", "light");
    await view.screenshot({ path: testInfo.outputPath(`${id}-light.png`) });
  }
  expect(errors).toEqual([]);
});

test("mindmap keeps full-size boxes in a scrollable narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog#mindmap");
  await expect(page.locator("aside .nd-diagram")).toHaveAttribute("data-nd-type", "mindmap");
  const input = { nodes: [{ id: "a", label: "Raiz" }, { id: "b", label: "Ramo", parentId: "a" }, { id: "c", label: "Folha", parentId: "b" }], links: [] };
  await page.getByRole("textbox", { name: "Editar dados da demonstração" }).fill(JSON.stringify(input));
  await expect(page.locator("aside .nd-diagram")).toContainText("Folha");
  const dimensions = await page.locator("aside .nd-diagram").evaluate(root => { const canvas = root.querySelector("canvas")!; return { logicalWidth: parseFloat(canvas.style.width), paintedWidth: canvas.getBoundingClientRect().width, hostWidth: root.clientWidth, overflow: getComputedStyle(root).overflowX, pageWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }; });
  expect(dimensions.logicalWidth).toBeGreaterThan(dimensions.hostWidth);
  expect(dimensions.paintedWidth).toBe(dimensions.logicalWidth);
  expect(dimensions.overflow).toBe("auto");
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.pageWidth);
});
