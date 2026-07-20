import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion } from "framer-motion";
import { Swords, Compass, Heart, Drama, Lightbulb, Scroll, Cpu, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { DEFAULT_COVER_PLACEHOLDER, ensureCoverSrc, resolvePlayerHeroSrc } from "../utils/covers.js";
import { buildAudioSource, openResolvedMedia, resolveAudioSource, resolvePdfSource } from "../utils/media.js";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import BookCard from "../components/BookCard.jsx";
import { useEngagement } from "../hooks/useEngagement.js";
import { hasCinematicExperience } from "../services/narratives.js";

const CATEGORY_VISUALS = [
  { icon: Swords, gradient: "linear-gradient(150deg,#c25a4d,#7a2f37)" },
  { icon: Compass, gradient: "linear-gradient(150deg,#cd8f4c,#7c4c22)" },
  { icon: Heart, gradient: "linear-gradient(150deg,#c75b87,#722f5a)" },
  { icon: Drama, gradient: "linear-gradient(150deg,#7d60ab,#3f3566)" },
  { icon: Lightbulb, gradient: "linear-gradient(150deg,#5c7f8c,#2f4a55)" },
  { icon: Scroll, gradient: "linear-gradient(150deg,#b48b50,#6f5225)" },
  { icon: Cpu, gradient: "linear-gradient(150deg,#6b809d,#34435f)" },
  { icon: Sparkles, gradient: "linear-gradient(150deg,#8d6dc2,#4a3a86)" },
];

const FLOW_ACCENTS = [
  { glow: "rgba(118,93,255,0.34)", solid: "#7b5dff" },
  { glow: "rgba(214,162,92,0.34)", solid: "#d6a25c" },
  { glow: "rgba(199,91,135,0.34)", solid: "#c75b87" },
  { glow: "rgba(92,127,140,0.34)", solid: "#5c7f8c" },
  { glow: "rgba(205,143,76,0.34)", solid: "#cd8f4c" },
];

const PAGE_SIZE = 24;

function pickCover(book) {
  return ensureCoverSrc(book?.capa_url || book?.capa_cinematica_url, DEFAULT_COVER_PLACEHOLDER);
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
    slug: book.slug,
    detailsId: book.id ?? null,
    title: book.titulo,
    author: book.autor?.nome ?? "Autor não informado",
    tag: book.destaque ? "Em destaque" : "Na biblioteca",
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
    slug: book.slug,
    detailsId: book.id ?? null,
    title: book.titulo,
    author: book.autor?.nome ?? "Autor não informado",
    genero: book.genero?.nome,
    sinopse: summarize(book.sinopse, 210),
    cover: pickCover(book, fallbackIndex),
    heroImage: resolvePlayerHeroSrc(book),
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
    slug: book.slug ?? null,
    title: book.titulo ?? book.title ?? "Audiobook Essência",
    author: book.autor?.nome ?? book.author ?? "Autor não informado",
    cover: pickCover(book, fallbackIndex),
    heroImage: resolvePlayerHeroSrc(book),
    source,
  };
}

function buildPlaylistFromBooks(books) {
  if (!books?.length) return [];
  return books.map((book, index) => mapBookToPlaylistTrack(book, index)).filter(Boolean);
}

function buildSectionsFromBooks(books) {
  if (!books?.length) return [];

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

  return sections;
}

function pickFeaturedBook(books) {
  if (!books?.length) return null;
  const candidate = books.find((book) => book.destaque) ?? books[0];
  return {
    id: candidate.id,
    slug: candidate.slug,
    detailsId: candidate.id ?? null,
    title: candidate.titulo,
    author: candidate.autor?.nome ?? "Autor não informado",
    cover: pickCover(candidate, 0),
    heroImage: resolvePlayerHeroSrc(candidate),
    sinopse: candidate.sinopse || "Sinopse não informada.",
    stats:
      [candidate.genero?.nome, candidate.audio_url && "Audiobook disponível", candidate.pdf_url && "PDF disponível"]
        .filter(Boolean)
        .join(" · ") || "Disponível na biblioteca",
    pdf_url: candidate.pdf_url,
    audio_url: candidate.audio_url,
  };
}

function mapBookToRailCard(book, fallbackIndex = 0) {
  if (!book) return null;
  return {
    id: book.id,
    detailsId: book.id ?? null,
    title: book.titulo,
    author: book.autor?.nome ?? "Autor não informado",
    summary: summarize(book.sinopse, 120) || "Sinopse em atualização.",
    cover: pickCover(book, fallbackIndex),
  };
}

