# Nodara — segunda ronda de confiança técnica

Baseline: `a1d7429a1c6161aca03d21e1d6e775c7e59954bb`. Este registo complementa,
sem substituir, o relatório do primeiro marco. Não declara paridade universal
com produtos especializados nem conclusão do programa de desenvolvimento.

## Implementação

- WebGL em chart/Gantt retém canvas, programa, uniformes e buffer. O armazenamento
  cresce por capacidade; updates não recompilam shaders. Mudança de modo, falhas
  nativas de alocação/upload, perda de contexto e destroy libertam recursos. Só
  contextos pertencentes ao componente são explicitamente perdidos; a API one-shot
  preserva o canvas do chamador. Menos trabalho redundante em escalas e cores.
- Scheduling elapsed: FS, SS, FF e SF, com antecipações/atrasos em milissegundos
  inteiros. Conflitos, cascata, CPM e causas usam a mesma desigualdade de início.
  Bounds intermédios são BigInt e só datas efetivamente escolhidas são convertidas;
  restrições redundantes fora do intervalo Date não invalidam soluções válidas.
  O Gantt DOM preserva os quatro anchors e o tipo/lag das relações.
- `@nodara/core/working-time`: calendário semanal ISO, pausas, feriados/exceções,
  IANA, DST, horários ambíguos/inexistentes, soma/subtração de trabalho e segmentos
  UTC. Entrada opcional separada com Temporal 0.5.1; o bundle principal não o carrega.
  ESM/CJS partilham a classe de erro do respetivo core e têm declarações específicas.
- Diagramas de caixas: portas nomeadas, margem aos nós, encaminhamento ortogonal
  com obstáculos e orçamento partilhado. Falhas/rotas degeneradas são explícitas,
  sem fallback que atravesse nós. Avisos visíveis em altura fixa e descrição
  semântica com nomes de nós/portas e direção da ligação.
- `/operations`: editor transacional de relações, laboratório laboral e laboratório
  de portas/percursos. JSON editável, resultados imediatos e código copiável. O
  exemplo laboral é verificado como JS e TS; confirmação de cópia só se aplica ao
  conteúdo efetivamente copiado. O exemplo vertical cabe em ecrãs estreitos.

## Evidência e reprodução

O resultado autoritativo é a execução completa, não a soma de tentativas. A bateria
tem retries desligados e inclui segurança, builds, lint, tipos, unidade, gerador de
exemplos, contratos, HTML compilado, consumidores isolados e browsers. Executar:

```text
npm run verify:release
NODARA_CONSUMER_VARIANT=minimum npm run test:consumers
node scripts/summarize-technical-confidence.mjs
node scripts/benchmark.mjs
node scripts/benchmark-updates.mjs
```

A atribuição da variável acima usa sintaxe POSIX; em PowerShell, definir
`$env:NODARA_CONSUMER_VARIANT = 'minimum'` apenas durante esse comando e restaurar
o valor anterior. As medições de desempenho devem correr sem testes concorrentes.

