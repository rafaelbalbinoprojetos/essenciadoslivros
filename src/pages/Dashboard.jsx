import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Film,
  FolderArchive,
  Headphones,
  LibraryBig,
  Play,
  ScrollText,
  Sparkles,
  Tags,
} from "lucide-react";
import JourneyHomeSection from "../components/JourneyHomeSection.jsx";
import { useBooksCatalog } from "../hooks/useBooksCatalog.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ensureCoverSrc } from "../utils/covers.js";
import { hasCinematicExperience } from "../services/narratives.js";

function getNarrative(book) {
  return Array.isArray(book?.narrativa) ? book.narrativa[0] : book?.narrativa;
}

function sceneCount(book) {
  return (getNarrative(book)?.faixas ?? []).filter((track) => track.status === "ativo").length;
}

function coverOf(book, cinematic = false) {
  return ensureCoverSrc(
    cinematic
      ? book?.capa_cinematica_url || book?.capa_url
      : book?.capa_url || book?.capa_cinematica_url,
  );
}

function shortText(value, limit = 150) {
  const text = value?.trim();
  if (!text) return "Uma obra preservada para ser descoberta em diferentes experiências.";
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}

function RailCard({ book, cinematic = false, badge, featured = false }) {
  return (
    <article className={`group flex-none ${featured ? "w-[250px] sm:w-[286px]" : "w-[205px] sm:w-[228px]"}`}>
      <Link
        to={`/biblioteca/${book.id}${cinematic ? "#narrativa" : ""}`}
        className="relative block aspect-[2/3] overflow-hidden rounded-[22px] border border-[#d4ad67]/45 bg-[#0b0805] shadow-[0_24px_55px_-30px_rgba(24,14,5,0.88)] ring-1 ring-black/20 transition duration-500 hover:-translate-y-1.5 hover:border-[#e1bd72]/75 hover:shadow-[0_34px_72px_-30px_rgba(48,29,9,0.95)]"
      >
        <img
          src={coverOf(book, cinematic)}
          alt={book.titulo}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.035]"
        />
        <span className="pointer-events-none absolute inset-0 rounded-[21px] ring-1 ring-inset ring-white/12" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black via-black/72 to-transparent" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/42 to-transparent" aria-hidden="true" />
        {badge && (
          <span className="absolute left-3 top-3 rounded-full border border-[#e1bd72]/38 bg-black/58 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.19em] text-[#f3d69a] shadow-lg backdrop-blur-md">
            {badge}
          </span>
        )}
        <span className="absolute inset-x-4 bottom-4 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          <span className={`block line-clamp-2 font-display font-semibold leading-[1.05] text-[#f5ddb0] ${featured ? "text-xl" : "text-lg"}`}>
            {book.titulo}
          </span>
          <span className="mt-1.5 block truncate text-[11px] font-medium text-white/72">
            {book.autor?.nome ?? "Autor não informado"}
          </span>
        </span>
      </Link>
    </article>
  );
}

