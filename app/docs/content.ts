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
  { name: "getData()", type: "TData", defaultValue: "—", description: "Devolve o snapshot normalizado atual." },
  { name: "getOptions()", type: "TOptions", defaultValue: "—", description: "Devolve as opções efetivas atuais." },
  { name: "update(data)", type: "void", defaultValue: "—", description: "Normaliza novamente os dados e redesenha sem recriar o controller." },
  { name: "setOptions(options)", type: "void", defaultValue: "—", description: "Faz merge parcial e aplica opções dinamicamente." },
  { name: "resize()", type: "void", defaultValue: "—", description: "Força nova medição e renderização." },
  { name: "on(event, listener)", type: "() => void", defaultValue: "—", description: "Subscreve um evento e devolve a função de unsubscribe." },
  { name: "destroy()", type: "void", defaultValue: "—", description: "Remove listeners, observers, conteúdo e plugins." },
];

export const docsPages: DocPage[] = [
  {
    id: "overview",
    group: "start",
    label: "Visão geral",
    eyebrow: "NODARA DOCS",
    title: "6 componentes. 69 tipos. 100 receitas.",
    description: "A Nodara disponibiliza seis componentes públicos, 69 tipos visuais únicos e 100 receitas reais: Gantt, Chart, Topology, Calendar, GeoMap e Diagram. Os componentes definem o contrato; o catálogo fornece configurações prontas, demos e padrões de integração.",
    badges: ["v0.1 alpha", "TypeScript strict", "MIT core"],
    facts: [{ value: "100", label: "receitas" }, { value: "69", label: "tipos visuais" }, { value: "6", label: "componentes" }, { value: "5", label: "pacotes" }],
    sections: [
      { id: "model", title: "O modelo do produto", body: "Seis componentes partilham contratos de dados, temas, renderização adaptativa, acessibilidade, lifecycle e erros. Sobre eles vivem 69 tipos visuais e 100 receitas documentadas, sem duplicar lógica nem criar APIs incompatíveis.", bullets: ["12 receitas Gantt sobre quatro escalas temporais.", "32 receitas de gráfico sobre 26 geometrias.", "12 receitas de topologia sobre cinco layouts em uso.", "16 calendários sobre dez vistas.", "14 mapas sobre dez combinações de modo e projeção.", "14 diagramas, cada um com o seu tipo visual."] },
      { id: "status", title: "O que significa alpha", body: "A implementação é funcional e testada, mas a API ainda pode receber alterações aditivas antes da versão 1.0. Os pacotes continuam versionados em conjunto e mudanças incompatíveis devem ter guia de migração." },
      { id: "path", title: "Percurso recomendado", body: "Começa pela instalação, abre a página do componente, copia o schema mínimo e só depois ajusta renderer, interações e performance. A referência do controller é comum a todas as stacks." },
    ],
    code: [{ label: "INSTALAÇÃO REACT", language: "bash", code: "npm i @nodara/react\n\n# CSS base obrigatório\nimport '@nodara/core/styles.css';" }],
    keywords: ["introdução", "componentes", "gantt", "chart", "topology", "calendar", "alpha"],
  },
  {
    id: "catalog",
    group: "start",
    label: "Catálogo de 100",
    eyebrow: "COLEÇÃO",
    title: "Tipos únicos e receitas",
    description: "O catálogo reúne 69 tipos visuais únicos e 100 receitas funcionais. Podes explorar sem repetição ou abrir todos os presets; cada item usa o componente real, permite reescrever os dados, valida o schema e mostra opções, eventos e código React.",
    badges: ["69 tipos únicos", "100 receitas", "dados editáveis"],
    facts: [{ value: "12", label: "Gantt" }, { value: "32", label: "gráficos" }, { value: "14", label: "mapas" }, { value: "14", label: "diagramas" }],
    sections: [
      { id: "honesty", title: "Componentes, tipos e receitas", body: "Nodara não apresenta 100 receitas como 100 implementações isoladas. Existem seis componentes públicos, 69 tipos visuais e 100 receitas; as 31 adicionais são presets de domínio que reutilizam um tipo com dados e opções próprios." },
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
    description: "Instala apenas o adaptador da tua stack. O core é uma dependência do adaptador e também pode ser usado diretamente.",
    badges: ["Node 22+", "ESM + CJS", "tree-shaking"],
    facts: [{ value: "React", label: "@nodara/react" }, { value: "Vue", label: "@nodara/vue" }, { value: "Angular", label: "@nodara/angular" }, { value: "JS", label: "@nodara/core" }],
    sections: [
      { id: "css", title: "Carrega os estilos uma vez", body: "Importa @nodara/core/styles.css no ponto de entrada da aplicação. Tokens e className permitem personalização posterior sem duplicar o CSS estrutural." },
      { id: "container", title: "Define uma altura", body: "Canvas, WebGL e calendários precisam de um host com altura mensurável. Usa style, uma classe ou o layout da aplicação para garantir a dimensão." },
      { id: "types", title: "Importa os contratos", body: "Todos os adaptadores reexportam os tipos de dados e opções do core. Mantém os payloads tipados desde a origem para detetar erros antes do runtime." },
    ],
    code: [
      { label: "PACOTES", language: "bash", code: "npm i @nodara/react\nnpm i @nodara/vue\nnpm i @nodara/angular\nnpm i @nodara/core\nnpm i @nodara/web-components" },
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
      { id: "editing", title: "Edição", body: "O ponteiro move a barra ou os handles de início/fim. Pelo teclado, setas movem, Shift + setas redimensiona o início e Alt + setas redimensiona o fim. Cada commit emite task:change com a tarefa anterior." },
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
        { name: "rowHeight", type: "number", defaultValue: "58", description: "Altura de linha; mínimo efetivo de 36 px." },
        { name: "snap", type: "none | day | week | number", defaultValue: "none", description: "Incremento usado em move e resize." },
        { name: "dependencyRouting", type: "straight | orthogonal", defaultValue: "straight", description: "Traçado das dependências." },
        { name: "onTaskSelect", type: "(event) => void", defaultValue: "—", description: "Seleção por ponteiro ou teclado." },
        { name: "onTaskChange", type: "(event) => void", defaultValue: "—", description: "Move ou resize confirmado." },
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
      { id: "stacking", title: "Stacking", body: "stacked calcula baselines por índice e trata valores positivos e negativos separadamente para evitar domínios incorretos." },
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
        { name: "stacked", type: "boolean", defaultValue: "false", description: "Empilha séries por índice." },
        { name: "showLegend", type: "boolean", defaultValue: "true", description: "Legenda visual das séries." },
        { name: "showGrid", type: "boolean", defaultValue: "true", description: "Linhas horizontais e valores do domínio." },
        { name: "showAxes", type: "boolean", defaultValue: "true", description: "Rótulos dos eixos." },
        { name: "showTooltip", type: "boolean", defaultValue: "true", description: "Tooltip no hover de um ponto." },
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
        { name: "onEventChange", type: "(event) => void", defaultValue: "—", description: "Move ou resize confirmado." },
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
      { id: "flows", title: "Fluxos ponderados", body: "Sankey e alluvial atribuem níveis aos nós e espessura proporcional a link.value. Chord distribui grupos em círculo e representa relações curvas." },
      { id: "hierarchies", title: "Hierarquias e processos", body: "Treemap, sunburst, icicle e circle-pack representam magnitude; tree, radial-tree, mindmap, flowchart, org-chart, ER e state organizam relações e níveis." },
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
        { name: "orientation", type: "horizontal | vertical", defaultValue: "horizontal", description: "Direção principal de layouts hierárquicos." },
        { name: "nodeWidth", type: "number", defaultValue: "92", description: "Largura base dos nós retangulares." },
        { name: "nodeGap", type: "number", defaultValue: "18", description: "Espaçamento entre nós e fluxos." },
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
    badges: ["React 18+", "hooks", "tipos reexportados"],
    facts: [{ value: "6", label: "componentes" }, { value: "1", label: "prop onReady" }, { value: "0", label: "providers" }, { value: "100%", label: "typed" }],
    sections: [
      { id: "lifecycle", title: "Lifecycle", body: "A instância é criada no mount, data e options são observados separadamente, e destroy corre no unmount. onReady entrega o controller quando precisas da API imperativa." },
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
    badges: ["Angular 17+", "standalone", "EventEmitter"],
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
      { id: "updates", title: "Todos os updates passam aqui", body: "controller.update() volta sempre a normalizar. O input não é mutado; o controller mantém um snapshot clonado e seguro." },
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
      { id: "auto", title: "renderer: auto", body: "O core escolhe DOM abaixo do Canvas threshold, Canvas em volume intermédio e WebGL acima do threshold quando o browser o suporta." },
      { id: "fallback", title: "Fallback", body: "WebGL explícito recua para Canvas se não estiver disponível. Chart converte DOM pedido em Canvas porque a geometria principal é desenhada em bitmap." },
      { id: "measurement", title: "Medição", body: "Define uma altura estável, limita devicePixelRatio em dispositivos densos e chama resize() quando o host muda fora do alcance do ResizeObserver." },
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
      { name: "render", type: "TData", defaultValue: "todos", description: "Render concluído." },
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
    facts: [{ value: "247", label: "testes core" }, { value: "36", label: "E2E ativos" }, { value: "2", label: "viewports" }, { value: "10k", label: "volume" }],
    sections: [
      { id: "unit", title: "Unitários", body: "Testa normalizers e utilities com dados inválidos, limites, imutabilidade e casos vazios. Não uses screenshots para regras de negócio." },
      { id: "integration", title: "Integração", body: "Monta o adaptador, altera dados e opções, observa atributos data-nd-* e confirma eventos. Verifica destroy para evitar listeners residuais." },
      { id: "browser", title: "Browser", body: "Automatiza teclado, ponteiro, Canvas/WebGL, temas, largura mobile e ausência de erros de página. Para grandes volumes, mede também densidade DOM e tempo." },
    ],
    code: [{ label: "PLAYWRIGHT", language: "ts", code: `await page.getByRole('button', { name: 'Dados' }).click();
await page.getByRole('textbox', { name: /Editar JSON/ }).fill(nextJson);
await expect(page.locator('.nd-gantt__label-text').first()).toContainText('Discovery');
await expect(page.locator('.nd-root')).toHaveAttribute('data-nd-renderer', /dom|canvas|webgl/);` }],
    keywords: ["testing", "vitest", "playwright", "e2e", "quality", "performance"],
  },
];

export const docsById = new Map(docsPages.map((page) => [page.id, page]));
