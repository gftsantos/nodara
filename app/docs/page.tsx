"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Box,
  Braces,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  Component,
  Copy,
  Database,
  ExternalLink,
  Gauge,
  Layers3,
  Menu,
  Map,
  Moon,
  Network,
  Palette,
  Puzzle,
  Rows3,
  Search,
  ShieldCheck,
  Sun,
  Terminal,
  TestTube2,
  Webhook,
  Wrench,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { docGroups, docsById, docsPages, type DocGroupId } from "./content";
import styles from "./docs.module.css";

const pageIcons: Partial<Record<string, LucideIcon>> = {
  overview: BookOpen,
  catalog: Layers3,
  installation: Terminal,
  architecture: Layers3,
  gantt: Rows3,
  charts: BarChart3,
  topology: Network,
  calendar: CalendarDays,
  "geo-map": Map,
  diagram: Workflow,
  react: Component,
  vue: Component,
  angular: Component,
  "web-components": Box,
  javascript: Code2,
  schemas: Database,
  themes: Palette,
  accessibility: ShieldCheck,
  performance: Gauge,
  plugins: Puzzle,
  controller: Wrench,
  "events-errors": Webhook,
  utilities: Braces,
  testing: TestTube2,
};

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /><i /></span>;
}

function PortalLink({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  // A plain anchor avoids coupling the documentation client shell to router state.
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <a className={className} href="/" aria-label={label}>{children}</a>;
}

function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return <button className={styles.copyCode} onClick={copy} aria-label="Copiar código">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copiado" : "Copiar"}</button>;
}

