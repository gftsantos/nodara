# Nodara — implementação e evidência técnica

Data: 14/09/2026. Baseline histórica: `1533df581ce3fa99b6b9e9f4fa94e7efd36ea4d9`.
Esta é uma evolução da alpha, não uma certificação de liderança de mercado.
Clientes, entrevistas, pilotos e mudanças de licença estão fora desta execução.

## Resultado implementado

- **Planeamento operacional integrado:** modelo/store público, cinco vistas ligadas,
  seleção partilhada, edição, validação de dependências, conflitos de capacidade,
  CPM por precedências, cascata, bloqueios, undo/redo e import/export JSON.
- **Núcleo defensivo:** normalização e opções verificadas antes de substituir estado,
  `setState(data, options)` atómico, eventos tipados, lifecycle/plugins/erros coerentes,
  cleanup e preservação da semântica do contentor do consumidor.
- **Interação real:** tooltips utilizáveis por teclado, geometrias de seleção corretas,
  foco preservado, cancelamento/identidade de pointers, viewport estável, cores e
  recuperação de perda de contexto WebGL.
- **Matemática real:** binning de histogramas, Gaussian KDE/Scott, marching squares,
  hierarquias quantitativas e Sankey, com referências numéricas e limites de trabalho.
- **Integração e distribuição:** opções dinâmicas nos adaptadores, consumidores
  instalados a partir dos cinco tarballs, hashes, avisos MIT/D3, documentação de
  migração, changeset não publicado, política de segurança e CI.
- **Portal:** design preservado, contraste e texto revistos, reflow a 320 px com texto
  ampliado, modais acessíveis e cópia de código com fallback honesto.

O catálogo continua a representar **6 componentes visuais, 69 configurações
agrupadas, 100 receitas e 31 presets adicionais**. Há 26 guias. Aumentar esses
números não foi usado como substituto de melhorar os motores existentes.

## Validação final

**Estado: marco técnico aprovado localmente.** A execução integral das 16 etapas
terminou com `passed: true`, entre 16:26:45 e 16:45:53 UTC de 14/09/2026
(17:26:45–17:45:53 em Lisboa). A matriz mínima foi executada depois e o resumo
consolidado foi gerado às 16:49:49 UTC, verificando a atualidade de cada relatório.

| Grupo | Aprovados | Reprovados | Excluídos |
| --- | ---: | ---: | ---: |
| Unitários, adaptadores e gerador de integração | 670 | 0 | 0 |
| Contratos públicos | 57 | 0 | 0 |
| HTML compilado das quatro páginas | 4 | 0 | 0 |
| Consumidores isolados — versões atuais | 28 | 0 | 0 |
| Portal — desktop e mobile emulado | 64 | 0 | 4 |
| Detalhe — Chromium, Firefox, WebKit e mobile emulado | 351 | 0 | 5 |
| Isolamento do preview de desenvolvimento | 1 | 0 | 0 |
| Consumidores isolados — mínimos React/Vue | 28 | 0 | 0 |
| **Total de casos parametrizados** | **1.203** | **0** | **9** |

São 1.212 casos planeados, não 1.212 funcionalidades independentes. O resumo conta
uma execução final por suite/perfil, sem acumular os ciclos de diagnóstico. Não
houve casos flaky. As nove exclusões têm motivo explícito: quatro percursos de
navegação específicos de desktop/mobile, três testes de toque executados apenas no
perfil mobile e duas repetições do catálogo já cobertas na suite do portal. Não há
exclusões por defeitos conhecidos. As 100 receitas foram percorridas nos quatro
perfis através das duas suites complementares.

As suites finais executam sobre o build de produção; o watcher de desenvolvimento
tem uma configuração e um servidor separados. Retries estão desativados. Nenhum
defeito conhecido foi convertido em sucesso com `test.fail` ou `fixme`. A matriz
gráfica detalhada executa com um worker. Foram também revistas visualmente as
capturas finais do planeamento em desktop escuro, WebKit claro e mobile claro.

