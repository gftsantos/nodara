import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@nodara/core/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nodara-visual.gftsantos.chatgpt.site"),
  title: "Nodara — Visual infrastructure for the web",
  robots: { index: false, follow: false },
  description:
    "Gantt, gráficos, grafos, topologias e calendários para React, Angular, Vue e JavaScript.",
  openGraph: {
    title: "Nodara — Dados complexos. Clareza instantânea.",
    description: "Gantt, charts, topology e calendar num único core TypeScript.",
    type: "website",
    locale: "pt_PT",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Nodara — Dados complexos. Clareza instantânea." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodara — Dados complexos. Clareza instantânea.",
    description: "Gantt, charts, topology e calendar num único core TypeScript.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
