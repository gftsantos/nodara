import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação — Nodara",
  description: "Referência completa de Gantt, Chart, Topology, Calendar, core, React, Vue, Angular, Web Components, temas, acessibilidade e performance.",
  openGraph: {
    title: "Nodara Docs — Referência completa",
    description: "Quarenta e oito visualizações, quatro motores, cinco pacotes e uma API TypeScript documentada de ponta a ponta.",
  },
};

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
