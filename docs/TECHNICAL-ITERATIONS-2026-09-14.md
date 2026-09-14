# Evolução técnica — 14/09/2026

Registo de 100 unidades de evolução identificadas e implementadas nesta execução. A validação foi feita em lotes de regressão, com ciclos adicionais quando surgiram falhas; isto **não representa 100 builds independentes, 100 publicações ou 100 componentes novos**. Uma parametrização de teste não é contada aqui como uma funcionalidade nova.

O resultado final de cada grupo depende da execução registada no relatório técnico, não da presença desta tabela. A baseline histórica está em `AUDIT-2026-09-14.md`. Os relatórios atuais estão em `outputs/technical-confidence/`.

## Fontes da validação

- **C:** `tests/audit/contracts.audit.ts` — contratos e lifecycle.
- **R:** `packages/core/test/confidence-regressions.test.ts` — regressões desta execução.
- **A:** `packages/core/test/adapters.test.ts` — testes unitários dos adaptadores; aplicações consumidoras reais no grupo I.
- **O:** `packages/core/test/operations.test.ts` — domínio/store operacional.
- **S:** `packages/core/test/statistics.test.ts` — referências estatísticas.
- **D:** `packages/core/test/diagram-math.test.ts` — referências geométricas.
- **B:** `tests/audit/interactions.spec.ts` — interação real no browser.
- **G:** `tests/audit/gpu-recovery.spec.ts` — WebGL real.
- **P:** `tests/audit/operations.spec.ts` — planeamento ponta a ponta.
- **U:** `tests/audit/portal-detail.spec.ts`, `supplemental.spec.ts` e `tests/e2e/` — portal, conteúdo, navegação e acessibilidade.
- **I:** `tests/runtime-audit/consumers.spec.ts` e `packages/core/test/integration-generator.test.ts` — distribuição e exemplos.

