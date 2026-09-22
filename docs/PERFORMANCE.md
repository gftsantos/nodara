# Desempenho: medir, não prometer

Executar `npm run build:lib`, depois `npm run benchmark`, sem builds ou testes em
paralelo. O relatório fica em `outputs/technical-confidence/beta-benchmark.json`.
Contém commit, estado dirty, hashes dos dois bundles e lockfile, CPU, RAM, sistema,
Node e Chromium. Dados sintéticos são determinísticos e mudam em cada atualização.

## Cobertura

| Família | Cargas medidas | Configuração |
| --- | --- | --- |
| Chart | 1k / 10k / 100k pontos | Scatter, Canvas / WebGL com fallback registado |
| Gantt | 100 / 1k / 10k tarefas | Renderer automático |
| Topology | 100 / 500 / 1k nós | Grid Canvas, cadeia de ligações |
| GeoMap | 1k / 10k / 50k pontos | Canvas |
| Diagram | 100 / 1k / 5k nós | Treemap Canvas |
| Calendar | 100 / 500 / 2k eventos | Agenda DOM |
| WorkingPlan | 50 / 200 / 500 tarefas | 10 recursos, fusos/férias, com/sem nivelamento |

Estas cargas não estabelecem máximos suportados nem representam todas as variantes.
Force layout, roteamento de diagramas, KDE, contornos e calendários recorrentes têm
custos diferentes. O script anterior `scripts/benchmark.mjs` complementa alguns
desses cenários; `scripts/benchmark-updates.mjs` verifica retenção de recursos GPU.

## Interpretação

- Mount: uma observação fria por cenário. Não calcular percentis dessa observação.
- Atualização: 2 aquecimentos + 9 amostras, mesmo controller, todos os dados mudam.
  Geração dos dados excluída; normalização e desenho CPU incluídos.
- Resposta: duas chamadas requestAnimationFrame após update ou teclado. Não é FPS,
  fence de GPU, nem medição de latência de um dispositivo físico.
- Interação: Enter real do browser sobre um item semântico; verificar evento de
  seleção e tempo desde keydown. Isto não mede todas as interações de ponteiro.
- Memória: heap JS após GC explícito, antes de montar e depois de destruir; DOM
  removido é uma invariável. Delta positivo isolado não prova uma fuga; compilações,
  caches e runtime também retêm memória. Não mede VRAM.
- p95 usa nearest rank; com 9 amostras é o máximo. Guardar amostras, não só a média.

Comparar revisões apenas no mesmo ambiente, renderer efetivo e dados. Uma regressão
repetida merece investigação; uma única corrida ruidosa não deve bloquear CI por
um limiar arbitrário. Resultados de Chromium headless não certificam desempenho em
telemóveis, outros browsers ou todos os computadores dos utilizadores.

## Limites explícitos

WorkingPlan: 500 tarefas/recursos, 5000 dependências/alocações, 200000 intervalos
compilados, 200000 intervalos de interseção em cache, 200000 segmentos úteis e
2000000 reservas (também sem nivelamento). Cada calendário: 1–3660 dias,
20000 intervalos, 24 períodos/dia e 3660 exceções. Recursos em fusos diferentes
podem precisar de mais um dia civil para cobrir o horizonte UTC do projeto.

O relógio indexado usa pesquisa binária e somas prefixadas: adicionar/subtrair
trabalho custa O(log I + S), e medir trabalho entre instantes O(log I), onde I é o
número de intervalos e S os segmentos produzidos. Interseções são lineares. O
nivelamento serial revê as reservas dos recursos envolvidos; não é um solver ótimo.
