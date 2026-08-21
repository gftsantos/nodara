import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo — 48 visualizações Nodara",
  description: "Explora 48 visualizações e receitas reais de Gantt, gráficos, topologias e calendários, com demos e dados editáveis.",
};

export default function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