### O que os testes demonstram — e o que não demonstram

- As 100 receitas são percorridas em Chromium, Firefox, WebKit e Pixel 7 emulado:
  montagem, pintura e ausência de exceções. Isto não prova todas as combinações de
  opções. Os algoritmos têm fixtures e testes numéricos separados.
- O gerador produz e analisa as cinco integrações das 100 receitas; também verifica
  tipos de 100 exemplos React e um caso adicional com opções aninhadas, e compila
  100 templates Angular com AOT. Não são 500
  aplicações executadas integralmente em cinco runtimes.
- Consumidores reais: React 19.2.8 e 18.2.0, Vue 3.5.41 e 3.3.0, Angular 21.2.21 e
  Web Components. Cada matriz exercita os seis componentes e a troca atómica de
  dados/schema. Não certifica todas as versões intermediárias ou futuras.
- Axe, foco, teclado, geometria, gestos, contraste e reflow são verificações
  complementares. WebKit no Windows não é Safari num iPhone; touch emulado não é
  um dispositivo físico. Não houve avaliação manual com NVDA/VoiceOver.
- A ampliação de texto computado inclui tamanhos em px; não é zoom real do browser
  nem ampliação do texto desenhado dentro de Canvas/WebGL. Scrollers de código,
  tabelas e visualizações continuam a ser locais e intencionais.
- Os contratos unitários usam Happy DOM; os consumidores e interações usam browsers
  reais. Angular tem testes unitários de lifecycle, JIT real e compilação AOT, que
  não devem ser confundidos entre si.

## Ciclos e falhas preservadas

O [registo de evolução](docs/TECHNICAL-ITERATIONS-2026-09-14.md) liga 100 unidades
implementadas a grupos de regressão, além de correções adicionais da verificação
final. A validação decorreu em lotes e ciclos de correção, **não em 100 builds ou
publicações independentes**. Execuções de diagnóstico não são somadas repetidamente
ao total final.

Ocorrências relevantes durante a execução:

1. Asserções antigas contradiziam o contrato decidido de `render` e o conteúdo dos
   tooltips. Foram alinhadas com os contratos publicados e mantidas como regressões.
2. O cache de opções Vue ficava desatualizado após um erro de cleanup pós-commit.
   Reproduzido com um teste que falhou antes da correção e passou depois.
3. Domínios numéricos agregados podiam transbordar mesmo com séries individualmente
   válidas. Foram acrescentados preflight partilhado e contraexemplos.
4. Artefactos HTML de testes ativavam o watcher e descartavam edições não exportadas.
   Excluídos os diretórios de evidence/work; a regressão escreve HTML real e confirma
   que a página e a edição continuam intactas.
5. Uma execução do gate encontrou três expectativas obsoletas do portal: comandos
   npm anteriormente anunciados e contagem de guias. Foram corrigidas para os
   tarballs efetivamente disponíveis e os 26 guias, sem mudar o produto para fazer
   passar uma expectativa antiga.
6. Houve quatro `NS_ERROR_NET_RESET` em Firefox/dev e cinco `ERR_EMPTY_RESPONSE`
   numa execução do portal sobre produção, antes de entrar na aplicação. A inspeção
   encontrou **WSL relay em `::1:3000` e `127.0.0.1:3000` simultâneo ao Node em
   `0.0.0.0:3000`**: a origem local não estava isolada. Os E2E passaram a usar portas
   dedicadas 4173/4174, binding e baseURL explícitos em `127.0.0.1`, sem reutilizar
   servidores desconhecidos. A flag instalada é `--hostname`, não `--host`, que a
   CLI ignora. WSL não foi parado nem reconfigurado. As execuções anteriores não
   são apresentadas como aprovadas; a matriz final verifica o ambiente isolado.
