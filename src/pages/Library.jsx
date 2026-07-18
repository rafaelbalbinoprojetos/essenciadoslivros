import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Swords, Compass, Heart, Drama, Lightbulb, Scroll, Cpu, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BookLink from "../components/BookLink.jsx";

const chipContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const chipItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};
import { useBooksCatalog } from "../hooks/useBooksCatalog.js";
import { DEFAULT_COVER_PLACEHOLDER, ensureCoverSrc } from "../utils/covers.js";
import { buildAudioSource, openResolvedMedia, resolveAudioSource, resolvePdfSource } from "../utils/media.js";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import BookCard from "../components/BookCard.jsx";
import { useEngagement } from "../hooks/useEngagement.js";
import { hasCinematicExperience } from "../services/narratives.js";

const coverManifest = import.meta.glob("../bookCover/*", { eager: true, import: "default" });
const COVER_POOL = Object.values(coverManifest).filter(Boolean);

function coverFromPool(index) {
  if (!COVER_POOL.length) return DEFAULT_COVER_PLACEHOLDER;
  const normalized = ((index % COVER_POOL.length) + COVER_POOL.length) % COVER_POOL.length;
  return COVER_POOL[normalized];
}

const CATEGORY_ITEMS = [
  { id: "acao", label: "Ação", icon: Swords, gradient: "linear-gradient(150deg,#c25a4d,#7a2f37)" },
  { id: "aventura", label: "Aventura", icon: Compass, gradient: "linear-gradient(150deg,#cd8f4c,#7c4c22)" },
  { id: "romance", label: "Romance", icon: Heart, gradient: "linear-gradient(150deg,#c75b87,#722f5a)" },
  { id: "drama", label: "Drama", icon: Drama, gradient: "linear-gradient(150deg,#7d60ab,#3f3566)" },
  { id: "filosofia", label: "Filosofia", icon: Lightbulb, gradient: "linear-gradient(150deg,#5c7f8c,#2f4a55)" },
  { id: "biografia", label: "Biografia", icon: Scroll, gradient: "linear-gradient(150deg,#b48b50,#6f5225)" },
  { id: "tecnico", label: "Técnico", icon: Cpu, gradient: "linear-gradient(150deg,#6b809d,#34435f)" },
  { id: "fantasia", label: "Fantasia", icon: Sparkles, gradient: "linear-gradient(150deg,#8d6dc2,#4a3a86)" },
];

const FLOW_ACCENTS = [
  { glow: "rgba(118,93,255,0.34)", solid: "#7b5dff" },
  { glow: "rgba(214,162,92,0.34)", solid: "#d6a25c" },
  { glow: "rgba(199,91,135,0.34)", solid: "#c75b87" },
  { glow: "rgba(92,127,140,0.34)", solid: "#5c7f8c" },
  { glow: "rgba(205,143,76,0.34)", solid: "#cd8f4c" },
];

const FALLBACK_FLOW_BOOKS = [
  {
    id: "flow-aurora",
    title: "Aurora sobre Códigos",
    author: "Luna Arendt",
    tag: "Recém adicionado",
    mood: "Mistério elegante · 312 páginas",
    summary: "Investigação sensorial em bibliotecas subterrâneas guiada por IA curatorial.",
    cover: coverFromPool(0),
    detailsId: null,
  },
  {
    id: "flow-yugen",
    title: "Yūgen Prisma",
    author: "Sohei Nakamura",
    tag: "Favorito da casa",
    mood: "Ficção especulativa · 288 páginas",
    summary: "Arquitetos silenciosos moldam cidades lendo diário de viajantes interdimensionais.",
    cover: coverFromPool(1),
    detailsId: null,
  },
  {
    id: "flow-atlas",
    title: "Atlas do Âmbar",
    author: "Helena Prado",
    tag: "Em alta na semana",
    mood: "Romance histórico · 354 páginas",
    summary: "Cartógrafa descobre cartas escondidas em bordados que contam revoluções invisíveis.",
    cover: coverFromPool(2),
    detailsId: null,
  },
  {
    id: "flow-vertigem",
    title: "Vertigem dos Silêncios",
    author: "Ícaro Mendes",
    tag: "IA recomenda",
    mood: "Drama contemporâneo · 198 páginas",
    summary: "Retratos de leitores que trocam memórias por capítulos inéditos.",
    cover: coverFromPool(3),
    detailsId: null,
  },
  {
    id: "flow-satori",
    title: "Satori de Papel",
    author: "Clarice Montevidéu",
    tag: "Coleção Essência",
    mood: "Filosofia lírica · 240 páginas",
    summary: "Meditativos fragmentos sobre o ato de reler e reescrever a si mesmo.",
    cover: coverFromPool(4),
    detailsId: null,
  },
];

const FALLBACK_FEATURED_BOOK = {
  title: "Cartas ao Horizonte Interno",
  author: "Clarice em Essência",
  sinopse: "Uma curadoria comentada de trechos, áudios e provocações para quem quer transformar leitura em ritual diário.",
  stats: "Audiobook · 26 minutos · 62% concluído",
  cover: coverFromPool(2),
  pdf_url: "",
  audio_url: "",
  detailsId: null,
};

