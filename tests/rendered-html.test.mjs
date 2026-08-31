import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
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
  assert.match(html, /6 componentes\. 69 tipos\. 100 receitas/);
  assert.match(html, /24<!-- --> guias · 100 receitas · 6 componentes/);
  assert.match(html, /Gantt/);
  assert.match(html, /Web Components/);
});

test("renders the organized visual catalog", async () => {
  const response = await render("/catalog");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /6 componentes\. 69 tipos visuais/);
  assert.match(html, /Line chart/);
  assert.match(html, /Candlestick/);
  assert.match(html, /Calendário semanal/);
  assert.match(html, /Orthographic globe/);
  assert.match(html, /Sankey/);
});
