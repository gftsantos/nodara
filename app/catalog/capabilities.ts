import type { VisualCatalogItem } from "@nodara/core";

export function recipeLimitations(item: VisualCatalogItem): string[] {
  const notes: string[] = [];
  if (item.id === "critical-path") notes.push("Preset com dependências; ainda não calcula caminho crítico nem folgas.");
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
    if (["treemap", "sunburst", "icicle", "circle-pack"].includes(type)) notes.push("Implementação base: os pesos são desenhados, mas o encaixe hierárquico completo ainda não está implementado.");
  }
  if (item.family === "charts" && item.options.type === "histogram") notes.push("Recebe bins já agregados em x/y. Não calcula a distribuição a partir de amostras brutas.");
  if (item.family === "charts" && ["violin", "contour"].includes(String(item.options.type))) notes.push("Visualização ilustrativa de densidade; não calcula KDE nem isolinhas científicas. Não usar como análise estatística validada.");
  if (item.family === "maps") notes.push("Projeção vetorial local. Fornece os teus polígonos: não inclui cartografia mundial, tiles ou geocoding.");
  if (item.family === "calendar") {
    notes.push("Recorrência básica DAILY/WEEKLY/MONTHLY. O fuso formata rótulos; a grelha segue o fuso do browser.");
    if (["agenda", "year", "timeline-day", "timeline-week", "resource-day", "resource-week"].includes(String(item.options.view))) notes.push("Esta vista permite consulta/seleção; move e redimensiona eventos nas vistas dia, semana, semana útil ou mês.");
  }
  return notes;
}