const CONTENT_RAIL_TEMPLATES = [
  {
    id: "biografias",
    title: "Bibliografias inspiradoras",
    subtitle: "Memórias e perfis que ampliam o repertório criativo",
    keywords: ["biografia", "memória", "memoria", "memoir", "perfil"],
  },
  {
    id: "times",
    title: "Times e liderança",
    subtitle: "Práticas para conduzir equipes e projetos complexos",
    keywords: ["liderança", "gestão", "time", "times", "empresa", "startup"],
  },
  {
    id: "ficcao-cientifica",
    title: "Ficção científica e futuros",
    subtitle: "Mundos especulativos, tecnologia e novas fronteiras",
    keywords: ["ficção científica", "sci-fi", "distopia", "futuro", "tecnologia"],
  },
  {
    id: "autoajuda",
    title: "Autoajuda e bem-estar",
    subtitle: "Rituais de presença, foco e autocuidado",
    keywords: ["autoajuda", "bem-estar", "produtividade", "mindfulness"],
  },
  {
    id: "animes",
    title: "Animes e universos ilustrados",
    subtitle: "Influências orientais, mangás e mundos expansivos",
    keywords: ["anime", "mangá", "manga", "otaku"],
  },
  {
    id: "games",
    title: "Games e storytelling interativo",
    subtitle: "Histórias que nasceram dos consoles e comunidades digitais",
    keywords: ["game", "jogo", "gamificação", "gameplay"],
  },
];

const FALLBACK_CONTENT_RAILS = CONTENT_RAIL_TEMPLATES.map((template, templateIndex) => ({
  ...template,
  cards: Array.from({ length: 4 }, (_, cardIndex) => {
    const coverIndex = templateIndex * 4 + cardIndex;
    return {
      id: `${template.id}-fallback-${cardIndex}`,
      title: `${template.title} ${cardIndex + 1}`,
      author: "Coleção Essência",
      summary: "Seleção curada pela equipe Essência para inspirar sua próxima imersão.",
      cover: coverFromPool(coverIndex),
      detailsId: null,
    };
  }),
}));

const PAGE_SIZE = 24;

const FALLBACK_LIST_SECTIONS = [
  {
    id: "progress",
    title: "📚 Em andamento",
    subtitle: "Continue do ponto onde parou",
    books: [
      { id: "clarice", detailsId: null, title: "Clarice em Essência", author: "Clarice Lispector", progress: 62, minutes: 12, cover: coverFromPool(6) },
      { id: "fundamentos", detailsId: null, title: "Fundamentos da Leitura Atenta", author: "Equipe Essência", progress: 35, minutes: 18, cover: coverFromPool(7) },
      { id: "aurora", detailsId: null, title: "Aurora sobre Códigos", author: "Luna Arendt", progress: 18, minutes: 9, cover: coverFromPool(0) },
    ],
  },
  {
    id: "ai",
    title: "✨ Recomendados pela IA",
    subtitle: "Escolhas alinhadas ao seu ritmo atual",
    books: [
      { id: "oceano", detailsId: null, title: "Oceano Diagonal", author: "Iris M. Alencar", progress: 0, minutes: 22, cover: coverFromPool(1) },
      { id: "manifesto", detailsId: null, title: "Manifesto das Pequenas Revoluções", author: "Hugo Rial", progress: 0, minutes: 16, cover: coverFromPool(2) },
      { id: "sombras", detailsId: null, title: "Sombras de Âmbar", author: "Marina Valença", progress: 0, minutes: 11, cover: coverFromPool(3) },
    ],
  },
  {
    id: "collections",
    title: "🕮 Coleções",
    subtitle: "Curadorias Essência para mergulhos temáticos",
    books: [
      { id: "classicos", detailsId: null, title: "Clássicos Modernos", author: "12 títulos selecionados", progress: 0, minutes: 0, cover: coverFromPool(4) },
      { id: "reflexoes", detailsId: null, title: "Reflexões Diárias", author: "7 ensaios breves", progress: 0, minutes: 0, cover: coverFromPool(5) },
      { id: "audio", detailsId: null, title: "Audiobooks Curtos", author: "Coleção 15 min", progress: 0, minutes: 0, cover: coverFromPool(6) },
    ],
  },
];

function pickCover(book, fallbackIndex = 0) {
  return ensureCoverSrc(book?.capa_url || book?.capa_cinematica_url, coverFromPool(fallbackIndex));
}

function handleCoverFallback(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = DEFAULT_COVER_PLACEHOLDER;
}

function summarize(text, maxLength = 180) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function mapBookToFlowCard(book, fallbackIndex = 0) {
  return {
    id: book.id,
    detailsId: book.id ?? null,
    title: book.titulo,
    author: book.autor?.nome ?? "Autor não informado",
    tag: book.destaque ? "Em destaque" : "Novo no catálogo",
    mood: [book.genero?.nome, book.duracao_audio ? `${book.duracao_audio} min` : null].filter(Boolean).join(" · ") || "Disponível agora",
    summary: summarize(book.sinopse, 140) || "Sinopse não informada no momento.",
    cover: pickCover(book, fallbackIndex),
    pdf_url: book.pdf_url,
    audio_url: book.audio_url,
    hasNarrative: hasCinematicExperience(book),
  };
}

function mapBookToSectionCard(book, fallbackIndex = 0) {
  return {
    id: book.id,
    detailsId: book.id ?? null,
    title: book.titulo,
    author: book.autor?.nome ?? "Autor não informado",
    genero: book.genero?.nome,
    sinopse: summarize(book.sinopse, 210),
    cover: pickCover(book, fallbackIndex),
    heroImage: book.player_hero_url ? ensureCoverSrc(book.player_hero_url) : null,
    pdf_url: book.pdf_url,
    audio_url: book.audio_url,
    hasNarrative: hasCinematicExperience(book),
    minutes: book.duracao_audio ? Number(book.duracao_audio) : null,
    destaque: Boolean(book.destaque),
  };
}

