# Nodara — comparação por capacidades, não por quantidade de demos

Referência: 14 de setembro de 2026. Fontes dos fabricantes; não é um benchmark independente de velocidade nem uma declaração de paridade. As páginas podem mudar. Clientes e pilotos comerciais estão fora deste programa.

Nodara contém **6 componentes visuais, 69 configurações agrupadas, 100 receitas e 31 presets adicionais**, mais um modelo/store operacional. As receitas não são componentes independentes. O número de testes, isoladamente, também não mede maturidade.

| Referência | Profundidade demonstrada pelo produto | Nodara nesta revisão | Próximo critério objetivo |
| --- | --- | --- | --- |
| [Plotly.js científico](https://plotly.com/javascript/scientific-charts/) e [3D](https://plotly.com/javascript/3d-charts/) | Contornos, ternários, coordenadas paralelas, superfícies, malhas e outros gráficos científicos especializados. | Histogramas, KDE, isolinhas retangulares e gráficos 2D; sem motor 3D, ternários ou coordenadas paralelas. | Contratos e fixtures próprios para cada família; avaliar módulos opcionais antes de aumentar o peso do core. Não equiparar um scatter WebGL 2D a um motor científico 3D. |
| [Apache ECharts](https://echarts.apache.org/en/feature.html) | Muitas famílias, datasets, transforms, brush, zoom e renderização incremental. | Canvas, scatter WebGL, eventos/temas, geometrias comuns, histogramas/KDE/isolines e layouts quantitativos de hierarquia/fluxo. | DataZoom/brush coordenado, transforms, atualização incremental, workers e benchmarks iguais por dataset. |
| [Highcharts](https://www.highcharts.com/products/) | Chart/Stock/Maps/Gantt/Grid/Dashboards; ferramentas especializadas de acessibilidade, exportação e finanças. [Sincronização](https://www.highcharts.com/docs/dashboards/synchronize-components). | Modelo operacional partilhado com transações; candles/OHLC básicos, mapas de coordenadas, tooltips e alternativas de teclado. | Indicadores financeiros, sessões de mercado, exportação validada, sonificação e controlo de interações cruzadas. Não anunciar isto como implementado. |
| [Syncfusion](https://www.syncfusion.com/javascript-ui-controls) | Suite geral de mais de 140 componentes UI, para além de visualizações. | Seis componentes focados em visualização; não há grid/editor/formulários equivalentes à suite. | Comparar os casos de visualização e integração, não 100 receitas com 140 widgets. Uma suite UI geral não é requisito implícito do core. |
| [Bryntum Gantt](https://bryntum.com/products/gantt/) | Motor de scheduling especializado, restrições, baselines e caminho crítico. | FS+lag não negativo, CPM precedence-only, capacidade, cascata para a frente, bloqueios, preview e undo/redo atómicos. | Calendários laborais/feriados, SS/FF/SF, restrições adicionais, nivelamento, baselines, edições em recurso e testes DST. |
| [yFiles](https://docs.yworks.com/yfiles-html/dguide/features/index.html) | Layouts, routing/ports/labels, algoritmos de grafos, agrupamento e análises. | Manual/grid/radial/force/hierárquico, pan/zoom, seleção, arestas WebGL; D3 hierarchy/Sankey por trás do schema Nodara. | Portas, routing com obstáculos, contenção de grupos, edição de arestas, layouts assíncronos e referências de qualidade. ER/state atuais são caixas e ligações, não notações semânticas completas. |
| [FullCalendar](https://fullcalendar.io/docs) | Calendários, recursos, regras de recorrência, timezones e business hours, com vários adaptadores. | Dez vistas, edição nas vistas principais, RRULE DAILY/WEEKLY/MONTHLY limitado, filtro/seleção; grelha no fuso do browser. | Fuso real da grelha, recorrências avançadas, exceções identificadas por instante, edição de vistas de recursos e calendários laborais. Ter adaptadores não é exclusividade Nodara. |
| [MapLibre GL JS](https://maplibre.org/projects/gl-js/) | Tiles, estilos geográficos, globo/terreno/extrusão e pipeline geográfico WebGL. | Projeções locais, pontos/rotas/polígonos fornecidos pelo consumidor. Não inclui basemap, tiles ou geocoding. | Integração opcional com um motor cartográfico dedicado, com licença/peso/atribuição e testes próprios. Recriar um motor de tiles não é um atalho para qualidade. |

## Proposta de valor a comprovar

1. **Coerência operacional:** editar uma tarefa produz uma transação única que atualiza Gantt, calendário, dependências, locais e carga. O histórico desfaz a operação inteira, não apenas uma vista.
2. **Integração observável:** editor de dados, erro explicável, opções explícitas, eventos visíveis, código com os dados atuais e ficheiros instaláveis. Os exemplos devem executar a partir dos tarballs candidatos.
3. **Confiança verificável:** contratos de normalização, ciclo de vida, foco/teclado, geometria, modelos numéricos e browsers. Publicar ambiente, resultados e exclusões; não publicar um “60 FPS” fixo.
4. **Limites transparentes:** presets e implementações distintas identificados; só promover uma capacidade depois de a testar. A dimensão do catálogo não prova equivalência a produtos especializados.

Estes pontos são posicionamento potencial, não diferenciação exclusiva demonstrada por estudo comercial. Não houve contacto com clientes, validação de procura ou estimativa de receita nesta execução.

## Licença e rentabilização

Mantém-se a licença MIT existente e a audiência atual do portal. Não foram publicados pacotes no npm nem alterada a licença. Para um futuro modelo open-core, separar serviços, suporte e funcionalidades empresariais de uma API aberta e sustentável; não reclassificar retroativamente contribuições de terceiros sem análise da titularidade/licenças. A decisão comercial permanece aberta — confiança técnica é necessária, mas não prova procura.

## Regra para encerrar uma lacuna

Requisito reproduzível → contrato público → implementação → fixture de referência → testes nos renderers/adaptadores aplicáveis → documentação → medição quando relevante → artefacto distribuído e instalado num consumidor limpo.

O programa pode reduzir estas lacunas de forma incremental. **Esta revisão não certifica Nodara como a biblioteca mais completa do mercado.**
