# Nodara

Monorepo alpha da Nodara: seis componentes visuais — Gantt, Chart, Topology, Calendar, GeoMap e Diagram — e um modelo operacional partilhado.

[Portal privado](https://nodara-visual.gftsantos.chatgpt.site) · [Catálogo](https://nodara-visual.gftsantos.chatgpt.site/catalog) · [Referência da API, exemplos e limites](https://nodara-visual.gftsantos.chatgpt.site/docs) · [Planeamento integrado](https://nodara-visual.gftsantos.chatgpt.site/operations)

## Experiência incluída

- 100 receitas executáveis, 69 configurações agrupadas e 26 guias. Receitas não representam 100 motores independentes.
- Editor de dados, validação, preview dos componentes reais e código copiável para cinco integrações.
- Planeamento integrado: plano único, transações, conflitos, caminho crítico por precedências, desfazer/refazer e ficheiro JSON.
- Histogramas por intervalos, densidades Gaussian KDE, isolinhas, hierarquias proporcionais e Sankey.
- Temas claro/escuro, pesquisa, navegação por teclado e layout responsivo.
- Pacotes alpha instaláveis por tarball; publicação npm sujeita à validação e autorização.

## Pacotes

| Pacote | Responsabilidade |
| --- | --- |
| `@nodara/core` | Contratos, normalização, matemática, planeamento, temas e seis renderers |
| `@nodara/react` | Componentes e lifecycle React |
| `@nodara/vue` | Componentes e eventos Vue 3 |
| `@nodara/angular` | Standalone components Angular |
| `@nodara/web-components` | Custom elements para outras stacks |

Core, React, Vue e Web Components incluem ESM/CJS e tipos. Angular é ESM/AOT. Cada pacote inclui a licença MIT; o core também inclui os avisos das dependências D3 distribuídas.

## Desenvolvimento e validação

Ambiente de referência: Node.js 22.13.1 e npm 11.19.1; os ranges declarados de compatibilidade não substituem testes em cada versão.

```bash
npm ci
npm run dev
```

No Windows, preferir `npm.cmd` ao wrapper PowerShell ao passar argumentos separados por `--`.

```bash
npx playwright install chromium firefox webkit
npm run verify:release
```

O gate executa 16 etapas: segurança, builds, lint, tipos, testes unitários/geradores, contratos, HTML compilado, consumidores isolados dos tarballs, portal, matriz de browsers sobre o build de produção e isolamento do watcher num servidor de desenvolvimento separado. Para CI Linux: `npx playwright install --with-deps chromium firefox webkit`.

Os servidores E2E usam `127.0.0.1:4173` e `127.0.0.1:4174`, nunca reutilizam um servidor desconhecido e falham se a porta estiver ocupada. Isto evita confundir a app com encaminhamentos WSL ou outros serviços em `localhost:3000`.

`NODARA_CONSUMER_VARIANT=minimum npm run test:consumers` verifica React 18.2.0 e Vue 3.3.0 além da matriz atual (React 19.2.8, Vue 3.5.41, Angular 21.2.21 e Web Components). É compatibilidade de browser, não recomendação para instalar versões antigas. No PowerShell, definir a variável com `$env:NODARA_CONSUMER_VARIANT='minimum'`.

`node scripts/benchmark.mjs` mede operações síncronas com datasets e ambiente registados. Executar sem outras suites em paralelo; não interpretar os resultados como FPS ou comparação de mercado.

`npm test` é um subconjunto (biblioteca, build do portal e HTML). Os relatórios brutos estão em `outputs/technical-confidence/`; a baseline histórica não deve ser confundida com a execução atual.

## Estado e limites

A alpha não promete paridade com todos os produtos especializados. O calendário ainda não implementa RRULE completo nem grelhas independentes do fuso do browser. Planeamento schema 1 usa tempo decorrido e precedências FS, não nivelamento automático de recursos, calendários laborais ou colaboração cloud. ER/state/chord e mapas têm limites publicados no catálogo.

Ver [plano de execução](TECHNICAL-CONFIDENCE-PLAN.md), [relatório técnico e limites medidos](TECHNICAL-CONFIDENCE-REPORT-2026-09-14.md), [100 unidades de evolução](docs/TECHNICAL-ITERATIONS-2026-09-14.md), [comparação por capacidades](COMPETITIVE-CAPABILITIES.md), [arquitetura](docs/ARCHITECTURE.md), [API](docs/PUBLIC_API.md), [migração](docs/MIGRATION-TECHNICAL-CONFIDENCE.md) e [segurança](SECURITY.md).