function mapBookToPlaylistTrack(book, fallbackIndex = 0) {
  if (!book) return null;
  const source = buildAudioSource(book.audio_url);
  if (!source) return null;
  return {
    id: book.id ?? `playlist-${fallbackIndex}`,
    bookId: book.id ?? null,
    title: book.titulo ?? book.title ?? "Audiobook Essência",
    author: book.autor?.nome ?? book.author ?? "Autor não informado",
    cover: pickCover(book, fallbackIndex),
    heroImage: book.player_hero_url ? ensureCoverSrc(book.player_hero_url) : null,
    source,
  };
}

function buildPlaylistFromBooks(books) {
  if (!books?.length) return [];
  return books.map((book, index) => mapBookToPlaylistTrack(book, index)).filter(Boolean);
}

function buildSectionsFromBooks(books) {
  if (!books?.length) return FALLBACK_LIST_SECTIONS;

  const highlights = books.filter((book) => book.destaque).slice(0, 3);
  const newcomers = books.filter((book) => !book.destaque).slice(0, 3);
  const multimedia = books.filter((book) => book.pdf_url || book.audio_url).slice(0, 3);

  const sections = [];
  if (highlights.length) {
    sections.push({
      id: "featured-live",
      title: "📚 Em destaque",
      subtitle: "Seleções atuais da curadoria",
      books: highlights.map((book, index) => mapBookToSectionCard(book, index)),
    });
  }
  if (newcomers.length) {
    sections.push({
      id: "recent-live",
      title: "✨ Novos na biblioteca",
      subtitle: "Entradas mais recentes no catálogo",
      books: newcomers.map((book, index) => mapBookToSectionCard(book, index + highlights.length)),
    });
  }
  if (multimedia.length) {
    sections.push({
      id: "media-live",
      title: "🔉 Conteúdo multimídia",
      subtitle: "Títulos com PDF ou áudio disponíveis",
      books: multimedia.map((book, index) => mapBookToSectionCard(book, index + highlights.length + newcomers.length)),
    });
  }

  return sections.length ? sections : FALLBACK_LIST_SECTIONS;
}

function pickFeaturedBook(books) {
  if (!books?.length) return FALLBACK_FEATURED_BOOK;
  const candidate = books.find((book) => book.destaque) ?? books[0];
  return {
    id: candidate.id,
    detailsId: candidate.id ?? null,
    title: candidate.titulo,
    author: candidate.autor?.nome ?? "Autor não informado",
    cover: pickCover(candidate, 0),
    heroImage: candidate.player_hero_url ? ensureCoverSrc(candidate.player_hero_url) : null,
    sinopse: candidate.sinopse ?? FALLBACK_FEATURED_BOOK.sinopse,
    stats:
      [candidate.genero?.nome, candidate.audio_url && "Audiobook disponível", candidate.pdf_url && "PDF disponível"]
        .filter(Boolean)
        .join(" · ") || FALLBACK_FEATURED_BOOK.stats,
    pdf_url: candidate.pdf_url,
    audio_url: candidate.audio_url,
  };
}

function mapBookToRailCard(book, fallbackIndex = 0) {
  if (!book) return null;
  return {
    id: book.id ?? `rail-card-${fallbackIndex}`,
    detailsId: book.id ?? null,
    title: book.titulo ?? "Título Essência",
    author: book.autor?.nome ?? "Autor não informado",
    summary: summarize(book.sinopse, 120) || "Sinopse em atualização.",
    cover: pickCover(book, fallbackIndex),
  };
}