7. O primeiro teste real de reflow reprovou nas quatro páginas. Corrigidos layouts,
   controlos cortados e offsets. Um falso positivo posterior incluía filtros com
   scroll local intencional; a seleção do teste foi restringida aos controlos que
   precisam de caber, mantendo verificações de ancestrais que recortam conteúdo.
8. O fallback de cópia da documentação podia anunciar sucesso sem copiar. Agora
   ambos os caminhos, sucesso e bloqueio, têm contratos de browser próprios.
9. No Firefox/Windows, a seleção manual serializa quebras de linha como CRLF,
   enquanto `textContent` usa LF. Um probe confirmou 181 versus 184 caracteres,
   exatamente três CR adicionais, os mesmos 14 espaços e foco/mensagem corretos.
   O contrato do teste compara apenas CRLF como LF; não remove espaços, indentação
   ou linhas. O conteúdo entregue diretamente à Clipboard API continua a exigir
   igualdade exata. A execução que revelou a diferença permanece registada.
10. A primeira matriz completa no ambiente isolado terminou com 328 aprovações,
    sete falhas e cinco exclusões. Além do CRLF, dois casos impunham a serialização
    Chromium a `datetime-local`; WebKit/Windows usa fallback text. O campo e o JSON
    mantinham os milissegundos exatos em guardar/desfazer/refazer, pelo que o teste
    passou a comparar o instante UTC. O pan mobile diferia 0,00000763 px por escala
    fracionária: a tolerância explícita é inferior a 0,00005 px, não arredondamento
    para um pixel inteiro. Nenhuma destas diferenças exige truncar dados no produto.
11. Dois testes revelaram defeitos reais de foco no modal WebKit: a ordem Tab nativa
    podia omitir botões/links e clicar no botão não o tornava o `activeElement`.
    A aplicação passou a guardar explicitamente o acionador e gerir o ciclo Tab
    completo entre controlos visíveis. A revisão visual também identificou caixas
    de seleção quase invisíveis: agora têm contorno/tick explícitos e regressão de
    contraste de 3:1 e interação por Space nos dois temas.
    Os blocos de código roláveis entram agora no ciclo de teclado. Atalhos de
    pesquisa não abrem um segundo modal atrás do primeiro; a pesquisa tem label,
    trap, retorno de foco, botão de fechar e contraste testados separadamente.
12. Houve um timeout de clique WebKit no botão Guardar durante a primeira matriz
    isolada. Um probe sem clique forçado passou em 432 ms, confirmou rollback,
    rect estável, página visível e callbacks de frames a progredir. Isto não explica
    retroativamente o timeout; a ocorrência é preservada e a repetição completa
    continua obrigatória, sem retries, force ou exclusão do caso.
13. “Abrir exemplo” ainda usava dados iniciais e JSX com variáveis indefinidas.
    Agora usa os últimos dados válidos e o mesmo gerador de componentes React
    completos do catálogo. Uma regressão percorre as quatro famílias, edita dados,
    introduz JSON inválido e verifica exportação/cópia sem perder o estado válido.
    Os botões de cópia da página inicial também tratam bloqueio e desmontagem sem
    falso sucesso. Simulação local e formatadores do portal são explicitamente
    excluídos do exemplo exportado.
14. A bateria adicional de diálogos encontrou uma expectativa de teste incorreta
    em mobile: o acionador de pesquisa visível está no explorador, não no cabeçalho
    oculto. Passou a escolher o acionador realmente visível. Um teste agregado
    WebKit esgotou o orçamento após navegação, 16 passos Tab, Axe, fecho e reabertura;
    o trace situa o último clique nos 10,3 s finais. Separados os percursos de
    teclado e de contraste/fecho em casos independentes, mantendo as verificações.
    Foi observado CPU total a 100%; a matriz de detalhe passa a usar um worker
    para não pôr dois browsers gráficos a competir. Isto não é uma prova causal
    retroativa dos timeouts nem aumento do limite de 45 s por caso.
