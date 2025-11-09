import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBooksCatalog } from "../hooks/useBooksCatalog.js";

const FLOW_COVERS = [
  {
    id: "essencia-binarios",
    title: "Essência dos Binários",
    author: "Luna Varella",
    mood: "Tecnologia & poesia",
    cover: "Essência Dos Binários.png",
  },
  {
    id: "ii-a",
    title: "Interlúdio Infinito",
    author: "Helena Marçal",
    mood: "Ficção especulativa",
    cover: "ii A.png",
  },
  {
    id: "reeves",
    title: "O Arco de Reeves",
    author: "Ícaro Martins",
    mood: "Biografia visual",
    cover: "Reeves (1).png",
  },
  {
    id: "suhiro",
    title: "Suhiro Ōtomo – Fragmentos",
    author: "Coletânea Essência",
    mood: "Arte sequencial",
    cover: "sUhiro-Ōtomo -.png",
  },
  {
    id: "va",
    title: "Vértice Azul",
    author: "Marina V.",
    mood: "Romance psicológico",
    cover: "vá (1).png",
  },
  {
    id: "flow-zero",
    title: "Flow Ø",
    author: "K. Aristeu",
    mood: "Sci-fi contemplativo",
    cover: "~I ~ ~ 0.png",
  },
  {
    id: "james",
    title: "Cartas para James",
    author: "Clarice Porto",
    mood: "Epistolar",
    cover: "\"i James.png",
  },
  {
    id: "peter",
    title: "Peter e o Atlas",
    author: "Rafael Nunes",
    mood: "Aventura histórica",
    cover: "\"PETER (2).png",
  },
];

function getCoverUrl(fileName) {
  return new URL(`../bookCover/${fileName}`, import.meta.url).href;
}

const FEATURED_BOOKS = [
  {
    id: "clarice",
    title: "Clarice em Essência",
    author: "Clarice Lispector",
    progress: 62,
    summaryType: "Resumo IA profundo",
    highlight:
      "“Liberdade é pouco. O que eu desejo ainda não tem nome.” — Lembre-se de anotar onde esse pensamento ressoa na sua rotina.",
  },
  {
    id: "fundamentos",
    title: "Os Fundamentos da Leitura Atenta",
    author: "Equipe Essência",
    progress: 35,
    summaryType: "Insights rápidos",
    highlight: "Transforme capítulos em ações com os cartões de foco automático.",
  },
];

const DISCOVERY_PILLS = [
  { id: "classicos", label: "Clássicos que inspiram", to: "/biblioteca" },
  { id: "ia", label: "Coleções IA para o seu perfil", to: "/biblioteca" },
  { id: "audio", label: "Audiobooks para começar agora", to: "/biblioteca" },
];

function resolveCoverSource(value) {
  if (!value) return "";
  return value.startsWith("http") ? value : getCoverUrl(value);
}