function matchesRailTemplate(book = {}, template = {}) {
  const haystack = [
    book.genero?.nome,
    book.titulo,
    book.sinopse,
    book.autor?.nome,
    book.colecao?.nome,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return template.keywords?.some((keyword) => haystack.includes(keyword)) ?? false;
}

function buildContentRails(books) {
  if (!books?.length) return FALLBACK_CONTENT_RAILS;

  const rails = CONTENT_RAIL_TEMPLATES.map((template, templateIndex) => {
    const cards = books
      .filter((book) => matchesRailTemplate(book, template))
      .slice(0, 8)
      .map((book, cardIndex) => mapBookToRailCard(book, templateIndex * 8 + cardIndex))
      .filter(Boolean);

    return cards.length
      ? { ...template, cards }
      : FALLBACK_CONTENT_RAILS[templateIndex];
  });

  return rails;
}

const TOP_RATED = [
  { id: "silencio", detailsId: null, title: "O Invisível e o Silêncio", author: "Helena Prado", rating: 4.9, category: "Filosofia", cover: coverFromPool(2) },
  { id: "fragmentos", detailsId: null, title: "Fragmentos de Sábado", author: "Ícaro Mendes", rating: 4.8, category: "Drama", cover: coverFromPool(0) },
  { id: "atlas", detailsId: null, title: "Atlas do Âmbar", author: "Helena Prado", rating: 4.7, category: "Romance", cover: coverFromPool(1) },
  { id: "playlist", detailsId: null, title: "Playlists para Pensar", author: "Equipe Essência", rating: 4.7, category: "Curadoria", cover: coverFromPool(4) },
];

const TRENDING = [
  { id: "fluxo", detailsId: null, title: "Fluxo das Pequenas Coragens", badge: "🔥 em alta", cover: coverFromPool(7) },
  { id: "paisagens", detailsId: null, title: "Paisagens em Frequência", badge: "🔥 em alta", cover: coverFromPool(5) },
  { id: "labirinto", detailsId: null, title: "Labirintos Claros", badge: "🔥 em alta", cover: coverFromPool(6) },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") ?? "";
  const rawPageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = Number.isFinite(rawPageParam) && rawPageParam > 0 ? rawPageParam : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;
  const {
    items: books,
    total: totalBooks = 0,
    loading: loadingBooks,
    error: booksError,
    reload: reloadBooks,
  } = useBooksCatalog({ limit: PAGE_SIZE, status: "ativo", search: searchQuery, offset });
  const { startPlaylist, addToQueue } = useAudioPlaylist();
  const totalPages = Math.max(1, Math.ceil(totalBooks / PAGE_SIZE) || 1);
  const pageSlots = useMemo(() => buildPaginationSlots(totalPages, currentPage), [totalPages, currentPage]);
  const showingStart = totalBooks ? Math.min(offset + 1, totalBooks) : 0;
  const showingEnd = totalBooks ? Math.min(offset + books.length, totalBooks) : 0;
  const handlePageChange = useCallback(
    (nextPage) => {
      const normalizedTotalPages = Math.max(1, totalPages);
      const safePage = Math.max(1, Math.min(nextPage, normalizedTotalPages));
      const params = new URLSearchParams(searchParams);
      if (searchQuery) {
        params.set("search", searchQuery);
      } else {
        params.delete("search");
      }
      if (safePage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(safePage));
      }
      setSearchParams(params);
    },
    [searchParams, searchQuery, setSearchParams, totalPages],
  );
  const previousSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (previousSearchRef.current !== searchQuery) {
      previousSearchRef.current = searchQuery;
      handlePageChange(1);
    }
  }, [searchQuery, handlePageChange]);
  useEffect(() => {
    if (!loadingBooks && totalBooks > 0 && currentPage > totalPages) {
      handlePageChange(totalPages);
    }
  }, [currentPage, handlePageChange, loadingBooks, totalBooks, totalPages]);
  const canGoPreviousPage = currentPage > 1;
  const canGoNextPage = currentPage < totalPages;
  const [flowIndex, setFlowIndex] = useState(0);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [manualSelection, setManualSelection] = useState([]);

  const flowBooks = useMemo(() => {
    return books.length ? books.slice(0, 5).map((book, index) => mapBookToFlowCard(book, index)) : FALLBACK_FLOW_BOOKS;
  }, [books]);
  const flowCount = flowBooks.length;
  const flowControlsDisabled = flowCount <= 1;

  const featuredBook = useMemo(() => pickFeaturedBook(books), [books]);
  const listSections = useMemo(() => buildSectionsFromBooks(books), [books]);
  const contentRails = useMemo(() => buildContentRails(books), [books]);
  const playlistTracks = useMemo(() => buildPlaylistFromBooks(books), [books]);
  const catalogBooksById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const librarySectionIds = useMemo(() => {
    const ids = [];
    listSections.forEach((section) => {
      section.books.forEach((book) => {
        const id = book.detailsId ?? (books.length > 0 ? book.id : null);
        if (id) ids.push(id);
      });
    });
    return ids;
  }, [listSections, books.length]);
  const engagement = useEngagement(librarySectionIds);
  const handleStartPlaylist = useCallback(
    (bookId = null) => {
      if (!playlistTracks.length) return;
      let startIndex = 0;
      if (bookId) {
        const foundIndex = playlistTracks.findIndex(
          (track) => track.bookId === bookId || track.id === bookId,
        );
        if (foundIndex >= 0) {
          startIndex = foundIndex;
        }
      }
      startPlaylist(playlistTracks, { startIndex });
    },
    [playlistTracks, startPlaylist],
  );
  const handlePlayFeaturedAudio = useCallback(async () => {
    if (!featuredBook.audio_url) return;
    const source = await resolveAudioSource(featuredBook.audio_url);
    if (!source) return;
    startPlaylist([
      {
        id: featuredBook.detailsId ?? "featured-book",
        bookId: featuredBook.detailsId ?? null,
        title: featuredBook.title ?? "Audiobook Essência",
        author: featuredBook.author ?? "Autor não informado",
        cover: featuredBook.cover,
        heroImage: featuredBook.heroImage,
        source,
      },
    ]);
  }, [featuredBook, startPlaylist]);
  const hasPlaylist = playlistTracks.length > 0;
  const handleToggleManualSelection = useCallback(
    (bookId) => {
      if (!bookId) return;
      setManualSelection((prev) => {
        const existingIndex = prev.findIndex((item) => item.bookId === bookId);
        if (existingIndex >= 0) {
          const next = [...prev];
          next.splice(existingIndex, 1);
          return next;
        }
        const target = catalogBooksById.get(bookId);
        if (!target) return prev;
        const track = mapBookToPlaylistTrack(target, prev.length);
        if (!track) return prev;
        return [...prev, track];
      });
    },
    [catalogBooksById],
  );
  const handleMoveManualSelection = useCallback((bookId, direction) => {
    if (!bookId || !direction) return;
    setManualSelection((prev) => {
      const index = prev.findIndex((item) => item.bookId === bookId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }, []);
  const handleClearManualSelection = useCallback(() => setManualSelection([]), []);
  const handlePlayManualSelection = useCallback(() => {
    if (!manualSelection.length) return;
    startPlaylist(manualSelection, { startIndex: 0 });
    setManualSelection([]);
  }, [manualSelection, startPlaylist]);
  const handleQueueManualSelection = useCallback(() => {
    if (!manualSelection.length) return;
    addToQueue(manualSelection, { playNext: true, autoplay: false });
    setManualSelection([]);
  }, [manualSelection, addToQueue]);
  const isEmptyState = !loadingBooks && !books.length && !booksError;

  useEffect(() => {
    if (!flowCount) return undefined;
    const timer = setInterval(() => {
      setFlowIndex((prev) => (prev + 1) % flowCount);
    }, 5500);
    return () => clearInterval(timer);
  }, [flowCount]);

  useEffect(() => {
    if (flowCount === 0) return;
    if (flowIndex >= flowCount) {
      setFlowIndex(0);
    }
  }, [flowCount, flowIndex]);

  const flowDeck = useMemo(() => {
    if (!flowCount) return [];
    const half = Math.floor(flowCount / 2);
    return flowBooks.map((card, idx) => {
      let relative = idx - flowIndex;
      if (relative > half) relative -= flowCount;
      if (relative < -half) relative += flowCount;
      return { ...card, relative };
    });
  }, [flowBooks, flowCount, flowIndex]);

  const activeFlowCard = flowBooks[flowIndex] ?? flowBooks[0] ?? null;
  const flowAccent =
    FLOW_ACCENTS[((flowIndex % FLOW_ACCENTS.length) + FLOW_ACCENTS.length) % FLOW_ACCENTS.length];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)] xl:gap-12">
      <main className="min-w-0 space-y-10 xl:pr-2">
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

        {booksError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-red-200/50 bg-red-50/80 p-4 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100">
            <p>{booksError}</p>
            <button
              type="button"
              onClick={reloadBooks}
              className="rounded-full border border-red-400/40 px-4 py-1 font-semibold text-red-900 hover:bg-red-100/60 dark:text-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {searchQuery && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[rgba(255,255,255,0.25)] bg-[rgba(var(--surface-card),0.6)] px-5 py-3 text-sm text-[rgb(var(--text-secondary))]">
            <p>
              Exibindo resultados para <span className="font-semibold text-[rgb(var(--text-primary))]">“{searchQuery}”</span>.
            </p>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="rounded-full border border-[rgba(255,255,255,0.3)] px-4 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
            >
              Limpar filtro
            </button>
          </div>
        )}

        {isEmptyState && (
          <div className="rounded-[32px] border border-dashed border-[rgba(255,255,255,0.25)] bg-[rgba(var(--surface-card),0.6)] p-6 text-center text-sm text-[rgb(var(--text-secondary))]">
            {searchQuery
              ? (
                <>
                  Nenhum resultado encontrado para <span className="font-semibold text-[rgb(var(--text-primary))]">“{searchQuery}”</span>. Ajuste os termos ou cadastre um novo título.
                </>
                )
              : "Nenhum livro cadastrado ainda. Use “Cadastrar título” para iniciar a sua biblioteca."}
          </div>
        )}
        
      <section className="relative w-full overflow-hidden">
  <div className="flex items-center justify-between gap-3">
    <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.65)]">
      Navegue por estilos
    </p>
    <span className="hidden text-[11px] font-medium text-[rgb(var(--text-secondary))] sm:inline">Arraste para ver mais →</span>
  </div>

  {/* container fixo que impede o scroll global */}
  <div className="relative">
    {/* faixa rolável isolada com glassmorphismo */}
    <Motion.div
      variants={chipContainerVariants}
      initial="hidden"
      animate="show"
      className="mt-4 flex w-full max-w-full gap-5 overflow-x-auto rounded-[28px] border border-[rgba(186,123,79,0.18)] bg-[color:rgba(var(--surface-card),0.55)] px-6 py-6 backdrop-blur-xl shadow-[0_30px_70px_-55px_rgba(40,25,10,0.85)] scrollbar-thin scrollbar-thumb-[rgba(186,123,79,0.25)] scrollbar-thumb-rounded-full"
      style={{
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORY_ITEMS.map((category, index) => {
        const active = index === 0;
        return (
          <Motion.button
            key={category.id}
            type="button"
            variants={chipItemVariants}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex flex-shrink-0 snap-start flex-col items-center gap-2.5 rounded-2xl px-1 py-1 focus-visible:outline-none"
          >
            <span
              className={`relative flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-white transition-shadow duration-300 group-hover:shadow-[0_22px_34px_-14px_rgba(40,25,10,0.6)] ${
                active
                  ? "ring-2 ring-[rgba(214,162,92,0.85)] ring-offset-2 ring-offset-[rgba(var(--surface-card),0.55)] shadow-[0_22px_34px_-14px_rgba(40,25,10,0.6)]"
                  : "ring-1 ring-white/10"
              }`}
              style={{ background: category.gradient }}
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent" aria-hidden="true" />
              {React.createElement(category.icon, {
                className: "relative h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]",
                strokeWidth: 1.75,
              })}
            </span>
            <span
              className={`font-serif text-sm transition ${
                active
                  ? "font-semibold text-[rgb(var(--text-primary))]"
                  : "text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]"
              }`}
            >
              {category.label}
            </span>
            {active && (
              <span className="absolute -bottom-1.5 h-1 w-7 rounded-full bg-[rgb(var(--color-accent-primary))]" aria-hidden="true" />
            )}
          </Motion.button>
        );
      })}
      </Motion.div>
    </div>
</section>

        {hasPlaylist && (
          <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-6 text-[rgb(var(--text-primary))] shadow-[0_30px_70px_-60px_rgba(15,10,35,0.8)]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.65)]">
                  Playlist continua
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[rgb(var(--text-primary))]">
                  {playlistTracks.length === 1
                    ? "1 audio pronto para tocar em sequencia"
                    : `${playlistTracks.length} audios prontos para tocar em sequencia`}
                </h3>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  Comece em qualquer titulo e siga automaticamente pela curadoria com audio disponivel.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleStartPlaylist()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(0,0,0,0.7)] transition hover:bg-[rgb(var(--color-accent-dark))]"
                >
                  Ouvir playlist sequencial
                </button>
                <span className="text-xs font-medium text-[rgb(var(--text-secondary))]">O player fixa no rodape para você continuar navegando.</span>
              </div>
            </div>
          </section>
        )}

        {manualSelection.length > 0 && (
          <section className="space-y-4 rounded-[32px] border border-[rgba(255,255,255,0.12)] bg-[rgba(var(--surface-card),0.9)] p-6 shadow-[0_28px_70px_-60px_rgba(15,10,35,0.85)]">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.65)]">
                  Playlist manual
                </p>
                <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                  {manualSelection.length === 1
                    ? "1 titulo selecionado"
                    : `${manualSelection.length} titulos selecionados`}
                </h3>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  Reordene como preferir e toque imediatamente ou apenas adicione na fila atual.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePlayManualSelection}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(0,0,0,0.7)] transition hover:bg-[rgb(var(--color-accent-dark))]"
                >
                  Tocar selecao agora
                </button>
                <button
                  type="button"
                  onClick={handleQueueManualSelection}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.15)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/5"
                >
                  Adicionar na fila atual
                </button>
                <button
                  type="button"
                  onClick={handleClearManualSelection}
                  className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[rgba(255,255,255,0.15)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] hover:bg-white/5"
                >
                  Limpar selecao
                </button>
              </div>
            </header>
            <ol className="space-y-3">
              {manualSelection.map((track, index) => (
                <li
                  key={track.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-muted),0.5)] px-4 py-3 text-sm text-[rgb(var(--text-primary))]"
                >
                  <span className="text-xs font-bold text-[color:rgba(var(--color-secondary-primary),0.9)]">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{track.title}</p>
                    <p className="truncate text-xs text-[rgb(var(--text-secondary))]">{track.author}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveManualSelection(track.bookId, "up")}
                      disabled={index === 0}
                      className="rounded-full border border-[rgba(255,255,255,0.2)] px-2 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveManualSelection(track.bookId, "down")}
                      disabled={index === manualSelection.length - 1}
                      className="rounded-full border border-[rgba(255,255,255,0.2)] px-2 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleManualSelection(track.bookId)}
                      className="rounded-full border border-red-300/30 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}


