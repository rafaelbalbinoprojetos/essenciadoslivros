import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const coverManifest = import.meta.glob("../bookCover/*", { eager: true, import: "default" });
const COVER_POOL = Object.values(coverManifest);

function coverFromPool(index) {
  if (!COVER_POOL.length) return "";
  const normalized = ((index % COVER_POOL.length) + COVER_POOL.length) % COVER_POOL.length;
  return COVER_POOL[normalized];
}

const CATEGORY_ITEMS = [
  { id: "acao", label: "Ação", icon: "⚔️" },
  { id: "aventura", label: "Aventura", icon: "🧭" },
  { id: "romance", label: "Romance", icon: "💌" },
  { id: "drama", label: "Drama", icon: "🎭" },
  { id: "filosofia", label: "Filosofia", icon: "☯" },
  { id: "biografia", label: "Biografia", icon: "📜" },
  { id: "tecnico", label: "Técnico", icon: "🧠" },
  { id: "fantasia", label: "Fantasia", icon: "✨" },
];

const FLOW_BOOKS = [
  {
    id: "flow-aurora",
    title: "Aurora sobre Códigos",
    author: "Luna Arendt",
    tag: "Recém adicionado",
    mood: "Mistério elegante · 312 páginas",
    summary: "Investigação sensorial em bibliotecas subterrâneas guiada por IA curatorial.",
    cover: coverFromPool(0),
  },
  {
    id: "flow-yugen",
    title: "Yūgen Prisma",
    author: "Sohei Nakamura",
    tag: "Favorito da casa",
    mood: "Ficção especulativa · 288 páginas",
    summary: "Arquitetos silenciosos moldam cidades lendo diário de viajantes interdimensionais.",
    cover: coverFromPool(1),
  },
  {
    id: "flow-atlas",
    title: "Atlas do Âmbar",
    author: "Helena Prado",
    tag: "Em alta na semana",
    mood: "Romance histórico · 354 páginas",
    summary: "Cartógrafa descobre cartas escondidas em bordados que contam revoluções invisíveis.",
    cover: coverFromPool(2),
  },
  {
    id: "flow-vertigem",
    title: "Vertigem dos Silêncios",
    author: "Ícaro Mendes",
    tag: "IA recomenda",
    mood: "Drama contemporâneo · 198 páginas",
    summary: "Retratos de leitores que trocam memórias por capítulos inéditos.",
    cover: coverFromPool(3),
  },
  {
    id: "flow-satori",
    title: "Satori de Papel",
    author: "Clarice Montevidéu",
    tag: "Coleção Essência",
    mood: "Filosofia lírica · 240 páginas",
    summary: "Meditativos fragmentos sobre o ato de reler e reescrever a si mesmo.",
    cover: coverFromPool(4),
  },
];

const FEATURED_BOOK = {
  title: "Cartas ao Horizonte Interno",
  author: "Clarice em Essência",
  rating: 4.9,
  description:
    "Uma curadoria comentada de trechos, áudios e provocações para quem quer transformar leitura em ritual diário.",
  stats: "Audiobook · 26 minutos · 62% concluído",
  cover: coverFromPool(2),
};

const LIST_SECTIONS = [
  {
    id: "progress",
    title: "📚 Em andamento",
    subtitle: "Continue do ponto onde parou",
    books: [
      { id: "clarice", title: "Clarice em Essência", author: "Clarice Lispector", progress: 62, minutes: 12, cover: coverFromPool(6) },
      { id: "fundamentos", title: "Fundamentos da Leitura Atenta", author: "Equipe Essência", progress: 35, minutes: 18, cover: coverFromPool(7) },
      { id: "aurora", title: "Aurora sobre Códigos", author: "Luna Arendt", progress: 18, minutes: 9, cover: coverFromPool(0) },
    ],
  },
  {
    id: "ai",
    title: "✨ Recomendados pela IA",
    subtitle: "Escolhas alinhadas ao seu ritmo atual",
    books: [
      { id: "oceano", title: "Oceano Diagonal", author: "Iris M. Alencar", progress: 0, minutes: 22, cover: coverFromPool(1) },
      { id: "manifesto", title: "Manifesto das Pequenas Revoluções", author: "Hugo Rial", progress: 0, minutes: 16, cover: coverFromPool(2) },
      { id: "sombras", title: "Sombras de Âmbar", author: "Marina Valença", progress: 0, minutes: 11, cover: coverFromPool(3) },
    ],
  },
  {
    id: "collections",
    title: "🕮 Coleções",
    subtitle: "Curadorias Essência para mergulhos temáticos",
    books: [
      { id: "classicos", title: "Clássicos Modernos", author: "12 títulos selecionados", progress: 0, minutes: 0, cover: coverFromPool(4) },
      { id: "reflexoes", title: "Reflexões Diárias", author: "7 ensaios breves", progress: 0, minutes: 0, cover: coverFromPool(5) },
      { id: "audio", title: "Audiobooks Curtos", author: "Coleção 15 min", progress: 0, minutes: 0, cover: coverFromPool(6) },
    ],
  },
];

