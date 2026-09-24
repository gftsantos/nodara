import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { AxeResults } from "axe-core";

test("production CSP hydrates the portal, blocks inline XSS, uses fresh nonces", async ({ page, request }) => {
  const errors: string[] = [], external: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", entry => { if (!entry.url().startsWith("http://127.0.0.1:") && /^https?:/.test(entry.url())) external.push(new URL(entry.url()).origin); });
  const response = await page.goto("/");
  const csp = response!.headers()["content-security-policy"]!;
  expect(csp).toContain("strict-dynamic");
  expect(csp).not.toContain("unsafe-eval");
  const nonce = csp.match(/'nonce-([^']+)'/)![1];
  const again = await request.get("/", { headers: { "content-security-policy": "script-src 'nonce-forged'" } });
  expect(again.headers()["content-security-policy"]).not.toContain(nonce);
  expect(again.headers()["content-security-policy"]).not.toContain("forged");
  await page.getByRole("button", { name: /Alternar tema|Mudar para modo claro|Ativar modo claro/i }).first().click();
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "light");
  // Simulate attacker-controlled HTML in the parser, not trusted DevTools JS.
  // strict-dynamic intentionally trusts scripts created by already trusted code.
  await page.route(page.url(), async route => {
    const original = await route.fetch();
    await route.fulfill({ response: original, body: (await original.text()).replace("</head>", '<script>window.__injected = true</script></head>') });
  });
  await page.reload();
  expect(await page.evaluate(() => Reflect.get(window, "__injected"))).toBeUndefined();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("private transparency is usable and has no tracking storage", async ({ page }) => {
  await page.goto("/legal");
  await expect(page.getByRole("heading", { name: "Privacidade, condições e limites." })).toBeVisible();
  await page.getByRole("link", { name: "Cookies", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cookies e serviços externos" })).toBeInViewport();
  for (const path of ["/licenses/geist-OFL.txt", "/licenses/lucide.txt"]) {
    const license = await page.request.get(path);
    expect(license.status()).toBe(200);
    expect((await license.text()).length).toBeGreaterThan(1000);
  }
  expect(await page.evaluate(() => ({ cookies: document.cookie, local: localStorage.length, session: sessionStorage.length }))).toEqual({ cookies: "", local: 0, session: 0 });
  // Testing instrumentation has the document's nonce; no weakening of the policy.
  const nonce = await page.locator("script[nonce]").first().evaluate(element => (element as HTMLScriptElement).nonce);
  await page.evaluate(({ source, nonce }) => { const script = document.createElement("script"); script.nonce = nonce; script.textContent = source; document.head.append(script); }, { source: readFileSync("node_modules/axe-core/axe.min.js", "utf8"), nonce });
  const results = await page.evaluate(async () => (window as typeof window & { axe: { run(): Promise<AxeResults> } }).axe.run());
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: `outputs/technical-confidence/legal-${test.info().project.name}.png`, fullPage: true });
});

test("read-only production endpoints deny mutations, source and unused proxies", async ({ request }) => {
  for (const path of ["/.env", "/.git/config", "/__debug", "/outputs/report.json", "/assets/missing.js.map"]) {
    const response = await request.get(path); expect(response.status(), path).toBe(404);
  }
  // vinext start owns image routes ahead of middleware; the deployed Worker
  // denies them before the router (asserted separately on the built Worker).
  const image = await request.get("/_vinext/image?url=http://169.254.169.254/&w=640&q=75");
  expect([400, 404]).toContain(image.status());
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = await request.fetch("/operations", { method, headers: { Origin: "https://attacker.invalid" } });
    expect(response.status()).toBe(405);
    expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
  }
});