<section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[rgba(12,10,22,0.9)] px-6 py-10 text-white shadow-[0_45px_90px_-60px_rgba(5,3,20,0.95)]">
  {/* Fundo iluminado — reage à cor da capa ativa */}
  <div className="pointer-events-none absolute inset-0">
    <div
      className="absolute -left-20 top-10 h-60 w-60 rounded-full blur-[110px] transition-colors duration-700"
      style={{ background: flowAccent.glow }}
    />
    <div
      className="absolute right-0 bottom-0 h-72 w-72 rounded-full blur-[120px] transition-colors duration-700"
      style={{ background: flowAccent.glow }}
    />
  </div>

  <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    {/* SEÇÃO DE TEXTO E CONTROLES */}
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.5em] text-white/50">Flow Essência</p>

      <div className="space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.25em] text-white/70">
          <span className="rounded-full border border-white/30 px-3 py-1 text-[0.7rem] uppercase tracking-[0.4em]">
            {activeFlowCard?.tag}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.4em]">
            {activeFlowCard?.mood}
          </span>
        </div>

        {/* Título e descrição */}
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">
            <BookLink
              bookId={activeFlowCard?.detailsId}
              className="hover:text-[rgba(255,255,255,0.9)]"
              stopPropagation
            >
              {activeFlowCard?.title ?? "Descubra uma nova obra"}
            </BookLink>
          </h2>
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-white/70">
            {activeFlowCard?.author}
          </p>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            {activeFlowCard?.summary}
          </p>
        </div>
      </div>

      {/* CTA primário */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => activeFlowCard && setSelectedFlow(activeFlowCard)}
          className="inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ backgroundColor: flowAccent.solid, boxShadow: `0 18px 34px -14px ${flowAccent.glow}` }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Começar a ler
        </button>
        <button
          type="button"
          onClick={() => activeFlowCard && setSelectedFlow(activeFlowCard)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/25 px-6 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
            <path d="M3 18v-5a9 9 0 0118 0v5" strokeLinecap="round" />
            <path d="M19 16h2v3a2 2 0 01-2 2h-1v-5zM5 16H3v3a2 2 0 002 2h1v-5z" />
          </svg>
          Ouvir resumo
        </button>
      </div>

      {/* Botões e indicadores */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => flowCount > 1 && setFlowIndex((prev) => (prev - 1 + flowCount) % flowCount)}
            disabled={flowControlsDisabled}
          >
            Anterior
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-2 text-sm font-semibold text-[rgb(var(--color-accent-dark))] shadow-lg shadow-black/20 transition hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => flowCount > 1 && setFlowIndex((prev) => (prev + 1) % flowCount)}
            disabled={flowControlsDisabled}
          >
            Próximo
          </button>
        </div>

        <div className="flex items-center gap-2">
          {flowBooks.map((book, idx) => (
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
    <div className="relative mt-6 sm:mt-4 lg:mt-0">
      {/* Luz ambiente */}
      <div className="pointer-events-none absolute inset-0 m-auto h-[320px] sm:h-[340px] w-[320px] sm:w-[360px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent blur-[120px]" />

      {/* Coverflow */}
      <div
        className="relative mx-auto h-[320px] w-full max-w-[460px]"
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        {flowDeck.map((card) => {
          const distance = Math.abs(card.relative);
          const isActive = card.relative === 0;
          const translateX = `${card.relative * 94}px`;
          const translateZ = 200 - distance * 64;
          const rotateY = card.relative * -22;
          const scale = isActive ? 1 : 0.86;
          const opacity = distance > 2 ? 0 : Math.max(0, 0.9 - distance * 0.26);

          return (
            <article
              key={card.id}
              className="absolute left-1/2 top-1/2 h-[260px] sm:h-[240px] lg:h-[260px] 
                         w-[195px] sm:w-[180px] lg:w-[195px]
                         -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden 
                         rounded-[28px] border border-white/10 bg-black/40 
                         shadow-[0_25px_45px_-25px_rgba(0,0,0,0.8)] transition-all"
              style={{
                transform: `translate(-50%, -50%) translateX(${translateX}) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex: 50 - distance,
                transition:
                  "transform 800ms cubic-bezier(0.17,0.67,0.23,0.99), opacity 400ms ease, z-index 400ms",
                transformStyle: "preserve-3d",
              }}
              onClick={() => setSelectedFlow(card)}
            >
              {card.detailsId ? (
                <BookLink
                  bookId={card.detailsId}
                  className="block h-full w-full"
                  stopPropagation
                >
                  <img
                    src={card.cover}
                    alt={card.title}
                    className="h-full w-full object-contain pt-2 brightness-[0.97] contrast-[1.08]"
                    draggable={false}
                    onError={handleCoverFallback}
                  />
                </BookLink>
              ) : (
                <img
                  src={card.cover}
                  alt={card.title}
                  className="h-full w-full object-contain pt-2 brightness-[0.97] contrast-[1.08]"
                  draggable={false}
                  onError={handleCoverFallback}
                />
              )}              
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
              <BookLink
                bookId={featuredBook.detailsId}
                className="mx-auto block h-[360px] w-[270px] rounded-[24px] bg-black/5 shadow-xl lg:h-[360px] lg:w-[270px]"
              >
                <img
                  src={featuredBook.cover}
                  alt={featuredBook.title}
                  className="h-full w-full rounded-[24px] object-contain pt-2"
                  onError={handleCoverFallback}
                />
              </BookLink>
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">
                Em destaque
              </p>
              <h3 className="font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">
                <BookLink
                  bookId={featuredBook.detailsId}
                  className="text-[rgb(var(--text-primary))]"
                >
                  {featuredBook.title}
                </BookLink>
              </h3>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{featuredBook.author}</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-[color:rgb(var(--color-accent-dark))]">
                {featuredBook.stats}
              </div>
              <p className="text-base leading-relaxed text-[rgb(var(--text-primary))]">{featuredBook.sinopse}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {featuredBook.pdf_url && (
                  <button
                    type="button"
                    onClick={() => openResolvedMedia(featuredBook.pdf_url, resolvePdfSource)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[color:rgb(var(--color-accent-primary))] px-4 py-2 font-semibold text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.35)] transition hover:bg-[color:rgb(var(--color-accent-dark))]"
                  >
                    Ler PDF →
                  </button>
                )}
                {buildAudioSource(featuredBook.audio_url) && (
                  <button
                    type="button"
                    onClick={handlePlayFeaturedAudio}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] px-4 py-2 font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
                  >
                    Ouvir áudio
                  </button>
                )}
                {featuredBook.detailsId ? (
                  <Link
                    to={`/biblioteca/${featuredBook.detailsId}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] px-4 py-2 font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
                  >
                    Ver detalhes
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[rgba(0,0,0,0.08)] px-4 py-2 font-semibold text-[rgb(var(--text-secondary))]">
                    Ver detalhes
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {listSections.map((section) => (
          <section key={section.id} className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[color:rgb(var(--text-primary))]">{section.title}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{section.subtitle}</p>
              </div>
              <button className="text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">Ver todos →</button>
            </header>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {section.books.map((book, idx) => {
                const detailsId = book.detailsId ?? (books.length > 0 ? book.id : null);
                return (
                  <BookCard
                    key={book.id ?? `${section.id}-${idx}`}
                    book={{
                      id: detailsId,
                      title: book.title,
                      author: book.author,
                      category: book.genero ?? (idx === 0 ? "Atual" : "Descoberta"),
                      cover: book.cover,
                      heroImage: book.heroImage,
                      synopsis: book.sinopse ?? book.summary,
                      hasPdf: Boolean(book.pdf_url),
                      hasAudio: Boolean(book.audio_url),
                      hasNarrative: Boolean(book.hasNarrative),
                      pdfUrl: book.pdf_url,
                      audioUrl: book.audio_url,
                      isNew: false,
                    }}
                    likeCount={detailsId ? engagement.likeCounts[detailsId] || 0 : 0}
                    liked={detailsId ? engagement.liked.has(detailsId) : false}
                    saved={detailsId ? engagement.saved.has(detailsId) : false}
                    onToggleLike={detailsId ? engagement.toggleLike : undefined}
                    onToggleSave={detailsId ? engagement.toggleSave : undefined}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {contentRails.map((rail) => (
          <section key={rail.id} className="space-y-4 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-5 shadow-[0_30px_70px_-60px_rgba(15,10,35,0.8)]">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.65)]">
                  {rail.subtitle}
                </p>
                <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">{rail.title}</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-1 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
              >
                Explorar tudo
              </button>
            </header>
            <div className="relative -mx-4 sm:mx-0">
              <div
                className="scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.1)] scrollbar-thumb-rounded-full flex gap-4 overflow-x-auto px-4 py-2"
                style={{ scrollSnapType: "x proximity" }}
              >
                {rail.cards.map((card, index) => (
                  <article
                    key={card.id ?? `${rail.id}-${index}`}
                    className="min-w-[240px] max-w-[260px] flex-shrink-0 rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[rgba(var(--surface-base),0.9)] p-4 shadow-[0_20px_40px_-30px_rgba(12,10,20,0.9)]"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <BookLink
                      bookId={card.detailsId}
                      className="group block overflow-hidden rounded-[22px]"
                      stopPropagation
                    >
                      <div
                        className="w-full overflow-hidden rounded-[22px] bg-black/10"
                        style={{ aspectRatio: "3 / 4" }}
                      >
                        <img
                          src={card.cover}
                          alt={card.title}
                          className="h-full w-full object-contain pt-2"
                          onError={handleCoverFallback}
                        />
                      </div>
                    </BookLink>
                    <div className="mt-4 space-y-2">
                      <h4 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{card.title}</h4>
                      <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]">{card.author}</p>
                      <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-3">{card.summary}</p>
                    </div>
                    <div className="mt-3">
                      {card.detailsId ? (
                        <BookLink
                          bookId={card.detailsId}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.18)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
                        >
                          Ver detalhes
                        </BookLink>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(255,255,255,0.18)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))]">
                          Detalhes em breve
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}

        {totalBooks > 0 && (
          <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-5 shadow-[0_25px_60px_-40px_rgba(10,8,30,0.5)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.75)]">Navegação do catálogo</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  Mostrando {showingStart}
                  {" – "}
                  {showingEnd} de {totalBooks} {searchQuery ? `resultado(s) para “${searchQuery}”.` : "títulos disponíveis."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.18)] px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!canGoPreviousPage || loadingBooks}
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(var(--surface-muted),0.3)] px-3 py-2">
                  {pageSlots.map((slot) =>
                    typeof slot === "number" ? (
                      <button
                        key={`page-${slot}`}
                        type="button"
                        onClick={() => handlePageChange(slot)}
                        aria-current={slot === currentPage ? "page" : undefined}
                        className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${
                          slot === currentPage
                            ? "bg-[rgb(var(--color-accent-primary))] text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.35)]"
                            : "text-[rgb(var(--text-primary))] hover:bg-white/10"
                        }`}
                      >
                        {slot}
                      </button>
                    ) : (
                      <span key={slot} className="px-2 text-sm font-semibold text-[rgb(var(--text-secondary))]">
                        …
                      </span>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.18)] px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!canGoNextPage || loadingBooks}
                >
                  Próximo →
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:border-l xl:border-[rgba(186,123,79,0.18)] xl:pl-12">
        <section className="rounded-[32px] border border-[rgba(186,123,79,0.16)] bg-[rgba(var(--surface-card),0.7)] p-5 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.85)] backdrop-blur-xl">
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
                <img
                  src={book.cover}
                  alt={book.title}
                  className="h-16 w-12 rounded-xl object-contain"
                  draggable={false}
                  onError={handleCoverFallback}
                />
                <div className="text-sm">
                  <p className="font-semibold text-[rgb(var(--text-primary))]">
                    <BookLink bookId={book.detailsId} className="text-[rgb(var(--text-primary))]">
                      {book.title}
                    </BookLink>
                  </p>
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
                <img
                  src={item.cover}
                  alt={item.title}
                  className="h-24 w-[72px] rounded-2xl object-contain"
                  draggable={false}
                  onError={handleCoverFallback}
                />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      <BookLink bookId={item.detailsId} className="text-white">
                        {item.title}
                      </BookLink>
                    </p>
                    <p className="text-sm text-white/70">Anotações, playlists e insights em alta.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[rgba(186,123,79,0.16)] bg-[rgba(var(--surface-card),0.7)] p-5 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.85)] backdrop-blur-xl">
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

        <section className="rounded-[32px] border border-[rgba(186,123,79,0.16)] bg-[rgba(var(--surface-card),0.7)] p-5 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.85)] backdrop-blur-xl">
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
              <BookLink bookId={selectedFlow.detailsId} className="block">
                <img
                  src={selectedFlow.cover}
                  alt={selectedFlow.title}
                  className="h-48 w-36 rounded-2xl object-contain"
                  onError={handleCoverFallback}
                />
              </BookLink>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">{selectedFlow.tag}</p>
                <h4 className="text-2xl font-semibold">
                  <BookLink
                    bookId={selectedFlow.detailsId}
                    className="text-white"
                  >
                    {selectedFlow.title}
                  </BookLink>
                </h4>
                <p className="text-sm text-white/70">{selectedFlow.author}</p>
                <p className="text-sm text-white/80">{selectedFlow.summary}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {selectedFlow.pdf_url && (
                    <a
                      href={selectedFlow.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--color-accent-dark))]"
                    >
                      Abrir PDF
                    </a>
                  )}
                  {buildAudioSource(selectedFlow.audio_url) && (
                    <a
                      href={buildAudioSource(selectedFlow.audio_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Ouvir áudio
                    </a>
                  )}
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

function buildPaginationSlots(totalPages, currentPage) {
  const safeTotal = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
  const safeCurrent = Math.min(Math.max(currentPage, 1), safeTotal);

  if (safeTotal <= 5) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const slots = [1];
  let start = safeCurrent - 1;
  let end = safeCurrent + 1;

  if (start <= 2) {
    start = 2;
  }

  if (end >= safeTotal - 1) {
    end = safeTotal - 1;
  }

  if (start > 2) {
    slots.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    if (page > 1 && page < safeTotal) {
      slots.push(page);
    }
  }

  if (end < safeTotal - 1) {
    slots.push("ellipsis-end");
  }

  slots.push(safeTotal);
  return slots;
}
