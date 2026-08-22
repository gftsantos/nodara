import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação — Nodara",
  description: "Referência completa de Gantt, Chart, Topology, Calendar, GeoMap, Diagram, schedulers, frameworks, acessibilidade e performance.",
  openGraph: {
    title: "Nodara Docs — Referência completa",
    description: "Cem visualizações, seis motores, cinco pacotes e uma API TypeScript documentada de ponta a ponta.",
  },
};

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
