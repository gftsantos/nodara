"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import type { VisualCatalogItem } from "@nodara/core";
import type { CatalogData } from "./catalog-data";
import { integrationFiles, integrationFrameworks, integrationPackages, type IntegrationFramework, type IntegrationSettings } from "./integration";
import styles from "./catalog.module.css";

export default function IntegrationWorkbench({ item, data, settings, onSettingsChange, pending }: {
  item: VisualCatalogItem; data: CatalogData; settings: IntegrationSettings;
  onSettingsChange: (settings: IntegrationSettings) => void; pending: boolean;
}) {
  const [framework, setFramework] = useState<IntegrationFramework>("react");
  const [fileIndex, setFileIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const files = integrationFiles(item, data, settings, framework);
  const file = files[fileIndex] ?? files[0]!;
  const packages = integrationPackages(framework);
  const install = `npm install ${packages.map(name => `./${name}`).join(" ")}`;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copiado.`);
    } catch {
      setCopyStatus("O browser bloqueou a cópia. Seleciona o código e usa Ctrl+C / ⌘C.");
    }
  };
  return <section className={styles.integration} aria-label="Integração pronta a copiar" id="integrar">
    <div className={styles.sectionTitle}><span>Do preview para o teu projeto</span><span className={styles.realBadge}>ALPHA · 0.1.0</span></div>
    <p>Escolhe a stack. O código inclui os dados validados, opções, estilos e eventos desta demonstração.</p>
    <div className={styles.integrationControls}>
      <label>Framework<select aria-label="Framework de integração" value={framework} onChange={event => { setFramework(event.target.value as IntegrationFramework); setFileIndex(0); setCopyStatus(""); }}>{Object.entries(integrationFrameworks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Altura · {settings.height}px<input aria-label="Altura da visualização" type="range" min="300" max="700" step="20" value={settings.height} onChange={event => onSettingsChange({ ...settings, height: Number(event.target.value) })} /></label>
      <label className={styles.checkbox}><input type="checkbox" checked={settings.interactive} onChange={event => onSettingsChange({ ...settings, interactive: event.target.checked })} /> Interações ativas</label>
    </div>
    {pending && <p className={styles.warning} role="status">Há alterações por validar. O código conserva os últimos dados válidos do preview.</p>}
    <details className={styles.installGuide} open>
      <summary>1. Instalar no teu projeto</summary>
      <p>Os pacotes alpha ainda não estão publicados no npm. Descarrega estes ficheiros para a pasta do teu projeto e executa o comando.</p>
      <div className={styles.downloads}>{packages.map(name => <a key={name} href={`/downloads/${name}`} download><Download size={14} /> {name.replace("-0.1.0-alpha.1.tgz", "")}</a>)}</div>
      <div className={styles.installCommand}><code>{install}</code><button type="button" onClick={() => copy(install, "Comando")} aria-label="Copiar comando de instalação"><Copy size={16} /></button></div>
      <p>{framework === "angular" ? "Requer Angular >=21.2.21 <22. Importa NodaraExampleComponent no componente pai, usa <app-nodara-example /> e adiciona o CSS aos estilos globais." : framework === "vue" ? "Requer Vue 3.3+. Cola o ficheiro .vue, importa-o no componente pai e usa <NodaraExample />." : framework === "react" ? "Requer React >=18.2.0. Cola o ficheiro .tsx, importa-o e usa <NodaraExample />. Em Next.js, mantém a diretiva use client." : "Exemplo para um projeto com bundler, como Vite. Os imports npm não funcionam ao abrir o HTML diretamente como ficheiro."}</p>
    </details>
    <div className={styles.sectionTitle}><span>2. Copiar os ficheiros</span><button type="button" onClick={() => copy(file.code, file.name)}>{copyStatus === `${file.name} copiado.` ? <Check size={15} /> : <Copy size={15} />} Copiar ficheiro</button></div>
    <div className={styles.fileTabs} role="group" aria-label="Ficheiros de integração">{files.map((entry, index) => <button key={entry.name} type="button" aria-pressed={file.name === entry.name} onClick={() => { setFileIndex(index); setCopyStatus(""); }}>{entry.name}</button>)}</div>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll and select the code region. */}
    <div role="region" tabIndex={0} aria-label={`Código ${file.name}`} className={styles.generatedCode}><pre><code>{file.code}</code></pre></div>
    <p role="status" className={styles.copyStatus}>{copyStatus || `${files.length} ${files.length === 1 ? "ficheiro completo" : "ficheiros completos"} · Dados locais, sem serviço externo.`}</p>
  </section>;
}