Os JSON finais ficam em `outputs/technical-confidence/`. O resumo identifica a
revisão/base, dirty state, hashes dos pacotes e exclusões; rejeita datas/contagens
inválidas ou relatórios anteriores ao início da bateria. O workflow preserva os
artefactos e executa também consumidores mínimos. Consultar a execução ligada à
revisão em [GitHub Actions](https://github.com/gftsantos/nodara/actions): sucesso
Windows não é prova de sucesso Ubuntu. Não foi acrescentado npm publish ao workflow.

Novas regressões cobrem:

- Retenção/libertação de GPU e falhas nativas sem exceção JavaScript; pixels novos
  e antigos, dez updates, cor, resize, seleção recente e teardown real em browser.
- Quatro relações com lag negativo/zero/positivo, folga, ramos mistos, bloqueios,
  rollback e histórico; coerção inválida de enums e limites extremos de datas.
- Lisboa nas duas mudanças de hora, Lord Howe, Kathmandu, feriados e horários
  partidos; meia-noite inexistente em São Paulo; políticas estritas e isolamento.
- Rotas diretas, obstáculos, paredes, stubs bloqueados, offsets de portas, resize,
  auto-ligações, degenerescência, limites de pesquisa e opções incompatíveis.
- Pacote laboral instalado de tarball: ESM, require, NodeNext, Bundler, browser,
  identidade de erros e ausência de Temporal no bundle principal.
- Laboratórios no portal desktop/mobile emulado: alterações válidas, recuperação
  de JSON inválido, desfazer, lag fracionário rejeitado, temas e cópia atualizada.

As falhas iniciais de UI foram preservadas em `outputs/advanced-labs-first-failures/`:
o seletor de teste do tipo de relação foi corrigido para o nome acessível real;
o exemplo horizontal de três nós sobrepunha-se num ecrã estreito e passou a vertical.
O gate preliminar foi interrompido para incorporar achados da revisão independente;
não conta como aprovação final. A baseline anterior foi preservada separadamente.

A bateria detalhada detetou ainda um seletor antigo que assumia existir apenas um
`details` na página operacional. Agora identifica o painel pelo campo «Plano completo»
e abre-o pelo `summary`, mantendo as mesmas asserções de precisão/importação. A
evidência dessa falha está em `outputs/diagram-details-selector-failure/`; não foi
alterado o contrato das tarefas para fazer os testes passarem.
No ensaio WebKit, o teste do mapa lia a geometria antes de o canvas da nova vista
montar. Agora espera explicitamente pela sua visibilidade antes do clique, sem
retries de testes nem alargamento do timeout.

## Resultado final local — 14 de setembro de 2026

O gate final decorreu entre `18:42:39.272Z` e `18:56:59.869Z`, com as 16 etapas
aprovadas. Os consumidores mínimos foram executados depois, antes de gerar o resumo
às `19:00:48.712Z`: **1 296 casos aprovados, zero falhas, nove exclusões de perfil**
(1 305 casos contabilizados). Uma execução por suite/perfil; repetições de depuração
não entram na contagem e casos parametrizados não representam funcionalidades distintas.

| Suite | Aprovados | Excluídos por perfil |
| --- | ---: | ---: |
| Unidade, adaptadores e gerador de integração | 747 | 0 |
| Contratos públicos | 57 | 0 |
| HTML compilado | 4 | 0 |
| Consumidores isolados atuais | 29 | 0 |
| Portal desktop/mobile emulado | 70 | 4 |
| Detalhe Chromium/Firefox/WebKit/mobile emulado | 359 | 5 |
| Isolamento da pré-visualização | 1 | 0 |
| Consumidores mínimos React 18.2 / Vue 3.3 | 29 | 0 |

As exclusões são interações exclusivas de mobile/desktop ou cobertura repetida da
mesma grelha de receitas; os nomes e motivos estão em `summary.json`. Não correspondem
a testes com falha desativados. Builds, lint, tipos e instalação real dos tarballs
também passaram. Segurança: zero avisos nas dependências de produção; quatro entradas
moderadas agregadas no conjunto completo, com duas exceções temporárias de tooling
documentadas até 14 de outubro. Essas exceções não são correções das vulnerabilidades.

O estado testado é a base `a1d7429a1c6161aca03d21e1d6e775c7e59954bb` com alterações
locais, identificado como `dirty: true`, e lock SHA-256
`4dd6ab0f9c6a8554c3f10fb730a54f6007cb849c663e6c345c75e5cf3cebd02c`.
O core ESM final medido tem SHA-256
`c809e0fdb9c846b249e6137623fc96a0f14ea0daf670f0831de762ef8e4294dc`:
292 023 bytes raw, 67 676 gzip e 55 181 Brotli. Face à baseline, o gzip cresceu
5 096 bytes; as capacidades adicionais não são gratuitas em tamanho.

Medições finais sem testes concorrentes, neste Windows/i5-1235U, Chromium headless
151.0.7922.34 e Node 22.13.1. Valores de atualização completa em milissegundos:

| Cenário | Mediana anterior | Mediana final | p95 anterior | p95 final |
| --- | ---: | ---: | ---: | ---: |
| Linha, 10 mil pontos | 37,4 | 11,8 | 68,0 | 15,3 |
| Scatter WebGL, 100 mil pontos | 676,7 | 78,7 | 1 174,1 | 102,5 |
| Gantt WebGL, 10 mil tarefas | 149,9 | 68,6 | 537,0 | 159,6 |

Os ensaios anteriores e finais foram executados separadamente no mesmo computador;
carga do sistema/estado térmico não foram controlados. Não se atribui toda a diferença
exclusivamente ao código, nem se extrapola para outros dispositivos. Os resultados
intermédios também estão preservados, em vez de escolher apenas a melhor tentativa.

O segundo ensaio final, com trinta conjuntos alterados por componente, registou
mediana/p95 de **87,9/111,1 ms** no scatter e **59,15/75,5 ms** no Gantt. Em ambos,
um programa e um buffer criados, conservados durante os updates e eliminados no
destroy; canvas retido, DOM estável (610/606 elementos), nenhum descendente após
destroy e nenhum erro de browser. A mediana de trinta amostras é a média das duas
centrais. O heap sem recolha forçada oscilou aproximadamente de 49 para 171 MB no
scatter e de 172 para 34 MB no Gantt: estes valores não constituem prova de ausência
de fugas de memória. As durações continuam suficientemente grandes para exigir
trabalho incremental/workers em experiências com atualizações muito frequentes.

**Publicação/CI pendentes:** a tentativa de commit não concluiu porque a confirmação
local da assinatura GPG expirou. Não foi desativada a assinatura nem alterada a
configuração Git. Não há novo commit/push/deploy desta ronda; o Site permanece na
versão anterior e o sucesso GitHub/Ubuntu ainda não foi validado para estas alterações.

### Método e limites das medições

Os relatórios incluem tamanhos, ambiente, amostras e hashes. `benchmark.mjs` mede
dois warmups e nove ciclos de mount/full-update/destroy; com nove amostras, p95
nearest-rank é o máximo. `benchmark-updates.mjs` faz dois warmups e trinta updates
com dados alterados num único componente (100 mil pontos / 10 mil tarefas), contando
programas/buffers, DOM estável e libertação. Geração dos dados não entra no tempo.

São medições síncronas de CPU e submissão GPU, não paint concluído, FPS, latência
de input, soak de horas nem memória física da GPU. Amostras de heap sem GC forçado
não provam ausência de leaks. A retenção melhora o custo, mas normalizar e percorrer
todo o dataset continua a bloquear a thread; updates incrementais/workers ficam abertos.

## Limites que permanecem explícitos

1. O relógio laboral não converte automaticamente o plano elapsed: ainda faltam
   calendários por recurso, CPM laboral, baselines, earned value e nivelamento.
2. Routing evita nós, não outras ligações. Não é um editor BPMN/UML completo;
   agrupamento avançado, auto-ligações desenhadas e layouts assíncronos ficam abertos.
3. A grelha do calendário visual continua baseada no fuso do browser; o módulo
   laboral IANA é separado. Não apresentar rótulos com fuso como transformação da grelha.
4. Só está disponível este computador Windows. Não foi detetado NVDA instalado.
   A sessão com leitor real continua por executar, com o percurso em
   [ACCESSIBILITY-DESKTOP-VALIDATION.md](ACCESSIBILITY-DESKTOP-VALIDATION.md).
   WebKit/emulação não equivalem a Safari/iPhone nem a VoiceOver/TalkBack físicos.
5. A licença e a audiência do Site não mudam. Nenhum cliente/piloto foi inventado,
   nenhum pacote foi publicado no npm e não há garantia de liderança de mercado.
