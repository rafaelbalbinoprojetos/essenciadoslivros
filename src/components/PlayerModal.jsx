import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ChevronDown, Heart, Share2, SkipBack, SkipForward, Play, Pause, Repeat, Gauge, Star } from "lucide-react";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getMyReview, upsertReview } from "../services/reviews.js";
import { DEFAULT_COVER_PLACEHOLDER } from "../utils/covers.js";

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

// Waveform decorativa e clicável (seek por posição).
function Waveform({ pct, onSeekFraction }) {
  const bars = useMemo(() => {
    const N = 48;
    return Array.from({ length: N }, (_, i) => 0.28 + Math.abs(Math.sin(i * 0.7) * 0.55 + Math.cos(i * 0.27) * 0.18));
  }, []);
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeekFraction?.(frac);
  };

  return (
    <div ref={containerRef} onClick={handleClick} className="flex h-10 cursor-pointer items-center gap-[3px]">
      {bars.map((h, i) => {
        const played = (i + 0.5) / bars.length <= pct / 100;
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${Math.min(100, h * 100)}%`,
              background: played ? "rgb(var(--color-accent-primary))" : "rgba(var(--color-accent-primary),0.22)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function PlayerModal({ open, onClose }) {
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
  } = useAudioPlaylist();

  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [myNota, setMyNota] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email || "").split("@")[0];
  const bookId = currentTrack?.bookId ?? null;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Carrega a nota do usuário para a obra atual.
  useEffect(() => {
    let active = true;
    setMyNota(0);
    if (!open || !bookId || !user?.id) return undefined;
    getMyReview(user.id, bookId)
      .then((r) => {
        if (active) setMyNota(Number(r?.nota) || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, bookId, user?.id]);

  const handleRate = async (n) => {
    if (!bookId || !user?.id) return;
    setMyNota(n);
    try {
      await upsertReview(user.id, bookId, { nota: n, usuarioNome: displayName });
      toast.success("Avaliação salva!");
    } catch (err) {
      console.error("[PlayerModal] avaliar:", err);
      toast.error("Não foi possível salvar a nota.");
    }
  };

  useEffect(() => {
    if (!open) setSpeedOpen(false);
  }, [open]);

  const coverSrc = currentTrack?.cover ?? DEFAULT_COVER_PLACEHOLDER;
  const safeProgress = Math.min(progress, duration || progress || 0);
  const pct = duration ? (safeProgress / duration) * 100 : 0;

  const handleShare = async () => {
    if (!currentTrack) return;
    const text = `${currentTrack.title} — ${currentTrack.author} · Essência dos Livros`;
    try {
      if (navigator.share) await navigator.share({ title: currentTrack.title, text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch {
      /* cancelado pelo usuário */
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && currentTrack && (
        <Motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 text-[rgb(var(--text-primary))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Player de áudio"
        >
          <button type="button" aria-label="Fechar player" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm" />

          <Motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-[rgba(var(--color-accent-primary),0.18)] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* fundo: capa desfocada + véu na cor do tema */}
            <div className="absolute inset-0 scale-125" style={{ backgroundImage: `url("${coverSrc}")`, backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden="true" />
            <div className="absolute inset-0 bg-[rgba(var(--surface-card),0.9)] backdrop-blur-2xl" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(var(--color-accent-primary),0.06)] to-[rgba(var(--surface-base),0.55)]" aria-hidden="true" />

            <div className="relative flex flex-col px-6 pb-6 pt-5">
              {/* Cabeçalho */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Minimizar"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--color-accent-primary),0.08)] text-[rgb(var(--text-secondary))] transition hover:bg-[rgba(var(--color-accent-primary),0.16)]"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[rgb(var(--text-subtle))]">Tocando agora</p>

                {/* Velocidade */}
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

              {/* Capa com anel de progresso */}
              <div className="relative mx-auto mt-2 w-52">
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
                  key={currentTrack.id}
                  src={coverSrc}
                  alt={currentTrack.title}
                  className="aspect-[3/4] w-full rounded-[16px] object-contain shadow-[0_40px_70px_-25px_rgba(40,25,10,0.55)]"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
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
                <button type="button" onClick={handleShare} aria-label="Compartilhar" className="flex-none text-[rgb(var(--text-subtle))] transition hover:text-[rgb(var(--text-primary))]">
                  <Share2 className="h-5 w-5" />
                </button>
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
              <div className="mt-4">
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
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Na fila · {tracks.length}</p>
                  <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
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
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