| ID | Requisito/bug identificado → alteração implementada | Validação |
| --- | --- | --- |
| TC001 | Updates ignoravam normalização → normalizar antes de substituir dados. | C |
| TC002 | Datas fora do intervalo Date → limites finitos explícitos. | R |
| TC003 | Valores null/boolean/object eram convertidos em datas → rejeição por tipo. | R |
| TC004 | Dependências falsy podiam escapar → referências não vazias e existentes. | R |
| TC005 | Owner inválido chegava ao renderer → validar estrutura e campos. | R |
| TC006 | Recorrência malformada → rejeitar valores não string e regra vazia. | R |
| TC007 | Inteiros RRULE inseguros → exigir precisão segura. | R |
| TC008 | UNTIL no epoch zero ignorado → comparação explícita com undefined. | R |
| TC009 | Intervalo mensal enorme podia não terminar → limites e saída por data inválida. | R |
| TC010 | Duração podia gerar fim inválido de calendário → validar data derivada. | R |
| TC011 | Opções públicas inválidas chegavam ao desenho → validação por família antes do commit. | R/C |
| TC012 | Troca de schema e dados não era atómica → controller.setState. | R/I |
| TC013 | Plugin repetido podia executar duas vezes → identidade em Set. | C |
| TC014 | Remoção de plugin não respeitava contexto anterior → teardown com contexto antigo. | C/R |
| TC015 | Teardown podia publicar estado transitório → bloquear mutações reentrantes durante setState. | R |
| TC016 | Recursão síncrona podia esgotar a stack → limites de mutações e renders. | R/C |
| TC017 | Erros duplicados/mascarados → canal onError e subscription coerentes. | C/R |
| TC018 | Listeners de erro continuavam depois de destroy → parar dispatch. | R |
| TC019 | Inicialização falhada deixava ResizeObserver → libertar recursos em falha. | C |
| TC020 | Destroy removia semântica original do contentor → restaurar atributos/tokens. | C |
| TC021 | Alterações de subscriptions durante dispatch eram instáveis → snapshots de listeners. | C |
| TC022 | Destroy dentro de callbacks permitia callbacks posteriores → interrupção explícita. | C/R |
| TC023 | Evento render contradizia documentação → payload tipado data/options. | C |
| TC024 | Conteúdo de dados precisava manter-se texto → DOM sem HTML executável. | C |
| TC025 | Cleanup incompleto após erro → tentar libertar todos os recursos/plugins. | C/B |
| TC026 | Tooltip omitia categoria → mostrar série, categoria e valor. | B |
| TC027 | Tooltip sem semântica acessível → role e associação identificável. | B |
| TC028 | Escape não dispensava tooltip → fechar por teclado. | B |
| TC029 | Foco não mostrava os mesmos detalhes do hover → conteúdo equivalente. | B |
| TC030 | Tooltip saía do contentor ou ignorava legenda → coordenadas e limites corretos. | B |
| TC031 | Tooltip podia manter dados antigos → invalidar com updates/formatters. | B |
| TC032 | Interação desativada não era consistente → respeitar flags de pointer/keyboard/tooltip. | B/C |
| TC033 | Buraco de donut selecionava dados → hit-testing de setor anular. | B |
| TC034 | Barra só era selecionável perto de um ponto → hit-testing do corpo. | B |
| TC035 | Error-bar não selecionava whiskers → união dos segmentos visíveis. | R |
| TC036 | Bullet não selecionava toda a barra → região retangular. | R |
| TC037 | Candlestick ignorava séries adicionais → agrupar todas e respeitar eixos. | R |
| TC038 | Muitas radial-bars produziam raios inválidos → largura proporcional dos anéis. | R |
| TC039 | Radar ignorava showGrid → grelha independente. | R |
| TC040 | Stacking alinhava índices em vez de categorias → identidade X partilhada. | C/R |
| TC041 | Datas ISO e Date não alinhavam → identidade temporal normalizada. | R |
| TC042 | Domínios/totais derivados podiam transbordar → validar ranges e somas antes do commit. | R |
| TC043 | Edição Gantt perdia foco → restaurar por identidade estável. | B |
| TC044 | Edição Calendar perdia foco → mesmo mecanismo de foco. | B |
| TC045 | pointercancel terminava como edição → cancelar gesto sem commit. | B |
| TC046 | Outro pointer terminava o drag → verificar pointerId. | B |
| TC047 | Densidade Gantt selecionava espaço vazio/disabled → geometria e flags reais. | B |
| TC048 | Updates de topologia repunham viewport → conservar controlo do utilizador. | B |
| TC049 | Cores CSS no WebGL eram inconsistentes → resolução de nomes/HSL/RGBA. | G |
| TC050 | Transparência WebGL multiplicava alpha duas vezes → blending separado. | G |
| TC051 | Perda real de contexto deixava canvas morto → fallback Canvas e listeners renovados. | G |
| TC052 | WebGL de topologia omitia relações → desenhar arestas e pontas. | B |
| TC053 | Tema system não seguia mudanças do SO → observar media query. | B |
| TC054 | Tabelas acessíveis tinham foco invisível → representação visível ao focar. | B, seis motores |
| TC055 | Contraste precisava de verificação por motor → scans WCAG automatizados no tema claro. | B, seis motores |
| TC056 | Não existia plano autoritativo → OperationalPlan schema 1 normalizado. | O |
| TC057 | Referências/ciclos operacionais precisavam de validação → IDs, DAG e relações explícitas. | O |
| TC058 | Marcos eram confundidos com duração inválida → duração zero sem ocupação. | O |
| TC059 | Ordenação profunda podia esgotar stack → ordem topológica iterativa de 10.000 tarefas. | O |
| TC060 | Faltava caminho crítico real → CPM com fixture diamante e empates. | O |
| TC061 | Lag, origem e release constraints precisavam de efeito matemático → passes forward/backward. | O |
| TC062 | Aresta entre tarefas críticas nem sempre é crítica → verificar relação temporal apertada. | O |
| TC063 | Alteração precisava propagar precedências → cascata para a frente com causas. | O/P |
| TC064 | Cascata podia violar locks → rejeitar movimento obrigatório de tarefa bloqueada. | O/P |
| TC065 | Intervalos adjacentes eram confundidos com sobreposição → capacidade semiaberta. | O |
| TC066 | Limites de capacidade perdiam precisão → libertar antes de alocar na mesma fronteira. | O |
| TC067 | Recursos precisavam representar indisponibilidade e frações → capacidade zero/unidades inteiras. | O |
| TC068 | Gráfico de carga somava tarefas disjuntas → pico concorrente por bucket. | O/P |
| TC069 | Vistas eram estados independentes → projeções Gantt/calendar/topology/map/load do plano. | O/P |
| TC070 | Comandos múltiplos podiam deixar estado parcial → transação validada antes de publicar. | O |
| TC071 | Faltava simulação sem efeitos → preview sem histórico/subscribers. | O |
| TC072 | Undo precisava desfazer a cascata inteira → snapshots e redo consistentes. | O/P |
| TC073 | Escrita concorrente precisava de deteção → expectedRevision e revisão monotónica. | O |
| TC074 | Histórico não podia crescer sem limite → historyLimit e invalidação de redo. | O |
| TC075 | Observador com erro não podia interromper restantes → isolamento de falhas e reentrância. | O |
| TC076 | Persistência precisava de contrato verificável → export/import JSON versionado. | O/P |
| TC077 | Formulário perdia segundos/milissegundos → preservar precisão e duração sub-hora. | P |
| TC078 | Guardar sem alterações criava undo fantasma → deteção de no-op. | O/P |
| TC079 | Rejeição visual podia divergir do store → restaurar projeção e foco. | P |
| TC080 | Mapa operacional fixo em Portugal → fit dos locais importados, incluindo Tóquio. | P |
| TC081 | Histograma era apenas um nome de barras → binning explícito, fronteiras e densidade. | S/R |
| TC082 | Violin não tinha densidade estatística → Gaussian KDE e Scott verificados numericamente. | S/R |
| TC083 | KDE precisava de limites e robustez numérica → orçamento, sparse arrays, tails e reescala. | S/R |
| TC084 | Contour não calculava isolinhas → marching squares nas 16 configurações de célula. | S |
| TC085 | Sela ambígua precisava de decisão correta → determinante assintótico e cruz exata. | S |
| TC086 | Treemap precisava de áreas proporcionais → D3 squarify/slice-dice e totais de folhas. | D |
| TC087 | Icicle precisava de conter filhos nos pais → partição hierárquica real. | D |
| TC088 | Sunburst precisava de hierarquia angular → intervalos aninhados e seleção por anel. | D |
| TC089 | Circle-pack precisava de áreas e contenção reais → packing quantitativo. | D |
| TC090 | Sankey precisava conservar escala de fluxo → larguras globais, DAG e pesos normalizados. | D |
| TC091 | Preparação matemática podia falhar após commit → preflight partilhado, incluindo domínios agregados. | R/D/S |
| TC092 | React podia entrar em loop de data:change → ignorar props iguais e separar option-only. | A |
| TC093 | Vue precisava aplicar dados/opções juntos e recuperar após erro pós-commit → watcher atómico/cache. | A/I |
| TC094 | Angular recuperava usando previousValue inválido → guardar opções efetivamente aplicadas. | A/I |
| TC095 | Custom element perdia estado/ARIA ao reconectar → snapshots, precedência de atributo e setState. | A/C/I |
| TC096 | Testes podiam depender do monorepo → verificar hashes dos tarballs e resolução isolada de todas as entradas dos bundles consumidores. | I |
| TC097 | Documentação confundia receitas/capacidades → 26 guias, schemas, limites e exemplos alinhados. | U/I |
| TC098 | Dependências vulneráveis sem política → atualizações e gate com exceções específicas e expirantes. | security-gate.mjs |
| TC099 | Relatórios HTML causavam reloads durante os testes → excluir evidence/work do watcher e repetir a matriz. | preview-isolation.spec.ts, gate completo |
| TC100 | Release e UX não tinham uma verificação única → gate de 16 etapas, CI readonly, temas/texto/modais/percurso completo. | verify-release.mjs, U/P |