15. O gate de tipos detetou que o novo consumidor do gerador fornecia opções
    aninhadas, enquanto o tipo dos presets do catálogo só permitia escalares.
    O gerador passou a ter um contrato de entrada próprio; os tipos públicos dos
    componentes mantêm-se. Um exemplo aninhado entra na compilação React e uma
    falha/timeout do compilador Angular reprova mesmo sem texto de diagnóstico.
16. Uma nova passagem parou na auditoria porque npm devolveu um objeto de erro
    vazio na consulta de produção. Não foi aceite nem substituído por um relatório
    antigo. Uma consulta nova devolveu o formato válido com zero findings; o gate
    completo foi novamente iniciado. Falhas do serviço externo permanecem falhas
    da execução, não aprovações automáticas.

A auditoria anterior permanece intacta em `AUDIT-2026-09-14.md`: 775 casos por
perfil, 604 aprovados, 162 reprovados e 9 excluídos. Os 162 eram execuções falhadas,
não 162 bugs únicos. Os novos resultados não devem ser misturados com essa baseline.

## Desempenho medido

Ambiente: Windows 10.0.26200, Intel i5-1235U, 12 CPUs lógicas, 34.049.875.968 bytes
de RAM, Node 22.13.1, Chromium headless 151.0.7922.34, DPR 1, contentor 1000×500.
Execução sem outras suites em paralelo. Dois aquecimentos e nove amostras por caso;
o p95 nearest-rank com nove amostras é o máximo observado.

**Só tempo síncrono de mount/update/destroy.** Não mede paint completo, FPS,
latência interativa, memória retida a longo prazo ou desempenho de concorrentes.

| Cenário | Volume | p95 mount | p95 atualização integral |
| --- | ---: | ---: | ---: |
| Linha Canvas | 1.000 pontos | 20,8 ms | 27,9 ms |
| Linha Canvas | 10.000 pontos | 52,3 ms | 68,0 ms |
| Scatter WebGL | 100.000 pontos | 616,0 ms | 1.174,1 ms |
| Gantt automático, WebGL escolhido | 10.000 tarefas | 187,5 ms | 537,0 ms |
| Topologia grid Canvas | 1.000 nós | 35,9 ms | 18,7 ms |
| Topologia force Canvas, 30 iterações | 100 nós | 37,4 ms | 46,8 ms |
| Mapa Canvas | 10.000 pontos | 31,3 ms | 21,7 ms |
| Treemap Canvas | 1.000 nós | 21,6 ms | 16,9 ms |
| Calendário mensal DOM | 500 eventos | 203,5 ms | 193,2 ms |

CPU/modelo, p95: normalização de uma cadeia operacional de 10.000 tarefas **38,7 ms**;
CPM **47,8 ms**; capacidade **37,6 ms**; KDE de 10.000 amostras em 128 posições
**56,7 ms**; marching squares 100×100 em cinco níveis **35,9 ms**.

Não foram registadas exceções de página e destroy não deixou elementos no contentor
nestes casos. Isto não é um soak test nem uma prova de ausência de leaks de GPU.
O limite padrão das alternativas acessíveis é 300 itens, explicitamente reportado.

O core ESM sem minificação adicional mede **272.405 bytes**, **62.580 gzip** e
**50.902 Brotli**; SHA-256 `eb3f24302943388cc6cebcf5b0d2b00b8d0506701156b5addf95d849615d03db`.
Não confundir bundle completo, bundle tree-shaken, tarball e download total do portal.

**Conclusão:** os grandes updates completos ainda bloqueiam demasiado tempo para
uma promessa de streaming fluido. A prioridade seguinte é profiling, retenção de
recursos, updates incrementais e trabalho assíncrono, com medição de paint e input.

## Segurança e release

A auditoria npm do ambiente de desenvolvimento passou de 22 entradas agregadas
(12 altas, 10 moderadas) para **4 moderadas agregadas**, associadas a dois advisories
folha de esbuild no tooling. `npm audit --omit=dev` reportou **zero entradas**.
Isto não equivale a ausência de vulnerabilidades ou a um teste de penetração.