function buildContentRails(books) {
  if (!books?.length) return [];

  const groups = new Map();
  books.forEach((book) => {
    const genre = book.genero?.nome?.trim();
    if (!genre) return;
    if (!groups.has(genre)) groups.set(genre, []);
    groups.get(genre).push(book);
  });

  return Array.from(groups.entries()).map(([genre, genreBooks], railIndex) => ({
    id: `genero-${genre.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
    title: genre,
    subtitle: `${genreBooks.length} ${genreBooks.length === 1 ? "título" : "títulos"} nesta página`,
    cards: genreBooks.slice(0, 8).map((book, cardIndex) => mapBookToRailCard(book, railIndex * 8 + cardIndex)),
  }));
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const modalPortalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!selectedFlow || !modalPortalTarget) return undefined;

    const previousOverflow = modalPortalTarget.style.overflow;
    modalPortalTarget.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") setSelectedFlow(null);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      modalPortalTarget.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedFlow, modalPortalTarget]);
  const [manualSelection, setManualSelection] = useState([]);

  const flowBooks = useMemo(() => {
    return books.slice(0, 5).map((book, index) => mapBookToFlowCard(book, index));
  }, [books]);
  const flowCount = flowBooks.length;
  const flowControlsDisabled = flowCount <= 1;

  const featuredBook = useMemo(() => pickFeaturedBook(books), [books]);
  const listSections = useMemo(() => buildSectionsFromBooks(books), [books]);
  const contentRails = useMemo(() => buildContentRails(books), [books]);
  const categoryItems = useMemo(() => {
    const genres = Array.from(new Set(books.map((book) => book.genero?.nome?.trim()).filter(Boolean)));
    return genres.map((label, index) => ({
      id: `categoria-${index}-${label}`,
      label,
      ...CATEGORY_VISUALS[index % CATEGORY_VISUALS.length],
    }));
  }, [books]);
  const playlistTracks = useMemo(() => buildPlaylistFromBooks(books), [books]);
  const catalogBooksById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const librarySectionIds = useMemo(() => books.map((book) => book.id).filter(Boolean), [books]);
  const engagement = useEngagement(librarySectionIds);
  const sidebarHighlights = useMemo(() => {
    return [...books]
      .sort((a, b) => {
        const likesDifference = (engagement.likeCounts[b.id] || 0) - (engagement.likeCounts[a.id] || 0);
        if (likesDifference !== 0) return likesDifference;
        return Number(Boolean(b.destaque)) - Number(Boolean(a.destaque));
      })
      .slice(0, 4);
  }, [books, engagement.likeCounts]);
  const sidebarMedia = useMemo(
    () => books.filter((book) => book.audio_url || book.pdf_url || hasCinematicExperience(book)).slice(0, 3),
    [books],
  );
  const pageGenres = useMemo(
    () => Array.from(new Set(books.map((book) => book.genero?.nome?.trim()).filter(Boolean))),
    [books],
  );
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
      const selectedTrack = playlistTracks[startIndex];
      if (selectedTrack?.slug) {
        navigate(`/obra/${encodeURIComponent(selectedTrack.slug)}/player`, { state: { backgroundLocation: location } });
      }
    },
    [location, navigate, playlistTracks, startPlaylist],
  );
  const handlePlayFeaturedAudio = useCallback(async () => {
    if (!featuredBook.audio_url) return;
    const source = await resolveAudioSource(featuredBook.audio_url);
    if (!source) return;
    const track = {
      id: featuredBook.detailsId ?? "featured-book",
      bookId: featuredBook.detailsId ?? null,
      slug: featuredBook.slug ?? null,
      title: featuredBook.title ?? "Audiobook Essência",
      author: featuredBook.author ?? "Autor não informado",
      cover: featuredBook.cover,
      heroImage: featuredBook.heroImage,
      source,
    };
    startPlaylist([track]);
    if (track.slug) {
      navigate(`/obra/${encodeURIComponent(track.slug)}/player`, { state: { backgroundLocation: location } });
    }
  }, [featuredBook, location, navigate, startPlaylist]);
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
    const selectedTrack = manualSelection[0];
    if (selectedTrack?.slug) {
      navigate(`/obra/${encodeURIComponent(selectedTrack.slug)}/player`, { state: { backgroundLocation: location } });
    }
    setManualSelection([]);
  }, [location, manualSelection, navigate, startPlaylist]);
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
        
      {categoryItems.length > 0 && (
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
      {categoryItems.map((category) => {
        return (
          <Motion.div
            key={category.id}
            variants={chipItemVariants}
            whileHover={{ y: -6 }}
            className="group relative flex flex-shrink-0 snap-start flex-col items-center gap-2.5 rounded-2xl px-1 py-1"
          >
            <span
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-white ring-1 ring-white/10 transition-shadow duration-300 group-hover:shadow-[0_22px_34px_-14px_rgba(40,25,10,0.6)]"
              style={{ background: category.gradient }}
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent" aria-hidden="true" />
              {React.createElement(category.icon, {
                className: "relative h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]",
                strokeWidth: 1.75,
              })}
            </span>
            <span className="font-serif text-sm text-[rgb(var(--text-secondary))] transition group-hover:text-[rgb(var(--text-primary))]">
              {category.label}
            </span>
          </Motion.div>
        );
      })}
      </Motion.div>
    </div>
</section>
      )}

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


{activeFlowCard && (
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
              {activeFlowCard.title}
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
)}

        {featuredBook && (
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
        )}

        {listSections.map((section) => (
          <section key={section.id} className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[color:rgb(var(--text-primary))]">{section.title}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{section.subtitle}</p>
              </div>
            </header>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {section.books.map((book, idx) => {
                const detailsId = book.detailsId;
                return (
                  <BookCard
                    key={book.id ?? `${section.id}-${idx}`}
                    book={{
                      id: detailsId,
                      slug: book.slug,
                      title: book.title,
                      author: book.author,
                      category: book.genero || null,
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
        {sidebarHighlights.length > 0 && (
        <section className="rounded-[32px] border border-[rgba(186,123,79,0.16)] bg-[rgba(var(--surface-card),0.7)] p-5 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.85)] backdrop-blur-xl">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Obras da biblioteca</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Destaques e títulos mais curtidos</p>
            </div>
          </header>
          <div className="mt-5 space-y-4">
            {sidebarHighlights.map((book) => (
              <div key={book.id} className="flex items-center gap-4 rounded-2xl border border-white/5 p-3">
                <img
                  src={pickCover(book)}
                  alt={book.titulo}
                  className="h-16 w-12 rounded-xl object-contain"
                  draggable={false}
                  onError={handleCoverFallback}
                />
                <div className="text-sm">
                  <p className="font-semibold text-[rgb(var(--text-primary))]">
                    <BookLink bookId={book.id} className="text-[rgb(var(--text-primary))]">
                      {book.titulo}
                    </BookLink>
                  </p>
                  <p className="text-[color:rgb(var(--text-secondary))]">{book.autor?.nome || "Autor não informado"}</p>
                  <p className="text-xs text-amber-400">
                    {engagement.likeCounts[book.id] || 0} curtida{(engagement.likeCounts[book.id] || 0) === 1 ? "" : "s"}
                    {book.genero?.nome ? ` · ${book.genero.nome}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {sidebarMedia.length > 0 && (
        <section className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(24,22,40,0.9)] via-[rgba(46,37,69,0.85)] to-[rgba(214,162,92,0.2)] p-5 text-white shadow-[0_35px_60px_-45px_rgba(5,2,20,0.9)]">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Experiências disponíveis</p>
              <p className="text-xs text-white/70">Conteúdos cadastrados nas obras</p>
            </div>
          </header>
          <div className="mt-5 space-y-4">
            {sidebarMedia.map((book) => (
              <div
                key={book.id}
                className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex gap-4">
                <img
                  src={pickCover(book)}
                  alt={book.titulo}
                  className="h-24 w-[72px] rounded-2xl object-contain"
                  draggable={false}
                  onError={handleCoverFallback}
                />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      <BookLink bookId={book.id} className="text-white">
                        {book.titulo}
                      </BookLink>
                    </p>
                    <p className="text-sm text-white/70">
                      {[book.audio_url && "Áudio", book.pdf_url && "PDF", hasCinematicExperience(book) && "Narrativa cinematográfica"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {totalBooks > 0 && (
        <section className="rounded-[32px] border border-[rgba(186,123,79,0.16)] bg-[rgba(var(--surface-card),0.7)] p-5 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.85)] backdrop-blur-xl">
          <header>
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Resumo da biblioteca</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Informações do catálogo ativo</p>
            </div>
          </header>
          <div className="mt-6 space-y-4 text-sm text-[rgb(var(--text-secondary))]">
            <div>
              <p className="text-3xl font-semibold text-[rgb(var(--text-primary))]">{totalBooks}</p>
              <p>{totalBooks === 1 ? "título ativo" : "títulos ativos"}</p>
            </div>
            {pageGenres.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:rgba(var(--color-secondary-primary),0.7)]">
                Gêneros nesta página
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {pageGenres.map((cat) => (
                  <span key={cat} className="rounded-full border border-[rgba(214,162,92,0.4)] px-3 py-1 text-[color:rgb(var(--color-accent-dark))]">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            )}
          </div>
        </section>
        )}
      </aside>

      {selectedFlow && modalPortalTarget && createPortal((
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedFlow(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${selectedFlow.title}`}
        >
          <div
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[32px] border border-white/10 bg-[rgba(10,9,20,0.95)] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-6 sm:flex-row">
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
      ), modalPortalTarget)}
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
