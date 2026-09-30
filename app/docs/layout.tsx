import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação — Nodara",
  description: "Referência completa de Gantt, Chart, Topology, Calendar, GeoMap, Diagram, schedulers, frameworks, acessibilidade e performance.",
  openGraph: {
    title: "Nodara Docs — Referência completa",
    description: "Seis componentes, 69 variantes de configuração e 100 exemplos de utilização, com contratos TypeScript e limites documentados.",
  },
};

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
