import type { VisualCatalogItem } from "@nodara/core";

export function recipeLimitations(item: VisualCatalogItem): string[] {
  const notes: string[] = [];
  if (item.id === "critical-path") notes.push("Este preset mostra dependências. O cálculo de caminho crítico e folgas está no workspace /operations e na API operationalCriticalPath.");
  if (item.family === "diagrams") {
    const type = String(item.options.type);
    const shared: Record<string, string> = {
      sankey: "Partilha o motor de fluxo com Alluvial.", alluvial: "Preset do motor Sankey; não adiciona estratos temporais próprios.",
      tree: "Partilha o layout com Organograma.", "org-chart": "Preset do layout de árvore.",
      "radial-tree": "Partilha o layout com Mindmap.", mindmap: "Preset da árvore radial.",
      flowchart: "Partilha o layout com ER e Estados.", er: "Layout de caixas e ligações; sem atributos, cardinalidades ou notação ER dedicada.",
      state: "Layout de caixas e ligações; sem semântica de máquina de estados.",
    };
    if (shared[type]) notes.push(shared[type]!);
    if (["treemap", "sunburst", "icicle", "circle-pack"].includes(type)) notes.push("Hierarquia real por parentId. Os pesos das folhas são agregados; valores nos pais não são contados duas vezes. Ciclos e pesos negativos são rejeitados. Contribuições abaixo da precisão numérica não têm área representável.");
    if (["sankey", "alluvial"].includes(type)) notes.push("Fluxos acíclicos com escala global de largura. A altura dos nós é o máximo entre entrada e saída; desequilíbrios não são inventados como novos fluxos.");
  }
  if (item.family === "charts" && item.options.type === "histogram") notes.push("Usa histogram(samples, {edges}) + histogramSeries para calcular contagens/densidades. Os limites binStart/binEnd preservam larguras desiguais. Dados x/y sem limites continuam a ser bins pré-agregados.");
  if (item.family === "charts" && item.options.type === "violin") notes.push("KDE gaussiano por série; Y contém amostras brutas. Bandwidth Scott ou absoluto explícito, escala de densidade partilhada. Amostras constantes sem bandwidth mostram apenas marcas, não uma densidade inventada.");
  if (item.family === "charts" && item.options.type === "contour") notes.push("Isolinhas reais de grelha retangular: usa scalarGridSeries({x,y,values}). gridY identifica a coordenada de cada linha. Não interpola pontos dispersos nem calcula densidade 2D; seleção/tooltip refere-se às amostras da grelha.");
  if (item.family === "charts" && ["gauge", "waterfall", "funnel"].includes(String(item.options.type))) notes.push("Uma série por componente; Gauge aceita um único valor. Configurações adicionais são rejeitadas explicitamente.");
  if (item.family === "maps") notes.push("Projeção vetorial local. Fornece os teus polígonos: não inclui cartografia mundial, tiles ou geocoding.");
  if (item.family === "calendar") {
    notes.push("Recorrência básica DAILY/WEEKLY/MONTHLY. O fuso formata rótulos; a grelha segue o fuso do browser.");
    if (["agenda", "year", "timeline-day", "timeline-week", "resource-day", "resource-week"].includes(String(item.options.view))) notes.push("Esta vista permite consulta/seleção; move e redimensiona eventos nas vistas dia, semana, semana útil ou mês.");
  }
  return notes;
}