As duas exceções são temporárias, por versão/caminho/advisory, com hashes dos
chamadores e expiração em **14/10/2026**. O gate rejeita desvios e expiração; não
foram usados overrides incompatíveis para esconder findings. Ver `SECURITY.md` e
`security-exceptions.json`.

CI preparada com permissões read-only, ações fixadas por SHA, dependências travadas,
16 etapas e artefactos. A validação aqui é local Windows; ainda não se afirma uma
execução aprovada no GitHub/Ubuntu. Publicação npm automática foi removida do fluxo.
Os cinco candidatos contêm licença; o core inclui avisos de D3.

Mantêm-se MIT, a audiência privada do portal e as versões alpha existentes.
Não foram publicados pacotes no npm, alterado o acesso do GitHub ou contactados
clientes. Uma release npm exige versão imutável, titularidade/canais de manutenção
confirmados, política de migração e autorização específica.

## Próximos critérios técnicos — programa ainda aberto

| Prioridade | Trabalho | Evidência necessária para encerrar |
| --- | --- | --- |
| 1 | Performance de updates e lifecycle de GPU | Perfis de CPU/GPU, datasets reproduzíveis, primeira pintura/input, memória e soak; medir atualizações parciais sem reconstrução integral. |
| 2 | Calendários laborais e timezones | Modelo de fuso/horários/feriados explícito, casos DST e recorrências com exceções, testes em fusos diferentes. |
| 3 | Scheduling especializado | SS/FF/SF, restrições, baselines e nivelamento; fixtures de viabilidade/conflitos e transações reversíveis. Não esconder heurísticas como soluções ótimas. |
| 4 | Profundidade de grafos/diagramas | Ports, routing com obstáculos, grupos, edição de arestas e layouts assíncronos; métricas de qualidade e fixtures próprias. |
| 5 | Ciência, finanças e mapas | Indicadores/sessões financeiras, famílias científicas adicionais, módulo geográfico opcional; contratos, licenças e peso separados. |
| 6 | Confiança de distribuição | CI real Ubuntu, matriz de versões suportadas, leitores de ecrã/dispositivos reais, canais de segurança e changelog/versionamento. |

O planeamento schema 1 permanece em tempo decorrido UTC, FS+lag não negativo e CPM
de precedências. Não há nivelamento automático de recursos, calendários laborais,
colaboração, contas ou persistência cloud. O calendário visual usa a grelha do fuso
do browser e RRULE limitado. ER/state/chord e mapas têm limites no catálogo.

O trabalho acima é uma base concreta para continuar o programa, não uma declaração
de que a Nodara já iguala ECharts, Plotly, Bryntum, yFiles ou MapLibre. A comparação
por capacidades e fontes está em `COMPETITIVE-CAPABILITIES.md`.

## Evidência e reprodução

```text
npm ci
npx playwright install chromium firefox webkit
npm run verify:release
NODARA_CONSUMER_VARIANT=minimum npm run test:consumers
node scripts/benchmark.mjs
node scripts/summarize-technical-confidence.mjs
```

No Windows usar `npm.cmd`; a atribuição de variável é
`$env:NODARA_CONSUMER_VARIANT='minimum'` e deve ser removida antes de repetir a matriz
atual. Ambiente de referência: npm 11.19.1. Em CI Linux instalar também as dependências
de sistema do Playwright (`--with-deps`).

Relatórios em `outputs/technical-confidence/`: gate, unitários, contratos, portal,
matriz de browsers, preview, consumidores atuais/mínimos, segurança, benchmark e
resumo consolidado. Outputs/work/downloads gerados estão ignorados no Git; os testes,
scripts e este relatório versionado permitem reproduzir a evidência.

A confirmação de publicação, versão e URL pertence ao resultado nativo de deploy
desta tarefa. Uma compilação local, por si só, não significa que o Site foi atualizado.
