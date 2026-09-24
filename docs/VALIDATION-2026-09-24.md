# Validação local da candidata privada — 24/09/2026

Estado no momento dos testes: alterações locais ainda não commitadas, **não
publicadas no npm e não publicadas no Site**. Base Git
`295517f5df32795c685ad1f04cd222bc57b87b2b`, branch
`codex/nodara-production-engine`. Guardar posteriormente estas alterações num
commit não significa publicação nem nova execução dos testes. Esta revisão não foi executada na CI
GitHub/Ubuntu; o resultado de uma revisão anterior não cobre estas alterações.

## Testes executados

Último resultado de cada suite, sem somar tentativas de diagnóstico:

| Suite | Aprovados | Excluídos |
| --- | ---: | ---: |
| Unitários, adaptadores e geração de integração | 894 | 0 |
| Contratos públicos | 57 | 0 |
| HTML compilado e política do Worker | 6 | 0 |
| Consumidores isolados atuais | 29 | 0 |
| Portal desktop e mobile emulado | 92 | 4 |
| Detalhe Chromium, Firefox, WebKit e mobile emulado | 427 | 5 |
| Isolamento do preview de desenvolvimento | 1 | 0 |
| Consumidores com React/Vue mínimos declarados | 29 | 0 |
| **Total** | **1535** | **9** |

Não houve falhas nem casos flaky nesses resultados finais. São casos
parametrizados/perfis, não 1535 funcionalidades independentes. As nove exclusões
são quatro interações específicas de desktop/mobile, três testes de toque fora
do perfil mobile e duas repetições do catálogo já cobertas pela suite de base.
Os consumidores mínimos repetem contratos com versões anteriores de React/Vue;
não são uma recomendação de usar dependências antigas em produção.

### A execução integral do gate não está verde

`npm run verify:release` executou as primeiras **17 de 18 etapas com sucesso**,
incluindo builds, lint, tipos, superfície de 269 exports, segurança e browsers.
A etapa final não arrancou porque o preview do percurso humano já detinha o lock
de `vinext dev`. A falha de infraestrutura permanece em `release-gate.json`.

Sem alterar código de aplicação nem desativar o lock, o teste final foi executado
separadamente com a opção suportada `NODARA_PREVIEW_URL=http://127.0.0.1:3001`:
**1/1 passou**. O relatório de arranque falhado foi preservado em
`preview-startup-failure-2026-09-24.json`; o resultado separado está em
`preview-results.json`. O agregador oficial, que exige um gate integral verde,
não foi usado para fabricar um estado aprovado. Antes de distribuir, executar
o gate integral no commit final, com essa opção se houver um preview aberto.

Relatórios JSON e screenshots ficam em `outputs/technical-confidence/`
(ignorados pelo Git). Não usar um `summary.json` anterior como resultado desta
revisão. Depois do build validado, só foi alterada documentação; os bundles de
aplicação e da biblioteca permaneceram os mesmos.

## Desempenho medido, sem promessa de capacidade

Benchmark final iniciado às 10:18 UTC, depois de terminar as suites: seis planos
laborais e dezoito cargas de browser; nenhum erro de execução. Ambiente Windows
10.0.26200, i5-1235U, cerca de 32 GB RAM, Node 22.13.1, Chromium 151.0.7922.34.
Dois aquecimentos e nove atualizações com dados alterados por cenário. Medianas
CPU abaixo; não são FPS, latência física nem valores garantidos noutro computador.

| Cenário | Antes | Candidata final |
| --- | ---: | ---: |
| Agenda, 100 eventos | 21,7 ms | 9,9 ms |
| Agenda, 500 eventos | 124,4 ms | 41,7 ms |
| Agenda, 2000 eventos | 465,0 ms | 190,0 ms |
| Gantt, 1000 tarefas | 173,3 ms | 65,1 ms |
| GeoMap, 10000 pontos | 69,1 ms | 77,7 ms |
| GeoMap, 50000 pontos | 748,6 ms | 796,6 ms |

A cache limitada de formatadores melhora a agenda e também é usada pelo Gantt.
**O redesenho de mapas muito grandes não ficou resolvido**: a amostra final de
50k pontos demora cerca de 797 ms CPU e 1016 ms até duas frames. O lookup de rotas
e o culling não justificam uma promessa de melhoria global. O ensaio com sprites
teve resultados inconsistentes e foi retirado. Diagramas e alguns cenários sem
alteração direta também variaram; não atribuir todas as diferenças ao código nem
escolher apenas os melhores números. Ver metodologia em `PERFORMANCE.md`.

Evidência final: `beta-benchmark.json`; comparação original:
`beta-benchmark-before-2026-09-24.json`. O ficheiro identificado como
`discarded-sprite-experiment` é um ensaio descartado, não a candidata.

- SHA256 do bundle core: `c18bca3224c40d06852ad3958ef923c61da92a638dc1cd86fe7849164e312ed9`.
- SHA256 de working-time: `f28ef6e728cd32dced9352edf619c6e5e4d0c408933b47e6d07b03c275b0c5f2`.
- SHA256 do lockfile: `7a49ec1e5d2895b91a473bcc47a9d0b8a235696c10653cf77d42e354ee620508`.

## Segurança, acessibilidade e publicação

- Auditoria npm online: zero advisories no conjunto production; quatro entradas
  no grafo dev, sob duas exceções temporárias documentadas até 14/10/2026.
  Não foram apresentadas como vulnerabilidades corrigidas.
- Política de pedidos, CSP com nonce, JSON limitado, proteção de artefactos,
  downloads e licenças foram testados localmente. Sem pentest à infraestrutura.
- O percurso humano está em `NARRATOR-QUICK-CHECK.md`. Narrador instalado;
  execução e resultado humanos **ainda pendentes**. A sequência 3h → 2h → aplicar
  → desfazer foi validada no modelo: zero conflitos e reposição das 3h.
- O Site mantém a versão **15**, owner-only, zero convidados/grupos. Pedidos
  anónimos à página e ao manifesto de downloads devolveram 401. Isso não valida
  todas as sessões, cookies ou proteções do fornecedor.
- O fluxo local obrigatório da skill `sites-hosting` deixou de estar disponível
  no ambiente. Não houve publicação alternativa, abertura de acesso nem alteração
  da licença MIT. Os cinco arquivos locais `0.1.0-beta.1` não foram publicados no npm.
- As lacunas legais, de alojamento e de proveniência de assets permanecem no
  relatório `SECURITY-LEGAL-REVIEW-2026-09-24.md`. Não é certificação jurídica,
  WCAG ou garantia de impenetrabilidade.
