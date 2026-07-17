import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, SkipBack, SkipForward, Play, Pause, Repeat, Gauge, Star } from "lucide-react";
import { useAudioPlaylist } from "../../context/AudioPlaylistContext.jsx";
import { getBookBySlug } from "../../services/books.js";
import { getNarrativeByBook } from "../../services/narratives.js";
import { resolveAudioSource } from "../../utils/media.js";
import { buildSimpleAudioTrack, buildNarrativeTracks } from "../../utils/playlist.js";
import { ensureCoverSrc, DEFAULT_COVER_PLACEHOLDER } from "../../utils/covers.js";
import { useTrackRating } from "../../hooks/useTrackRating.js";
import Waveform from "./Waveform.jsx";
import ShareButton from "./ShareButton.jsx";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatRate(rate) {
  return String(rate).replace(".", ",");
}

export default function CinematicPlayer() {
  const { slug, cenaSegment } = useParams();
  // A rota captura o segmento inteiro ("cena-<id>"); o React Router não
  // resolve prefixo fixo + parâmetro dentro do mesmo segmento de URL.
  const cenaId = cenaSegment?.startsWith("cena-") ? cenaSegment.slice("cena-".length) : cenaSegment ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const backgroundLocation = location.state?.backgroundLocation;

  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    hasNext,
    hasPrevious,
    playNext,
    playPrevious,
    togglePlay,
    seek,
    tracks,
    currentIndex,
    selectTrack,
    playbackRate,
    setRate,
    repeat,
    toggleRepeat,
    startPlaylist,
  } = useAudioPlaylist();

  const [liked, setLiked] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState("");
  const [fallbackBookId, setFallbackBookId] = useState(null);

  const bookId = currentTrack?.bookId ?? null;
  const { myNota, rate: handleRate } = useTrackRating(bookId);

  const isMatchingRoute = currentTrack?.slug === slug && (!cenaId || String(currentTrack?.sceneId) === cenaId);

  // Hidrata a fila quando a URL é acessada diretamente (refresh / link direto),
  // sem passar pela página do livro antes.
  useEffect(() => {
    if (isMatchingRoute) return undefined;
    let active = true;
    setHydrating(true);
    setHydrateError("");
    (async () => {
      try {
        const book = await getBookBySlug(slug);
        if (!active) return;
        setFallbackBookId(book.id);
        const coverSrc = ensureCoverSrc(book.capa_url || book.capa_cinematica_url);

        if (cenaId) {
          const narrativeData = await getNarrativeByBook(book.id);
          const activeNarrative =
            narrativeData?.status === "ativo"
              ? { ...narrativeData, faixas: (narrativeData.faixas ?? []).filter((t) => t.status === "ativo") }
              : null;
          const playable = await buildNarrativeTracks(book, activeNarrative, coverSrc);
          if (!active) return;
          if (!playable.length) throw new Error("Nenhuma cena pôde ser carregada.");
          const startIndex = Math.max(0, playable.findIndex((t) => String(t.sceneId) === cenaId));
          startPlaylist(playable, { startIndex, autoplay: true });
        } else {
          const audioSource = await resolveAudioSource(book.audio_url);
          const track = buildSimpleAudioTrack(book, coverSrc, audioSource);
          if (!active) return;
          if (!track) throw new Error("Áudio indisponível para esta obra.");
          startPlaylist([track], { autoplay: true });
        }
      } catch (err) {
        console.error("[CinematicPlayer] erro ao hidratar player:", err);
        if (active) setHydrateError(err?.message ?? "Não foi possível carregar o player.");
      } finally {
        if (active) setHydrating(false);
      }
    })();
    return () => {
      active = false;
    };
    // Reidrata apenas quando a rota (slug/cena) muda — não a cada tick do player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, cenaId]);

  const handleClose = React.useCallback(() => {
    if (backgroundLocation) {
      navigate(-1);
      return;
    }
    const targetBookId = currentTrack?.bookId ?? fallbackBookId;
    navigate(targetBookId ? `/biblioteca/${targetBookId}` : "/biblioteca");
  }, [backgroundLocation, currentTrack?.bookId, fallbackBookId, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const coverSrc = currentTrack?.cover ?? DEFAULT_COVER_PLACEHOLDER;
  const safeProgress = Math.min(progress, duration || progress || 0);
  const pct = duration ? (safeProgress / duration) * 100 : 0;

  if (hydrating && !currentTrack) {
    return (
      <div className="cinematic-player fixed inset-0 z-[1000] flex items-center justify-center bg-[#050806] text-white">
        <p className="text-sm text-white/60">Carregando player...</p>
      </div>
    );
  }

  if (hydrateError && !currentTrack) {
    return (
      <div className="cinematic-player fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-[#050806] p-6 text-center text-white">
        <p className="text-sm text-white/70">{hydrateError}</p>
        <button
          type="button"
          onClick={() => navigate("/biblioteca")}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Voltar para a biblioteca
        </button>
      </div>
    );
  }

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <Motion.section
        className="cinematic-player fixed inset-0 z-[1000] overflow-y-auto text-[rgb(var(--text-primary))]"
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.6 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        role="dialog"
        aria-modal="true"
        aria-label="Player de áudio"
      >
        <div
          className="absolute inset-0 scale-125"
          style={{ backgroundImage: `url("${coverSrc}")`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[rgba(var(--surface-card),0.92)] backdrop-blur-2xl" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[rgba(var(--color-accent-primary),0.06)] to-[rgba(var(--surface-base),0.55)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-10 pt-6">
          {/* Cabeçalho */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Minimizar"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--color-accent-primary),0.08)] text-[rgb(var(--text-secondary))] transition hover:bg-[rgba(var(--color-accent-primary),0.16)]"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[rgb(var(--text-subtle))]">Tocando agora</p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((v) => !v)}
                aria-label="Velocidade de reprodução"
                className={`flex h-9 min-w-9 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition ${
                  playbackRate !== 1
                    ? "border-[rgb(var(--color-accent-primary))] bg-[rgba(var(--color-accent-primary),0.18)] text-[rgb(var(--color-accent-dark))]"
                    : "border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--color-accent-primary),0.08)] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--color-accent-primary),0.16)]"
                }`}
              >
                <Gauge className="h-3.5 w-3.5" /> {formatRate(playbackRate)}×
              </button>
              <AnimatePresence>
                {speedOpen && (
                  <Motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-11 z-10 w-32 overflow-hidden rounded-2xl border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgb(var(--surface-card))] p-1 shadow-2xl"
                  >
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setRate(s);
                          setSpeedOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                          s === playbackRate
                            ? "bg-[rgba(var(--color-accent-primary),0.18)] font-semibold text-[rgb(var(--color-accent-dark))]"
                            : "text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--color-accent-primary),0.08)]"
                        }`}
                      >
                        {formatRate(s)}×{s === 1 ? " · normal" : ""}
                      </button>
                    ))}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Capa com anel de progresso — layoutId compartilhado com o mini-player */}
          <div className="relative mx-auto mt-6 w-64">
            <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)]" aria-hidden="true">
              <rect x="3" y="3" width="94" height="127" rx="13" fill="none" stroke="rgba(var(--color-accent-primary),0.18)" strokeWidth="2.5" />
              <rect
                x="3"
                y="3"
                width="94"
                height="127"
                rx="13"
                fill="none"
                stroke="rgb(var(--color-accent-primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - pct}
                style={{ transition: "stroke-dashoffset 0.3s linear" }}
              />
            </svg>
            <Motion.img
              layoutId={`artwork-${currentTrack.id}`}
              src={coverSrc}
              alt={currentTrack.title}
              className="aspect-[3/4] w-full rounded-[16px] object-contain shadow-[0_40px_70px_-25px_rgba(40,25,10,0.55)]"
            />
          </div>

          {/* Título + artista com like/share */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              aria-label="Curtir"
              className={`flex-none transition ${liked ? "text-rose-500" : "text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--text-primary))]"}`}
            >
              <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h2 className="truncate font-display text-xl font-semibold leading-tight text-[rgb(var(--text-primary))]">{currentTrack.title}</h2>
              <p className="truncate text-sm text-[rgb(var(--text-secondary))]">{currentTrack.author}</p>
            </div>
            <ShareButton track={currentTrack} className="flex-none text-[rgb(var(--text-subtle))] transition hover:text-[rgb(var(--text-primary))]" />
          </div>

          {/* Avaliação por estrelas */}
          {bookId && (
            <div className="mt-3 flex flex-col items-center">
              <div className="flex items-center gap-1" onMouseLeave={() => setRatingHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (ratingHover || myNota) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setRatingHover(n)}
                      onClick={() => handleRate(n)}
                      aria-label={`Avaliar com ${n} estrela${n > 1 ? "s" : ""}`}
                      className="text-[rgb(var(--color-accent-primary))] transition hover:scale-110"
                    >
                      <Star className="h-6 w-6" fill={filled ? "currentColor" : "none"} strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-[rgb(var(--text-subtle))]">{myNota ? "Sua avaliação" : "Toque para avaliar"}</p>
            </div>
          )}

          {/* Waveform + tempos */}
          <div className="mt-6">
            <Waveform pct={pct} onSeekFraction={(f) => duration && seek(f * duration)} />
            <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-[rgb(var(--text-subtle))]">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controles */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button type="button" onClick={playPrevious} disabled={!hasPrevious} aria-label="Anterior" className="text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))] disabled:opacity-30">
              <SkipBack className="h-6 w-6" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--color-accent-primary))] text-white shadow-[0_18px_40px_-16px_rgba(186,123,79,0.7)] transition hover:scale-105 hover:bg-[rgb(var(--color-accent-dark))] active:scale-95"
            >
              {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7 translate-x-[2px]" fill="currentColor" />}
            </button>
            <button type="button" onClick={playNext} disabled={!hasNext} aria-label="Próxima" className="text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))] disabled:opacity-30">
              <SkipForward className="h-6 w-6" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              aria-label="Repetir"
              className={`transition ${repeat ? "text-[rgb(var(--color-accent-primary))]" : "text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--text-primary))]"}`}
            >
              <Repeat className="h-5 w-5" />
            </button>
          </div>

          {/* Fila */}
          {tracks.length > 1 && (
            <div className="mt-8">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Na fila · {tracks.length}</p>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {tracks.map((track, index) => {
                  const active = index === currentIndex;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectTrack(track.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                        active ? "bg-[rgba(var(--color-accent-primary),0.14)]" : "hover:bg-[rgba(var(--color-accent-primary),0.07)]"
                      }`}
                    >
                      <img src={track.cover ?? DEFAULT_COVER_PLACEHOLDER} alt="" className="h-9 w-7 flex-none rounded-md object-contain" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${active ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-secondary))]"}`}>{track.title}</span>
                        <span className="block truncate text-xs text-[rgb(var(--text-subtle))]">{track.author}</span>
                      </span>
                      {active && (
                        <span className="flex-none text-[rgb(var(--color-accent-primary))]">
                          {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Motion.section>
    </AnimatePresence>
  );
}
