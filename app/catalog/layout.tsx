import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo — 69 tipos visuais e 100 receitas Nodara",
  description: "Explora 6 componentes, 69 tipos visuais únicos e 100 receitas de Gantt, gráficos, topologias, calendários, mapas e diagramas, com demos e dados editáveis.",
};

export default function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
