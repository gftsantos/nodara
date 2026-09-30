import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", method = "GET") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Nodara showcase", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Nodara/);
  assert.match(html, /Dados complexos/);
  assert.match(html, /Gantt/);
  assert.match(html, /React/);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("renders the complete Nodara documentation hub", async () => {
  const response = await render("/docs");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Documentação — Nodara/);
  assert.match(html, /6 componentes\. 69 configurações\. 100 receitas/);
  assert.match(html, /26<!-- --> guias · 100 receitas · 6 componentes/);
  assert.match(html, /Gantt/);
  assert.match(html, /Web Components/);
});

test("renders the organized visual catalog", async () => {
  const response = await render("/catalog");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Copia e integra/);
  assert.match(html, /Framework de integração/);
  assert.match(html, /downloads\/nodara-core/);
  for (const family of ["Gantt", "Gráficos", "Topologias", "Calendários", "Mapas", "Diagramas"]) assert.match(html, new RegExp(`Explorar componente: ${family}`));
  assert.equal([...html.matchAll(/data-catalog-id="/g)].length, 6);
  assert.match(html, /Componentes/);
  assert.match(html, /Variantes/);
  assert.match(html, /Exemplos/);
});

test("renders the shared operational planning workspace", async () => {
  const response = await render("/operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Planeamento operacional/);
  assert.match(html, /Gantt/);
  assert.match(html, /Calendário/);
  assert.match(html, /JSON/);
});

test("built Worker denies unused image proxies and writes before the router", async () => {
  for (const path of ["/_vinext/image?url=http://169.254.169.254/&w=640&q=75", "/_next/image?url=https://example.com/", "/.env", "/%252eenv", "/outputs/log.json", "/_next/static/index.js.map"]) {
    const response = await render(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  assert.equal((await render("/operations", "POST")).status, 405);
});

test("built Worker renders transparency and fresh CSP nonces", async () => {
  const response = await render("/legal");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /strict-dynamic/);
  const nonce = csp.match(/'nonce-([^']+)'/)[1];
  assert.match(await response.text(), new RegExp(`nonce="${nonce.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  const second = await render("/legal");
  assert.notEqual(second.headers.get("content-security-policy"), csp);
});
