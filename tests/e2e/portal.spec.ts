import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.site')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
});

test("loads cleanly and renders the real Gantt", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await expect(page.locator(".nd-root.nd-gantt")).toBeVisible();
  await expect(page.locator(".nd-gantt__bar")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("switches every real visualization and keeps topology legible", async ({ page }) => {
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Gráficos/ }).click();
  await expect(page.locator(".nd-root.nd-chart")).toBeVisible();
  await page.getByRole("button", { name: /Grafos & topologias/ }).click();
  const topology = page.locator(".nd-root.nd-topology");
  await expect(topology).toBeVisible();
  await expect(topology).toHaveAttribute("data-nd-layout", "hierarchical");
  await expect(topology).toHaveAttribute("data-nd-accessible-items", "5");
  const canvasDensity = await topology.locator("canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) visible += 1;
    return visible / (canvas.width * canvas.height);
  });
  expect(canvasDensity).toBeGreaterThan(0.001);
  expect(canvasDensity).toBeLessThan(0.2);
  await page.getByRole("button", { name: /Calendários/ }).click();
  await expect(page.locator(".nd-root.nd-calendar")).toBeVisible();
});

test("Live data explains itself and performs observable updates", async ({ page }) => {
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Grafos & topologias/ }).click();
  const live = page.getByRole("button", { name: "Live data" });
  await expect(live).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#live-data-description")).toContainText("Simula atualizações");
  await live.click();
  await expect(live).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#live-data-description")).toContainText("ciclo 1");
  await expect(page.locator("#live-data-description")).toContainText("ciclo 2", { timeout: 3_000 });
  await expect(page.locator(".nd-root.nd-topology")).toHaveAttribute("data-nd-accessible-items", "5");
  await live.click();
  await expect(live).toHaveAttribute("aria-pressed", "false");
});

test("workspace tabs and open example expose usable integration details", async ({ page }) => {
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.locator(".data-inspector")).toContainText("Schema válido");
  await page.getByRole("tab", { name: "API" }).click();
  await expect(page.locator(".api-table")).toContainText("interactive");
  await page.getByRole("button", { name: "Abrir exemplo" }).click();
  const dialog = page.getByRole("dialog", { name: "Gantt" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("DADOS DE ENTRADA");
  await expect(dialog).toContainText("INTEGRAÇÃO REACT");
  await dialog.locator(".dialog-code-head .copy-button").first().click();
  await expect(dialog.locator(".dialog-code-head .copy-button").first()).toContainText("Copiado");
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("explorer sidebar can be collapsed and restored", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop-only interaction");
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  const collapse = page.getByRole("button", { name: "Recolher menu" });
  await collapse.click();
  await expect(page.locator(".product-shell")).toHaveClass(/sidebar-collapsed/);
  const expand = page.getByRole("button", { name: "Expandir menu" });
  await expand.click();
  await expect(page.locator(".product-shell")).not.toHaveClass(/sidebar-collapsed/);
});

test("all foundation actions open their respective documentation", async ({ page }) => {
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  for (const item of ["Tipos & schemas", "Temas & tokens", "Acessibilidade"]) {
    await page.getByRole("button", { name: item, exact: true }).click();
    await expect(page.getByRole("dialog", { name: item })).toBeVisible();
    await page.getByRole("button", { name: "Fechar painel" }).click();
  }
});

test("help and architecture actions lead to useful next steps", async ({ page }) => {
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Precisas de ajuda/ }).click();
  const help = page.getByRole("dialog", { name: "Precisas de ajuda?" });
  await expect(help.getByRole("link", { name: /Abrir pedido no GitHub/ })).toHaveAttribute("href", /issues\/new/);
  await help.getByRole("button", { name: "Fechar painel" }).click();
  await page.locator("#arquitetura").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Explorar arquitetura/ }).click();
  const architecture = page.getByRole("dialog", { name: "Um core, três motores." });
  await expect(architecture).toContainText("DOM");
  await expect(architecture).toContainText("CANVAS");
  await expect(architecture).toContainText("WEBGL");
});

test("search supports its visible keyboard shortcuts", async ({ page }) => {
  await page.keyboard.press("/");
  const input = page.getByPlaceholder("Pesquisar componentes, APIs e guias…");
  await expect(input).toBeFocused();
  await input.fill("Topologias");
  await expect(page.getByRole("button", { name: /Topologias · auto-layout/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Pesquisa da documentação" })).toBeHidden();
  await expect(page.locator("#componentes")).toBeInViewport();
});

test("framework tabs and theme controls update the interface", async ({ page }) => {
  await page.locator("#integrar").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: "Vue" }).click();
  await expect(page.locator(".install-command code")).toHaveText("npm i @nodara/vue");
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "light");
});

test("type scale and page width remain usable", async ({ page }) => {
  const audit = await page.evaluate(() => {
    const visibleLeafNodes = [...document.body.querySelectorAll("*")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return element.children.length === 0 && Boolean(element.textContent?.trim()) && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const sizes = visibleLeafNodes.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    return { minimum: Math.min(...sizes), clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(audit.minimum).toBeGreaterThanOrEqual(10);
  expect(audit.scrollWidth).toBeLessThanOrEqual(audit.clientWidth);
});

test("mobile navigation reaches every main section", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only interaction");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Arquitetura", exact: true }).click();
  await expect(page.locator("#arquitetura")).toBeInViewport();
});
