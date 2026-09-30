# Nodara — programa de confiança técnica e planeamento integrado

Início: 14/09/2026. Base: auditoria `AUDIT-2026-09-14.md`, revisão `1533df5`.

## Objetivo e regras

Criar uma biblioteca de visualização consistente, acessível e integrável, e um espaço de planeamento operacional cujas vistas partilham os mesmos dados e regras. O portal mantém a identidade visual atual. Clientes, entrevistas e pilotos comerciais estão fora desta execução, por indicação do utilizador.

“Não ficar atrás de nenhuma biblioteca” é a direção competitiva, não um resultado que se possa declarar por contagem de receitas. Cada capacidade terá estado, limites, testes e evidência. A paridade com todos os produtos especializados não está presumida. Não haverá alteração da licença MIT ou da audiência do Site sem pedido específico.

Cada iteração: **requisito/bug → implementação → regressão automatizada → verificação → registo**. Um teste pode ser corrigido se contradiz o contrato real e decidido, mas a alteração e a razão serão registadas. Falhas conhecidas não serão escondidas por retries ou marcações de sucesso esperado.

## Fases e critérios de saída

| Fase | Entregáveis | Critério de conclusão | Estado |
| --- | --- | --- | --- |
| A — integridade do núcleo | Normalização defensiva, erros consistentes, lifecycle, plugins, destruição, semântica do contentor, eventos tipados, opções dos adaptadores. | Requisitos de contratos da auditoria resolvidos; estados inválidos não substituem dados válidos. | Validada no âmbito dos contratos deste marco |
| B — interação e acessibilidade | Tooltips, hit-testing geométrico, foco preservado/visível, gestos canceláveis, viewport estável, WebGL coerente, contraste e modais. | Matriz Chromium/Firefox/WebKit/mobile sem falhas conhecidas nestes requisitos. | Matriz automática aprovada; avaliação manual permanece em F |
| C — planeamento integrado | Modelo partilhado, validação, transações, seleção comum, desfazer/refazer, dependências, conflitos de recursos, caminho crítico, vistas Gantt/calendário/mapa/topologia/gráfico. | Uma alteração legítima reflete-se em todas as vistas; alterações inválidas são atómicas; testes de domínio e E2E. | Schema 1 implementado e validado; limites abaixo |
| D — profundidade matemática | Estatística/histogramas/densidades, hierarquias/Sankey/treemap, layouts, calendário e scheduling avançado com contratos explícitos. | Exemplos de referência com resultados numéricos conhecidos e casos extremos; funcionalidades limitadas são identificadas. | Parcial: matemática de referência validada; calendários/scheduling avançados abertos |
| E — experiência do developer | Catálogo sem redundância enganadora, estados por capacidade, documentação da API, editor de dados/opções, código executável, projetos consumidores. | Exemplos instalados a partir dos artefactos distribuídos executam sem configuração oculta. | Validada na matriz atual e nos mínimos React/Vue; não em todas as versões possíveis |
| F — engenharia de release | Licença nos pacotes, versões/changelog, segurança de dependências, CI, matriz de frameworks, acessibilidade manual e benchmarks. | Compilação e testes reproduzíveis; métricas publicadas com ambiente/volumes; limitações restantes visíveis. | Parcial: gate local aprovado; CI Ubuntu, dispositivos/leitores reais e performance prolongada abertos |
| G — comparação por capacidades | Matriz ECharts/Plotly/Highcharts/Syncfusion/Bryntum/FullCalendar/yFiles/MapLibre. | Cada diferença tem implementação comprovada, integração opcional fundamentada ou lacuna explicitamente aberta. | Matriz documentada; paridade não atingida nem presumida |
| H — publicação e passagem | Publicar revisão validada do portal, manter audiência, documentação e resultados alinhados. | Deploy confirmado; sem apresentar fases abertas como concluídas. | Revisão validada; confirmação de publicação no resultado nativo desta tarefa |

## Prioridade de correção da auditoria

1. Dados e lifecycle: A07–A14, A16–A17, A21.
2. Seleção, teclado, tooltips, viewport e WebGL: A01–A09, A15.
3. Portal e apresentação: A18–A20.
4. Novos cenários integrados e contraexemplos matemáticos.

## Contrato implementado — schema 1 e limitações

