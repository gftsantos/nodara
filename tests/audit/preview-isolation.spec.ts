import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

test("writing generated HTML evidence does not reload or discard an unsaved operational edit", async ({ page }, testInfo) => {
  await page.goto("/operations");
  const input = page.getByLabel("Nome da tarefa", { exact: true });
  await expect(input).toBeVisible(); await input.fill("Unsaved sentinel");
  await page.evaluate(() => { (window as unknown as { evidenceSentinel: string }).evidenceSentinel = "stable"; });
  const directory = resolve("outputs/technical-confidence/watch-probe"); mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `${testInfo.project.name}-${testInfo.workerIndex}.html`);
  try {
    writeFileSync(path, "<!doctype html><title>Generated test evidence, never application source</title>");
    // This wait observes a watcher side effect; it is not a substitute for UI readiness.
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { evidenceSentinel?: string }).evidenceSentinel)).toBe("stable");
    await expect(input).toHaveValue("Unsaved sentinel");
  } finally { unlinkSync(path); }
});
