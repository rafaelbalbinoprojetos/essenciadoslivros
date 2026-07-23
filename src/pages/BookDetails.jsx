import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CircleUserRound,
  Clock3,
  FileText,
  Film,
  Headphones,
  Images,
  Landmark,
  Lightbulb,
  ListMusic,
  MoreVertical,
  Music2,
  Pause,
  Pencil,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Trophy,
} from "lucide-react";
import { deleteBook, getBookById, listBooks } from "../services/books.js";
import { getBookReviews } from "../services/reviews.js";
import { ensureCoverSrc, resolvePlayerHeroSrc } from "../utils/covers.js";
import { resolveAudioSource, resolvePdfSource } from "../utils/media.js";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isAdminUser } from "../utils/admin.js";
import BookReviews from "../components/BookReviews.jsx";
import { getNarrativeByBook } from "../services/narratives.js";
import { buildNarrativeTracks, buildSimpleAudioTrack } from "../utils/playlist.js";

function formatDuration(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function formatTrackDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return null;
  const minutes = Math.floor(Number(seconds) / 60);
  const remainder = Math.floor(Number(seconds) % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const panelClass = "book-exhibition-panel rounded-[28px]";
const eyebrowClass = "text-[10px] font-bold uppercase tracking-[0.36em] text-[rgb(var(--color-accent-primary))]";

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const {
    startPlaylist,
    togglePlay,
    currentTrack,
    isPlaying: playerIsPlaying,
  } = useAudioPlaylist();

  const [book, setBook] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [reviews, setReviews] = useState({ count: 0, average: 0 });
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audioSource, setAudioSource] = useState("");
  const [narrativeStarting, setNarrativeStarting] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      getBookById(bookId),
      getNarrativeByBook(bookId).catch(() => null),
      getBookReviews(bookId).catch(() => ({ count: 0, average: 0 })),
    ])
      .then(([bookData, narrativeData, reviewData]) => {
        if (!active) return;
        setBook(bookData);
        setNarrative(narrativeData?.status === "ativo" ? {
          ...narrativeData,
          faixas: asArray(narrativeData.faixas).filter((track) => track.status === "ativo"),
        } : null);
        setReviews(reviewData);
      })
      .catch((requestError) => {
        console.error("[BookDetails] erro ao carregar obra:", requestError);
        if (active) setError(requestError?.message ?? "Não foi possível carregar esta obra.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [bookId]);

  useEffect(() => {
    let active = true;
    if (!book?.id) return undefined;
    listBooks({ limit: 60, status: "ativo" })
      .then(({ items }) => {
        if (!active) return;
        const matches = items.filter((item) => item.id !== book.id && (
          (book.genero?.id && item.genero?.id === book.genero.id)
          || (book.colecao?.id && item.colecao?.id === book.colecao.id)
        ));
        setRelated(matches.slice(0, 4));
      })
      .catch((relatedError) => console.error("[BookDetails] obras relacionadas:", relatedError));
    return () => { active = false; };
  }, [book]);

  useEffect(() => {
    let active = true;
    if (!book?.audio_url) {
      setAudioSource("");
      return undefined;
    }
    resolveAudioSource(book.audio_url)
      .then((source) => { if (active) setAudioSource(source); })
      .catch(() => { if (active) setAudioSource(""); });
    return () => { active = false; };
  }, [book?.audio_url]);

  const coverSrc = useMemo(() => ensureCoverSrc(book?.capa_url || book?.capa_cinematica_url), [book]);
  const heroSrc = useMemo(() => resolvePlayerHeroSrc(book), [book]);
  const narrativeTracks = useMemo(() => asArray(narrative?.faixas), [narrative]);
  const timeline = useMemo(() => asArray(book?.linha_tempo), [book]);
  const gallery = useMemo(() => asArray(book?.galeria_exposicao), [book]);
  const soundtrack = useMemo(() => asArray(book?.trilha_sonora), [book]);
  const duration = formatDuration(book?.duracao_audio);
  const releaseYear = book?.data_lancamento ? String(book.data_lancamento).slice(0, 4) : null;
  const audioTrack = useMemo(() => buildSimpleAudioTrack(book, coverSrc, audioSource), [audioSource, book, coverSrc]);
  const audioIsCurrent = Boolean(audioTrack?.id && currentTrack?.id === audioTrack.id);
  const audioIsPlaying = audioIsCurrent && playerIsPlaying;
  const hasPdf = Boolean(book?.pdf_cinematica_url || book?.pdf_url || book?.pdf_guia_editorial_url || book?.pdf_enciclopedico_url);
  const hasCinematic = narrativeTracks.length > 0;

  const openPlayer = useCallback((track) => {
    const slug = track?.slug ?? book?.slug;
    if (!slug) return;
    const sceneSegment = track?.sceneId ? `/cena-${track.sceneId}` : "";
    navigate(`/obra/${encodeURIComponent(slug)}/player${sceneSegment}`, { state: { backgroundLocation: location } });
  }, [book?.slug, location, navigate]);

  const handleAudio = useCallback(() => {
    if (!audioTrack) return;
    if (audioIsCurrent) togglePlay();
    else startPlaylist([audioTrack]);
    openPlayer(audioTrack);
  }, [audioIsCurrent, audioTrack, openPlayer, startPlaylist, togglePlay]);

  const handleNarrative = useCallback(async (index = 0) => {
    if (!narrativeTracks.length || narrativeStarting) return;
    const expectedId = `narrative-${narrativeTracks[index]?.id}`;
    if (currentTrack?.id === expectedId) {
      togglePlay();
      openPlayer(currentTrack);
      return;
    }
    setNarrativeStarting(true);
    setNarrativeError("");
    try {
      const playable = await buildNarrativeTracks(book, narrative, coverSrc);
      if (!playable.length) throw new Error("Nenhuma cena pôde ser carregada.");
      const playableIndex = Math.max(0, playable.findIndex((track) => track.id === expectedId));
      startPlaylist(playable, { startIndex: playableIndex, autoplay: true });
      openPlayer(playable[playableIndex]);
    } catch (playError) {
      console.error("[BookDetails] narrativa:", playError);
      setNarrativeError(playError?.message ?? "Não foi possível iniciar a experiência.");
    } finally {
      setNarrativeStarting(false);
    }
  }, [book, coverSrc, currentTrack, narrative, narrativeStarting, narrativeTracks, openPlayer, startPlaylist, togglePlay]);

  const handlePdf = useCallback(async () => {
    const path = book?.pdf_cinematica_url || book?.pdf_url || book?.pdf_guia_editorial_url || book?.pdf_enciclopedico_url;
    if (!path) return;
    try {
      const url = await resolvePdfSource(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (pdfError) {
      toast.error(pdfError?.message ?? "Não foi possível abrir o PDF.");
    }
  }, [book]);

  const handleEnterJourney = useCallback(() => {
    if (hasCinematic) handleNarrative(0);
    else if (audioTrack) handleAudio();
    else if (hasPdf) handlePdf();
    else document.getElementById("curadoria")?.scrollIntoView({ behavior: "smooth" });
  }, [audioTrack, handleAudio, handleNarrative, handlePdf, hasCinematic, hasPdf]);

  const handleShare = useCallback(async () => {
    const shareData = { title: book?.titulo, text: `Conheça ${book?.titulo} no Essência dos Livros.`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado.");
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") toast.error("Não foi possível compartilhar.");
    }
  }, [book?.titulo]);

  const handleExcluirObra = useCallback(async () => {
    if (!book?.id) return;
    setExcluindo(true);
    try {
      await deleteBook(book.id);
      toast.success("Obra excluída com sucesso.");
      navigate("/biblioteca");
    } catch (deleteError) {
      toast.error(deleteError?.message ?? "Não foi possível excluir a obra.");
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  }, [book?.id, navigate]);

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center text-sm text-[rgb(var(--text-secondary))]">Preparando a exposição...</div>;
  }

  if (error || !book) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-400/20 bg-red-950/10 p-8 text-center">
        <p className="text-[rgb(var(--text-primary))]">{error || "Obra não encontrada."}</p>
        <button type="button" onClick={() => navigate("/biblioteca")} className="mt-5 rounded-full bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white">Voltar à biblioteca</button>
      </div>
    );
  }

  const experiences = [
    { label: "Museu", caption: "Editorial", icon: Landmark, available: true, action: () => document.getElementById("curadoria")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Áudio", caption: "Podcast", icon: Headphones, available: Boolean(audioTrack), action: handleAudio },
    { label: "Cinemática", caption: `${narrativeTracks.length} cenas`, icon: Film, available: hasCinematic, action: () => handleNarrative(0) },
    { label: "PDF", caption: "Narrativa", icon: FileText, available: hasPdf, action: handlePdf },
    { label: "Trilha", caption: "Sonora", icon: Music2, available: soundtrack.length > 0, action: () => document.getElementById("trilha")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  const infoItems = [
    { label: "Categoria", value: book.genero?.nome || "Não informada", icon: Tag },
    { label: "Autor", value: book.autor?.nome || "Não informado", icon: CircleUserRound },
    { label: "Ano", value: releaseYear || "Não informado", icon: CalendarDays },
    { label: "Coleção", value: book.colecao?.nome || "Acervo Essência", icon: ShieldCheck },
    { label: "Status", value: book.status || "Indisponível", icon: Sparkles },
  ];

  return (
    <article className="book-exhibition -mx-4 -mt-6 overflow-hidden md:-mx-8">
      <section className="book-exhibition-hero relative flex min-h-[620px] items-end overflow-hidden px-5 pb-8 pt-28 sm:min-h-[660px] sm:px-10 lg:min-h-[680px] lg:px-16 lg:pb-12">
        <img src={heroSrc} alt="" className="book-exhibition-hero__image absolute inset-y-0 right-0 h-full w-full object-cover object-center lg:w-[74%]" />
        <div className="book-exhibition-hero__veil-horizontal absolute inset-0" />
        <div className="book-exhibition-hero__veil-vertical absolute inset-0" />

        <div className="absolute left-5 top-6 z-20 sm:left-10 lg:left-16">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className="book-exhibition-glass-button flex h-12 w-12 items-center justify-center rounded-2xl transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute right-5 top-6 z-20 flex gap-2 sm:right-10 lg:right-16">
          <button type="button" onClick={handleShare} aria-label="Compartilhar" className="book-exhibition-glass-button flex h-12 w-12 items-center justify-center rounded-2xl transition"><Share2 className="h-5 w-5" /></button>
          {admin && (
            <div className="relative">
              <button type="button" onClick={() => setAdminMenuOpen((open) => !open)} aria-label="Opções administrativas" className="book-exhibition-glass-button flex h-12 w-12 items-center justify-center rounded-2xl transition"><MoreVertical className="h-5 w-5" /></button>
              {adminMenuOpen && (
                <div className="absolute right-0 top-14 w-48 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[rgba(var(--surface-card),0.96)] p-2 text-[rgb(var(--text-primary))] shadow-2xl backdrop-blur-xl">
                  <Link to={`/biblioteca/${bookId}/editar`} className="book-exhibition-interactive flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"><Pencil className="h-4 w-4" />Editar obra</Link>
                  <button type="button" onClick={() => { setAdminMenuOpen(false); setConfirmandoExclusao(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Excluir obra</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative z-10 w-full max-w-7xl">
          <div className="max-w-2xl">
            <p className={eyebrowClass}>✧ Obra Essência</p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] text-[rgb(var(--text-primary))] sm:text-6xl lg:text-8xl">{book.titulo}</h1>
            <p className="mt-5 text-lg font-medium text-[rgb(var(--color-accent-primary))]">✧ {book.genero?.nome || "Acervo Essência"}</p>
            <p className="mt-3 max-w-xl text-base leading-7 text-[rgb(var(--text-secondary))] sm:text-lg">{book.subtitulo || book.sinopse || `Uma exposição dedicada à essência de ${book.titulo}.`}</p>
            <p className="mt-5 text-sm uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{book.autor?.nome || "Autoria não informada"}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-[rgb(var(--text-secondary))]">
              {releaseYear && <span className="inline-flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[rgb(var(--color-accent-primary))]" />{releaseYear}</span>}
              {duration && <span className="inline-flex items-center gap-2"><Clock3 className="h-5 w-5 text-[rgb(var(--color-accent-primary))]" />{duration}</span>}
              {book.colecao?.nome && <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[rgb(var(--color-accent-primary))]" />{book.colecao.nome}</span>}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-xl"><Star className="h-5 w-5 fill-[rgb(var(--color-accent-primary))] text-[rgb(var(--color-accent-primary))]" /><span>{reviews.count ? reviews.average.toFixed(1) : "—"}</span></div>
                <p className="text-xs text-[rgb(var(--text-subtle))]">{reviews.count.toLocaleString("pt-BR")} avaliações</p>
              </div>
              <button type="button" onClick={handleEnterJourney} disabled={narrativeStarting} className="inline-flex min-h-16 items-center gap-4 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-7 py-3 font-semibold text-white shadow-[0_15px_45px_-12px_rgba(var(--color-accent-primary),0.65)] transition hover:bg-[rgb(var(--color-accent-dark))] disabled:opacity-60">
                {audioIsPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                <span className="text-left"><span className="block text-lg">Entrar na Jornada</span><span className="block text-xs font-normal opacity-80">Iniciar experiência</span></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-3 max-w-7xl space-y-7 px-4 pb-16 sm:px-8 lg:px-12">
        <nav className={`${panelClass} grid grid-cols-2 overflow-hidden p-2 sm:grid-cols-5`} aria-label="Experiências disponíveis">
          {experiences.map(({ label, caption, icon, available, action }) => (
            <button key={label} type="button" onClick={action} disabled={!available} className="book-exhibition-interactive group flex min-h-28 flex-col items-center justify-center rounded-2xl px-3 py-4 text-center transition disabled:cursor-not-allowed disabled:opacity-30">
              {React.createElement(icon, { className: "h-7 w-7 text-[rgb(var(--color-accent-primary))] transition group-hover:scale-110" })}
              <span className="mt-2 text-sm font-semibold">{label}</span>
              <span className="text-xs text-[rgb(var(--text-subtle))]">{caption}</span>
            </button>
          ))}
        </nav>

        <section id="curadoria" className={`${panelClass} scroll-mt-24 overflow-hidden p-7 sm:p-10`}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_280px]">
            <div className="max-w-4xl">
              <p className={eyebrowClass}>Curadoria editorial</p>
              <blockquote className="mt-5 font-display text-2xl italic leading-relaxed text-[rgb(var(--text-primary))] sm:text-3xl">“{book.curadoria_editorial || book.sinopse || `Uma obra escolhida para ser vivida, lembrada e redescoberta.`}”</blockquote>
              <p className="mt-5 text-sm text-[rgb(var(--color-accent-primary))]">— Essência dos Livros</p>
            </div>
            <img src={coverSrc} alt={`Capa de ${book.titulo}`} className="mx-auto aspect-[3/4] w-full max-w-[230px] rotate-2 rounded-xl border border-[var(--border-strong)] object-cover shadow-2xl" />
          </div>
        </section>

        <section className={`${panelClass} p-6 sm:p-8`}>
          <p className={eyebrowClass}>Informações essenciais</p>
          <div className="mt-6 grid divide-y divide-[var(--border-soft)] sm:grid-cols-5 sm:divide-x sm:divide-y-0">
            {infoItems.map(({ label, value, icon }) => (
              <div key={label} className="px-4 py-5 text-center first:pl-0 last:pr-0 sm:py-2">
                {React.createElement(icon, { className: "mx-auto h-6 w-6 text-[rgb(var(--color-accent-primary))]" })}
                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{label}</p>
                <p className="mt-1 text-sm capitalize text-[rgb(var(--text-primary))]">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {(book.voce_sabia || book.legado) && (
          <div className="grid gap-5 lg:grid-cols-2">
            {book.voce_sabia && <section className={`${panelClass} p-7`}><p className={`${eyebrowClass} flex items-center gap-2`}><Lightbulb className="h-4 w-4" />Você sabia?</p><p className="mt-5 font-display text-xl leading-relaxed text-[rgb(var(--text-secondary))]">{book.voce_sabia}</p></section>}
            {book.legado && <section className={`${panelClass} p-7`}><p className={`${eyebrowClass} flex items-center gap-2`}><Trophy className="h-4 w-4" />Legado</p><p className="mt-5 font-display text-xl leading-relaxed text-[rgb(var(--text-secondary))]">{book.legado}</p></section>}
          </div>
        )}

        {timeline.length > 0 && (
          <section className={`${panelClass} overflow-hidden p-6 sm:p-8`}>
            <div className="flex items-center justify-between"><p className={eyebrowClass}>Linha do tempo</p><span className="text-xs text-[rgb(var(--text-subtle))]">{timeline.length} marcos</span></div>
            <div className="mt-8 grid gap-0 overflow-x-auto pb-3" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(170px, 1fr))` }}>
              {timeline.map((item, index) => (
                <article key={`${item.ano}-${item.titulo}-${index}`} className="relative border-t border-[rgb(var(--color-accent-primary))]/50 px-5 pt-7 first:pl-0 last:pr-0">
                  <span className="absolute -top-1.5 left-5 h-3 w-3 rounded-full bg-[rgb(var(--color-accent-primary))] shadow-[0_0_14px_rgba(var(--color-accent-primary),0.9)] first:left-0" />
                  <p className="text-xs font-bold text-[rgb(var(--color-accent-primary))]">{item.ano || "Marco"}</p>
                  <h3 className="mt-2 text-sm font-semibold">{item.titulo}</h3>
                  {item.descricao && <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.descricao}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className={`${panelClass} p-6 sm:p-8`}>
            <p className={`${eyebrowClass} flex items-center gap-2`}><Images className="h-4 w-4" />Galeria da exposição</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((item, index) => (
                <figure key={`${item.titulo}-${index}`} className="book-exhibition-subcard group overflow-hidden rounded-2xl">
                  <img src={ensureCoverSrc(item.imagem_url || item.url)} alt={item.titulo || `Item ${index + 1}`} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                  <figcaption className="p-3"><p className="text-sm font-medium">{item.titulo || `Objeto ${index + 1}`}</p>{item.descricao && <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">{item.descricao}</p>}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {hasCinematic && (
          <section id="cinematica" className={`${panelClass} scroll-mt-24 overflow-hidden`}>
            <header className="book-exhibition-divider flex flex-wrap items-center justify-between gap-5 border-b p-6 sm:p-8">
              <div><p className={eyebrowClass}>Memória cinematográfica</p><h2 className="mt-2 font-display text-3xl">{book.titulo_cinematico || narrative?.titulo || book.titulo}</h2><p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text-secondary))]">{book.descricao_cinematica || narrative?.descricao || "Uma narrativa construída em cenas."}</p></div>
              <button type="button" onClick={() => handleNarrative(0)} disabled={narrativeStarting} className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><ListMusic className="h-4 w-4" />Ouvir do início</button>
            </header>
            <ol className="grid gap-px bg-[var(--border-soft)] lg:grid-cols-2">
              {narrativeTracks.map((track, index) => {
                const active = currentTrack?.id === `narrative-${track.id}`;
                return (
                  <li key={track.id} className="bg-[rgb(var(--surface-card))]">
                    <button type="button" onClick={() => handleNarrative(index)} className={`book-exhibition-interactive flex w-full items-center gap-4 p-5 text-left transition ${active ? "book-exhibition-interactive--active" : ""}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${active ? "border-[rgb(var(--color-accent-primary))] bg-[rgb(var(--color-accent-primary))] text-white" : "border-[var(--border-strong)] text-[rgb(var(--color-accent-primary))]"}`}>{active && playerIsPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</span>
                      <span className="min-w-0 flex-1"><span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[rgb(var(--text-subtle))]">Cena {index + 1}</span><span className="mt-1 block truncate text-sm font-semibold">{track.titulo}</span>{track.descricao && <span className="mt-1 block line-clamp-1 text-xs text-[rgb(var(--text-subtle))]">{track.descricao}</span>}</span>
                      {formatTrackDuration(track.duracao_segundos) && <span className="text-xs text-[rgb(var(--text-subtle))]">{formatTrackDuration(track.duracao_segundos)}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            {narrativeError && <p className="p-5 text-sm text-red-300">{narrativeError}</p>}
          </section>
        )}

        {soundtrack.length > 0 && (
          <section id="trilha" className={`${panelClass} scroll-mt-24 p-6 sm:p-8`}>
            <p className={`${eyebrowClass} flex items-center gap-2`}><Music2 className="h-4 w-4" />Trilha sonora</p>
            <div className="mt-6 divide-y divide-[var(--border-soft)]">
              {soundtrack.map((track, index) => (
                <div key={`${track.titulo}-${index}`} className="flex items-center gap-4 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[rgb(var(--color-accent-primary))]">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{track.titulo || `Faixa ${index + 1}`}</p><p className="text-xs text-[rgb(var(--text-subtle))]">{track.artista || track.descricao || "Essência dos Livros"}</p></div>
                  {track.audio_url && <a href={track.audio_url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs hover:border-[rgb(var(--color-accent-primary))]">Ouvir</a>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`${panelClass} p-4 sm:p-7`}>
          <p className={`${eyebrowClass} mb-5 flex items-center gap-2`}><Star className="h-4 w-4" />Avaliações da exposição</p>
          <BookReviews bookId={book.id} />
        </section>

        {related.length > 0 && (
          <section className={`${panelClass} p-6 sm:p-8`}>
            <p className={`${eyebrowClass} flex items-center gap-2`}><BookOpen className="h-4 w-4" />Obras relacionadas</p>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((item) => (
                <Link key={item.id} to={`/biblioteca/${item.id}`} className="book-exhibition-subcard group overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:border-[rgb(var(--color-accent-primary))]">
                  <img src={ensureCoverSrc(item.capa_url || item.capa_cinematica_url)} alt={item.titulo} className="aspect-[3/4] w-full object-cover" />
                  <div className="p-4"><h3 className="line-clamp-2 font-display text-lg">{item.titulo}</h3><p className="mt-1 truncate text-xs text-[rgb(var(--text-subtle))]">{item.autor?.nome || "Essência dos Livros"}</p></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {confirmandoExclusao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[rgb(var(--surface-card))] p-6 text-[rgb(var(--text-primary))] shadow-2xl">
            <h2 className="font-display text-2xl">Excluir esta obra?</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">“{book.titulo}” e seus arquivos associados serão removidos permanentemente. Esta ação não pode ser desfeita.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmandoExclusao(false)} disabled={excluindo} className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm">Cancelar</button>
              <button type="button" onClick={handleExcluirObra} disabled={excluindo} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{excluindo ? "Excluindo..." : "Sim, excluir"}</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