function summarizeHighlight(text, maxLength = 180) {
  if (!text) return "Cadastre uma sinopse para este título e desbloqueie recomendações personalizadas.";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export default function DashboardPage() {
  const { items: books, loading: booksLoading, error: booksError, reload: reloadBooks } = useBooksCatalog({ limit: 20, status: "ativo" });
  const [flowIndex, setFlowIndex] = useState(0);
  const flowItems = useMemo(() => {
    if (!books.length) return FLOW_COVERS;
    return books.slice(0, FLOW_COVERS.length).map((book, index) => ({
      id: book.id,
      title: book.titulo,
      author: book.autor?.nome ?? "Autor não informado",
      mood: book.genero?.nome ?? FLOW_COVERS[index % FLOW_COVERS.length].mood,
      cover: book.capa_url || FLOW_COVERS[index % FLOW_COVERS.length].cover,
      highlight: summarizeHighlight(book.sinopse),
    }));
  }, [books]);
  const totalCovers = flowItems.length;
  const activeFlow = flowItems[flowIndex] ?? flowItems[0] ?? null;
  const highlightCards = useMemo(() => {
    if (!books.length) return FEATURED_BOOKS;
    return books.slice(0, 2).map((book) => ({
      id: book.id,
      title: book.titulo,
      author: book.autor?.nome ?? "Autor não informado",
      summaryType: book.genero?.nome ?? "Seleção Essência",
      highlight: summarizeHighlight(book.sinopse),
      pdf_url: book.pdf_url,
      audio_url: book.audio_url,
    }));
  }, [books]);

  useEffect(() => {
    if (!totalCovers) return undefined;
    const interval = setInterval(() => {
      setFlowIndex((current) => (current + 1) % totalCovers);
    }, 4500);
    return () => clearInterval(interval);
  }, [totalCovers]);

  useEffect(() => {
    if (totalCovers && flowIndex >= totalCovers) {
      setFlowIndex(0);
    }
  }, [flowIndex, totalCovers]);

  const flowDeck = useMemo(() => {
    const sequence = [];
    if (!totalCovers) return sequence;
    for (let offset = -2; offset <= 2; offset += 1) {
      const index = (flowIndex + offset + totalCovers) % totalCovers;
      sequence.push({
        ...flowItems[index],
        offset,
      });
    }
    return sequence;
  }, [flowIndex, flowItems, totalCovers]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-[#6c63ff]/15 bg-[rgb(var(--surface-card))]/90 p-6 shadow-lg shadow-[#6c63ff]/10 dark:border-white/10 dark:bg-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-28 top-10 h-64 w-64 rounded-full bg-[rgba(var(--color-accent-primary),0.08)] blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[rgba(var(--color-secondary-primary),0.08)] blur-3xl" />
        </div>
        <div className="relative grid gap-6 md:grid-cols-[1.1fr,0.9fr] lg:grid-cols-[1fr,420px]">
          <div className="space-y-6 pr-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#6c63ff]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#4c3f8f] dark:bg-[#cfc2ff]/15 dark:text-[#cfc2ff]">
                Últimos livros
              </span>
              <h2 className="mt-3 font-display text-3xl font-semibold text-[rgb(var(--text-primary))]">
                Entre no fluxo Essência e descubra uma capa por vez
              </h2>
              <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">
                Curadoria atualizada automaticamente com seus títulos mais recentes. Cada capa traz um mood
                e um atalho para mergulhar no livro certo, no momento certo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:rgba(var(--color-accent-primary),0.25)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))] transition hover:border-[color:rgba(var(--color-accent-primary),0.45)] hover:text-[color:rgb(var(--color-accent-primary))]"
                onClick={() => setFlowIndex((current) => (current - 1 + totalCovers) % totalCovers)}
              >
                ← Voltar capa
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-[color:rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[color:rgba(var(--color-accent-primary),0.35)] transition hover:bg-[color:rgb(var(--color-accent-dark))]"
                onClick={() => setFlowIndex((current) => (current + 1) % totalCovers)}
              >
                Avançar capa →
              </button>
            </div>
            <div className="rounded-2xl border border-[color:rgba(var(--color-accent-primary),0.2)] bg-[rgba(255,255,255,0.75)] p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
              <strong className="font-semibold text-[color:rgb(var(--color-accent-dark))]">
                {activeFlow?.title}
              </strong>
              <p className="text-xs uppercase tracking-[0.26em] text-[color:rgba(var(--color-secondary-primary),0.85)]">
                {activeFlow?.mood}
              </p>
              <p className="mt-2 text-[rgb(var(--text-secondary))]">
                {activeFlow?.author} · Explore insights personalizados, playlists de leitura e notas inteligentes vinculadas ao título.
              </p>
            </div>
          </div>
          <div
            className="relative flex h-[320px] items-center justify-center overflow-visible"
            style={{ perspective: "1400px" }}
          >
            {flowDeck.map((item) => {
              const distance = Math.abs(item.offset);
              const isCenter = item.offset === 0;
              const translateX = `${item.offset * 90}%`;
              const translateZ = isCenter ? 80 : 30 - distance * 10;
              const rotate = item.offset * -6;
              const opacity = isCenter ? 1 : distance === 1 ? 0.75 : 0.45;
              const scale = isCenter ? 1 : distance === 1 ? 0.88 : 0.78;
              return (
                <article
                  key={item.id}
                  className="absolute flex h-[260px] w-[190px] flex-col overflow-hidden rounded-[28px] border border-white/20 shadow-2xl will-change-transform"
                  style={{
                    transform: `translateX(${translateX}) translateZ(${translateZ}px) rotate(${rotate}deg) scale(${scale})`,
                    opacity,
                    zIndex: 50 - distance,
                    transition:
                      "transform 650ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 500ms ease, z-index 650ms",
                  }}
                >
                  <img src={resolveCoverSource(item.cover)} alt={item.title} className="h-full w-full object-cover" draggable={false} />
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/80">{item.mood}</p>
                  </div>
                </article>
              );
            })}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/15 shadow-inner shadow-black/10" />
          </div>
        </div>
      </section>

      {booksError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100">
          <p>{booksError}</p>
          <button
            type="button"
            onClick={reloadBooks}
            className="rounded-full border border-red-400/30 px-4 py-1 font-semibold text-red-900 hover:bg-red-100/60 dark:text-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {booksLoading && !booksError && (
        <p className="text-xs uppercase tracking-[0.3em] text-[#7a6c5e]/70 dark:text-[#cfc2ff]/70">Sincronizando catálogo...</p>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#6c63ff]/20 bg-white/95 shadow-lg shadow-[#6c63ff]/10 dark:border-white/10 dark:bg-slate-900/80">
        <div className="grid gap-8 p-8 md:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(var(--color-accent-primary),0.12)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[color:rgb(var(--color-accent-dark))]">
              Essência do dia
            </span>
            <h2 className="font-display text-3xl font-semibold text-[#1f2933] dark:text-white">
              Continue sua jornada com serenidade e propósito
            </h2>
            <p className="text-sm text-[#7a6c5e]/85 dark:text-[#cfc2ff]/80">
              Escolhemos trechos, resumos e audiobooks de acordo com seu ritmo. Retome um título em andamento ou explore algo
              completamente novo com o apoio da nossa IA literária.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/biblioteca"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6c63ff] via-[#4c3f8f] to-[#b38b59] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6c63ff]/30 transition hover:from-[#574de3] hover:to-[#9c784f]"
              >
                Retomar leitura
              </Link>
              <Link
                to="/assistente"
                className="inline-flex items-center gap-2 rounded-xl border border-[#6c63ff]/30 px-5 py-2.5 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/60 hover:text-[#3c2f75] dark:border-[#cfc2ff]/30 dark:text-[#cfc2ff]"
              >
                Pedir sugestão à IA
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#6c63ff]/15 bg-[#f9f5ef]/80 p-5 shadow-inner dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#b38b59] dark:text-[#cfc2ff]/70">Hoje eu quero</p>
            <div className="mt-4 grid gap-3 text-sm text-[#4b3f35] dark:text-[#cfc2ff]">
              <button className="rounded-xl border border-[#6c63ff]/20 bg-white/70 px-4 py-3 text-left shadow-sm transition hover:border-[#6c63ff]/40 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">
                <strong className="block font-semibold text-[#4c3f8f] dark:text-[#cfc2ff]">Um insight rápido</strong>
                Receba um resumo em 3 parágrafos com cartões de ação.
              </button>
              <button className="rounded-xl border border-[#6c63ff]/20 bg-white/70 px-4 py-3 text-left shadow-sm transition hover:border-[#6c63ff]/40 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">
                <strong className="block font-semibold text-[#4c3f8f] dark:text-[#cfc2ff]">Um trecho para refletir</strong>
                A Essência sugere uma citação marcante para começar o dia.
              </button>
              <button className="rounded-xl border border-[#6c63ff]/20 bg-white/70 px-4 py-3 text-left shadow-sm transition hover:border-[#6c63ff]/40 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">
                <strong className="block font-semibold text-[#4c3f8f] dark:text-[#cfc2ff]">Um audiobook breve</strong>
                Liste narrativas com menos de 15 minutes para acompanhar seus intervalos.
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-[#1f2933] dark:text-white">Livros em destaque</h3>
            <p className="text-sm text-[#7a6c5e]/80 dark:text-[#cfc2ff]/70">Continue a leitura ou revise as notas guardadas.</p>
          </div>
          <Link
            to="/biblioteca"
            className="inline-flex items-center gap-2 rounded-lg border border-[#6c63ff]/25 px-3 py-1.5 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/45 hover:text-[#3c2f75]"
          >
            Ver biblioteca completa →
          </Link>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {highlightCards.map((book) => (
            <article
              key={book.id}
              className="flex flex-col gap-4 rounded-3xl border border-[#6c63ff]/15 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#6c63ff]/30 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#b38b59] dark:text-[#cfc2ff]/60">{book.summaryType}</p>
                  <h4 className="mt-1 text-lg font-semibold text-[#1f2933] dark:text-white">{book.title}</h4>
                  <p className="text-sm text-[#7a6c5e]/80 dark:text-[#cfc2ff]/70">{book.author}</p>
                </div>
                {(book.audio_url || book.pdf_url) && (
                  <span className="rounded-full border border-[#6c63ff]/20 px-3 py-1 text-xs font-semibold text-[#4c3f8f] dark:border-[#cfc2ff]/30 dark:text-[#cfc2ff]">
                    {[book.audio_url && "Audiobook", book.pdf_url && "PDF"].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <blockquote className="rounded-2xl border border-[#6c63ff]/15 bg-[#f2ede4]/80 px-4 py-3 text-sm text-[#4b3f35] dark:border-white/10 dark:bg-white/5 dark:text-[#cfc2ff]">
                {book.highlight}
              </blockquote>
              <div className="flex flex-wrap gap-3">
                {book.pdf_url ? (
                  <a
                    href={book.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4c3f8f]"
                  >
                    Abrir PDF
                  </a>
                ) : (
                  <Link
                    to={`/biblioteca#${book.id ?? "destaque"}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4c3f8f]"
                  >
                    Ver na biblioteca
                  </Link>
                )}
                {book.audio_url ? (
                  <a
                    href={book.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#6c63ff]/25 px-4 py-2 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/45 hover:text-[#3c2f75] dark:text-[#cfc2ff]"
                  >
                    Ouvir áudio
                  </a>
                ) : (
                  <Link
                    to={`/biblioteca#${book.id ?? "destaque"}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#6c63ff]/25 px-4 py-2 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/45 hover:text-[#3c2f75]"
                  >
                    Explorar detalhes
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-[#1f2933] dark:text-white">Descobertas recomendadas</h3>
            <p className="text-sm text-[#7a6c5e]/80 dark:text-[#cfc2ff]/70">Use os atalhos abaixo para explorar novas coleções.</p>
          </div>
          <Link
            to="/assistente?prompt=recomendar"
            className="inline-flex items-center gap-2 rounded-lg border border-[#6c63ff]/25 px-3 py-1.5 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/45 hover:text-[#3c2f75]"
          >
            Conversar com a IA →
          </Link>
        </header>

        <div className="mt-4 flex flex-wrap gap-3">
          {DISCOVERY_PILLS.map((pill) => (
            <Link
              key={pill.id}
              to={pill.to}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#6c63ff]/25 bg-white/70 px-4 py-2 text-sm font-semibold text-[#4c3f8f] shadow-sm transition hover:border-[#6c63ff]/45 hover:text-[#3c2f75] dark:border-[#cfc2ff]/20 dark:bg-white/5 dark:text-[#cfc2ff]"
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
