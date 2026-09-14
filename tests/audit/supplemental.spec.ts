import { expect, test } from "@playwright/test";

test("homepage persists moving a recurring calendar occurrence", async ({ page }) => {
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  await page.locator("#componentes").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Calendários/ }).click();
  const monday = page.locator('.nd-calendar__day[data-date="2026-08-17"]');
  const planning = monday.locator('.nd-calendar__event').filter({ hasText: "Planning" });
  await expect(planning).toHaveCount(1); await planning.focus();
  await page.keyboard.press("ArrowRight");
  await expect(planning).toHaveCount(0);
  await expect(page.locator('.nd-calendar__day[data-date="2026-08-18"] .nd-calendar__event').filter({ hasText: "Planning" })).toHaveCount(2);
});

test("modal Escape restores focus to its opener independently of the tab loop", async ({ page }) => {
  await page.goto("/"); await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
  const trigger = page.getByRole("button", { name: "Tipos & schemas", exact: true });
  await trigger.click(); await expect(page.getByRole("dialog", { name: "Tipos & schemas" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
