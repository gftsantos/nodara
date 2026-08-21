# Nodara — registo de 100 iterações

Cada iteração seguiu o mesmo ciclo: identificar uma limitação, implementar a alteração e validar com um teste automatizado ou uma verificação real no browser. A suite final contém 197 testes automatizados no core, além das verificações desktop e mobile do portal.

| # | Funcionalidade ou bug identificado | Desenvolvimento / correção | Validação |
|---:|---|---|---|
| 1 | Updates contornavam validação | O controller normaliza todos os `update()` | I106, I125 |
| 2 | Dados atuais não eram consultáveis | Adicionado `getData()` tipado | I107 |
| 3 | Opções atuais não eram consultáveis | Adicionado `getOptions()` tipado | I109 |
| 4 | Opções exigiam recriar renderers | Adicionado `setOptions()` reativo | I108 |
| 5 | Updates não notificavam consumidores | Evento `data:change` consistente | I110 |
| 6 | Mudanças de opções eram silenciosas | Evento `options:change` | I111 |
| 7 | Listeners não tinham ciclo completo | Unsubscribe determinístico | I112 |
| 8 | Core não tinha extensões | API de plugins com `beforeRender` | I113 |
| 9 | Plugins não recebiam pós-render | Hook `afterRender` | I113 |
| 10 | Plugins não observavam dados | Hook `onDataChange` | I114 |
| 11 | Plugins não observavam opções | Hook `onOptionsChange` | I115 |
| 12 | Plugins não libertavam recursos | Hook `onDestroy` | I116 |
| 13 | Erros de renderer não eram encaminhados | Callback `onError` e evento `error` | I118 |
| 14 | Destroy deixava conteúdo residual | Limpeza de DOM, atributos e observers | I117 |
| 15 | Progresso Gantt podia exceder 100 | Clamp superior | I001 |
| 16 | Progresso Gantt podia ser negativo | Clamp inferior | I002 |
| 17 | Normalização podia mutar dados | Clonagem imutável | I003 |
| 18 | Intervalos Gantt invertidos eram aceites | Erro estável `ND_INVALID_RANGE` | I004 |
| 19 | IDs Gantt duplicados eram aceites | Validação de unicidade | I005 |
| 20 | IDs Gantt vazios eram aceites | Validação de presença | I006 |
| 21 | Tarefas sem título eram aceites | Validação de label | I007 |
| 22 | Dependências inexistentes eram aceites | Validação de referências | I008 |
| 23 | Tarefas podiam depender de si próprias | Erro `ND_SELF_DEPENDENCY` | I009 |
| 24 | Dependências repetidas criavam ligações duplicadas | Deduplicação | I010 |
| 25 | Dependências não eram desenhadas | Camada de paths ortogonais/retos | I121 |
| 26 | `zoom` Gantt era ignorado | Densidade de escala por day/week/month/quarter | I031–I034, I120 |
| 27 | Escala temporal não tinha modelo público | `buildTimeScale()` | I031–I038 |
| 28 | Range automático falhava com dados vazios | Range seguro de um dia | I029 |
| 29 | Range explícito não tinha precedência testada | `start`/`end` estáveis | I030 |
| 30 | Conversão tempo/pixel era ad hoc | Conversores percentuais bidirecionais | I036–I038 |
| 31 | Snap não era configurável | Snap day/week/custom/none | I039–I042 |
| 32 | Movimento de tarefas não existia | `shiftTask()` e commit imutável | I043, I124 |
| 33 | Resize inicial não existia | Handle e modelo `resize-start` | I044, I165 |
| 34 | Resize final não existia | Handle e modelo `resize-end` | I045, I165 |
| 35 | Resize podia inverter duração | Duração mínima | I046 |
| 36 | Substituição de tarefa era manual | `replaceTask()` | I047 |
| 37 | Pares de dependências não eram reutilizáveis | `dependencyPairs()` | I048 |
| 38 | Gantt não suportava teclado para selecionar | Enter/Espaço | I123 |
| 39 | Gantt não suportava teclado para mover | Setas com snap | I124 |
| 40 | Gantt não suportava teclado para resize | Shift/Alt + setas | I124 |
| 41 | Gantt não tinha drag-and-drop | Pointer drag com `task:change` | I164 |
| 42 | `task:change` nunca era emitido | Callback e evento com before/after | I124, I164–I165 |
| 43 | `interactive=false` era ignorado no Gantt | Remoção de foco e handlers | I122 |
| 44 | Grandes Gantt criavam milhares de nós DOM | Density Canvas/WebGL + fallback acessível configurável | I138, I181 |
| 45 | Gantt não expunha renderer ativo | `data-nd-renderer` | Browser desktop |
| 46 | Séries duplicadas eram aceites | Validação de IDs | I011 |
| 47 | Infinity era aceite em gráficos | Validação finita | I012 |
| 48 | NaN era aceite em gráficos | Validação finita | I013 |
| 49 | Datas inválidas eram aceites em eixos | Validação de Date | I014 |
| 50 | Normalização de séries não era imutável | Clonagem de séries e pontos | I015 |
| 51 | `stacked` era ignorado | Baselines positivos e negativos | I102–I103 |
| 52 | Domínio stacked podia cortar valores | Domínio inclui value e baseline | I104 |
| 53 | Gráfico só tinha line/area/bar | Adicionado scatter | I101 |
| 54 | Grid não era configurável | `showGrid` | I126 |
| 55 | Eixos não eram configuráveis | `showAxes` e formatters | I126 |
| 56 | Labels não eram personalizáveis | `labelFormatter` | I126 |
| 57 | Tooltips não existiam | Tooltip por hit-area | I129 |
| 58 | Canvas não era acessível por teclado | Tabela com botões de pontos | I127–I128 |
| 59 | `interactive=false` não afetava charts | Tab order e pointer controlados | I174 |
| 60 | Grandes séries não selecionavam renderer | Threshold Canvas/WebGL | I096–I097, browser dense |
| 61 | Não havia primitive WebGL real | Shaders, buffers e points renderer | I137 |
| 62 | 10k pontos não tinham teste | Teste de geometria e fallback DOM limitado | I139, I179 |
| 63 | Edges podiam apontar para nós ausentes | `ND_DANGLING_EDGE` | I016 |
| 64 | Nós duplicados eram aceites | Validação de node IDs | I017 |
| 65 | Edge IDs duplicados eram aceites | Validação de edge IDs | I018 |
| 66 | Normalização de topologia mutava input | Clonagem imutável | I019 |
| 67 | `layout` era ignorado | Motor de layouts selecionável | I049–I062 |
| 68 | Layout manual não respeitava coordenadas | Manual com fallback | I049–I050 |
| 69 | Layout radial não era reutilizável | Algoritmo radial | I051–I052 |
| 70 | Layout grid não existia | Grid determinístico | I053–I054 |
| 71 | Hierarquias não eram legíveis | Layout por níveis | I055–I056 |
| 72 | Auto-layout avançado não existia | Force layout determinístico | I057–I059 |
| 73 | Auto-layout não escolhia estratégia | Manual/force/grid por contexto | I060–I062 |
| 74 | Topologia não suportava zoom | Wheel zoom com limites | I167 |
| 75 | Topologia não suportava pan | Pointer pan e viewport event | I168 |
| 76 | Estado de viewport não era observável | `onViewportChange` | I167–I168 |
| 77 | Canvas topology não era acessível | Lista de controlos por nó | I131, I172 |
| 78 | `interactive=false` não afetava topology | Tab order e handlers controlados | I175 |
| 79 | 10k nós não tinham teste | Layout de 10.000 nós e fallback DOM limitado | I140, I180 |
| 80 | Duração de calendário zero era aceite | Validação positiva | I021 |
| 81 | Duração negativa era aceite | Validação positiva | I022 |
| 82 | Intervalos de evento invertidos eram aceites | Range validation | I023 |
| 83 | Recorrências inválidas passavam silenciosamente | Parser com erro estável | I024, I074 |
| 84 | Start de eventos não era normalizado | Timestamp normalizado | I025 |
| 85 | IDs de eventos duplicados eram aceites | Validação de unicidade | I026 |
| 86 | Títulos vazios eram aceites | Validação de título | I027 |
| 87 | Recorrência diária não era expandida | `FREQ=DAILY` | I067, I077 |
| 88 | Recorrência semanal não era expandida | `FREQ=WEEKLY` | I069, I078 |
| 89 | Recorrência mensal não era expandida | `FREQ=MONTHLY` | I070, I079 |
| 90 | Interval/count/until não eram suportados | RRULE subset completo | I068, I071–I072 |
| 91 | BYDAY não gerava dias múltiplos | Expansão semanal multi-day | I073, I163 |
| 92 | Recorrências podiam gerar indefinidamente | Hard limit configurável | I081 |
| 93 | Ocorrências perdiam identidade | IDs e metadata de origem | I082–I083 |
| 94 | Views tinham ranges inconsistentes | Day/week/workweek/month model | I063–I066 |
| 95 | Recursos não eram filtráveis | Resources e visibleResourceIds | I134 |
| 96 | Calendário não tinha edição | Movimento/resize por teclado e pointer | I136, I166 |
| 97 | Vue ignorava mudanças de opções | Watch profundo + `setOptions()` | I149 |
| 98 | Angular ignorava mudanças de opções | `ngOnChanges` para dados e opções | I151–I155 |
| 99 | Web Components recriavam tudo | Updates incrementais, options e eventos | I156–I162 |
| 100 | Playground era apenas uma maquete | React adapters reais, browser desktop/mobile e contraste 5.9:1 | I141–I146, I178, browser QA |

## Validação adicional

- 197 testes automatizados em cinco suites.
- TypeScript strict nos cinco pacotes.
- Build ESM, CJS e declarações para core e adaptadores.
- Browser desktop: Gantt editável, dependencies, Chart Canvas/WebGL, Topology e Calendar recorrente.
- Browser mobile: menu, playground, calendário e ausência de overflow global.
- Modo claro: contraste do destaque corrigido de fluorescente sobre claro para 5.9:1.