## Regressões adicionais encontradas na verificação final

- **Reflow real:** a 320 px, o explorador escondia controlos mesmo com `scrollWidth=320`. Texto computado ampliado a 200% também fazia sair controlos dos cabeçalhos. Corrigidos grid min-content, wraps e offsets dinâmicos da documentação; `reflow.spec.ts` mede os controlos e os ancestrais que os recortam. Scrollers locais intencionais não são confundidos com controlos perdidos. A simulação text-only não equivale a zoom do browser nem amplia Canvas.
- **Clipboard da documentação:** o fallback mostrava “Copiado” mesmo quando `execCommand` devolvia false. Agora a mensagem de sucesso exige sucesso real; uma falha seleciona o código e explica a cópia manual. Dois contratos de browser cobrem ambos os caminhos.
- **WebKit e controlos nativos:** o modal regista explicitamente o acionador e gere o ciclo Tab completo, inclusive quando a preferência nativa omite botões/links. Checkboxes têm contorno contrastante e estado marcado visível. Comparações de datetime usam UTC exato (fallback text no WebKit/Windows); seleção manual admite apenas a equivalência CRLF/LF e pan admite erro subpixel inferior a 0,00005 px.
- **Ambientes de teste separados:** os E2E de release executam o build de produção. A regressão do watcher executa um servidor de desenvolvimento separado; não deve passar por testar um servidor sem watcher. As execuções incompletas e os erros de transporte do servidor dev são preservados e descritos no relatório, não contados como aprovações.

## O que esta lista não certifica

Não certifica paridade de mercado, estabilidade de versões futuras, todos os dispositivos físicos, leitores de ecrã ou funcionalidades que o catálogo marca como limitadas. Calendários laborais, timezone completo da grelha, scheduling com recursos, mapas por tiles, 3D, colaboração e funcionalidades empresariais continuam no programa de evolução.