function DocIcon({ id, size = 16 }: { id: string; size?: number }) {
  const Icon = pageIcons[id] ?? BookOpen;
  return <Icon size={size} />;
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileNav, setMobileNav] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const docsRef = useRef<HTMLDivElement>(null);

  const activePage = docsById.get(activeId) ?? docsPages[0]!;
  const activeIndex = docsPages.findIndex((page) => page.id === activePage.id);
  const previousPage = activeIndex > 0 ? docsPages[activeIndex - 1] : undefined;
  const nextPage = activeIndex < docsPages.length - 1 ? docsPages[activeIndex + 1] : undefined;
  const filteredPages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return docsPages.filter((page) => [page.label, page.title, page.description, page.packageName, ...page.keywords].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    const root = docsRef.current;
    if (!root) return;
    root.dataset.docsReady = "true";
    return () => { delete root.dataset.docsReady; };
  }, []);

  useEffect(() => {
    function syncHash() {
      const id = window.location.hash.slice(1);
      if (docsById.has(id)) setActiveId(id);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !editing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMobileNav(false);
        setMobileSearch(false);
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openPage(id: string) {
    const page = docsById.get(id);
    if (!page) return;
    setActiveId(id);
    setQuery("");
    setMobileNav(false);
    setMobileSearch(false);
    if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pagesFor(group: DocGroupId) {
    return docsPages.filter((page) => page.group === group);
  }

  return (
    <div ref={docsRef} className={styles.docs} data-theme={theme}>
      <header className={styles.header}>
        <PortalLink className={styles.brand} label="Nodara, voltar ao portal"><BrandMark /><strong>NODARA</strong><span>DOCS</span></PortalLink>
        <div className={`${styles.headerSearch} ${mobileSearch ? styles.headerSearchOpen : ""}`}>
          <Search size={16} />
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar em toda a documentação…" aria-label="Pesquisar documentação" />
          <kbd>/</kbd>
          {query && (
            <div className={styles.searchResults} role="listbox" aria-label="Resultados da pesquisa">
              <div className={styles.searchCount}>{filteredPages.length} {filteredPages.length === 1 ? "resultado" : "resultados"}</div>
              {filteredPages.map((page) => (
                <button key={page.id} role="option" aria-selected={page.id === activeId} onClick={() => openPage(page.id)}>
                  <span><DocIcon id={page.id} /><span><strong>{page.label}</strong><small>{page.description}</small></span></span><ChevronRight size={15} />
                </button>
              ))}
              {filteredPages.length === 0 && <p>Nenhum resultado. Experimenta “WebGL”, “eventos” ou “recorrência”.</p>}
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          <span className={styles.version}>v0.1 ALPHA</span>
          <a href="/catalog"><Layers3 size={16} /><span>Catálogo</span></a>
          <button className={styles.mobileSearchButton} onClick={() => { setMobileSearch((value) => !value); setMobileNav(false); window.setTimeout(() => searchRef.current?.focus(), 0); }} aria-label={mobileSearch ? "Fechar pesquisa" : "Abrir pesquisa"}><Search size={17} /></button>
          <button onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label="Alternar tema">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <a href="https://github.com/gftsantos/nodara" target="_blank" rel="noreferrer"><Code2 size={16} /><span>GitHub</span><ExternalLink size={12} /></a>
          <button className={styles.mobileMenu} onClick={() => setMobileNav((value) => !value)} aria-expanded={mobileNav} aria-label={mobileNav ? "Fechar navegação" : "Abrir navegação"}>{mobileNav ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`} aria-label="Navegação da documentação">
          <div className={styles.sidebarIntro}><span>DOCUMENTAÇÃO</span><strong>Referência completa</strong><small>{docsPages.length} guias · 100 demos · 6 motores</small></div>
          <nav>
            {docGroups.map((group) => (
              <div className={styles.navGroup} key={group.id}>
                <p>{group.label}</p>
                {pagesFor(group.id).map((page) => (
                  <a key={page.id} href={`#${page.id}`} className={page.id === activePage.id ? styles.active : ""} onClick={(event) => { event.preventDefault(); openPage(page.id); }}>
                    <DocIcon id={page.id} /><span>{page.label}</span>{page.id === activePage.id && <i />}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className={styles.sidebarFoot}><span><span className={styles.statusDot} /> API documentada</span><a href="https://github.com/gftsantos/nodara/issues/new" target="_blank" rel="noreferrer">Encontraste um problema? <ArrowRight size={13} /></a></div>
        </aside>

        <main className={styles.main} id="conteudo">
          <article key={activePage.id} className={styles.article}>
            <div className={styles.breadcrumb}><PortalLink>Portal</PortalLink><ChevronRight size={13} /><span>{docGroups.find((group) => group.id === activePage.group)?.label}</span><ChevronRight size={13} /><strong>{activePage.label}</strong></div>
            <header className={styles.articleHeader}>
              <div className={styles.articleEyebrow}><span><DocIcon id={activePage.id} size={15} />{activePage.eyebrow}</span>{activePage.packageName && <code>{activePage.packageName}</code>}</div>
              <h1>{activePage.title}</h1>
              <p>{activePage.description}</p>
              <div className={styles.badges}>{activePage.badges.map((badge) => <span key={badge}><Check size={12} />{badge}</span>)}</div>
            </header>

            <div className={styles.facts}>{activePage.facts.map((fact) => <div key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></div>)}</div>

            {activePage.sections.map((section, index) => (
              <section className={styles.docSection} id={`${activePage.id}-${section.id}`} key={section.id}>
                <span className={styles.sectionIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{section.title}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={15} />{bullet}</li>)}</ul>}</div>
              </section>
            ))}

            {activePage.code?.map((block) => (
              <section className={styles.codeSection} key={block.label} aria-label={`Exemplo ${block.label}`}>
                <div className={styles.codeHead}><span><i /><i /><i /></span><strong>{block.label}</strong><small>{block.language}</small><CopyCode value={block.code} /></div>
                <pre><code>{block.code}</code></pre>
              </section>
            ))}

            {activePage.api?.map((group) => (
              <section className={styles.referenceSection} key={group.title}>
                <div className={styles.referenceTitle}><span>API</span><h2>{group.title}</h2><p>{group.rows.length} propriedades e métodos documentados.</p></div>
                <div className={styles.apiTable} role="table" aria-label={group.title}>
                  <div className={`${styles.apiRow} ${styles.apiHead}`} role="row"><span role="columnheader">NOME</span><span role="columnheader">TIPO</span><span role="columnheader">DEFAULT</span><span role="columnheader">DESCRIÇÃO</span></div>
                  {group.rows.map((row) => <div className={styles.apiRow} role="row" key={row.name}><code role="cell">{row.name}</code><span role="cell"><b>{row.type}</b></span><code role="cell">{row.defaultValue}</code><p role="cell">{row.description}</p></div>)}
                </div>
              </section>
            ))}

            {activePage.events && (
              <section className={styles.referenceSection}>
                <div className={styles.referenceTitle}><span>EVENTOS</span><h2>Eventos emitidos</h2><p>Payloads tipados, disponíveis por callback ou controller.</p></div>
                <div className={styles.apiTable} role="table" aria-label="Eventos emitidos">
                  <div className={`${styles.apiRow} ${styles.apiHead}`} role="row"><span role="columnheader">EVENTO</span><span role="columnheader">PAYLOAD</span><span role="columnheader">ORIGEM</span><span role="columnheader">DESCRIÇÃO</span></div>
                  {activePage.events.map((row) => <div className={styles.apiRow} role="row" key={row.name}><code role="cell">{row.name}</code><span role="cell"><b>{row.type}</b></span><code role="cell">{row.defaultValue}</code><p role="cell">{row.description}</p></div>)}
                </div>
              </section>
            )}

            <nav className={styles.pageNavigation} aria-label="Páginas adjacentes">
              {previousPage ? <a href={`#${previousPage.id}`} onClick={(event) => { event.preventDefault(); openPage(previousPage.id); }}><ArrowLeft size={16} /><span><small>ANTERIOR</small><strong>{previousPage.label}</strong></span></a> : <span />}
              {nextPage && <a href={`#${nextPage.id}`} onClick={(event) => { event.preventDefault(); openPage(nextPage.id); }}><span><small>SEGUINTE</small><strong>{nextPage.label}</strong></span><ArrowRight size={16} /></a>}
            </nav>
          </article>
        </main>

        <aside className={styles.onThisPage} aria-label="Nesta página">
          <p>NESTA PÁGINA</p>
          {activePage.sections.map((section) => <a key={section.id} href={`#${activePage.id}`} onClick={(event) => { event.preventDefault(); document.getElementById(`${activePage.id}-${section.id}`)?.scrollIntoView({ behavior: "smooth" }); }}>{section.title}</a>)}
          <div><span><span className={styles.statusDot} /> Conteúdo verificado</span><small>Baseado na API pública atual.</small></div>
        </aside>
      </div>
    </div>
  );
}