const TOP_RATED = [
  { id: "silencio", title: "O Invisível e o Silêncio", author: "Helena Prado", rating: 4.9, category: "Filosofia", cover: coverFromPool(2) },
  { id: "fragmentos", title: "Fragmentos de Sábado", author: "Ícaro Mendes", rating: 4.8, category: "Drama", cover: coverFromPool(0) },
  { id: "atlas", title: "Atlas do Âmbar", author: "Helena Prado", rating: 4.7, category: "Romance", cover: coverFromPool(1) },
  { id: "playlist", title: "Playlists para Pensar", author: "Equipe Essência", rating: 4.7, category: "Curadoria", cover: coverFromPool(4) },
];

const TRENDING = [
  { id: "fluxo", title: "Fluxo das Pequenas Coragens", badge: "🔥 em alta", cover: coverFromPool(7) },
  { id: "paisagens", title: "Paisagens em Frequência", badge: "🔥 em alta", cover: coverFromPool(5) },
  { id: "labirinto", title: "Labirintos Claros", badge: "🔥 em alta", cover: coverFromPool(6) },
];

const USER_STATS = {
  monthReads: 6,
  minutes: 1240,
  categories: ["Romance sensorial", "Ficção histórica", "Filosofia"],
  streak: 14,
};

const TIMELINE = [
  { id: "clarice", label: "Você concluiu Clarice em Essência", time: "há 2 dias" },
  { id: "ia", label: "IA sugeriu 3 novas leituras", time: "há 3 dias" },
  { id: "colecao", label: "Você salvou a coleção Audiobooks Curtos", time: "há 5 dias" },
  { id: "nota", label: "Nova anotação em Atlas do Âmbar", time: "há 1 semana" },
];