- Identificadores estáveis; tarefas, recursos e locais referenciados explicitamente.
- Datas normalizadas; intervalos semiabertos `[início,fim)`; duração e capacidade em inteiros seguros não negativos (duração zero representa um marco); alocações positivas. Relações FS/SS/FF/SF com lag inteiro com sinal (evolução de 14/09/2026, segunda ronda).
- Um único estado autoritativo; as vistas são projeções, não cópias concorrentes.
- Comandos transacionais; validação antes de publicar alterações; dependências cíclicas rejeitadas.
- Histórico limitado e snapshots isolados; seleção partilhada na UI, separada do histórico; importação/exportação JSON com versão.
- Conflitos de capacidade e restrições visíveis, não resolução silenciosa.
- Scheduling com pressupostos publicados; não confundir tempo decorrido com calendários laborais, fusos ou recursos infinitos.
- Persistência: sessão da página e ficheiro JSON explícito; recarregar perde alterações não exportadas. Histórico, revisão e seleção não são exportados. Não prometer contas, colaboração ou armazenamento cloud não implementados.

## Matriz de validação

- Testes unitários de domínio e contratos, dados inválidos, limites, negativos e ciclos.
- Testes reais dos seis motores e adaptadores, lifecycle, opções, eventos e teardown.
- E2E dos percursos do portal, catálogo, documentação e planeamento.
- Interação por rato, teclado e touch emulado; cancelamento e múltiplos pointers.
- Axe + testes de foco; testes manuais com leitores de ecrã/dispositivos reais permanecem abertos se indisponíveis.
- Performance por família: definir dataset, operações, hardware, browser, duração e percentis; nenhum “60 FPS” sem medição.
- Build e pacotes; instalação em consumidores; controlo de tamanho e dependências.

## Registo de execução

- Plano iniciado; auditoria preservada como baseline histórica.
- Decisão de compatibilidade: manter `render` com payload `{data, options}` e corrigir documentação/tipagem/teste contraditório.
- Decisão de tooltip: mostrar série, categoria e valor; atualizar asserções antigas que exigiam ausência da categoria.

## Marco validado em 14/09/2026

- Gate integral: 16 etapas aprovadas; resultado consolidado de 1.203 aprovações,
  zero falhas e nove exclusões justificadas, sem retries. Uma execução final por
  suite/perfil; não somar novamente os ciclos anteriores.
- 100 unidades de evolução registadas com requisito, implementação e regressão,
  além das correções da validação final. Não representam 100 builds independentes.
- Seis componentes visuais, 69 configurações agrupadas, 100 receitas e 26 guias.
  Os números do catálogo não são apresentados como componentes independentes.
- Medições de CPU e de nove cenários de browser publicadas com volumes e ambiente;
  updates integrais grandes continuam a ser uma prioridade de desempenho.
- Ver [relatório completo](TECHNICAL-CONFIDENCE-REPORT-2026-09-14.md) para resultados,
  falhas preservadas, versões, exclusões e limites da evidência.

## Sequência operacional seguinte

### Incremento de 15/09/2026

- Catálogo em três níveis: seis APIs de componentes, 69 variantes de configuração
  e 100 exemplos. Presets de domínio não são componentes especializados adicionais.
- Chord ponderado, mindmap bilateral, radial-tree por profundidade, atributos e
  cardinalidades ER, estados inicial/final e transições curvas. Gantt com fronteiras
  UTC reais e textos localizados; sprint/release com horizontes e dados distintos.
- Schema 2 laboral: calendário partilhado, dependências FS/SS/FF/SF, capacidade por
  segmentos úteis, prévia, aplicação atómica e histórico transversal. Cinco vistas
  recebem o mesmo plano; JSON editável e integração completa copiável.
- A validação final é registada em `outputs/technical-confidence/`; a CI preserva
  os mesmos relatórios como artefactos. Não reutilizar contagens históricas como
  prova da revisão atual nem equiparar emulação a leitores de ecrã físicos.

### Trabalho que continua aberto

1. Medir e reduzir o custo dos updates grandes: retenção de recursos, updates
   incrementais e trabalho assíncrono, com paint/input e soak de memória/GPU.
2. Evoluir o calendário laboral partilhado para calendários por recurso e CPM
   laboral, sem confundir horas úteis com duração elapsed. As quatro relações e
   lag com sinal existem nos dois modelos; baselines e nivelamento de recursos
   continuam abertos.
3. Evoluir os ports e routing com obstáculos agora implementados: grupos, ciclos
   semânticos, qualidade de layout e processamento assíncrono permanecem abertos.
4. Separar módulos científicos, financeiros e geográficos opcionais, com contratos,
   licenças, atribuição e orçamento de tamanho definidos antes de integrar.
5. Executar CI Ubuntu e validação com leitores de ecrã/dispositivos reais; confirmar
   manutenção e canais de segurança antes de uma release npm autorizada.

Cada item mantém o ciclo requisito → implementação → testes → documentação →
evidência. Clientes continuam fora do âmbito. O programa completo permanece aberto;
este marco não constitui paridade com todos os produtos especializados.
