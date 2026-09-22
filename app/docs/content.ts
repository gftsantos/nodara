export type DocGroupId = "start" | "components" | "frameworks" | "foundations" | "reference";

export interface ApiRow {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

export interface DocSection {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}

export interface CodeBlock {
  label: string;
  language: string;
  code: string;
}

export interface DocPage {
  id: string;
  group: DocGroupId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  packageName?: string;
  badges: string[];
  facts: Array<{ value: string; label: string }>;
  sections: DocSection[];
  code?: CodeBlock[];
  api?: Array<{ title: string; rows: ApiRow[] }>;
  events?: ApiRow[];
  keywords: string[];
}

export const docGroups: Array<{ id: DocGroupId; label: string }> = [
  { id: "start", label: "COMEÇAR" },
  { id: "components", label: "COMPONENTES" },
  { id: "frameworks", label: "FRAMEWORKS" },
  { id: "foundations", label: "FUNDAÇÕES" },
  { id: "reference", label: "REFERÊNCIA" },
];

const baseOptions: ApiRow[] = [
  { name: "ariaLabel", type: "string", defaultValue: "por componente", description: "Nome acessível aplicado ao elemento raiz e à representação semântica." },
  { name: "className", type: "string", defaultValue: "—", description: "Classe adicional no elemento raiz Nodara." },
  { name: "interactive", type: "boolean | InteractionOptions", defaultValue: "true", description: "Ativa globalmente ou por capacidade: keyboard, pointer, pan e zoom." },
  { name: "locale", type: "string", defaultValue: "en", description: "Locale BCP 47 usado em datas, números e rótulos." },
  { name: "theme", type: "light | dark | system", defaultValue: "system", description: "Tema visual resolvido por instância." },
  { name: "tokens", type: "Partial<ThemeTokens>", defaultValue: "{}", description: "Substituições locais de cores, fonte, bordas e raio." },
  { name: "renderer", type: "auto | dom | canvas | webgl", defaultValue: "auto", description: "Motor preferido; WebGL recua automaticamente para Canvas quando necessário." },
  { name: "performance", type: "PerformanceOptions", defaultValue: "{}", description: "Thresholds, limite acessível e pixel ratio máximo." },
  { name: "plugins", type: "NodaraPlugin[]", defaultValue: "[]", description: "Hooks antes/depois de render, updates e destroy." },
  { name: "onError", type: "(error: Error) => void", defaultValue: "—", description: "Canal centralizado de erros do renderer." },
];

const controllerRows: ApiRow[] = [
  { name: "element", type: "HTMLElement", defaultValue: "readonly", description: "Elemento host controlado pela instância." },
  { name: "getData()", type: "TData", defaultValue: "—", description: "Devolve os dados normalizados atuais. Não os alteres diretamente; usa update/setState." },
  { name: "getOptions()", type: "TOptions", defaultValue: "—", description: "Devolve as opções efetivas atuais." },
  { name: "update(data)", type: "void", defaultValue: "—", description: "Normaliza novamente os dados e redesenha sem recriar o controller." },
  { name: "setOptions(options)", type: "void", defaultValue: "—", description: "Faz merge parcial e aplica opções dinamicamente." },
  { name: "setState(data, options)", type: "void", defaultValue: "—", description: "Valida os dados e opções em conjunto e faz um único render. Usa ao mudar para um tipo com schema diferente." },
  { name: "resize()", type: "void", defaultValue: "—", description: "Força nova medição e renderização." },
  { name: "on(event, listener)", type: "() => void", defaultValue: "—", description: "Subscreve um evento e devolve a função de unsubscribe." },
  { name: "destroy()", type: "void", defaultValue: "—", description: "Remove listeners, observers, conteúdo e plugins." },
];

export const docsPages: DocPage[] = [
  {
    id: "statistics", group: "reference", label: "Estatística e isolinhas", eyebrow: "MATH CONTRACTS", title: "Resultados numéricos antes da aparência.",
    description: "Histogramas com limites explícitos, densidade gaussiana e isolinhas de grelhas escalares. Funções TypeScript puras, sem DOM, usadas pelos componentes reais.",
    packageName: "@nodara/core", badges: ["Fixtures numéricos", "Sem DOM", "Limites explícitos"],
    facts: [{ value: "KDE", label: "gaussiano" }, { value: "n−1", label: "Scott · SD amostral" }, { value: "[a,b)", label: "bins" }, { value: "x,y,z", label: "grelha escalar" }],
    sections: [
      { id: "histogram", title: "Amostras → bins → componente", body: "histogram(samples,{edges}) calcula bins, includedCount, underflowCount e overflowCount. Os edges são estritamente crescentes. Cada bin inclui o limite esquerdo e exclui o direito, exceto o último que o inclui. density=count/(includedCount×largura); a integral é 1 se existirem amostras incluídas. histogramSeries conserva binStart/binEnd/count/density em meta, permitindo larguras numéricas desiguais.", bullets: ["Com samples=[0,0.5,1,2,4] e edges=[0,1,4], counts=[2,3] e densities=[0.4,0.2].", "Sem amostras: contagens e densidades zero. Não inventa uma distribuição.", "Chart type=histogram continua a aceitar x/y pré-agregados sem limites. Não interpreta esses dados antigos como amostras brutas."] },
      { id: "kde", title: "Violin e Gaussian KDE", body: "gaussianKDE(samples,{bandwidth,evaluationPoints}) devolve bandwidth, sampleCount e points[{value,density}]. Um bandwidth numérico é uma largura absoluta na unidade dos dados. Scott usa desvio-padrão amostral × n^(-1/5). A densidade não é renormalizada quando a janela de avaliação é truncada.", bullets: ["Chart type=violin interpreta data[].y como amostras brutas; cada série produz um violino. A largura usa uma escala comum de densidade entre séries, não um valor arbitrário por índice.", "A curva visual usa 128 avaliações entre min−3h e max+3h. Há marcas nas observações reais; selecionar a curva identifica a observação mais próxima, não uma nova amostra.", "Scott exige variância finita e diferente de zero. O helper rejeita dados degenerados sem bandwidth explícito; o renderer mostra apenas marcas nesses casos, com data-nd-density=samples-only.", "Para samples=[0], h=1, f(0)=0.3989422804014327. Com samples=[0,2], Scott devolve h≈1.2311444133449163."] },
      { id: "contour", title: "Contornos: grelha explícita, não pontos dispersos", body: "ScalarGrid={x,y,values}: eixos estritamente crescentes; values é row-major, index=row*x.length+column. marchingSquares(grid,levels) devolve segmentos com level,a{x,y},b{x,y}. Interpola nos edges e resolve células de sela pelo determinante bilinear, normalizado para evitar overflow. Uma sela exata produz quatro braços até ao ponto de sela.", bullets: ["scalarGridSeries converte a grelha para o schema editável: ChartSeries.gridY é a coordenada Y da linha; point.x é a coordenada X; point.y é o valor escalar. seriesScalarGrid faz o caminho inverso e valida todas as linhas.", "Chart type=contour desenha as isolinhas; contourLevels controla os níveis, por defeito cinco interiores ao intervalo de valores. Tooltip e seleção referem-se aos pontos amostrados da grelha.", "Não calcula KDE 2D, interpolação de observações dispersas, isolinhas geográficas com projeção, polígonos preenchidos ou stitching em polígonos fechados.", "Uma grelha vazia, constante ou unidimensional não recebe círculos decorativos para simular contornos."] },
      { id: "limits", title: "Precisão, limites e erros", body: "NaN/Infinity, limites invertidos, grelhas irregulares e bandwidth inválido são rejeitados. KDE limita samples×avaliações e marching squares limita células×níveis a 10 milhões de operações de referência por chamada. Reescala dados que excedam a precisão numérica; não trates a biblioteca como um pacote de inferência estatística.", bullets: ["Os helpers não inferem causalidade, significância estatística ou decisões financeiras.", "Fixtures verificam valores conhecidos, invariantes de escala, integral, todos os 16 masks de contorno e casos extremos. Não existe certificação de todos os possíveis inputs numéricos."] },
    ],
    code: [
      { label: "HISTOGRAMA · JAVASCRIPT", language: "ts", code: "import { createChart, histogram, histogramSeries } from '@nodara/core';\nimport '@nodara/core/styles.css';\nconst result = histogram([0, 0.5, 1, 2, 4], { edges: [0, 1, 4] });\nconst chart = createChart('#chart', {\n  type: 'histogram',\n  series: [histogramSeries(result, { id: 'h', label: 'Densidade', measure: 'density' })]\n});\n// HTML: <div id=\"chart\" style=\"height:420px\"></div>\n// Ao desmontar: chart.destroy();" },
      { label: "CONTORNO · JAVASCRIPT", language: "ts", code: "import { createChart, scalarGridSeries } from '@nodara/core';\nimport '@nodara/core/styles.css';\nconst grid = { x: [0, 2], y: [10, 14], values: [0, 2, 0, 2] };\nconst chart = createChart('#chart', {\n  type: 'contour', series: scalarGridSeries(grid), contourLevels: [1]\n});\n// A isolinha é x=1, desde y=10 até y=14.\n// Ao mudar simultaneamente os dados/tipo: chart.setState(nextSeries, nextOptions);" },
    ],
    keywords: ["statistics", "histogram", "KDE", "violin", "contour", "Scott", "gaussian", "isolines", "grelha", "bins"],
  },
  {
    id: "operations", group: "components", label: "Planeamento integrado", eyebrow: "OPERATIONAL CORE", title: "Um plano operacional. Cinco projeções sincronizadas.",
    description: "Modelo TypeScript independente do DOM, transações atómicas, dependências FS/SS/FF/SF, capacidade, caminho crítico e histórico. Experimenta o workspace em /operations e exporta os dados para a tua integração.",
    packageName: "@nodara/core · @nodara/core/working-time", badges: ["Schemas 1 e 2", "Contínuo ou laboral", "API alpha"],
    facts: [{ value: "5", label: "projeções" }, { value: "4", label: "relações" }, { value: "CPM", label: "precedências" }, { value: "UTC", label: "timestamps" }],
    sections: [
      { id: "working-plan", title: "Plano laboral integrado · schema 2", body: "Em /operations escolhe Planeamento laboral · impacto. Um feriado, a capacidade da equipa ou o trabalho útil de uma tarefa produzem uma prévia transversal: Gantt, agenda, dependências, locais e carga. As datas só são guardadas ao aplicar. A agenda respeita o fuso do projeto e inclui todos os segmentos do horizonte; o Gantt mostra o intervalo total e mantém seleção, com edição de datas pelo inspector/JSON.", bullets: ["Importa createWorkingPlanStore, evaluateWorkingPlan e workingPlanViews de @nodara/core/working-time. WorkingPlan usa schemaVersion:2, timeBasis:'working', calendar, horizon e workingMs em cada tarefa, em vez de durationMs. Não há conversão implícita do schema 1.", "startMs é o início solicitado; windows contém início/fim calculados e segmentos úteis. FS/SS/FF/SF e notBeforeMs são respeitados; lagMs continua a ser tempo decorrido. Remover um feriado recalcula a partir dos inícios solicitados, não cristaliza a cascata anterior.", "Capacidade usa intervalos úteis semiabertos [start,end), nunca o fim de semana ou a noite dentro da barra. preview(candidate) não altera o estado; apply(candidate,expectedRevision,allowConflicts=false) valida novamente e publica uma única revisão. Sobrecarga é rejeitada salvo aprovação explícita; ciclos, horizonte insuficiente e bloqueios continuam a ser erros.", "locked fixa a janela calculada no primeiro snapshot; não força um início solicitado fora de turno. Alterar ou remover uma janela bloqueada exige desbloquear numa transação anterior. Undo/redo restaura calendário, capacidade e tarefas; uma nova alteração elimina redo. Histórico limitado a 100 snapshots.", "resources[].calendar é opcional: turnos e exceções no fuso de cada recurso intersectam o projeto e os restantes recursos atribuídos. Sem calendário próprio, herda o projeto. Marcos de duração zero não consomem capacidade.", "resourceLeveling:'serial' propõe nivelamento por ordem topológica estável, reservando tarefas bloqueadas primeiro. Pode interromper trabalho em períodos ocupados e retomá-lo depois. Omissão ou 'none' preserva o comportamento anterior. Prévia, aplicar e desfazer incluem esta opção; não é um otimizador de prazo mínimo.", "Limites: 500 tarefas/recursos, 5000 dependências/alocações, 200000 intervalos de calendários compilados, 200000 segmentos úteis e 2000000 reservas de recursos. Cada calendário admite 3660 dias civis; fusos diferentes podem exigir um dia adicional para cobrir o horizonte UTC. Falta de disponibilidade/capacidade ou horizonte insuficiente é erro explícito. Não há CPM laboral nem persistência cloud.", "O workspace permite editar/exportar o JSON e copiar uma integração completa com cinco componentes reais. O código é verificado como JavaScript e TypeScript estritos. Exporta o plano antes de fechar a página."] },
      { id: "working-time", title: "Calendários laborais e fusos IANA", body: "Importa createWorkingClock de @nodara/core/working-time. A entrada principal não carrega Temporal; a entrada laboral resolve @js-temporal/polyfill e o core através do teu bundler ou Node ESM/CJS. createWorkingClock(calendar,{startDate,endDate}) compila um horizonte civil exclusivo de 1 a 3660 dias para intervalos UTC congelados.", bullets: ["WorkingCalendar: id, timeZone IANA, week:[{day:1..7,periods:[{start:'09:00',end:'17:00'}]}], exceptions:{'2026-10-26':[]} e disambiguation opcional. Exceções substituem o dia inteiro; [] fecha-o. Fins de semana só fecham se não tiverem regra.", "fromLocal('2026-10-23T16:00') rejeita horários inexistentes/ambíguos por defeito. earlier, later e compatible são escolhas explícitas. toLocal(ms) inclui offset e identificador IANA. Os limites do horizonte usam o primeiro instante real do dia civil, mesmo quando a meia-noite não existe.", "add(ms,workingMs) e subtract(ms,workingMs) devolvem startMs/endMs, workingMs e segments. between(a,b) soma apenas os intervalos abertos; alignForward(ms) procura a próxima abertura. Valores são inteiros em milissegundos; duração zero mantém o instante sem alinhá-lo.", "São horas reais dentro dos turnos, não horas nominais salariais: 00–04 numa mudança de hora pode conter 3 ou 5 horas. Divide turnos noturnos à meia-noite; só um fim pode ser 24:00. Máximos: 24 períodos/dia, 3660 exceções, 20000 intervalos. Horizonte insuficiente é erro, nunca truncamento silencioso.", "O sistema fornece as regras Intl/IANA: persiste os intervalos compilados se precisares de reproduzir um cálculo numa versão futura da base de fusos. ND_WORKING_CALENDAR identifica erros; NodaraError tem a mesma identidade entre as entradas de cada formato.", "Experimenta /operations#working-time-lab e copia o exemplo completo. createWorkingClock é apenas aritmética laboral; evaluateWorkingPlan associa calendários aos recursos e oferece nivelamento serial opcional. Nenhum dos dois transforma OperationalPlan em CPM laboral."] },
      { id: "diagram-routing", title: "Portas e encaminhamento ortogonal", body: "createDiagram aceita linkRouting:'orthogonal' e routingClearance (0–1000px, padrão 8). Cada DiagramNode pode declarar ports:[{id,side:'top'|'right'|'bottom'|'left',offset:0.5,label?}]; DiagramLink referencia fromPort e toPort. Os identificadores são locais ao nó e validados antes de alterar o controller.", bullets: ["Suportado em tree, radial-tree, mindmap, flowchart, org-chart, er e state. Portas exigem encaminhamento ortogonal; opções incompatíveis em Sankey, chord e hierarquias de áreas são rejeitadas, não ignoradas.", "Sem porta explícita, o motor escolhe a face voltada para o outro nó. Recalcula os pontos com os dados, opções e resize. Evita os interiores dos nós expandidos pela margem; não evita cruzamentos entre ligações nem corrige nós sobrepostos.", "routeDiagramLinks(boxes,links,{width,height},clearance,budget?) é uma API geométrica independente do canvas. Devolve status:routed com points,length,bends ou status:unroutable/limited e reason. O orçamento por chamada é partilhado por todas as ligações: 10000 vértices por grelha, 2000000 verificações de obstáculos e 200000 estados visitados.", "Sem percurso, porta bloqueada, saída dos limites, auto-ligação e orçamento esgotado são explícitos. O renderer omite essas linhas e mostra um aviso; uma lista semântica descreve ligações e portas. Não é ainda um editor BPMN/UML completo.", "Experimenta /operations#diagram-routing-lab. O exemplo editável usa o componente real e inclui código para copiar."] },
      { id: "model", title: "Um estado autoritativo", body: "OperationalPlan contém schemaVersion:1, timeBasis:'elapsed', projectStartMs, tasks, resources, assignments, dependencies e locations. Os identificadores são estáveis; todas as referências são validadas antes da publicação. normalizeOperationalPlan aceita JSON não confiável, remove campos desconhecidos e devolve uma cópia canónica.", bullets: ["Tarefa: id, label, startMs, durationMs, progress; opcionais notBeforeMs, locked e locationId. Duração zero representa um marco.", "Recurso: id, label e capacityUnits; alocação: taskId, resourceId e units. 100 unidades podem representar uma pessoa, mas a escala é definida pelo consumidor.", "Dependência: id, fromTaskId, toTaskId, kind:'FS'|'SS'|'FF'|'SF', lagMs inteiro com sinal. S=início e F=fim. IDs e triplos (origem,destino,tipo) duplicados, referências inexistentes e ciclos são rejeitados.", "Datas são inteiros seguros em milissegundos UTC dentro do intervalo Date do JavaScript. Durações são tempo decorrido: fins de semana e feriados não são subtraídos."] },
      { id: "transactions", title: "Validar, prever e publicar", body: "createOperationalStore(plan) devolve um store independente de frameworks. preview(transaction) calcula o candidato, conflitos e movimentos automáticos sem publicar estado ou consumir histórico. transact(transaction) valida o candidato inteiro e publica um único snapshot congelado; em caso de erro, preserva o snapshot anterior por identidade.", bullets: ["Transação: id, commands, label opcional, expectedRevision opcional, scheduling:'manual'|'cascade-forward', conflicts:'reject'|'report'. IDs são rótulos de operações; não existe deduplicação/idempotência automática por id.", "Comandos: addTask, updateTask, removeTask, addDependency, removeDependency, assign, unassign, upsertResource, removeResource, upsertLocation, removeLocation e replacePlan.", "Referências não são apagadas implicitamente. Para remover uma tarefa atribuída, remove também as alocações e dependências no mesmo lote.", "expectedRevision rejeita edições preparadas sobre uma revisão antiga. Writes síncronos dentro de subscribe são rejeitados; agenda outro comando fora do callback.", "Erros dos observadores não revertem um commit já publicado; configura onObserverError para os reportar."] },
      { id: "scheduling", title: "Cascata explicável e capacidade", body: "cascade-forward percorre o grafo e avança cada sucessora até ao máximo de início atual, origem do projeto, notBeforeMs e limites impostos pelas relações e lag. Preserva duração e devolve a causa de cada movimento. Nunca antecipa tarefas nem faz nivelamento automático de recursos.", bullets: ["Intervalos de capacidade são semiabertos [start,end). Duas tarefas adjacentes não colidem. Marcos não consomem duração.", "operationalCapacity devolve segmentos com procura, capacidade e tarefas ativas. operationalConflicts descreve sobrecargas, precedências e início mínimo.", "conflicts:'report' permite guardar conflitos de datas/capacidade; não ignora schema inválido, ciclos ou uma cascata que tente mover uma tarefa bloqueada.", "locked impede editar/mover/remover a tarefa pelos comandos normais. Desbloqueia numa operação explícita antes de mudar datas. replacePlan substitui o plano completo e não é uma barreira de autorização."] },
      { id: "cpm", title: "Caminho crítico: o que é calculado", body: "operationalCriticalPath aplica passes forward/backward ao DAG. Devolve earliestStartMs, earliestEndMs, latestStartMs, latestEndMs, totalFloatMs, criticalTaskIds e criticalDependencyIds. Considera duração, precedências, lag, origem e notBeforeMs, mas ignora datas manuais, capacidade e bloqueios; o resultado identifica-se como precedence-only-elapsed.", bullets: ["Todas as ramificações com folga zero são identificadas, incluindo caminhos críticos empatados.", "Uma ligação só é crítica se ambos os extremos forem críticos e a restrição estiver ativa: FS usa EFp+lag=ESs; SS usa ESp+lag=ESs; FF usa EFp+lag=EFs; SF usa ESp+lag=EFs. Um atalho entre tarefas críticas pode não ser crítico.", "O fim mínimo por precedências pode diferir do fim do plano manual atual. A interface mostra os dois.", "CPM e cascata usam tempo decorrido; não incluem calendários por recurso, baselines, earned value ou nivelamento de recursos. O módulo laboral separado não altera automaticamente o plano."] },
      { id: "views", title: "Projeções e integração com os componentes", body: "operationalGantt, operationalCalendar, operationalTopology, operationalMap e operationalLoadChart geram os schemas públicos a partir do mesmo plano. Guarda a seleção de taskId na tua interface, separada do histórico. Eventos do renderer devem produzir comandos, não mutações independentes das projeções.", bullets: ["O calendário geral produz um evento por tarefa, com meta.taskId; não duplica as tarefas por recurso nesta projeção. A grelha de calendário atual segue o fuso do browser, mesmo com rótulos UTC.", "O mapa agrupa tarefas por local; não converte precedências em viagens nem inclui roteamento rodoviário.", "O gráfico agrega pico concorrente por bucket, não a soma de tarefas disjuntas; endMs e capacidade acompanham cada ponto em meta.", "Callbacks de edição dos renderers antecedem o seu commit local. Ressincroniza a projeção no fim do gesto, incluindo a rejeição, para não deixar o renderer com um candidato inválido."] },
      { id: "history", title: "Histórico, persistência e limites do workspace", body: "undo/redo restaura uma transação completa, incluindo a cascata. A revisão é monotónica; uma nova edição após undo elimina redo. No-ops não consomem histórico. historyLimit é 100 por defeito, admite 0 para o desligar e no máximo 10.000 snapshots.", bullets: ["exportJSON() inclui schema e plano, mas não seleção, histórico ou revisão. Importar é uma transação replacePlan validada.", "O workspace /operations mantém dados apenas na sessão da página. Exporta antes de recarregar. Não existe conta, backend, colaboração ou persistência cloud implícita.", "O workspace de demonstração limita a 500 tarefas, 500 recursos/locais, 5000 vínculos/alocações e 730 dias, com datas entre 1900 e 2199 (incluindo margem visual). O motor de domínio é independente desta política de UI; mede o teu volume real.", "Testes automatizados não substituem ensaios com leitores de ecrã e hardware físico; não existe certificação universal de acessibilidade ou performance."] },
    ],
    api: [{ title: "OperationalStore", rows: [
      { name: "getSnapshot()", type: "OperationalSnapshot", defaultValue: "revision:0", description: "Snapshot congelado, com plan, conflicts, canUndo, canRedo e lastTransaction." },
      { name: "preview(transaction)", type: "OperationalPreview", defaultValue: "—", description: "Candidato isolado, movimentos e conflitos; sem efeitos no estado/histórico." },
      { name: "transact(transaction)", type: "OperationalSnapshot", defaultValue: "conflicts:reject", description: "Commit atómico ou NodaraError; sem publicação parcial." },
      { name: "undo() / redo()", type: "OperationalSnapshot", defaultValue: "historyLimit:100", description: "Restaura a operação transversal com nova revisão monotónica." },
      { name: "subscribe(listener)", type: "() => void", defaultValue: "—", description: "Uma notificação por commit; devolve unsubscribe." },
      { name: "exportJSON()", type: "string", defaultValue: "schemaVersion:1", description: "Serializa apenas o plano atual, não histórico nem seleção." },
      { name: "destroy()", type: "void", defaultValue: "—", description: "Liberta histórico e subscritores; futuras mutações são rejeitadas." },
    ] }],
    code: [{ label: "TRANSAÇÃO + PREVIEW", language: "ts", code: `import { createOperationalStore, operationalCriticalPath } from '@nodara/core';

// plan: OperationalPlan validado, por exemplo o JSON exportado do workspace.
const store = createOperationalStore(plan);
const transaction = {
  id: crypto.randomUUID(),
  expectedRevision: store.getSnapshot().revision,
  commands: [{ type: 'updateTask' as const, taskId: 'core', changes: {
    startMs: Date.UTC(2026, 8, 17)
  }}],
  scheduling: 'cascade-forward' as const,
  conflicts: 'reject' as const
};
const preview = store.preview(transaction); // sem publicação
console.table(preview.moves);
store.transact(transaction); // um commit
console.log(operationalCriticalPath(store.getSnapshot().plan));
store.undo(); // desfaz toda a cascata
store.redo();
store.destroy();` }],
    keywords: ["operations", "planeamento", "scheduling", "transações", "capacidade", "CPM", "undo", "redo", "integrado"],
  },
  {
    id: "overview",
    group: "start",
    label: "Visão geral",
    eyebrow: "NODARA DOCS",
    title: "6 componentes. 69 configurações. 100 receitas.",
    description: "A Nodara disponibiliza seis componentes públicos, 69 configurações visuais e 100 receitas reais: Gantt, Chart, Topology, Calendar, GeoMap e Diagram. Os componentes definem o contrato; o catálogo fornece configurações prontas, demos e padrões de integração.",
    badges: ["v0.1 alpha", "TypeScript strict", "MIT core"],
    facts: [{ value: "100", label: "receitas" }, { value: "69", label: "configurações" }, { value: "6", label: "componentes" }, { value: "5", label: "pacotes" }],
    sections: [
      { id: "model", title: "O modelo do produto", body: "Seis componentes partilham contratos de dados, temas, renderização adaptativa, acessibilidade, lifecycle e erros. Sobre eles vivem 69 configurações visuais e 100 receitas documentadas, sem duplicar lógica nem criar APIs incompatíveis.", bullets: ["12 receitas Gantt sobre quatro escalas temporais.", "32 receitas de gráfico sobre 26 geometrias.", "12 receitas de topologia sobre cinco layouts em uso.", "16 calendários sobre dez vistas.", "14 mapas sobre dez combinações de modo e projeção.", "14 configurações de diagrama; algumas partilham o mesmo layout base."] },
      { id: "status", title: "O que significa alpha", body: "A implementação é funcional e testada, mas a API ainda pode receber alterações aditivas antes da versão 1.0. Os pacotes continuam versionados em conjunto e mudanças incompatíveis devem ter guia de migração." },
      { id: "path", title: "Percurso recomendado", body: "Começa pela instalação, abre a página do componente, copia o schema mínimo e só depois ajusta renderer, interações e performance. A referência do controller é comum a todas as stacks." },
    ],
    code: [{ label: "INSTALAÇÃO REACT", language: "bash", code: "npm i ./nodara-core-0.1.0-alpha.1.tgz ./nodara-react-0.1.0-alpha.1.tgz\n\n# Descarrega primeiro os .tgz em /docs#installation\n# No módulo JavaScript: import \"@nodara/core/styles.css\";" }],
    keywords: ["introdução", "componentes", "gantt", "chart", "topology", "calendar", "alpha"],
  },
  {
    id: "catalog",
    group: "start",
    label: "Componentes e exemplos",
    eyebrow: "COLEÇÃO",
    title: "Componentes, variantes e exemplos",
    description: "Começa pelas seis APIs públicas. Explora depois as 69 variantes de configuração ou os 100 exemplos de utilização. Os exemplos não são componentes especializados independentes; usam o motor real, dados editáveis e integração copiável para cinco stacks.",
    badges: ["69 configurações", "100 receitas", "dados editáveis"],
    facts: [{ value: "12", label: "Gantt" }, { value: "32", label: "gráficos" }, { value: "14", label: "mapas" }, { value: "14", label: "diagramas" }],
    sections: [
      { id: "honesty", title: "Componentes, tipos e receitas", body: "Nodara não apresenta 100 receitas como 100 implementações isoladas. Existem seis APIs públicas, 69 variantes de configuração e 100 exemplos. Os 31 exemplos adicionais reutilizam variantes existentes; alguns partilham dados e opções. A contagem mede configurações e exemplos, não especializações independentes." },
      { id: "live", title: "Uma demo real por item", body: "Seleciona qualquer receita, interage com o resultado e observa os eventos. O editor JSON volta a passar pela normalização pública antes de atualizar a visualização." },
      { id: "coverage", title: "Cobertura atual", body: "A coleção inclui 26 geometrias de gráfico, quatro escalas Gantt, cinco layouts de topologia em uso, dez vistas de calendário, dez combinações geográficas de modo e projeção e catorze tipos de diagrama." },
    ],
    code: [{ label: "ABRIR CATÁLOGO", language: "text", code: "https://nodara-visual.gftsantos.chatgpt.site/catalog" }],
    keywords: ["catalog", "catálogo", "100", "visualizações", "presets", "receitas", "demos"],
  },
  {
    id: "installation",
    group: "start",
    label: "Instalação",
    eyebrow: "COMEÇAR",
    title: "Instalação por stack",
    description: "Versão alpha distribuída por downloads no catálogo; os pacotes ainda não estão no npm público. Descarrega core e adaptador e instala os dois ficheiros no mesmo comando. JavaScript usa apenas core.",
    badges: ["Node 22+", "ESM · Angular ESM", "alpha local"],
    facts: [{ value: "React", label: "@nodara/react" }, { value: "Vue", label: "@nodara/vue" }, { value: "Angular", label: "@nodara/angular" }, { value: "JS", label: "@nodara/core" }],
    sections: [
      { id: "css", title: "Carrega os estilos uma vez", body: "Importa @nodara/core/styles.css no ponto de entrada da aplicação. Tokens e className permitem personalização posterior sem duplicar o CSS estrutural." },
      { id: "container", title: "Define uma altura", body: "Canvas, WebGL e calendários precisam de um host com altura mensurável. Usa style, uma classe ou o layout da aplicação para garantir a dimensão." },
      { id: "types", title: "Importa os contratos", body: "Todos os adaptadores reexportam os tipos de dados e opções do core. Mantém os payloads tipados desde a origem para detetar erros antes do runtime." },
    ],
    code: [
      { label: "PACOTES", language: "bash", code: "# Descarrega os ficheiros em /catalog → Instalar no teu projeto\n# Exemplo React; substitui react pela tua stack\nnpm install ./nodara-core-0.1.0-alpha.1.tgz ./nodara-react-0.1.0-alpha.1.tgz" },
      { label: "CSS", language: "ts", code: "import '@nodara/core/styles.css';" },
    ],
    keywords: ["install", "npm", "css", "node", "package", "setup"],
  },
  {
    id: "architecture",
    group: "start",
    label: "Arquitetura",
    eyebrow: "UM CORE",
    title: "Arquitetura da biblioteca",
    description: "Contratos e normalização alimentam um controller reativo; cada visualização escolhe o renderer adequado e os adaptadores traduzem apenas o lifecycle.",
    badges: ["core agnóstico", "adapters finos", "render adaptativo"],
    facts: [{ value: "1", label: "core" }, { value: "4", label: "adapters" }, { value: "3", label: "renderers" }, { value: "5", label: "plugin hooks" }],
    sections: [
      { id: "layers", title: "Camadas", body: "Application data passa por contratos tipados e normalização runtime, entra no controller reativo, segue para o renderer do componente e termina no adaptador React, Vue, Angular, Web Components ou JavaScript." },
      { id: "rendering", title: "Estratégia de renderer", body: "DOM privilegia semântica em listas pequenas; Canvas desenha centenas ou milhares de elementos; WebGL usa buffers compactos em volumes superiores. O fallback semântico continua disponível." },
      { id: "ownership", title: "Responsabilidades", body: "Validação, temas, acessibilidade, performance, eventos e erros vivem no core. Adaptadores não duplicam lógica visual e podem evoluir sem criar comportamentos divergentes." },
    ],
    code: [{ label: "FLUXO", language: "text", code: `Application data
  → TypeScript contracts + runtime normalization
  → Reactive controller + plugin lifecycle
  → Gantt | Chart | Topology | Calendar | GeoMap | Diagram
  → DOM | Canvas | WebGL
  → React | Vue | Angular | Web Components | JavaScript` }],
    keywords: ["architecture", "layers", "core", "adapters", "dom", "canvas", "webgl"],
  },
  {
    id: "gantt",
    group: "components",
    label: "Gantt",
    eyebrow: "PLANEAMENTO",
    title: "Gantt",
    description: "Planeamento temporal com dependências visuais, drag-and-drop, resize, teclado, zoom e renderer de densidade para grandes volumes.",
    packageName: "@nodara/react · Gantt",
    badges: ["DOM + Canvas + WebGL", "editável", "teclado"],
    facts: [{ value: "4", label: "níveis de zoom" }, { value: "3", label: "tipos de alteração" }, { value: "10k", label: "tasks testadas" }, { value: "2", label: "rotas de dependência" }],
    sections: [
      { id: "data", title: "Contrato GanttTask", body: "Cada tarefa precisa de id, label, start e end. Datas aceitam string ISO, timestamp ou Date. dependencies referencia ids existentes; progress é normalizado entre 0 e 100." },
      { id: "editing", title: "Edição", body: "O ponteiro move a barra ou os handles de início/fim. Pelo teclado, setas movem, Shift + setas redimensiona o fim e Alt + setas redimensiona o início. Cada commit emite task:change com a tarefa anterior. editable:false impede alterações às datas e mantém seleção; interactive:false desliga a interação toda." },
      { id: "scale", title: "Escala e exemplos", body: "Dias começam à meia-noite UTC; semanas à segunda-feira; meses e trimestres usam fronteiras reais. Horizontes longos agregam unidades para limitar a escala a cerca de 120 células. Rótulos compactos não se sobrepõem. Sprint timeline é um exemplo de duas semanas com tarefas de uma sprint; release train é um exemplo de oito semanas com entregas de equipas dependentes. Partilham a API Gantt, não são dois motores de scheduling." },
      { id: "density", title: "Grandes volumes", body: "Em auto, datasets grandes usam uma representação de densidade Canvas/WebGL e mantêm uma lista semântica limitada por accessibilityLimit." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `import { Gantt, type GanttTask } from '@nodara/react';

const tasks: GanttTask[] = [{
  id: 'design', label: 'Design system',
  start: '2026-01-10', end: '2026-02-20',
  progress: 64, dependencies: ['discovery']
}];

<Gantt data={tasks} zoom="month" snap="day"
  dependencyRouting="orthogonal"
  onTaskChange={({ task, previousTask, change }) => save(task)}
  style={{ height: 520 }} />` }],
    api: [
      { title: "GanttOptions", rows: [
        { name: "data", type: "GanttTask[]", defaultValue: "obrigatório", description: "Tarefas normalizadas e desenhadas." },
        { name: "start / end", type: "DateInput", defaultValue: "range dos dados", description: "Limites explícitos da linha temporal." },
          { name: "zoom", type: "day | week | month | quarter", defaultValue: "month", description: "Densidade e unidades da escala." },
          { name: "editable", type: "boolean", defaultValue: "true", description: "false preserva seleção, mas remove os handles e bloqueia move/resize por ponteiro e teclado." },
        { name: "rowHeight", type: "number", defaultValue: "58", description: "Altura de linha; mínimo efetivo de 36 px." },
          { name: "snap", type: "none | day | week | number", defaultValue: "day", description: "Incremento usado em move e resize. none permite incrementos de 1ms." },
        { name: "dependencyRouting", type: "straight | orthogonal", defaultValue: "straight", description: "Traçado das dependências." },
        { name: "onTaskSelect", type: "(event) => void", defaultValue: "—", description: "Seleção por ponteiro ou teclado." },
        { name: "onTaskChange", type: "(event) => void", defaultValue: "—", description: "Proposta de move/resize antes do commit local. O evento task:change/event:change do controller é emitido depois; update/setState não simulam interações." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [
      { name: "task:select", type: "GanttTaskEvent", defaultValue: "pointer | keyboard", description: "Tarefa selecionada." },
      { name: "task:change", type: "GanttTaskEvent", defaultValue: "move | resize-start | resize-end", description: "Inclui task, previousTask, change e source." },
    ],
    keywords: ["roadmap", "tasks", "dependencies", "drag", "resize", "zoom", "snap"],
  },
  {
    id: "charts",
    group: "components",
    label: "Chart",
    eyebrow: "ANALYTICS",
    title: "Chart",
    description: "Vinte e seis geometrias para análise operacional, científica e financeira, de line e bar a boxplot, contour, candlestick e OHLC.",
    packageName: "@nodara/react · Chart",
    badges: ["Canvas + WebGL", "26 tipos", "stacked"],
    facts: [{ value: "26", label: "tipos" }, { value: "32", label: "receitas" }, { value: "10k", label: "pontos testados" }, { value: "1", label: "evento tipado" }],
    sections: [
      { id: "data", title: "ChartSeries e ChartPoint", body: "Cada série tem id, label, cor opcional e pontos. x aceita texto, número ou Date; y tem de ser finito. IDs duplicados e valores NaN/Infinity são rejeitados." },
      { id: "stacking", title: "Stacking", body: "stacked calcula baselines pela identidade de x entre todas as séries e trata valores positivos e negativos separadamente para evitar domínios incorretos." },
      { id: "science", title: "Estatística real e limites", body: "Consulta Estatística e isolinhas para histogram, gaussianKDE e marchingSquares. Violin recebe amostras y; Contour exige linhas com gridY e coordenadas x numéricas, produzidas por scalarGridSeries. Candles/boxplots/bullet/radial-bar desenham todas as séries; gauge, waterfall e funnel rejeitam mais de uma série. Gauge aceita um valor." },
      { id: "access", title: "Seleção e tooltip", body: "O Canvas responde ao ponteiro e existe em paralelo uma tabela semanticamente navegável. showTooltip controla apenas a camada visual, não os dados acessíveis." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `const revenue = [{
  id: 'mrr', label: 'MRR', color: '#7884ff',
  data: [{ x: 'Jan', y: 128400 }, { x: 'Fev', y: 164200 }]
}];

<Chart series={revenue} type="area" showTooltip
  valueFormatter={(value) => formatCurrency(value)}
  onPointSelect={({ point, series }) => inspect(point, series)}
  style={{ height: 420 }} />` }],
    api: [
      { title: "ChartOptions", rows: [
        { name: "series", type: "ChartSeries[]", defaultValue: "obrigatório", description: "Séries e pontos do gráfico." },
        { name: "type", type: "ChartType (26 geometrias)", defaultValue: "line", description: "Inclui séries cartesianas, radiais, distribuição, forecast, estatística e OHLC; consulta o catálogo para as 26 opções." },
        { name: "stacked", type: "boolean", defaultValue: "false", description: "Empilha séries pela categoria/instante x; positivos e negativos têm baselines separadas." },
        { name: "showLegend", type: "boolean", defaultValue: "true", description: "Legenda visual das séries." },
        { name: "showGrid", type: "boolean", defaultValue: "true", description: "Linhas horizontais e valores do domínio." },
        { name: "showAxes", type: "boolean", defaultValue: "true", description: "Rótulos dos eixos." },
        { name: "showTooltip", type: "boolean", defaultValue: "true", description: "Tooltip no hover de um ponto." },
        { name: "violinBandwidth", type: "number | scott", defaultValue: "scott", description: "Largura absoluta do kernel; amostras constantes sem largura mostram apenas marcas." },
        { name: "contourLevels", type: "number[]", defaultValue: "5 níveis interiores", description: "Níveis escalares das isolinhas; as linhas de dados têm gridY explícito." },
        { name: "valueFormatter", type: "(number) => string", defaultValue: "Intl.NumberFormat", description: "Formata eixo, tooltip e tabela acessível." },
        { name: "labelFormatter", type: "(x) => string", defaultValue: "String", description: "Formata o eixo x." },
        { name: "onPointSelect", type: "(event) => void", defaultValue: "—", description: "Callback ao selecionar um ponto." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [{ name: "point:select", type: "ChartPointEvent", defaultValue: "pointer | keyboard", description: "Inclui point, series e source." }],
    keywords: ["chart", "graph", "line", "area", "bar", "scatter", "stacked", "tooltip"],
  },
  {
    id: "topology",
    group: "components",
    label: "Topology",
    eyebrow: "OBSERVABILIDADE",
    title: "Topology",
    description: "Grafos direcionados ou livres com layouts manual, radial, grid, force e hierarchical, além de pan e zoom observáveis.",
    packageName: "@nodara/react · Topology",
    badges: ["Canvas + WebGL", "5 layouts", "pan + zoom"],
    facts: [{ value: "5", label: "layouts" }, { value: "10k", label: "nós testados" }, { value: "2", label: "eventos" }, { value: "300", label: "iterações máx." }],
    sections: [
      { id: "model", title: "Nodes e edges", body: "TopologyData contém nodes e edges. Cada edge referencia dois ids existentes. Nós podem transportar estado, valor, kind, cor, posição manual e meta." },
      { id: "layouts", title: "Escolha de layout", body: "auto usa manual se todos os nós tiverem coordenadas, grid acima de 80 nós e force nos restantes casos. hierarchical organiza níveis a partir dos nós sem entradas." },
      { id: "viewport", title: "Viewport", body: "Wheel controla zoom dentro de minZoom/maxZoom; drag no fundo controla pan. viewport:change expõe zoom, x, y e source." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `const services = {
  nodes: [
    { id: 'gateway', label: 'API Gateway', status: 'healthy' },
    { id: 'billing', label: 'Billing', status: 'warning' }
  ],
  edges: [{ from: 'gateway', to: 'billing', directed: true }]
};

<Topology data={services} layout="hierarchical"
  interactive={{ keyboard: true, pointer: true, pan: true, zoom: true }}
  onViewportChange={({ zoom, x, y }) => persistViewport({ zoom, x, y })}
  style={{ height: 520 }} />` }],
    api: [
      { title: "TopologyOptions", rows: [
        { name: "data", type: "TopologyData", defaultValue: "obrigatório", description: "Objeto { nodes, edges }." },
        { name: "layout", type: "auto | manual | radial | grid | force | hierarchical", defaultValue: "auto", description: "Estratégia de posicionamento." },
        { name: "nodeRadius", type: "number", defaultValue: "adaptativo", description: "Raio visual, com mínimo de 4 px." },
        { name: "layoutIterations", type: "number", defaultValue: "60", description: "Iterações force, limitadas a 300." },
        { name: "minZoom", type: "number", defaultValue: "0.25", description: "Limite inferior do viewport." },
        { name: "maxZoom", type: "number", defaultValue: "4", description: "Limite superior do viewport." },
        { name: "initialZoom", type: "number", defaultValue: "1", description: "Zoom inicial sujeito aos limites." },
        { name: "onNodeSelect", type: "(event) => void", defaultValue: "—", description: "Seleção de um nó." },
        { name: "onViewportChange", type: "(event) => void", defaultValue: "—", description: "Mudança de pan ou zoom." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [
      { name: "node:select", type: "TopologyNodeEvent", defaultValue: "pointer | keyboard", description: "Nó selecionado e origem." },
      { name: "viewport:change", type: "TopologyViewportEvent", defaultValue: "pointer", description: "zoom, x, y e source." },
    ],
    keywords: ["topology", "graph", "nodes", "edges", "force", "grid", "hierarchical", "webgl", "zoom"],
  },
  {
    id: "calendar",
    group: "components",
    label: "Calendar",
    eyebrow: "OPERAÇÕES",
    title: "Calendar",
    description: "Calendário e scheduler com dez vistas: dia, semana, mês, agenda, timeline, recursos e planeamento anual.",
    packageName: "@nodara/react · Calendar",
    badges: ["10 vistas", "recorrência", "recursos"],
    facts: [{ value: "10", label: "vistas" }, { value: "3", label: "frequências RRULE" }, { value: "500", label: "ocorrências default" }, { value: "2", label: "eventos" }],
    sections: [
      { id: "events", title: "CalendarEvent", body: "Um evento precisa de id, title e start. Define end ou durationMinutes; pode ainda indicar recurso, cor, allDay, disabled, recurrence e meta." },
      { id: "recurrence", title: "Recorrência", body: "O subset RRULE suporta DAILY, WEEKLY e MONTHLY, além de INTERVAL, COUNT, UNTIL e BYDAY. A expansão é limitada por maxOccurrences." },
      { id: "resources", title: "Recursos e edição", body: "resources descreve entidades visuais e visibleResourceIds filtra o calendário. Eventos ativos podem mover e redimensionar; event:change inclui o valor anterior." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `const events = [{
  id: 'planning', title: 'Planning',
  start: '2026-08-17T09:30:00', durationMinutes: 60,
  resourceId: 'product', recurrence: 'FREQ=WEEKLY;COUNT=6'
}];

<Calendar events={events} date="2026-08-20" view="workweek"
  expandRecurrence maxOccurrences={250}
  onEventChange={({ event, previousEvent, change }) => save(event)}
  style={{ height: 560 }} />` }],
    api: [
      { title: "CalendarOptions", rows: [
        { name: "events", type: "CalendarEvent[]", defaultValue: "obrigatório", description: "Eventos de origem; recorrências são expandidas na vista." },
        { name: "view", type: "CalendarView (10 vistas)", defaultValue: "week", description: "Day, week, workweek, month, agenda, timeline-day/week, resource-day/week ou year." },
        { name: "date", type: "DateInput", defaultValue: "agora", description: "Âncora temporal da vista." },
        { name: "weekStartsOn", type: "0 | 1", defaultValue: "1", description: "Domingo ou segunda-feira." },
        { name: "timeZone", type: "string", defaultValue: "local", description: "Identificador de fuso horário para apresentação." },
        { name: "resources", type: "CalendarResource[]", defaultValue: "[]", description: "Catálogo de recursos." },
        { name: "visibleResourceIds", type: "string[]", defaultValue: "todos", description: "Filtro por recursos." },
        { name: "expandRecurrence", type: "boolean", defaultValue: "true", description: "Expande regras RRULE na janela visível." },
        { name: "maxOccurrences", type: "number", defaultValue: "500", description: "Hard limit de expansão." },
        { name: "onEventSelect", type: "(event) => void", defaultValue: "—", description: "Seleção de evento." },
        { name: "onEventChange", type: "(event) => void", defaultValue: "—", description: "Proposta de move/resize antes do commit local. O evento task:change/event:change do controller é emitido depois; update/setState não simulam interações." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [
      { name: "event:select", type: "CalendarEventSelectEvent", defaultValue: "pointer | keyboard", description: "Evento e origem da seleção." },
      { name: "event:change", type: "CalendarEventChangeEvent", defaultValue: "move | resize", description: "event, previousEvent, change e source." },
    ],
    keywords: ["calendar", "agenda", "rrule", "recurrence", "resources", "month", "week", "event"],
  },
  {
    id: "geo-map",
    group: "components",
    label: "GeoMap",
    eyebrow: "GEOSPATIAL",
    title: "GeoMap",
    description: "Mapas geográficos Canvas com pontos, bolhas, rotas, heatmaps, regiões, três projeções e viewport interativo.",
    packageName: "@nodara/react · GeoMap",
    badges: ["3 projeções", "5 modos", "pan + zoom"],
    facts: [{ value: "14", label: "receitas" }, { value: "3", label: "projeções" }, { value: "5", label: "modos" }, { value: "2", label: "eventos" }],
    sections: [
      { id: "geo-data", title: "GeoMapData", body: "points usa latitude e longitude; routes liga ids de pontos ou coordenadas diretas; regions recebe polígonos com pelo menos três coordenadas. O normalizer valida limites geográficos e referências." },
      { id: "projections", title: "Projeções", body: "Mercator é adequada a mapas navegáveis, equirectangular preserva uma grelha linear e orthographic apresenta um hemisfério. center define a origem e viewport controla zoom e deslocamento." },
      { id: "modes", title: "Camadas e modos", body: "points desenha marcadores, bubbles dimensiona por value, routes desenha fluxos dirigidos, heatmap representa concentração e choropleth preenche regiões por valor." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `const geoData = {
  points: [{ id: 'lisbon', label: 'Lisboa', latitude: 38.72, longitude: -9.14, value: 58 }],
  routes: [{ from: 'lisbon', to: { latitude: 51.51, longitude: -0.13 }, directed: true }],
  regions: []
};

<GeoMap data={geoData} mode="routes" projection="mercator"
  interactive={{ keyboard: true, pointer: true, pan: true, zoom: true }}
  onPointSelect={({ point }) => inspect(point)} style={{ height: 520 }} />` }],
    api: [
      { title: "GeoMapOptions", rows: [
        { name: "data", type: "GeoMapData", defaultValue: "obrigatório", description: "Pontos, rotas e regiões geográficas." },
        { name: "projection", type: "mercator | equirectangular | orthographic", defaultValue: "mercator", description: "Transformação de longitude/latitude para o Canvas." },
        { name: "mode", type: "points | bubbles | routes | heatmap | choropleth", defaultValue: "points", description: "Camada visual principal." },
        { name: "center", type: "GeoCoordinate", defaultValue: "0°, 12°", description: "Centro longitudinal e latitudinal da projeção." },
        { name: "initialZoom / minZoom / maxZoom", type: "number", defaultValue: "1 / 0.6 / 12", description: "Limites do viewport." },
        { name: "pointRadius", type: "number", defaultValue: "6", description: "Raio base dos marcadores." },
        { name: "showGraticule", type: "boolean", defaultValue: "true", description: "Mostra a grelha geográfica." },
        { name: "onPointSelect", type: "(event) => void", defaultValue: "—", description: "Seleção de ponto por ponteiro ou teclado." },
        { name: "onViewportChange", type: "(event) => void", defaultValue: "—", description: "Emite zoom e pan atuais." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [
      { name: "point:select", type: "GeoPointEvent", defaultValue: "pointer | keyboard", description: "Ponto selecionado e origem." },
      { name: "viewport:change", type: "GeoViewportEvent", defaultValue: "pointer", description: "zoom, x, y e source." },
    ],
    keywords: ["map", "geo", "mercator", "orthographic", "routes", "choropleth", "heatmap"],
  },
  {
    id: "diagram",
    group: "components",
    label: "Diagram",
    eyebrow: "FLOWS & HIERARCHIES",
    title: "Diagram",
    description: "Catorze diagramas para fluxo, hierarquia, processos, estados, dados e organizações, incluindo Sankey e treemap.",
    packageName: "@nodara/react · Diagram",
    badges: ["14 tipos", "links ponderados", "teclado"],
    facts: [{ value: "14", label: "tipos" }, { value: "14", label: "receitas" }, { value: "2", label: "orientações" }, { value: "1", label: "evento" }],
    sections: [
      { id: "diagram-data", title: "DiagramData", body: "nodes pode declarar value, parentId, kind e meta; links liga ids existentes e pode transportar value, direção, cor e label. IDs e referências são validados antes de desenhar." },
      { id: "flows", title: "Fluxos ponderados", body: "Sankey/alluvial usam D3 sankey com escala global proporcional de links e altura do nó igual a max(entrada,saída). Chord usa arcos e faixas proporcionais a link.value: cada relação contribui nos dois extremos; auto-ligações contam duas incidências. Não é uma matriz de fluxos agregada. Links paralelos/direcionais permanecem separados, zero não inventa fluxo e pesos negativos são rejeitados." },
      { id: "hierarchies", title: "Hierarquias distintas", body: "Treemap, sunburst, icicle e circle-pack usam contenção real por parentId e agregação de folhas. Radial-tree coloca a raiz ao centro e profundidades em raios; mindmap usa ramos à esquerda/direita, com branchSide opcional nos filhos diretos da raiz. D3 hierarchy fornece os algoritmos. parentId define a árvore; sem parentId, links inferem pais e rejeitam múltiplos pais/ciclos. Mindmaps extensos usam uma área lógica com scroll, sem reduzir a letra para caber." },
      { id: "domain-diagrams", title: "Entidades não são estados", body: "ER apresenta attributes:[{name,type?,key:'PK'|'FK'|'PK/FK'}] e fromCardinality/toCardinality ('1','0..1','0..*','1..*'). State apresenta stateKind:'normal'|'initial'|'final', transições rotuladas e auto-ligações curvas. São vistas de estruturas diferentes, não um gerador SQL ou um executor de máquinas de estados. O ER usa uma grelha com altura ajustada aos atributos, não um auto-layout semântico avançado." },
    ],
    code: [{ label: "REACT", language: "tsx", code: `const flow = {
  nodes: [{ id: 'traffic', label: 'Tráfego', value: 100 }, { id: 'trial', label: 'Trial', value: 42 }],
  links: [{ from: 'traffic', to: 'trial', value: 42, directed: true }]
};

<Diagram data={flow} type="sankey"
  onNodeSelect={({ node }) => inspect(node)}
  style={{ height: 520 }} />` }],
    api: [
      { title: "DiagramOptions", rows: [
        { name: "data", type: "DiagramData", defaultValue: "obrigatório", description: "Nós e links validados." },
        { name: "type", type: "DiagramType (14 tipos)", defaultValue: "flowchart", description: "Sankey, alluvial, treemap, sunburst, icicle, circle-pack, árvores, processos, ER, state e chord." },
        { name: "orientation", type: "horizontal | vertical", defaultValue: "horizontal", description: "Direção de fluxo/caixas. Não muda a contenção de treemap, icicle, sunburst ou circle-pack." },
        { name: "nodeWidth", type: "number", defaultValue: "22 fluxo / 92 caixas", description: "Largura de nós em Sankey/alluvial e layouts de caixas; hierarquias de área não usam esta dimensão." },
        { name: "nodeGap", type: "number", defaultValue: "18", description: "Separação entre nós Sankey/alluvial. As hierarquias de área usam o seu padding interno." },
        { name: "linkOpacity", type: "number", defaultValue: "por tipo", description: "Opacidade das relações." },
        { name: "onNodeSelect", type: "(event) => void", defaultValue: "—", description: "Seleção por ponteiro ou teclado." },
      ] },
      { title: "Opções partilhadas", rows: baseOptions },
    ],
    events: [{ name: "node:select", type: "DiagramNodeEvent", defaultValue: "pointer | keyboard", description: "Nó selecionado e origem." }],
    keywords: ["diagram", "sankey", "treemap", "sunburst", "flowchart", "org chart", "ER", "state", "chord"],
  },
  {
    id: "react",
    group: "frameworks",
    label: "React",
    eyebrow: "ADAPTADOR OFICIAL",
    title: "React",
    description: "Componentes funcionais que atualizam dados e opções no controller sem destruir a visualização.",
    packageName: "@nodara/react",
    badges: ["React >=18.2.0", "hooks", "tipos reexportados"],
    facts: [{ value: "6", label: "componentes" }, { value: "1", label: "prop onReady" }, { value: "0", label: "providers" }, { value: "100%", label: "typed" }],
    sections: [
      { id: "lifecycle", title: "Lifecycle", body: "A instância é criada no mount; alterações simultâneas usam setState, alterações apenas de opções usam setOptions e props idênticas não causam updates. destroy corre no unmount. onReady entrega o controller quando precisas da API imperativa." },
      { id: "state", title: "Estado controlado", body: "Mantém data ou series no estado da aplicação. Nos callbacks de edição, substitui o item emitido e passa o novo array de volta ao componente." },
      { id: "exports", title: "Exports", body: "Gantt, Chart, Topology, Calendar, GeoMap e Diagram, respetivas Props e todos os contratos públicos do core." },
    ],
    code: [{ label: "COMPONENTE CONTROLADO", language: "tsx", code: `import { Gantt, type GanttTask } from '@nodara/react';

function Roadmap() {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks);
  return <Gantt data={tasks}
    onTaskChange={({ task }) =>
      setTasks(current => current.map(item => item.id === task.id ? task : item))
    }
    style={{ height: 520 }} />;
}` }],
    api: [{ title: "Props adicionais do adaptador", rows: [
      { name: "style", type: "CSSProperties", defaultValue: "—", description: "Estilo do host React; útil para altura." },
      { name: "onReady", type: "(controller) => void", defaultValue: "—", description: "Acesso à API imperativa tipada." },
    ] }],
    keywords: ["react", "hooks", "props", "state", "onReady"],
  },
  {
    id: "vue",
    group: "frameworks",
    label: "Vue 3",
    eyebrow: "ADAPTADOR OFICIAL",
    title: "Vue 3",
    description: "Componentes Vue com props reativas profundas, eventos kebab-case e controller disponível em ready.",
    packageName: "@nodara/vue",
    badges: ["Vue 3.3+", "Composition API", "deep watch"],
    facts: [{ value: "6", label: "componentes" }, { value: "deep", label: "watch" }, { value: "ready", label: "controller" }, { value: "typed", label: "emits" }],
    sections: [
      { id: "components", title: "Componentes", body: "NodaraGantt, NodaraChart, NodaraTopology, NodaraCalendar, NodaraGeoMap e NodaraDiagram recebem dados e um objeto options." },
      { id: "reactivity", title: "Reatividade", body: "Alterações profundas aos dados e opções chamam update() e setOptions(). A instância é destruída em onBeforeUnmount." },
      { id: "events", title: "Eventos Vue", body: "Usa @task-select, @task-change, @point-select, @node-select e @event-select. @ready recebe o controller." },
    ],
    code: [{ label: "VUE", language: "vue", code: `<script setup lang="ts">
import { NodaraTopology } from '@nodara/vue';
import '@nodara/core/styles.css';
</script>

<template>
  <NodaraTopology :data="services"
    :options="{ layout: 'hierarchical', theme: 'dark' }"
    @node-select="openService"
    @ready="controller = $event" />
</template>` }],
    keywords: ["vue", "composition", "watch", "emits", "options"],
  },
  {
    id: "angular",
    group: "frameworks",
    label: "Angular",
    eyebrow: "ADAPTADOR OFICIAL",
    title: "Angular",
    description: "Standalone components com Inputs reativos, Outputs tipados e lifecycle Angular completo.",
    packageName: "@nodara/angular",
    badges: ["Angular 21.2.21+", "standalone", "EventEmitter"],
    facts: [{ value: "6", label: "standalone components" }, { value: "2", label: "inputs padrão" }, { value: "typed", label: "outputs" }, { value: "OnDestroy", label: "cleanup" }],
    sections: [
      { id: "imports", title: "Imports standalone", body: "Importa apenas o componente necessário, incluindo NodaraGeoMapComponent e NodaraDiagramComponent nas novas famílias." },
      { id: "changes", title: "Mudanças dinâmicas", body: "ngOnChanges encaminha data para update e options para setOptions depois de a view estar pronta." },
      { id: "outputs", title: "Outputs", body: "ready e os eventos específicos usam EventEmitter com payloads do core." },
    ],
    code: [{ label: "ANGULAR", language: "ts", code: `@Component({
  standalone: true,
  imports: [NodaraCalendarComponent],
  template: \`<nd-calendar
    [events]="events"
    [options]="{ view: 'workweek', locale: 'pt-PT' }"
    (eventSelect)="openEvent($event)"
    (ready)="calendar = $event" />\`
})
export class TeamSchedule {}` }],
    keywords: ["angular", "standalone", "input", "output", "ngOnChanges"],
  },
  {
    id: "web-components",
    group: "frameworks",
    label: "Web Components",
    eyebrow: "QUALQUER STACK",
    title: "Web Components",
    description: "Custom elements nativos para aplicações sem framework ou stacks que interoperam melhor com o DOM.",
    packageName: "@nodara/web-components",
    badges: ["Custom Elements", "prefix configurável", "eventos DOM"],
    facts: [{ value: "6", label: "custom elements" }, { value: "nd", label: "prefix default" }, { value: "DOM", label: "CustomEvent" }, { value: "native", label: "lifecycle" }],
    sections: [
      { id: "define", title: "Registo", body: "defineNodaraElements() regista nd-gantt, nd-chart, nd-topology, nd-calendar, nd-geo-map e nd-diagram. Passa outro prefixo se os nomes já existirem." },
      { id: "properties", title: "Properties e attributes", body: "Atribui data e options como propriedades JavaScript. theme, aria-label e options JSON também são observados como attributes." },
      { id: "dom-events", title: "Eventos", body: "Os eventos recebem o prefixo nodara:, por exemplo nodara:task-change, nodara:point-select e nodara:viewport-change." },
    ],
    code: [{ label: "JAVASCRIPT", language: "js", code: `import { defineNodaraElements } from '@nodara/web-components';
import '@nodara/core/styles.css';

defineNodaraElements();
const gantt = document.querySelector('nd-gantt');
gantt.data = tasks;
gantt.options = { zoom: 'week', snap: 'day' };
gantt.addEventListener('nodara:task-change', event => save(event.detail.task));` }],
    keywords: ["web components", "custom elements", "vanilla", "dom", "prefix"],
  },
  {
    id: "javascript",
    group: "frameworks",
    label: "JavaScript / Core",
    eyebrow: "SEM FRAMEWORK",
    title: "JavaScript e TypeScript",
    description: "Factories diretas do core para controlo total do lifecycle e integração com qualquer arquitetura.",
    packageName: "@nodara/core",
    badges: ["framework agnostic", "controller", "TypeScript"],
    facts: [{ value: "6", label: "factories" }, { value: "1", label: "controller comum" }, { value: "0", label: "runtime de framework" }, { value: "strict", label: "tipagem" }],
    sections: [
      { id: "factories", title: "Factories", body: "createGantt, createChart, createTopology, createCalendar, createGeoMap e createDiagram aceitam um seletor CSS ou Element e devolvem NodaraController." },
      { id: "ownership", title: "Responsabilidade de lifecycle", body: "Sem adaptador, a aplicação deve chamar destroy ao remover o host. Usa update e setOptions para alterações incrementais." },
      { id: "errors", title: "Erros", body: "Apanha falhas com onError ou controller.on('error'). Dados inválidos lançam NodaraError com código estável." },
    ],
    code: [{ label: "CORE", language: "ts", code: `import { createChart } from '@nodara/core';
import '@nodara/core/styles.css';

const chart = createChart('#revenue', {
  series, type: 'bar', renderer: 'auto', showTooltip: true
});

chart.on('point:select', ({ point }) => inspect(point));
chart.update(nextSeries);
chart.setOptions({ stacked: true });
// chart.destroy() quando o host sair do DOM` }],
    api: [{ title: "NodaraController", rows: controllerRows }],
    keywords: ["javascript", "typescript", "core", "factory", "createGantt", "controller"],
  },
  {
    id: "schemas",
    group: "foundations",
    label: "Dados & schemas",
    eyebrow: "CONTRATOS",
    title: "Dados e validação",
    description: "Contratos TypeScript e normalização runtime partilhados por todos os renderers e adaptadores.",
    packageName: "@nodara/core",
    badges: ["imutável", "runtime", "erros estáveis"],
    facts: [{ value: "6", label: "normalizers" }, { value: "100%", label: "updates validados" }, { value: "0–100", label: "progress clamp" }, { value: "unique", label: "ids" }],
    sections: [
      { id: "normalizers", title: "Normalização pública", body: "Os seis normalizers públicos incluem normalizeGeoMap e normalizeDiagram e podem ser chamados antes de persistir ou enviar dados." },
      { id: "rules", title: "Regras principais", body: "IDs são obrigatórios e únicos; ranges não podem estar invertidos; referências têm de existir; valores numéricos têm de ser finitos; recorrências são analisadas antes do render." },
      { id: "updates", title: "Todos os updates passam aqui", body: "controller.update() volta sempre a normalizar. O input estrutural é normalizado, mas getData não promete deep-freeze. Não alteres o resultado diretamente; usa update/setState. Apenas o OperationalStore garante snapshots profundamente congelados." },
    ],
    code: [{ label: "VALIDAÇÃO ANTES DE GUARDAR", language: "ts", code: `import { normalizeGanttTasks, NodaraError } from '@nodara/core';

try {
  const safeTasks = normalizeGanttTasks(apiResponse.tasks);
  await persist(safeTasks);
} catch (error) {
  if (error instanceof NodaraError) {
    report(error.code, error.message);
  }
}` }],
    keywords: ["schema", "validation", "normalize", "errors", "data", "immutable"],
  },
  {
    id: "themes",
    group: "foundations",
    label: "Temas & tokens",
    eyebrow: "DESIGN SYSTEM",
    title: "Temas e tokens",
    description: "Tema por instância e tokens parciais sem alterar a lógica nem duplicar os estilos estruturais.",
    badges: ["dark", "light", "system"],
    facts: [{ value: "3", label: "modos" }, { value: "11", label: "tokens" }, { value: "local", label: "por instância" }, { value: "CSS", label: "variables" }],
    sections: [
      { id: "resolution", title: "Resolução", body: "system segue prefers-color-scheme. applyTheme escreve variáveis --nd-* no elemento raiz, por isso duas instâncias podem usar temas diferentes na mesma página." },
      { id: "tokens", title: "ThemeTokens", body: "background, surface, foreground, muted, border, primary, positive, warning, danger, fontFamily e borderRadius." },
      { id: "contrast", title: "Contraste", body: "Usa contrastRatio, relativeLuminance e readableTextColor para validar cores personalizadas. Mantém foco e estados críticos distinguíveis nos dois temas." },
    ],
    code: [{ label: "TOKENS LOCAIS", language: "tsx", code: `<Topology data={services} theme="dark" tokens={{
  background: '#0b0e0f',
  surface: '#121617',
  foreground: '#f3f4ef',
  primary: '#c8fa63',
  warning: '#f5c451',
  borderRadius: 8
}} />` }],
    keywords: ["theme", "tokens", "dark", "light", "contrast", "colors"],
  },
  {
    id: "accessibility",
    group: "foundations",
    label: "Acessibilidade",
    eyebrow: "INCLUSÃO",
    title: "Acessibilidade",
    description: "Representação semântica paralela, teclado, foco e controlo de movimento para visualizações que usam Canvas ou WebGL.",
    badges: ["keyboard", "screen reader", "reduced motion"],
    facts: [{ value: "300", label: "itens semânticos default" }, { value: "4", label: "componentes navegáveis" }, { value: "WCAG", label: "contraste" }, { value: "0", label: "Canvas sem fallback" }],
    sections: [
      { id: "parallel", title: "Semântica paralela", body: "Chart cria uma tabela acessível; Topology uma lista de nós; Gantt uma lista de tarefas. Estes elementos coexistem com Canvas/WebGL e respeitam accessibilityLimit." },
      { id: "keyboard", title: "Teclado", body: "Seleção usa Enter/Espaço. Gantt e Calendar oferecem move/resize por teclas modificadoras. interactive.keyboard=false remove os itens da ordem de tabulação." },
      { id: "labels", title: "Rótulos", body: "Define ariaLabel com contexto de produto, não apenas o tipo de gráfico. Formata valores para que tabela acessível e tooltip comuniquem a mesma unidade." },
    ],
    code: [{ label: "INTERAÇÃO SELETIVA", language: "tsx", code: `<Topology data={services}
  ariaLabel="Dependências dos serviços de checkout em produção"
  interactive={{ keyboard: true, pointer: true, pan: true, zoom: true }}
  performance={{ accessibilityLimit: 500 }} />` }],
    keywords: ["a11y", "accessibility", "keyboard", "screen reader", "aria", "focus"],
  },
  {
    id: "performance",
    group: "foundations",
    label: "Performance",
    eyebrow: "RENDER ENGINE",
    title: "Performance e renderers",
    description: "Seleção DOM, Canvas ou WebGL por volume, com limites configuráveis e fallback seguro.",
    badges: ["auto", "Canvas", "WebGL"],
    facts: [{ value: "750", label: "Canvas threshold" }, { value: "5k", label: "WebGL threshold" }, { value: "2×", label: "DPR default máx." }, { value: "10k", label: "volume testado" }],
    sections: [
      { id: "auto", title: "renderer: auto", body: "A escolha depende da família: Gantt usa DOM/densidade Canvas/WebGL; Chart usa Canvas e WebGL apenas para scatter; Topology usa Canvas/WebGL; Calendar usa DOM; GeoMap e Diagram usam Canvas." },
      { id: "fallback", title: "Fallback", body: "WebGL indisponível, inicialização falhada ou perda de contexto ativa fallback Canvas nos motores GPU. Chart só usa WebGL em scatter; os restantes tipos usam Canvas." },
      { id: "measurement", title: "Medição", body: "Define uma altura estável, limita devicePixelRatio em dispositivos densos e chama resize() quando o host muda fora do alcance do ResizeObserver." },
      { id: "benchmark", title: "Benchmarks reproduzíveis da candidata", body: "npm run benchmark mede 18 cargas nas seis famílias e seis planos com recursos, fusos e férias. O relatório beta-benchmark.json guarda ambiente, hashes, amostras e renderer efetivo. Executa após build:lib e sem testes em paralelo.", bullets: ["Updates com dados realmente alterados: Chart 1k–100k pontos; Gantt 100–10k tarefas; Topology grid 100–1k nós; GeoMap 1k–50k pontos; Diagram treemap 100–5k nós; Calendar agenda 100–2k eventos. São cargas de ensaio, não máximos garantidos.", "Dois aquecimentos e nove amostras por update; p95 é o máximo neste tamanho de amostra. Separa cálculo CPU, resposta em duas frames e seleção por teclado. Não é FPS nem medição de um dispositivo físico.", "Heap JS medido após recolha de lixo, antes de montar e após destruir. DOM residual é erro; um delta de memória isolado não prova uma fuga. Não mede VRAM.", "Planos laborais de 50, 200 e 500 tarefas, dez recursos e nivelamento ligado/desligado. Variantes especializadas têm custos diferentes; não há comparação com concorrentes ou promessa de 60 FPS para qualquer volume."] },
    ],
    code: [{ label: "PERFORMANCE OPTIONS", language: "tsx", code: `<Chart series={series} renderer="auto" performance={{
  canvasThreshold: 500,
  webglThreshold: 5_000,
  maxDevicePixelRatio: 2,
  accessibilityLimit: 300
}} />` }],
    api: [{ title: "PerformanceOptions", rows: [
      { name: "canvasThreshold", type: "number", defaultValue: "750", description: "Itens a partir dos quais auto prefere Canvas." },
      { name: "webglThreshold", type: "number", defaultValue: "5000", description: "Itens a partir dos quais auto tenta WebGL." },
      { name: "maxDevicePixelRatio", type: "number", defaultValue: "2", description: "Limita memória e resolução do Canvas." },
      { name: "accessibilityLimit", type: "number", defaultValue: "300", description: "Máximo de itens na representação semântica paralela." },
    ] }],
    keywords: ["performance", "renderer", "dom", "canvas", "webgl", "threshold", "10k"],
  },
  {
    id: "plugins",
    group: "foundations",
    label: "Plugins",
    eyebrow: "EXTENSIBILIDADE",
    title: "Plugins",
    description: "Hooks tipados para observar render, dados, opções e destruição sem forkar os componentes.",
    badges: ["lifecycle", "typed context", "cleanup"],
    facts: [{ value: "5", label: "hooks" }, { value: "1", label: "contexto" }, { value: "ordered", label: "execução" }, { value: "safe", label: "destroy" }],
    sections: [
      { id: "context", title: "NodaraPluginContext", body: "Cada hook recebe element, data e options atuais. Usa-o para telemetria, instrumentação, auditorias ou integração com ferramentas de produto." },
      { id: "order", title: "Ordem", body: "beforeRender corre antes do desenho e afterRender depois. onDataChange e onOptionsChange acompanham updates; onDestroy liberta recursos externos." },
      { id: "discipline", title: "Disciplina", body: "Plugins não devem mutar data nem options. Guarda unsubscribes e observers dentro do plugin e remove-os no destroy." },
    ],
    code: [{ label: "PLUGIN DE MÉTRICAS", language: "ts", code: `const metricsPlugin = {
  name: 'render-metrics',
  beforeRender({ element }) { element.dataset.started = String(performance.now()); },
  afterRender({ element, data }) { reportRender(data, element.dataset.started); },
  onDataChange({ data }) { reportVolume(data); },
  onDestroy() { flushMetrics(); }
};

createTopology('#map', { data, plugins: [metricsPlugin] });` }],
    api: [{ title: "NodaraPlugin", rows: [
      { name: "name", type: "string", defaultValue: "obrigatório", description: "Identificador estável do plugin." },
      { name: "beforeRender", type: "(context) => void", defaultValue: "—", description: "Antes de cada render." },
      { name: "afterRender", type: "(context) => void", defaultValue: "—", description: "Depois de cada render." },
      { name: "onDataChange", type: "(context) => void", defaultValue: "—", description: "Depois de update normalizado." },
      { name: "onOptionsChange", type: "(context) => void", defaultValue: "—", description: "Depois de setOptions." },
      { name: "onDestroy", type: "(context) => void", defaultValue: "—", description: "No teardown final." },
    ] }],
    keywords: ["plugin", "hooks", "lifecycle", "telemetry", "extension"],
  },
  {
    id: "controller",
    group: "reference",
    label: "Controller",
    eyebrow: "API IMPERATIVA",
    title: "NodaraController",
    description: "Uma superfície de lifecycle idêntica para os seis componentes e todas as stacks.",
    badges: ["reactive", "normalized", "unsubscribe"],
    facts: [{ value: "8", label: "membros públicos" }, { value: "1", label: "contrato" }, { value: "0", label: "recriações necessárias" }, { value: "typed", label: "generics" }],
    sections: [
      { id: "updates", title: "Updates", body: "update normaliza, guarda e redesenha; setOptions faz merge parcial e redesenha. Ambos notificam plugins e listeners." },
      { id: "events", title: "Subscrições", body: "on devolve sempre uma função de unsubscribe. Usa-a quando a subscrição tiver lifecycle inferior ao controller." },
      { id: "destroy", title: "Destroy idempotente", body: "destroy remove ResizeObserver, listeners de documento, cleanup do renderer, atributos e plugins. Adaptadores chamam-no automaticamente." },
    ],
    code: [{ label: "CONTROLLER", language: "ts", code: `const controller = createGantt(host, { data: tasks });
const unsubscribe = controller.on('task:change', syncTask);

controller.update(nextTasks);
controller.setOptions({ zoom: 'quarter' });
controller.resize();

unsubscribe();
controller.destroy();` }],
    api: [{ title: "NodaraController<TData, TOptions>", rows: controllerRows }],
    keywords: ["controller", "update", "setOptions", "resize", "destroy", "events"],
  },
  {
    id: "events-errors",
    group: "reference",
    label: "Eventos & erros",
    eyebrow: "OBSERVABILIDADE",
    title: "Eventos e erros",
    description: "Callbacks por componente, event bus comum e códigos de validação previsíveis.",
    badges: ["typed payloads", "stable codes", "source"],
    facts: [{ value: "8+", label: "eventos" }, { value: "3", label: "origens" }, { value: "1", label: "error channel" }, { value: "stable", label: "códigos" }],
    sections: [
      { id: "sources", title: "InteractionSource", body: "Eventos de seleção e alteração indicam pointer, keyboard ou api. Isto permite telemetria e regras de produto sem inferir a origem." },
      { id: "lifecycle", title: "Eventos comuns", body: "render, data:change, options:change e error estão disponíveis em todos os controllers." },
      { id: "validation", title: "NodaraError", body: "Erros de contrato usam códigos como ND_DUPLICATE_ID, ND_INVALID_RANGE, ND_DANGLING_EDGE e ND_INVALID_DURATION, acompanhados de mensagem acionável." },
    ],
    code: [{ label: "TRATAMENTO CENTRAL", language: "ts", code: `const controller = createCalendar(host, {
  events,
  onError(error) { captureException(error); }
});

controller.on('error', error => showToast(error.message));
controller.on('data:change', data => audit('calendar-data', data));` }],
    events: [
      { name: "render", type: "{ data: TData; options: TOptions }", defaultValue: "todos", description: "Render concluído com os dados e opções atuais." },
      { name: "data:change", type: "TData", defaultValue: "todos", description: "Update normalizado aplicado." },
      { name: "options:change", type: "TOptions", defaultValue: "todos", description: "Opções efetivas alteradas." },
      { name: "error", type: "Error", defaultValue: "todos", description: "Erro do renderer ou lifecycle." },
      { name: "task:select / task:change", type: "GanttTaskEvent", defaultValue: "Gantt", description: "Seleção e edição de tarefa." },
      { name: "point:select", type: "ChartPointEvent", defaultValue: "Chart", description: "Seleção de ponto." },
      { name: "node:select / viewport:change", type: "Topology events", defaultValue: "Topology", description: "Seleção de nó e viewport." },
      { name: "event:select / event:change", type: "Calendar events", defaultValue: "Calendar", description: "Seleção e edição de evento." },
    ],
    keywords: ["events", "errors", "NodaraError", "callback", "source", "data:change"],
  },
  {
    id: "utilities",
    group: "reference",
    label: "Utilities",
    eyebrow: "CORE EXPORTS",
    title: "Utilities públicas",
    description: "Modelos reutilizáveis para datas, layouts, recorrências, cores e escolha de renderer.",
    badges: ["pure functions", "tree-shakeable", "tested"],
    facts: [{ value: "7", label: "famílias" }, { value: "pure", label: "modelos" }, { value: "public", label: "exports" }, { value: "typed", label: "inputs" }],
    sections: [
      { id: "gantt", title: "Tempo e Gantt", body: "DAY, buildTimeScale, resolveGanttRange, resolveSnap, snapTimestamp, shiftTask, resizeTask, replaceTask, dependencyPairs e conversores timestamp/percentagem." },
      { id: "calendar", title: "Calendário e recorrência", body: "calendarRange, startOfDay, startOfWeek, moveCalendarEvent, resizeCalendarEvent, replaceCalendarEvent, parseRecurrence, expandRecurringEvent e expandCalendarEvents." },
      { id: "math", title: "Hierarquias e estatística", body: "layoutDiagramHierarchy, layoutDiagramSankey, validateDiagramLayout, gaussianKDE, histogram, histogramSeries, marchingSquares, scalarGridSeries e seriesScalarGrid. Consulta Estatística e isolinhas e Planeamento integrado para contratos e exemplos numéricos." },
      { id: "visual", title: "Layout, renderer e cor", body: "calculateTopologyLayout, resolveRenderMode, supportsWebGL, isInteractionEnabled, renderWebGLPoints, applyTheme, resolveTheme, contrastRatio, relativeLuminance e readableTextColor." },
    ],
    code: [{ label: "MODELOS SEM UI", language: "ts", code: `import {
  calculateTopologyLayout,
  expandCalendarEvents,
  shiftTask,
  contrastRatio
} from '@nodara/core';

const moved = shiftTask(task, 86_400_000);
const positions = calculateTopologyLayout(data, 'hierarchical', 900, 520);
const visible = expandCalendarEvents(events, rangeStart, rangeEnd, 250);` }],
    keywords: ["utilities", "time scale", "recurrence", "layout", "color", "render mode"],
  },
  {
    id: "testing",
    group: "reference",
    label: "Testes & qualidade",
    eyebrow: "QUALITY GATES",
    title: "Testar integrações Nodara",
    description: "Estratégia para contratos, renderers, eventos, acessibilidade, performance e browsers.",
    badges: ["Vitest", "Playwright", "TypeScript"],
    facts: [{ value: "Unit", label: "contratos e matemática" }, { value: "E2E", label: "percursos reais" }, { value: "4", label: "perfis de browser" }, { value: "Artefactos", label: "consumidores isolados" }],
    sections: [
      { id: "unit", title: "Unitários", body: "Testa normalizers e utilities com dados inválidos, limites, imutabilidade e casos vazios. Não uses screenshots para regras de negócio." },
      { id: "integration", title: "Integração", body: "Monta o adaptador, altera dados e opções, observa atributos data-nd-* e confirma eventos. Verifica destroy para evitar listeners residuais." },
      { id: "browser", title: "Browser", body: "Automatiza teclado, ponteiro, Canvas/WebGL, temas, largura mobile e ausência de erros de página. Para grandes volumes, mede também densidade DOM e tempo." },
      { id: "beta", title: "Preparação da beta, sem publicação implícita", body: "A candidata continua alpha até receber uma versão de distribuição própria. O gate compara 269 exports de declarações em seis entradas, compila exemplos e instala os cinco pacotes em consumidores isolados. Consultar docs/BETA-READINESS.md e docs/PUBLIC_API.md no repositório.", bullets: ["Mudanças de API exigem revisão da baseline e notas de migração. Assinaturas iguais não garantem comportamento igual; os percursos e contratos continuam obrigatórios.", "A validação com leitor de ecrã real está pendente. Existe um percurso de teclado, anúncios, tabelas, erros e cinco vistas em docs/SCREEN-READER-CHECKLIST.md. Axe e emulação não contam como execução com NVDA.", "Publicar o portal não publica pacotes no npm nem significa certificação WCAG ou prontidão industrial. Acesso ao portal e distribuição dos pacotes são decisões separadas."] },
    ],
    code: [{ label: "PLAYWRIGHT", language: "ts", code: `await page.getByRole('button', { name: 'Dados' }).click();
await page.getByRole('textbox', { name: /Editar JSON/ }).fill(nextJson);
await expect(page.locator('.nd-gantt__label-text').first()).toContainText('Discovery');
await expect(page.locator('.nd-root')).toHaveAttribute('data-nd-renderer', /dom|canvas|webgl/);` }],
    keywords: ["testing", "vitest", "playwright", "e2e", "quality", "performance"],
  },
];

export const docsById = new Map(docsPages.map((page) => [page.id, page]));
