import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Film, ListMusic, Pause, Pencil, Play } from "lucide-react";
import { getBookById } from "../services/books.js";
import { DEFAULT_COVER_PLACEHOLDER, ensureCoverSrc } from "../utils/covers.js";
import { resolveAudioSource, resolveNarrativeSource, resolvePdfSource } from "../utils/media.js";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isAdminUser } from "../utils/admin.js";
import BookReviews from "../components/BookReviews.jsx";
import { getNarrativeByBook } from "../services/narratives.js";

const AUTHOR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='gradient' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2334315b'/%3E%3Cstop offset='100%25' stop-color='%235f5677'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' rx='72' fill='url(%23gradient)'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='rgba(255,255,255,0.8)' font-family='Helvetica,Arial,sans-serif' font-size='72'%3EE%3C/text%3E%3C/svg%3E";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

function getAuthorInitials(name = "") {
  if (!name) return "A";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const {
    startPlaylist,
    addToQueue,
    togglePlay,
    seek,
    currentTrack,
    isPlaying: playerIsPlaying,
    progress: playerProgress,
    duration: playerDuration,
  } = useAudioPlaylist();
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [narrativeStarting, setNarrativeStarting] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const [experience, setExperience] = useState(() => (
    typeof window !== "undefined" && window.location.hash === "#narrativa" ? "cinematic" : "editorial"
  ));

  useEffect(() => {
    let active = true;
    async function fetchBook() {
      setLoading(true);
      setError(null);
      try {
        const [data, narrativeData] = await Promise.all([
          getBookById(bookId),
          getNarrativeByBook(bookId).catch((narrativeRequestError) => {
            console.error("[BookDetails] erro ao carregar narrativa:", narrativeRequestError);
            return null;
          }),
        ]);
        if (active) {
          setBook(data);
          setNarrative(narrativeData?.status === "ativo" ? {
            ...narrativeData,
            faixas: (narrativeData.faixas ?? []).filter((track) => track.status === "ativo"),
          } : null);
        }
      } catch (err) {
        console.error("[BookDetails] erro ao carregar livro:", err);
        if (active) {
          setError(err?.message ?? "Não foi possível carregar os detalhes do livro.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchBook();
    return () => {
      active = false;
    };
  }, [bookId]);

  const coverSrc = useMemo(
    () => ensureCoverSrc(book?.capa_url || book?.capa_cinematica_url),
    [book?.capa_url, book?.capa_cinematica_url],
  );
  const cinematicCoverSrc = useMemo(
    () => ensureCoverSrc(book?.capa_cinematica_url || book?.capa_url),
    [book?.capa_cinematica_url, book?.capa_url],
  );
  const authorName = book?.autor?.nome ?? "Autor não informado";
  const authorInitials = useMemo(() => getAuthorInitials(authorName), [authorName]);
  const authorAvatar = useMemo(() => {
    const avatarUrl = book?.autor?.avatar_url;
    if (!avatarUrl) return null;
    return ensureCoverSrc(avatarUrl, AUTHOR_PLACEHOLDER);
  }, [book]);

  const genre = book?.genero?.nome;
  const collection = book?.colecao?.nome;
  const synopsis = book?.sinopse ?? "Sinopse não informada ainda.";
  const [audioSource, setAudioSource] = useState("");
  useEffect(() => {
    let active = true;
    const raw = book?.audio_url;
    if (!raw) {
      setAudioSource("");
      return undefined;
    }
    resolveAudioSource(raw)
      .then((url) => {
        if (active) setAudioSource(url);
      })
      .catch(() => {
        if (active) setAudioSource("");
      });
    return () => {
      active = false;
    };
  }, [book?.audio_url]);
  const hasAudio = Boolean(book?.audio_url);
  const hasPdf = Boolean(book?.pdf_url);
  const hasCinematicPdf = Boolean(book?.pdf_cinematica_url);
  const playlistTrack = useMemo(() => {
    if (!book || !audioSource) return null;
    return {
      id: book.id ?? "book-current",
      bookId: book.id ?? null,
      title: book.titulo ?? "Audiobook Essência",
      author: authorName,
      cover: coverSrc,
      source: audioSource,
    };
  }, [audioSource, authorName, book, coverSrc]);

  const handleQueueInGlobalPlayer = useCallback(() => {
    if (!playlistTrack) return;
    addToQueue([playlistTrack], { playNext: true, autoplay: false });
  }, [playlistTrack, addToQueue]);

  const handleOpenPdf = useCallback(async () => {
    const raw = book?.pdf_url;
    if (!raw) return;
    const url = await resolvePdfSource(raw);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [book?.pdf_url]);

  const handleOpenCinematicPdf = useCallback(async () => {
    const raw = book?.pdf_cinematica_url;
    if (!raw) return;
    const url = await resolvePdfSource(raw);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [book?.pdf_cinematica_url]);

  // Este livro é a faixa atual do player global?
  const isCurrentTrack = Boolean(playlistTrack?.id && currentTrack?.id === playlistTrack.id);
  const displayIsPlaying = isCurrentTrack && playerIsPlaying;
  const displayProgress = isCurrentTrack ? playerProgress : 0;
  const displayDuration = isCurrentTrack ? playerDuration : 0;

  const handlePlaybackToggle = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else if (playlistTrack) {
      startPlaylist([playlistTrack]);
    }
  };

  const narrativeTracks = useMemo(() => narrative?.faixas ?? [], [narrative?.faixas]);
  const hasCinematicExperience = Boolean(
    book?.tem_experiencia_cinematica || book?.capa_cinematica_url || narrativeTracks.length,
  );
  const displayedCover = experience === "cinematic" ? cinematicCoverSrc : coverSrc;
  useEffect(() => {
    if (window.location.hash === "#narrativa" && hasCinematicExperience) setExperience("cinematic");
  }, [hasCinematicExperience]);
  useEffect(() => {
    if (!hasCinematicExperience || window.location.hash !== "#narrativa") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("narrativa")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasCinematicExperience]);
  const handlePlayNarrative = useCallback(async (startIndex = 0) => {
    if (!narrativeTracks.length || narrativeStarting) return;

    const selectedTrack = narrativeTracks[startIndex];
    const selectedPlayerId = selectedTrack ? `narrative-${selectedTrack.id}` : null;
    if (selectedPlayerId && currentTrack?.id === selectedPlayerId) {
      togglePlay();
      return;
    }

    setNarrativeStarting(true);
    setNarrativeError("");
    try {
      const resolved = await Promise.all(
        narrativeTracks.map(async (track) => ({
          id: `narrative-${track.id}`,
          bookId: book?.id ?? null,
          title: track.titulo,
          author: narrative?.titulo ?? authorName,
          cover: narrative?.capa_url ? ensureCoverSrc(narrative.capa_url) : coverSrc,
          source: await resolveNarrativeSource(track.audio_path),
          skipIntro: true,
          skipProgress: true,
        })),
      );
      const playable = resolved.filter((track) => track.source);
      if (!playable.length) throw new Error("Nenhuma cena pôde ser carregada.");

      const requestedId = selectedPlayerId;
      const playableIndex = Math.max(0, playable.findIndex((track) => track.id === requestedId));
      startPlaylist(playable, { startIndex: playableIndex, autoplay: true });
    } catch (narrativePlaybackError) {
      console.error("[BookDetails] erro ao iniciar narrativa:", narrativePlaybackError);
      setNarrativeError(narrativePlaybackError.message ?? "Não foi possível carregar a narrativa.");
    } finally {
      setNarrativeStarting(false);
    }
  }, [authorName, book?.id, coverSrc, currentTrack?.id, narrative, narrativeStarting, narrativeTracks, startPlaylist, togglePlay]);

  const handleSeek = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || !isCurrentTrack) return;
    seek(value);
  };

  const renderHero = () => {
    if (loading) {
      return (
        <div className="rounded-[32px] border border-white/10 bg-white/40 p-8 text-center text-sm text-[rgb(var(--text-secondary))] dark:bg-white/5">
          Carregando detalhes do título...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[32px] border border-red-200/50 bg-red-50/80 p-8 text-center text-sm text-red-900 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
          <p>{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/70 dark:text-red-100"
              onClick={() => navigate("/biblioteca")}
            >
              Voltar para a biblioteca
            </button>
            <button
              type="button"
              className="rounded-full border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/70 dark:text-red-100"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    if (!book) return null;

    return (
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] 2xl:gap-10">
        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="cover-frame">
            <img
              key={`${experience}-${displayedCover}`}
              src={displayedCover}
              alt={experience === "cinematic" ? `Capa da Memória Cinematográfica de ${book.titulo}` : `Capa editorial de ${book.titulo}`}
              className="cover-frame__art"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {experience === "editorial" && hasPdf && (
              <button
                type="button"
                onClick={handleOpenPdf}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.25)] transition hover:bg-[rgb(var(--color-accent-dark))]"
              >
                Abrir PDF
              </button>
            )}
            {experience === "podcast" && hasAudio && (
              <button type="button" onClick={handlePlaybackToggle} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white">
                {displayIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {displayIsPlaying ? "Pausar podcast" : "Ouvir podcast"}
              </button>
            )}
            {experience === "cinematic" && narrativeTracks.length > 0 && (
              <button type="button" onClick={() => handlePlayNarrative(0)} disabled={narrativeStarting} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Film className="h-4 w-4" /> Iniciar experiência
              </button>
            )}
            {experience === "cinematic" && hasCinematicPdf && (
              <button
                type="button"
                onClick={handleOpenCinematicPdf}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(var(--color-accent-primary),0.4)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)]"
              >
                <FileText className="h-4 w-4" /> Abrir PDF da narrativa
              </button>
            )}
            {admin && (
              <Link
                to={`/biblioteca/${bookId}/editar`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(var(--color-accent-primary),0.4)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)]"
              >
                <Pencil className="h-4 w-4" /> Editar obra
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate("/biblioteca")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(83,61,42,0.16)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/30"
            >
              Voltar para a biblioteca
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(83,61,42,0.1)] pt-3 text-xs text-[rgb(var(--text-subtle))]">
            <span>{hasPdf ? "E-book disponível" : "Sem e-book"}</span>
            <span>{hasAudio ? "Áudio disponível" : "Sem podcast"}</span>
            {narrativeTracks.length > 0 && <span>{narrativeTracks.length} cenas</span>}
            {hasCinematicPdf && <span>PDF da narrativa disponível</span>}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <nav className="flex flex-wrap gap-2 rounded-2xl border border-[rgba(83,61,42,0.12)] bg-[rgba(var(--surface-card),0.68)] p-2" aria-label="Selecionar experiência da obra">
            <button type="button" onClick={() => setExperience("editorial")} className={`min-h-10 flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${experience === "editorial" ? "bg-[rgb(var(--color-accent-primary))] text-white shadow-sm" : "text-[rgb(var(--text-secondary))] hover:bg-white/45"}`}>
              Museu Editorial
            </button>
            <button type="button" onClick={() => setExperience("podcast")} className={`min-h-10 flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${experience === "podcast" ? "bg-[rgb(var(--color-accent-primary))] text-white shadow-sm" : "text-[rgb(var(--text-secondary))] hover:bg-white/45"}`}>
              Podcast
            </button>
            {hasCinematicExperience && (
              <button type="button" onClick={() => setExperience("cinematic")} className={`min-h-10 flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${experience === "cinematic" ? "bg-[rgb(var(--color-accent-primary))] text-white shadow-sm" : "text-[rgb(var(--text-secondary))] hover:bg-white/45"}`}>
                Memória Cinematográfica
              </button>
            )}
          </nav>
          <div className="space-y-3 px-1 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.46em] text-[color:rgba(var(--color-secondary-primary),0.85)]">Obra Essência</p>
            <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] text-[rgb(var(--text-primary))] md:text-5xl">{book.titulo}</h1>
            {book.subtitulo && <p className="text-lg text-[rgb(var(--text-secondary))]">{book.subtitulo}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-[rgb(var(--text-secondary))]">
              {genre && <span>✧ {genre}</span>}
              {collection && <span>· Coleção {collection}</span>}
              {book.duracao_audio && <span>· {book.duracao_audio} min</span>}
            </div>
          </div>

          <div className="flex items-center gap-4 border-y border-[rgba(83,61,42,0.1)] px-1 py-4">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#b38b59] text-lg font-semibold text-white shadow-md">
                {authorInitials}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.75)]">Criador</p>
              <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{authorName}</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{book.autor?.bio ?? "Autor convidado Essência."}</p>
            </div>
          </div>

          {experience === "editorial" && renderMeta()}

          <div className="space-y-5">
            {experience === "editorial" && <section className="rounded-[22px] border border-[rgba(83,61,42,0.13)] bg-[linear-gradient(145deg,rgba(var(--surface-card),0.92),rgba(var(--surface-card),0.68))] p-5 shadow-[0_22px_55px_-45px_rgba(50,35,20,0.6)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Descrição</p>
              <p className="mt-4 line-clamp-6 whitespace-pre-line text-sm leading-7 text-[rgb(var(--text-secondary))]">{synopsis}</p>
            </section>}

          {experience === "podcast" && <section className="space-y-4 rounded-[22px] border border-[rgba(83,61,42,0.13)] bg-[linear-gradient(145deg,rgba(var(--surface-card),0.92),rgba(var(--surface-card),0.68))] p-5 shadow-[0_22px_55px_-45px_rgba(50,35,20,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Audiobook</p>
                <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{hasAudio ? "Pronto para ouvir" : "Audio indisponível"}</p>
              </div>
              {hasAudio && (
                <button
                  type="button"
                  onClick={handlePlaybackToggle}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-accent-primary))] text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.35)] transition hover:bg-[rgb(var(--color-accent-dark))]"
                >
                  {displayIsPlaying ? "⏸" : "▶"}
                </button>
              )}
            </div>
            {hasAudio ? (
              <>
                <input
                  type="range"
                  min="0"
                  max={displayDuration || 0}
                  value={displayProgress}
                  onChange={handleSeek}
                  disabled={!isCurrentTrack}
                  className="w-full accent-[rgb(var(--color-accent-primary))] disabled:opacity-60"
                />
                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
                  <span>{formatTime(displayProgress)}</span>
                  <span>{formatTime(displayDuration)}</span>
                </div>
                {playlistTrack && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleQueueInGlobalPlayer}
                      className="inline-flex items-center gap-2 rounded-full border border-dashed border-[rgba(255,255,255,0.2)] px-4 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:bg-white/10"
                    >
                      Adicionar à fila atual
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Cadastre um link de áudio para liberar o player personalizado desta obra.
              </p>
            )}
          </section>}
          </div>

          {experience === "cinematic" && (
            <section id="narrativa" className="scroll-mt-24 rounded-[22px] border border-[rgba(var(--color-accent-primary),0.18)] bg-[linear-gradient(135deg,rgba(34,28,43,0.96),rgba(72,51,42,0.92))] p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-white/55">Memória Cinematográfica</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{book.titulo_cinematico || narrative?.titulo || "Memória Cinematográfica"}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">{book.descricao_cinematica || narrative?.descricao || "Uma jornada narrada como lembrança — por alguém que esteve lá."}</p>
            </section>
          )}

          {experience === "cinematic" && narrative && narrativeTracks.length > 0 && (
            <section className="overflow-hidden rounded-[28px] border border-[rgba(var(--color-accent-primary),0.2)] bg-[linear-gradient(145deg,rgba(var(--surface-card),0.94),rgba(var(--surface-card),0.72))] shadow-[0_24px_60px_-48px_rgba(24,16,45,0.8)]">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(var(--color-accent-primary),0.12)] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(var(--color-accent-primary),0.12)] text-[rgb(var(--color-accent-dark))]">
                    <Film className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Narrativa cinematográfica</p>
                    <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--text-primary))]">{narrative.titulo}</h2>
                    {narrative.descricao && <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{narrative.descricao}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayNarrative(0)}
                  disabled={narrativeStarting}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))] disabled:cursor-wait disabled:opacity-60"
                >
                  <ListMusic className="h-4 w-4" aria-hidden="true" />
                  {narrativeStarting ? "Carregando cenas..." : "Ouvir do início"}
                </button>
              </header>

              <ol className="grid p-2 lg:grid-cols-2">
                {narrativeTracks.map((track, index) => {
                  const playerId = `narrative-${track.id}`;
                  const active = currentTrack?.id === playerId;
                  const playing = active && playerIsPlaying;
                  return (
                    <li key={track.id} className="border-b border-[rgba(var(--color-accent-primary),0.1)] lg:odd:border-r">
                      <button
                        type="button"
                        onClick={() => handlePlayNarrative(index)}
                        disabled={narrativeStarting}
                        className={`flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? "bg-[rgba(var(--color-accent-primary),0.12)]"
                            : "hover:bg-[rgba(var(--color-accent-primary),0.06)]"
                        }`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${active ? "border-[rgb(var(--color-accent-primary))] bg-[rgb(var(--color-accent-primary))] text-white" : "border-[rgba(var(--color-accent-primary),0.22)] text-[rgb(var(--color-accent-dark))]"}`}>
                          {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Cena {index + 1}</span>
                          <span className="mt-0.5 block truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{track.titulo}</span>
                          {track.descricao && <span className="mt-0.5 block line-clamp-1 text-xs text-[rgb(var(--text-secondary))]">{track.descricao}</span>}
                        </span>
                        {track.duracao_segundos ? (
                          <span className="shrink-0 text-xs font-medium text-[rgb(var(--text-subtle))]">{formatTime(track.duracao_segundos)}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {narrativeError && <p className="px-5 pb-4 text-sm text-red-600">{narrativeError}</p>}
            </section>
          )}
        </main>
      </div>
    );
  };

  const renderMeta = () => {
    if (!book) return null;
    return (
      <section className="grid overflow-hidden rounded-[22px] border border-[rgba(83,61,42,0.13)] bg-[linear-gradient(145deg,rgba(var(--surface-card),0.9),rgba(var(--surface-card),0.64))] shadow-[0_22px_55px_-48px_rgba(50,35,20,0.65)] sm:grid-cols-3">
        <div className="p-4 sm:border-r sm:border-[rgba(83,61,42,0.1)]">
          <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Status</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold capitalize text-[rgb(var(--text-primary))]"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{book.status ?? "indisponível"}</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">Disponibilidade editorial.</p>
        </div>
        <div className="border-t border-[rgba(83,61,42,0.1)] p-4 sm:border-r sm:border-t-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Lançamento</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {book.data_lancamento ? new Date(book.data_lancamento).toLocaleDateString("pt-BR") : "Não informado"}
          </p>
          <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">Data da primeira edição.</p>
        </div>
        <div className="border-t border-[rgba(83,61,42,0.1)] p-4 sm:border-t-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Coleção</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--text-primary))]">{collection ?? "Livre"}</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">Curadoria Essência.</p>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
        >
          ← Voltar
        </button>
        <Link
          to="/biblioteca"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
        >
          Biblioteca
        </Link>
      </div>

      {renderHero()}
      {book && <BookReviews bookId={book.id} />}
    </div>
  );
}
