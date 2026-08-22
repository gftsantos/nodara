import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo — 100 visualizações Nodara",
  description: "Explora 100 visualizações reais de Gantt, gráficos, topologias, calendários, mapas e diagramas, com demos e dados editáveis.",
};

export default function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
