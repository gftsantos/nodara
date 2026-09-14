import { expect, test } from "@playwright/test";

for (const route of ["/", "/catalog", "/docs", "/operations"]) {
  test(`${route}: 320px reflow keeps navigation and actions reachable at normal and doubled text sizes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    await expect(page.locator('[data-ready="true"], [data-catalog-ready="true"], [data-docs-ready="true"], [data-operations-ready="true"]').first()).toBeVisible({ timeout: 20_000 });
    for (const scale of [1, 2]) {
      if (scale === 2) await page.evaluate(() => {
        // Capture first, then apply: inherited fonts must not be doubled repeatedly.
        // This simulates text-only enlargement, including px; it is not browser zoom
        // or enlargement of text drawn inside Canvas/WebGL.
        const fonts = [...document.querySelectorAll<HTMLElement>("body, body *")]
          .filter(element => element instanceof HTMLElement && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName))
          .map(element => [element, parseFloat(getComputedStyle(element).fontSize)] as const);
        for (const [element, size] of fonts) element.style.setProperty("font-size", `${size * 2}px`, "important");
      });
      const result = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        // Catalog family filters and visualization tabs intentionally scroll locally;
        // this set targets controls that must fit without such a scroller.
        const clipped = [...document.querySelectorAll<HTMLElement>('header a, header button, .sidebar-search, .foundation-link, .workspace-actions button, [class*="codeHead"] button, [class*="codePanel"] > div button, [data-operations-ready] [class*="toolbar"] button')]
          .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden")
          .map(element => {
            const box = element.getBoundingClientRect();
            let hiddenBy: string | null = null;
            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
              const style = getComputedStyle(parent); const bounds = parent.getBoundingClientRect();
              if (["hidden", "clip"].includes(style.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1)) hiddenBy = parent.className;
            }
            return { text: element.getAttribute("aria-label") ?? element.textContent?.trim(), left: box.left, right: box.right, hiddenBy };
          })
          .filter(element => element.left < -1 || element.right > width + 1 || element.hiddenBy);
        return { width, scroll: document.documentElement.scrollWidth, clipped };
      });
      await testInfo.attach(`reflow-${scale}x.json`, { body: JSON.stringify(result), contentType: "application/json" });
      await testInfo.attach(`reflow-${scale}x.png`, { body: await page.screenshot(), contentType: "image/png" });
      expect(result.clipped, `${route} text ${scale}x`).toEqual([]);
      expect(result.scroll, `${route} text ${scale}x`).toBeLessThanOrEqual(result.width + 1);
      if (route === "/docs") {
        await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
        const sidebar = page.getByRole("complementary", { name: "Navegação da documentação" });
        await expect(sidebar).toBeVisible();
        const header = await page.locator("header").first().boundingBox();
        await expect.poll(async () => (await sidebar.boundingBox())!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
        await page.getByRole("button", { name: "Fechar navegação", exact: true }).click();
      }
    }
  });
}
