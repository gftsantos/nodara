import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible();
});

const examples = [
  { id: "project-plan", selector: ".nd-gantt", family: "gantt" },
  { id: "line-chart", selector: ".nd-chart", family: "charts" },
  { id: "service-map", selector: ".nd-topology", family: "topology" },
  { id: "week-calendar", selector: ".nd-calendar", family: "calendar" },
  { id: "point-map", selector: ".nd-geo-map", family: "maps" },
  { id: "sankey", selector: ".nd-diagram", family: "diagrams" },
];

for (const example of examples) {
  test(`${example.family}: edited JSON reaches renderer and every copyable framework`, async ({ page, context }) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/catalog#${example.id}`);
    await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible();
    await expect(page.locator(`aside[data-active-id="${example.id}"]`)).toBeVisible();
    const root = page.locator(example.selector);
    const editor = page.getByLabel("Editar dados da demonstração");
    const original = await editor.inputValue();
    const data = JSON.parse(original);
    const marker = `Cliente ${example.family} integração`;
    if (example.family === "gantt") data[0].label = marker;
    else if (example.family === "calendar") data[0].title = marker;
    else if (example.family === "charts") { data[0].label = marker; data[0].data[0].y = 123; }
    else if (example.family === "maps") { data.points[0].label = marker; data.points[0].latitude = 20; }
    else data.nodes[0].label = marker;
    await editor.fill(JSON.stringify(data));
    await expect(page.locator("#catalog-editor-status")).toHaveText("Preview atualizado automaticamente.");
    await expect(root).toContainText(marker);
    const codeRegion = page.getByRole("region", { name: /^Código / });
    await expect(codeRegion).toContainText(marker);
    for (const framework of ["react", "vue", "angular", "javascript", "web-components"]) {
      await page.getByLabel("Framework de integração").selectOption(framework);
      await expect(codeRegion).toContainText(marker);
      await page.getByRole("button", { name: "Copiar ficheiro", exact: true }).click();
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard.replace(/\r\n/g, "\n")).toBe((await codeRegion.locator("code").textContent())?.replace(/\r\n/g, "\n"));
      expect(clipboard).toContain("@nodara/");
      if (framework === "angular") {
        await page.getByRole("button", { name: "styles.css", exact: true }).click();
        await expect(codeRegion).toContainText('@import "@nodara/core/styles.css"');
      }
      if (["javascript", "web-components"].includes(framework)) {
        await page.getByRole("button", { name: "index.html", exact: true }).click();
        await expect(codeRegion).toContainText('<div id="app">');
      }
    }
    await page.getByLabel("Framework de integração").selectOption("react");
    await editor.fill("{");
    await expect(editor).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert")).toContainText("O último preview válido foi preservado");
    await expect(root).toContainText(marker);
    await expect(codeRegion).toContainText(marker);
    await page.getByRole("button", { name: "Repor", exact: true }).click();
    await expect(editor).toHaveValue(original);
    await expect(editor).toHaveAttribute("aria-invalid", "false");
    expect(errors).toEqual([]);
  });
}

test("integration controls change the real renderer and the exported configuration", async ({ page }) => {
  await page.goto("/catalog#line-chart");
  await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible();
  const root = page.locator(".nd-chart");
  await page.getByLabel("Interações ativas").uncheck();
  await expect(page.getByRole("region", { name: /^Código / })).toContainText('"interactive": false');
  await expect(root.locator("table button").first()).toHaveAttribute("tabindex", "-1");
  await page.getByLabel("Altura da visualização").fill("600");
  await expect(root).toHaveCSS("height", "600px");
  await page.getByRole("button", { name: "Ativar modo claro" }).click();
  await expect(root).toHaveAttribute("data-nd-theme", "light");
  await expect(page.getByRole("region", { name: /^Código / })).toContainText('"theme": "light"');
});

test("manual mode preserves pending data until validation", async ({ page }) => {
  await page.goto("/catalog#line-chart");
  await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible();
  await page.getByLabel("Renderizar enquanto escrevo").uncheck();
  const editor = page.getByLabel("Editar dados da demonstração");
  const original = await editor.inputValue();
  await editor.fill(original.replace("Line chart", "Pending label"));
  await expect(page.getByText("Há alterações por validar.", { exact: false })).toBeVisible();
  await expect(page.locator(".nd-chart")).not.toContainText("Pending label");
  await page.getByRole("button", { name: "Validar e renderizar" }).click();
  await expect(page.locator(".nd-chart")).toContainText("Pending label");
});

test("clipboard denial has a useful fallback and no unhandled error", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.clipboard, "writeText", { value: () => Promise.reject(new Error("denied")) }));
  await page.goto("/catalog");
  await expect(page.locator('[data-catalog-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Copiar ficheiro", exact: true }).click();
  await expect(page.getByText(/O browser bloqueou a cópia/)).toBeVisible();
  await expect(page.getByRole("region", { name: /^Código / })).toBeVisible();
});

test("every downloadable package is available and matches its manifest size", async ({ request }) => {
  const response = await request.get("/downloads/manifest.json"); expect(response.ok()).toBe(true);
  const manifest = await response.json(); expect(manifest).toHaveLength(5);
  for (const entry of manifest) {
    const artifact = await request.get(`/downloads/${entry.filename}`);
    expect(artifact.ok()).toBe(true); const bytes = await artifact.body();
    expect(bytes.length).toBe(entry.bytes); expect(bytes.subarray(0, 2).toString("hex")).toBe("1f8b");
  }
});

test("catalog discloses shared renderers and precise scientific contracts", async ({ page }) => {
  await page.goto("/catalog#er-diagram");
  await expect(page.getByLabel("Limitações desta receita")).toContainText("cardinalidades");
  await page.goto("/catalog#contour");
  await expect(page.getByLabel("Limitações desta receita")).toContainText("Isolinhas reais de grelha retangular");
  await expect(page.locator('.nd-chart[data-nd-contours]')).toBeVisible();
});