function CollectionRail({ eyebrow, title, description, to, books, cinematic = false, badge }) {
  if (!books.length) return null;
  return (
    <section className="space-y-5">
      <header className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-[rgb(var(--color-accent-dark))]">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[rgb(var(--text-primary))]">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--text-secondary))]">{description}</p>
        </div>
        <Link to={to} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(var(--color-accent-primary),0.24)] px-4 py-2 text-xs font-semibold text-[rgb(var(--color-accent-dark))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)]">
          Ver coleção <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <div className="flex gap-5 overflow-x-auto pb-5 pt-1 [scrollbar-width:thin]">
        {books.map((book, index) => <RailCard key={book.id} book={book} cinematic={cinematic} badge={badge} featured={index === 0} />)}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { items: books, loading, error, reload } = useBooksCatalog({ limit: 60, status: "ativo" });

  const cinematicBooks = useMemo(() => books.filter(hasCinematicExperience), [books]);
  const audioBooks = useMemo(() => books.filter((book) => book.audio_url), [books]);
  const guideBooks = useMemo(() => books.filter((book) => book.pdf_url), [books]);
  const recentBooks = useMemo(() => [...books].sort((a, b) => new Date(b.data_adicao || 0) - new Date(a.data_adicao || 0)).slice(0, 6), [books]);
  const heroBooks = useMemo(() => {
    const featured = books.filter((book) => book.destaque);
    const candidates = [...featured, ...cinematicBooks, ...books];
    const seen = new Set();

    return candidates.filter((book) => {
      if (!book?.id || seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    }).slice(0, 6);
  }, [books, cinematicBooks]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTouched, setHeroTouched] = useState(false);
  const heroCarouselRef = useRef(null);
  const heroProgrammaticScrollRef = useRef(null);
  const heroProgrammaticScrollTimeoutRef = useRef(0);
  const heroScrollRafRef = useRef(0);
  const heroSwipeStartXRef = useRef(null);
  const heroBook = heroBooks[heroIndex] ?? heroBooks[0] ?? null;
  const heroDeck = useMemo(() => {
    if (!heroBooks.length) return [];
    const half = Math.floor(heroBooks.length / 2);
    return heroBooks.map((book, index) => {
      let relative = index - heroIndex;
      if (relative > half) relative -= heroBooks.length;
      if (relative < -half) relative += heroBooks.length;
      return { book, index, relative };
    });
  }, [heroBooks, heroIndex]);

  const moveHero = useCallback((direction) => {
    if (heroBooks.length < 2) return;
    setHeroTouched(true);
    setHeroIndex((current) => (current + direction + heroBooks.length) % heroBooks.length);
  }, [heroBooks.length]);

  const scrollHeroTo = useCallback((index, behavior = "smooth") => {
    const viewport = heroCarouselRef.current;
    const slide = viewport?.children?.[index];
    if (!viewport || !slide) return;
    heroProgrammaticScrollRef.current = index;
    if (heroProgrammaticScrollTimeoutRef.current) {
      window.clearTimeout(heroProgrammaticScrollTimeoutRef.current);
    }
    const target = slide.offsetLeft - (viewport.clientWidth - slide.clientWidth) / 2;
    viewport.scrollTo({ left: Math.max(0, target), behavior });
    heroProgrammaticScrollTimeoutRef.current = window.setTimeout(() => {
      heroProgrammaticScrollRef.current = null;
    }, behavior === "smooth" ? 650 : 0);
  }, []);

  const handleHeroScroll = useCallback(() => {
    const viewport = heroCarouselRef.current;
    if (!viewport || heroScrollRafRef.current) return;

    heroScrollRafRef.current = window.requestAnimationFrame(() => {
      heroScrollRafRef.current = 0;
      if (heroProgrammaticScrollRef.current !== null) return;
      const center = viewport.scrollLeft + viewport.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      Array.from(viewport.children).forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(center - slideCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setHeroIndex((current) => (current === closestIndex ? current : closestIndex));
    });
  }, []);

  useEffect(() => {
    if (heroIndex >= heroBooks.length) setHeroIndex(0);
  }, [heroBooks.length, heroIndex]);

  useEffect(() => {
    if (heroBooks.length < 2 || heroTouched) return undefined;
    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroBooks.length);
    }, 7200);
    return () => window.clearInterval(interval);
  }, [heroBooks.length, heroTouched]);

  useEffect(() => {
    scrollHeroTo(heroIndex, "smooth");
  }, [heroIndex, scrollHeroTo]);

  useEffect(() => () => {
    if (heroScrollRafRef.current) window.cancelAnimationFrame(heroScrollRafRef.current);
    if (heroProgrammaticScrollTimeoutRef.current) window.clearTimeout(heroProgrammaticScrollTimeoutRef.current);
  }, []);

  const genres = useMemo(() => {
    const map = new Map();
    books.forEach((book) => {
      const name = book.genero?.nome;
      if (name && !map.has(name)) map.set(name, book);
    });
    return [...map.entries()].slice(0, 10);
  }, [books]);

  const interestRails = useMemo(() => {
    const groups = new Map();
    books.forEach((book) => {
      const name = book.genero?.nome;
      if (!name) return;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(book);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  }, [books]);

  const stats = useMemo(() => {
    const collections = new Set(books.map((book) => book.colecao?.id).filter(Boolean)).size;
    const genreCount = new Set(books.map((book) => book.genero?.id).filter(Boolean)).size;
    const hours = Math.round(books.reduce((sum, book) => sum + (Number(book.duracao_audio) || 0), 0) / 60);
    return [
      { label: "Obras preservadas", value: books.length, icon: LibraryBig },
      { label: "Registros em áudio", value: audioBooks.length, icon: Headphones },
      { label: "Memórias narradas", value: cinematicBooks.length, icon: Film },
      { label: "Cenas arquivadas", value: cinematicBooks.reduce((sum, book) => sum + sceneCount(book), 0), icon: Play },
      { label: "Guias preservados", value: guideBooks.length, icon: ScrollText },
      { label: "Universos catalogados", value: genreCount, icon: Tags },
      { label: "Coleções históricas", value: collections, icon: FolderArchive },
      { label: "Horas de memória", value: hours, icon: Clock3 },
    ];
  }, [audioBooks.length, books, cinematicBooks, guideBooks.length]);

  const firstName = user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0] || "leitor";

  if (loading && !books.length) {
    return <p className="py-20 text-center text-sm text-[rgb(var(--text-secondary))]">Abrindo o acervo Essência...</p>;
  }

  return (
    <div className="min-w-0 max-w-full space-y-16 overflow-x-hidden pb-14 md:space-y-20">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          <span>{error}</span><button type="button" onClick={reload} className="font-semibold underline">Tentar novamente</button>
        </div>
      )}

      {heroBook && (
        <section className="relative overflow-hidden rounded-[34px] border border-[#d5b06a]/20 bg-[#090705] py-6 text-white shadow-[0_45px_110px_-55px_rgba(32,19,5,0.95)] md:py-9">
          <div className="pointer-events-none absolute inset-0">
            <AnimatePresence mode="sync">
              <Motion.img
                key={`panorama-ambient-new-${heroBook.id}`}
                src={coverOf(heroBook, hasCinematicExperience(heroBook))}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.18 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_30%,rgba(191,137,63,0.22),transparent_36%),radial-gradient(circle_at_82%_15%,rgba(213,176,106,0.08),transparent_28%),linear-gradient(100deg,rgba(8,6,4,0.58),rgba(8,6,4,0.88)_58%,rgba(8,6,4,0.98))]" />
            <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-[#d5b06a]/40 to-transparent" />
          </div>

          <div className="relative z-[1] px-5 pb-5 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-white/45">Bem-vindo de volta, {firstName}</p>
          </div>

          <div
            className="relative z-[1] mx-auto h-[calc(30dvh+2rem)] w-full max-w-[900px] overflow-hidden px-5 pb-4 pt-1 [touch-action:pan-y]"
            style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}
            aria-label="Obras em destaque"
            onPointerDown={(event) => {
              heroSwipeStartXRef.current = event.clientX;
              setHeroTouched(true);
            }}
            onPointerUp={(event) => {
              if (heroSwipeStartXRef.current === null) return;
              const delta = event.clientX - heroSwipeStartXRef.current;
              heroSwipeStartXRef.current = null;
              if (Math.abs(delta) < 42) return;
              moveHero(delta < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              heroSwipeStartXRef.current = null;
            }}
          >
            <div className="pointer-events-none absolute inset-x-8 bottom-1 h-20 rounded-[50%] bg-black/50 blur-2xl" />
            {heroDeck.map(({ book, index, relative }) => {
              const active = relative === 0;
              const distance = Math.abs(relative);
              if (distance > 2) return null;

              const translateZ = active ? 150 : 70 - distance * 35;
              const rotateY = relative * -14;
              const scale = active ? 1 : 0.88;
              const opacity = distance > 2 ? 0 : Math.max(0, 1 - distance * 0.28);
              const cinematic = hasCinematicExperience(book);

              return (
                <article
                  key={book.id}
                  role="button"
                  tabIndex={active ? -1 : 0}
                  onClick={() => {
                    if (!active) {
                      setHeroTouched(true);
                      setHeroIndex(index);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!active && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      setHeroTouched(true);
                      setHeroIndex(index);
                    }
                  }}
                  className={`group absolute left-1/2 top-1/2 aspect-[5/6] h-[60%] w-auto overflow-hidden rounded-[24px] border bg-black/58 shadow-[0_35px_80px_-42px_rgba(0,0,0,0.95)] transition-[filter,border-color] duration-500 ${active ? "border-[#d5b06a]/80 brightness-100" : "cursor-pointer border-[#d5b06a]/28 brightness-[0.72] hover:brightness-90"}`}
                  style={{
                    opacity,
                    zIndex: 30 - distance,
                    transform: `translate(-50%, -50%) translateX(calc(${relative} * clamp(150px, 22vw, 215px))) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    transformStyle: "preserve-3d",
                    transition: "transform 760ms cubic-bezier(0.18,0.82,0.2,1), opacity 420ms ease, filter 420ms ease, border-color 420ms ease",
                  }}
                >
                  <img src={coverOf(book, cinematic)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" draggable={false} />
                  <div className={`absolute inset-0 ${active ? "bg-[linear-gradient(to_top,rgba(7,5,3,0.98)_0%,rgba(7,5,3,0.78)_30%,rgba(7,5,3,0.12)_68%,transparent_100%)]" : "bg-[linear-gradient(to_top,rgba(7,5,3,0.96)_0%,rgba(7,5,3,0.55)_48%,rgba(7,5,3,0.2)_100%)]"}`} />
                  <span className="absolute inset-x-10 top-4 z-[2] truncate text-center text-[9px] font-bold uppercase tracking-[0.24em] text-[#d5b06a]/85">
                    Curadoria Essência
                  </span>
                  <div className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border border-[#d5b06a]/25 bg-black/28 text-[#d5b06a]/80 backdrop-blur-md">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                  <div className="absolute inset-x-3 bottom-3 top-1/2 z-[2] flex flex-col justify-end">
                    <h1 className={`line-clamp-2 break-words font-display font-semibold leading-[1.04] text-[#f4d088] ${active ? "text-[clamp(1rem,2vw,1.35rem)]" : "text-[clamp(0.9rem,1.7vw,1.1rem)]"}`}>{book.titulo}</h1>
                    <p className="mt-1 line-clamp-1 text-[9px] leading-4 text-white/78">{shortText(book.sinopse, active ? 90 : 68)}</p>
                    {active ? (
                      <div className="mt-1 flex flex-nowrap items-center gap-1">
                        <Link to={`/biblioteca/${book.id}${cinematic ? "#narrativa" : ""}`} className="inline-flex min-h-7 items-center gap-0.5 whitespace-nowrap rounded-full bg-[rgb(var(--color-accent-primary))] px-1.5 py-1 text-[9px] font-semibold text-white shadow-[0_0_22px_rgba(124,83,255,0.28)] transition hover:bg-[rgb(var(--color-accent-dark))]">
                          <Play className="h-2.5 w-2.5" fill="currentColor" /> Continuar
                        </Link>
                        <Link to={`/biblioteca/${book.id}`} className="inline-flex min-h-7 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-1 text-[9px] font-semibold text-white transition hover:bg-white/10">
                          Explorar <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#d5b06a]/76">
                        Explorar obra <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
            {heroBooks.length > 1 && (
              <>
                <button type="button" onClick={() => moveHero(-1)} aria-label="Obra anterior" className="absolute left-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/36 text-white shadow-lg backdrop-blur-md transition hover:bg-white/12 sm:left-6"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => moveHero(1)} aria-label="Proxima obra" className="absolute right-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/36 text-white shadow-lg backdrop-blur-md transition hover:bg-white/12 sm:right-6"><ChevronRight className="h-4 w-4" /></button>
              </>
            )}
          </div>

          {false && (
          <div
            ref={heroCarouselRef}
            onScroll={handleHeroScroll}
            onPointerDown={() => setHeroTouched(true)}
            onTouchStart={() => setHeroTouched(true)}
            className="relative z-[1] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-3 pt-1 [scrollbar-width:none] [touch-action:pan-y_pinch-zoom] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-8"
            aria-label="Obras em destaque"
          >
            {heroBooks.map((book, index) => {
              const active = index === heroIndex;
              const cinematic = hasCinematicExperience(book);
              return (
                <article
                  key={book.id}
                  className={`group relative h-[min(68dvh,660px)] min-h-[430px] max-h-[72dvh] flex-[0_0_88%] snap-center overflow-hidden rounded-[30px] border border-white/10 bg-black/55 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.95)] transition duration-500 md:flex-[0_0_72%] xl:flex-[0_0_56%] ${active ? "scale-100 opacity-100" : "scale-[0.965] opacity-70"}`}
                >
                  <img src={coverOf(book, cinematic)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" draggable={false} />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,5,3,0.98)_0%,rgba(7,5,3,0.86)_31%,rgba(7,5,3,0.18)_68%,transparent_100%)]" />
                  <div className="absolute inset-x-5 bottom-6 z-[2] sm:inset-x-8 sm:bottom-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d5b06a]/78">Seleção do acervo</span>
                    <h1 className="mt-3 break-words font-display text-[clamp(1.9rem,8vw,3.6rem)] font-semibold leading-[0.98]">{book.titulo}</h1>
                    <p className="mt-3 text-sm text-white/72">{book.autor?.nome ?? "Curadoria Essência"} · {book.genero?.nome ?? "Acervo Essência"}</p>
                    <p className="mt-4 max-w-2xl overflow-hidden text-sm leading-6 text-white/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:text-base md:leading-7">{shortText(book.sinopse, 210)}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link to={`/biblioteca/${book.id}${cinematic ? "#narrativa" : ""}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[rgb(var(--color-accent-dark))]">
                        <Play className="h-4 w-4" fill="currentColor" /> Continuar
                      </Link>
                      <Link to={`/biblioteca/${book.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/14">
                        Explorar obra <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          )}

          {heroBooks.length > 1 && (
            <div className="relative z-[2] mt-3 flex items-center justify-center gap-5 px-5 sm:px-8">
              <div className="flex items-center gap-2" aria-label="Selecionar obra em destaque">
                {heroBooks.map((book, index) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      setHeroTouched(true);
                      setHeroIndex(index);
                    }}
                    aria-label={`Exibir ${book.titulo}`}
                    aria-current={index === heroIndex ? "true" : undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === heroIndex ? "w-8 bg-[rgb(var(--color-accent-primary))]" : "w-2 bg-white/28 hover:bg-white/55"}`}
                  />
                ))}
              </div>
              <div className="hidden">
                <button type="button" onClick={() => { setHeroTouched(true); setHeroIndex((current) => (current - 1 + heroBooks.length) % heroBooks.length); }} aria-label="Obra anterior" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/12"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setHeroTouched(true); setHeroIndex((current) => (current + 1) % heroBooks.length); }} aria-label="Próxima obra" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/12"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </section>
      )}

      {false && heroBook && (
        <section className="relative min-h-[580px] overflow-hidden rounded-[34px] border border-[#d5b06a]/20 bg-[#090705] text-white shadow-[0_45px_110px_-55px_rgba(32,19,5,0.95)]">
          <div className="pointer-events-none absolute inset-0">
            <AnimatePresence mode="sync">
              <Motion.img
                key={`panorama-ambient-${heroBook.id}`}
                src={coverOf(heroBook, hasCinematicExperience(heroBook))}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.18 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_31%_48%,rgba(191,137,63,0.2),transparent_38%),radial-gradient(circle_at_82%_15%,rgba(213,176,106,0.07),transparent_28%),linear-gradient(100deg,rgba(8,6,4,0.56),rgba(8,6,4,0.9)_58%,rgba(8,6,4,0.98))]" />
            <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-[#d5b06a]/40 to-transparent" />
          </div>

          <div className="relative grid min-h-[580px] min-w-0 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.18fr)]">
            <div className="flex items-center justify-center overflow-hidden px-2 pb-0 pt-8 sm:px-8 lg:p-10">
              <div className="relative mx-auto h-[380px] w-full max-w-[600px] sm:h-[460px]" style={{ perspective: "1100px", perspectiveOrigin: "50% 50%" }}>
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(218,174,91,0.16)_0%,rgba(218,174,91,0.06)_42%,transparent_72%)] blur-2xl" />
                {heroDeck.map(({ book, relative }) => {
                  const distance = Math.abs(relative);
                  const isActive = relative === 0;
                  const transform = `translate(-50%, -50%) translateX(${relative * 86}px) translateZ(${210 - distance * 68}px) rotateY(${relative * -22}deg) scale(${isActive ? 1 : 0.86})`;
                  const opacity = distance > 2 ? 0 : Math.max(0, 0.92 - distance * 0.25);
                  const image = <img src={coverOf(book, hasCinematicExperience(book))} alt={`Capa de ${book.titulo}`} className="h-full w-full object-contain pt-2 brightness-[0.97] contrast-[1.08]" draggable={false} />;

                  return (
                    <article
                      key={book.id}
                      className="absolute left-1/2 top-1/2 h-[340px] w-[255px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-white/10 bg-black/40 shadow-[0_25px_45px_-25px_rgba(0,0,0,0.8)] transition-all sm:h-[430px] sm:w-[322px] sm:rounded-[28px]"
                      style={{
                        transform,
                        opacity,
                        zIndex: 50 - distance,
                        transition: "transform 800ms cubic-bezier(0.17,0.67,0.23,0.99), opacity 400ms ease, z-index 400ms",
                        transformStyle: "preserve-3d",
                        pointerEvents: distance > 2 ? "none" : "auto",
                      }}
                    >
                      {isActive ? (
                        <Link to={`/biblioteca/${book.id}`} className="block h-full w-full" aria-label={`Abrir ${book.titulo}`}>{image}</Link>
                      ) : (
                        <button type="button" onClick={() => setHeroIndex(heroBooks.findIndex((item) => item.id === book.id))} className="block h-full w-full" aria-label={`Destacar ${book.titulo}`}>{image}</button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={`hero-copy-${heroBook.id}`}
              initial={{ x: 90, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 90, opacity: 0 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-0 flex-col justify-center p-6 sm:p-7 md:p-11 lg:px-12 lg:py-14 xl:px-16"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-white/48">Bem-vindo de volta, {firstName}</p>
              <p className="mt-9 text-[10px] font-bold uppercase tracking-[0.34em] text-[rgb(var(--color-accent-light))]">Seleção do acervo</p>
              <h1 className="mt-3 max-w-3xl break-words font-display text-4xl font-semibold leading-[1.02] md:text-6xl">{heroBook.titulo}</h1>
              <p className="mt-4 text-base text-white/70">{heroBook.autor?.nome ?? "Curadoria Essência"} · {heroBook.genero?.nome ?? "Acervo Essência"}</p>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/68">{shortText(heroBook.sinopse, 300)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/biblioteca/${heroBook.id}${hasCinematicExperience(heroBook) ? "#narrativa" : ""}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[rgb(var(--color-accent-dark))]">
                  <Play className="h-4 w-4" fill="currentColor" /> Continuar
                </Link>
                <Link to={`/biblioteca/${heroBook.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/14">
                  Explorar obra <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/14 pt-5 text-xs text-white/55">
                <span>{heroBook.audio_url ? "Audiobook disponível" : "Curadoria editorial"}</span>
                <span>{sceneCount(heroBook) ? `${sceneCount(heroBook)} cenas cinematográficas` : "Experiência museológica"}</span>
                {heroBook.duracao_audio && <span>{heroBook.duracao_audio} min de áudio</span>}
              </div>

              {heroBooks.length > 1 && (
                <div className="mt-8 flex items-center justify-between gap-5">
                  <div className="flex items-center gap-2" aria-label="Selecionar obra em destaque">
                    {heroBooks.map((book, index) => (
                      <button key={book.id} type="button" onClick={() => setHeroIndex(index)} aria-label={`Exibir ${book.titulo}`} aria-current={index === heroIndex ? "true" : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${index === heroIndex ? "w-9 bg-[rgb(var(--color-accent-primary))]" : "w-2.5 bg-white/25 hover:bg-white/50"}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHeroIndex((current) => (current - 1 + heroBooks.length) % heroBooks.length)} aria-label="Obra anterior" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/12"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setHeroIndex((current) => (current + 1) % heroBooks.length)} aria-label="Próxima obra" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/12"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </Motion.div>
            </AnimatePresence>
          </div>
        </section>
      )}

      <section>
        <header className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[rgb(var(--color-accent-dark))]">O legado preservado</p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-[rgb(var(--text-primary))]">Cada número representa uma experiência preservada.</h2>
        </header>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {stats.map(({ label, value, icon }) => (
            <div key={label} className="group rounded-[20px] border border-[rgba(var(--color-accent-primary),0.13)] bg-[rgba(var(--surface-card),0.72)] p-4 shadow-[0_18px_40px_-34px_rgba(30,20,12,0.55)] transition hover:-translate-y-0.5 hover:border-[rgba(var(--color-accent-primary),0.3)]">
              {React.createElement(icon, { className: "h-4 w-4 text-[rgb(var(--color-accent-primary))]" })}
              <strong className="mt-5 block font-display text-3xl font-semibold text-[rgb(var(--text-primary))]">{value}</strong>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--text-subtle))]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {genres.length > 0 && (
        <section>
          <header className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[rgb(var(--color-accent-dark))]">Descubra por afinidade</p><h2 className="mt-2 font-display text-4xl font-semibold text-[rgb(var(--text-primary))]">Explore Universos</h2></div>
            <Link to="/mural" className="hidden text-sm font-semibold text-[rgb(var(--color-accent-dark))] sm:inline">Ver todos →</Link>
          </header>
          <div className="mt-7 grid auto-rows-[105px] gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {genres.map(([genre, book], index) => (
              <Link key={genre} to="/mural" className={`group relative overflow-hidden rounded-[24px] border border-white/10 ${index === 0 ? "row-span-3 sm:col-span-2 lg:col-span-2" : index === 3 || index === 6 ? "row-span-3" : "row-span-2"}`}>
                <img src={coverOf(book)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent" />
                <span className="absolute inset-x-5 bottom-5 font-display text-2xl font-semibold text-white">{genre}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-16">
        {interestRails.map(([genre, genreBooks], index) => (
          <CollectionRail
            key={genre}
            eyebrow={index === 0 ? "Continue explorando" : "Acervos por afinidade"}
            title={genre}
            description={`Obras de ${genre.toLocaleLowerCase("pt-BR")} reunidas para você escolher a história antes do formato.`}
            to="/mural"
            books={genreBooks.slice(0, 10)}
            badge={index === 0 ? "Em destaque" : genre}
          />
        ))}
        <CollectionRail eyebrow="Chegaram ao arquivo" title="Recém adicionados" description="As preservações mais recentes do acervo Essência." to="/mural" books={recentBooks} badge="Novo" />
      </div>

      {heroBook && (
        <section className="grid overflow-hidden rounded-[32px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgb(var(--surface-card))] shadow-[0_34px_80px_-58px_rgba(35,22,14,0.78)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative flex min-h-[420px] flex-col bg-black/5 p-7">
            <Link to={`/biblioteca/${heroBook.id}`} className="block">
              <img src={coverOf(heroBook)} alt={heroBook.titulo} className="mx-auto h-full max-h-[440px] w-full object-contain" />
            </Link>
            <AnimatePresence mode="wait" initial={false}>
              <Motion.div
                key={`experience-caption-${heroBook.id}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 border-t border-[rgba(var(--color-accent-primary),0.16)] pt-5"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgb(var(--color-accent-dark))]">Obra em destaque</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">{heroBook.titulo}</h3>
                <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">{heroBook.autor?.nome ?? "Curadoria Essência"}</p>
                <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{shortText(heroBook.sinopse, 190)}</p>
              </Motion.div>
            </AnimatePresence>
          </div>
          <div className="flex flex-col justify-center p-7 md:p-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[rgb(var(--color-accent-dark))]">O diferencial Essência</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-[rgb(var(--text-primary))]">Uma obra. Cinco maneiras de vivê-la.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[rgb(var(--text-secondary))]">A obra não termina na última página. Ela pode ser lida, ouvida, revivida e compreendida como parte de um legado maior.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { title: "Ler", text: "Entre na obra pelo texto integral.", icon: BookOpen },
                { title: "Ouvir", text: "Leve a história para outros ritmos.", icon: Headphones },
                { title: "Reviver", text: "Atravesse cenas narradas como memória.", icon: Film },
                { title: "Explorar", text: "Descubra documentos e camadas do acervo.", icon: ScrollText },
                { title: "Conhecer o legado", text: "Entenda por que esta obra permanece.", icon: Sparkles },
              ].map(({ title, text, icon }) => (
                <article key={title} className="group rounded-[20px] border border-[rgba(var(--color-accent-primary),0.14)] bg-[rgba(var(--surface-base),0.55)] p-5 transition hover:-translate-y-0.5 hover:border-[rgba(var(--color-accent-primary),0.32)]">
                  {React.createElement(icon, { className: "h-8 w-8 text-[rgb(var(--color-accent-primary))]" })}
                  <strong className="mt-5 block font-display text-xl text-[rgb(var(--text-primary))]">{title}</strong>
                  <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{text}</p>
                </article>
              ))}
            </div>
            <Link to={`/biblioteca/${heroBook.id}`} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white">Conhecer a experiência <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      <JourneyHomeSection />

      <section>
        <header><p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[rgb(var(--color-accent-dark))]">Diário do arquivo</p><h2 className="mt-2 font-display text-4xl font-semibold text-[rgb(var(--text-primary))]">Novas entradas no acervo</h2></header>
        <div className="mt-7 max-w-4xl border-l border-[rgba(var(--color-accent-primary),0.25)] pl-6">
          {recentBooks.map((book, index) => (
            <Link key={book.id} to={`/biblioteca/${book.id}`} className="group relative grid gap-3 border-b border-[rgba(var(--color-accent-primary),0.1)] py-5 sm:grid-cols-[90px_1fr_auto] sm:items-center">
              <span className="absolute -left-[30px] top-8 h-2 w-2 rounded-full bg-[rgb(var(--color-accent-primary))] ring-4 ring-[rgb(var(--surface-base))]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{index === 0 ? "Hoje" : index < 3 ? "Ontem" : "Esta semana"}</span>
              <span><strong className="block font-display text-lg text-[rgb(var(--text-primary))]">{book.titulo}</strong><span className="mt-1 block text-sm text-[rgb(var(--text-secondary))]">{hasCinematicExperience(book) ? "Nova memória cinematográfica" : book.pdf_url ? "Novo guia editorial" : "Nova obra preservada"}</span></span>
              <ArrowRight className="hidden h-4 w-4 text-[rgb(var(--color-accent-primary))] transition group-hover:translate-x-1 sm:block" />
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