export default function LibraryPage() {
  const [flowIndex, setFlowIndex] = useState(0);
  const [selectedFlow, setSelectedFlow] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setFlowIndex((prev) => (prev + 1) % FLOW_BOOKS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const flowDeck = useMemo(() => {
    const half = Math.floor(FLOW_BOOKS.length / 2);
    return FLOW_BOOKS.map((card, idx) => {
      let relative = idx - flowIndex;
      if (relative > half) relative -= FLOW_BOOKS.length;
      if (relative < -half) relative += FLOW_BOOKS.length;
      return { ...card, relative };
    });
  }, [flowIndex]);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]">
      <main className="space-y-10">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-5 shadow-[0_30px_70px_-60px_rgba(15,10,35,0.8)]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.7)]">Gestão editorial</p>
            <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--text-primary))]">Cadastre novos títulos</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Conecte autores, gêneros e coleções em poucos passos.</p>
          </div>
          <Link
            to="/biblioteca/novo"
            className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(0,0,0,0.7)] transition hover:bg-[rgb(var(--color-accent-dark))]"
          >
            + Cadastrar título
          </Link>
        </section>
        <section>
          <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.65)]">
            Navegue por estilos
          </p>
          <div className="mt-4 flex flex-wrap gap-3 overflow-x-auto rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[color:rgba(var(--surface-card),0.7)] p-4 backdrop-blur">
            {CATEGORY_ITEMS.map((category, index) => (
              <button
                key={category.id}
                type="button"
                className="group flex flex-col items-center gap-2 rounded-full px-4 py-2 text-[0.8rem] font-medium text-[rgb(var(--text-primary))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(214,162,92,0.7)]"
                style={{
                  background:
                    index === 0
                      ? "linear-gradient(145deg, rgba(214,162,92,0.35), rgba(118,93,255,0.15))"
                      : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(249,215,142,0.15)] text-lg text-[rgb(var(--text-primary))] shadow-inner shadow-white/5">
                  {category.icon}
                </span>
                <span className="font-serif text-sm">{category.label}</span>
              </button>
            ))}
          </div>
        </section>

<section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[rgba(12,10,22,0.9)] px-6 py-10 text-white shadow-[0_45px_90px_-60px_rgba(5,3,20,0.95)]">
  {/* Fundo iluminado */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-[rgba(118,93,255,0.25)] blur-[110px]" />
    <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[rgba(214,162,92,0.22)] blur-[120px]" />
  </div>

  <div className="relative grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    {/* SEÇÃO DE TEXTO E CONTROLES */}
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.5em] text-white/50">Flow Essência</p>

      <div className="space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.25em] text-white/70">
          <span className="rounded-full border border-white/30 px-3 py-1 text-[0.7rem] uppercase tracking-[0.4em]">
            {FLOW_BOOKS[flowIndex].tag}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.4em]">
            {FLOW_BOOKS[flowIndex].mood}
          </span>
        </div>

        {/* Título e descrição */}
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-semibold">{FLOW_BOOKS[flowIndex].title}</h2>
          <p className="text-sm uppercase tracking-[0.35em] text-white/70">
            {FLOW_BOOKS[flowIndex].author}
          </p>
          <p className="text-base text-white/90 leading-relaxed">
            {FLOW_BOOKS[flowIndex].summary}
          </p>
        </div>
      </div>

      {/* Botões e indicadores */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={() => setFlowIndex((prev) => (prev - 1 + FLOW_BOOKS.length) % FLOW_BOOKS.length)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-2 text-sm font-semibold text-[rgb(var(--color-accent-dark))] shadow-lg shadow-black/20 transition hover:bg-white"
            onClick={() => setFlowIndex((prev) => (prev + 1) % FLOW_BOOKS.length)}
          >
            Próximo
          </button>
        </div>

        <div className="flex items-center gap-2">
          {FLOW_BOOKS.map((book, idx) => (
            <span
              key={book.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === flowIndex ? "w-10 bg-white" : "w-4 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>

    {/* SEÇÃO DAS CAPAS */}
    <div className="relative">
      {/* Luz ambiente */}
      <div className="pointer-events-none absolute inset-0 m-auto h-[360px] w-[360px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent blur-[120px]" />

      {/* Coverflow */}
      <div
        className="relative mx-auto h-[340px] w-full max-w-[520px] -translate-y-[160px]"
        style={{
          perspective: "1300px",
          perspectiveOrigin: "50% 30%",
        }}
      >
        {flowDeck.map((card) => {
          const distance = Math.abs(card.relative);
          const isActive = card.relative === 0;
          const translateX = `${card.relative * 160}px`;
          const translateZ = 260 - distance * 70;
          const rotateY = card.relative * -28;
          const scale = isActive ? 1 : 0.85;
          const opacity = Math.max(0, 1 - distance * 0.28);

          return (
            <article
              key={card.id}
              className="absolute left-1/2 top-1/2 h-[260px] w-[170px] -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-black/40 shadow-[0_25px_45px_-25px_rgba(0,0,0,0.8)] transition-all"
              style={{
                transform: `translateX(${translateX}) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex: 50 - distance,
                transition:
                  "transform 800ms cubic-bezier(0.17,0.67,0.23,0.99), opacity 400ms ease, z-index 400ms",
                transformStyle: "preserve-3d",
              }}
              onClick={() => setSelectedFlow(card)}
            >
              <img
                src={card.cover}
                alt={card.title}
                className="h-full w-full object-cover brightness-[0.97] contrast-[1.08]"
                draggable={false}
              />
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/70 px-3 py-2 text-left backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">{card.tag}</p>
                <p className="text-base font-semibold">{card.title}</p>
                <p className="text-xs text-white/80">{card.author}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </div>
</section>





        <section className="rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.92)] p-5 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="w-full lg:w-1/3">
              <img
                src={FEATURED_BOOK.cover}
                alt={FEATURED_BOOK.title}
                className="mx-auto h-[360px] w-[240px] rounded-[24px] object-cover shadow-xl lg:h-[360px] lg:w-[240px]"
              />
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">
                Em destaque
              </p>
              <h3 className="font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">{FEATURED_BOOK.title}</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{FEATURED_BOOK.author}</p>
              <div className="flex items-center gap-2 text-xs font-semibold text-[color:rgb(var(--color-accent-dark))]">
                ⭐ {FEATURED_BOOK.rating} · {FEATURED_BOOK.stats}
              </div>
              <p className="text-base leading-relaxed text-[rgb(var(--text-primary))]">{FEATURED_BOOK.description}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <button className="inline-flex items-center gap-2 rounded-2xl bg-[color:rgb(var(--color-accent-primary))] px-4 py-2 font-semibold text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.35)] transition hover:bg-[color:rgb(var(--color-accent-dark))]">
                  Ler agora →
                </button>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] px-4 py-2 font-semibold text-[rgb(var(--text-primary))]">
                  Ver detalhes
                </button>
              </div>
            </div>
          </div>
        </section>

        {LIST_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[color:rgb(var(--text-primary))]">{section.title}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{section.subtitle}</p>
              </div>
              <button className="text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">Ver todos →</button>
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.books.map((book, idx) => (
                <article
                  key={book.id}
                  className="group relative overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-4 shadow-[0_25px_60px_-40px_rgba(10,8,30,0.6)] transition hover:-translate-y-1"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="h-44 w-full rounded-2xl object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.7)]">
                        {idx === 0 ? "Atual" : "Descoberta"}
                      </p>
                      <h4 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{book.title}</h4>
                      <p className="text-sm text-[rgb(var(--text-secondary))]">{book.author}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
                        <span>{book.progress > 0 ? `${book.progress}%` : "Novo"}</span>
                        {book.minutes > 0 && <span>{book.minutes} min</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[rgba(214,162,92,0.85)] to-[rgba(118,93,255,0.85)]"
                          style={{ width: `${book.progress || 15}%` }}
                        />
                      </div>
                    </div>
                    <button className="inline-flex items-center gap-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))] opacity-0 transition group-hover:opacity-100">
                      Retomar →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      <aside className="space-y-6 xl:sticky xl:top-24">
        <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.8)] p-5 backdrop-blur">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Mais bem avaliados</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Favoritos da comunidade</p>
            </div>
            <button className="text-xs font-semibold text-[color:rgb(var(--color-accent-dark))]">Ver todos</button>
          </header>
          <div className="mt-5 space-y-4">
            {TOP_RATED.map((book) => (
              <div key={book.id} className="flex items-center gap-4 rounded-2xl border border-white/5 p-3">
                <img src={book.cover} alt={book.title} className="h-16 w-12 rounded-xl object-cover" draggable={false} />
                <div className="text-sm">
                  <p className="font-semibold text-[rgb(var(--text-primary))]">{book.title}</p>
                  <p className="text-[color:rgb(var(--text-secondary))]">{book.author}</p>
                  <p className="text-xs text-amber-400">⭐ {book.rating} · {book.category}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(24,22,40,0.9)] via-[rgba(46,37,69,0.85)] to-[rgba(214,162,92,0.2)] p-5 text-white shadow-[0_35px_60px_-45px_rgba(5,2,20,0.9)]">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Popular da semana</p>
              <p className="text-xs text-white/70">Descobertas em movimento</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[0.7rem] uppercase tracking-[0.3em]">Trend</span>
          </header>
          <div className="mt-5 space-y-4">
            {TRENDING.map((item, index) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur"
                style={{ opacity: 1 - index * 0.15 }}
              >
                <span className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {item.badge}
                </span>
                <div className="flex gap-4">
                  <img src={item.cover} alt={item.title} className="h-24 w-20 rounded-2xl object-cover" draggable={false} />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-white/70">Anotações, playlists e insights em alta.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-5 backdrop-blur">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Suas estatísticas</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Resumo visual do mês</p>
            </div>
            <span className="text-xs font-semibold text-[color:rgb(var(--color-accent-dark))]">+{USER_STATS.streak} dias</span>
          </header>
          <div className="mt-6 space-y-4 text-sm text-[rgb(var(--text-secondary))]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-[rgb(var(--text-primary))]">{USER_STATS.monthReads}</p>
                <p>livros lidos</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-[rgb(var(--text-primary))]">{USER_STATS.minutes}</p>
                <p>minutos de leitura</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:rgba(var(--color-secondary-primary),0.7)]">
                Categorias em foco
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {USER_STATS.categories.map((cat) => (
                  <span key={cat} className="rounded-full border border-[rgba(214,162,92,0.4)] px-3 py-1 text-[color:rgb(var(--color-accent-dark))]">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:rgba(var(--color-secondary-primary),0.7)]">Fluxo</p>
              <div className="mt-3 h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                <div className="h-full rounded-full bg-gradient-to-r from-[rgba(214,162,92,0.9)] via-[rgba(118,93,255,0.7)] to-[rgba(38,255,236,0.6)]" style={{ width: "78%" }} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-5 backdrop-blur">
          <header className="mb-4">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Atividades recentes</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Linha do tempo Essência</p>
          </header>
          <div className="space-y-4">
            {TIMELINE.map((item) => (
              <div key={item.id} className="relative pl-6 text-sm">
                <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-gradient-to-br from-[rgba(214,162,92,0.9)] to-[rgba(118,93,255,0.8)] shadow-[0_0_10px_rgba(214,162,92,0.6)]" />
                <p className="font-semibold text-[rgb(var(--text-primary))]">{item.label}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{item.time}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {selectedFlow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedFlow(null)}
        >
          <div
            className="max-w-lg rounded-[32px] border border-white/10 bg-[rgba(10,9,20,0.95)] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex gap-6">
              <img src={selectedFlow.cover} alt={selectedFlow.title} className="h-48 w-36 rounded-2xl object-cover" />
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">{selectedFlow.tag}</p>
                <h4 className="text-2xl font-semibold">{selectedFlow.title}</h4>
                <p className="text-sm text-white/70">{selectedFlow.author}</p>
                <p className="text-sm text-white/80">{selectedFlow.summary}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--color-accent-dark))]">
                    Continuar leitura
                  </button>
                  <button className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white" onClick={() => setSelectedFlow(null)}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
