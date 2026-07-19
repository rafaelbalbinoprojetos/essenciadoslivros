import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MoreHorizontal,
  Heart,
  Bookmark,
  Download,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Repeat,
  Star,
  Mic,
  Clock,
  Music,
} from "lucide-react";
import { useAudioPlaylist } from "../../context/AudioPlaylistContext.jsx";
import { getBookBySlug } from "../../services/books.js";
import { getNarrativeByBook } from "../../services/narratives.js";
import { resolveAudioSource } from "../../utils/media.js";
import { buildSimpleAudioTrack, buildNarrativeTracks } from "../../utils/playlist.js";
import { ensureCoverSrc, DEFAULT_COVER_PLACEHOLDER } from "../../utils/covers.js";
import { useTrackRating } from "../../hooks/useTrackRating.js";
import ShareButton from "./ShareButton.jsx";
import MetadataCard from "./MetadataCard.jsx";
import EnergyBorder from "./EnergyBorder.jsx";
import GoldenParticles from "./GoldenParticles.jsx";
import { CinematicThemeEngine } from "../cinematic-player/theme/CinematicThemeEngine.jsx";
import { CinematicWaveform } from "../cinematic-player/CinematicWaveform.jsx";
import { SceneProgress } from "../cinematic-player/SceneProgress.jsx";
import { EnergyButton } from "../cinematic-player/theme/EnergyButton.jsx";
import "../cinematic-player/cinematic-player.css";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUpItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatRate(rate) {
  return String(rate).replace(".", ",");
}

function formatLongDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
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
    audioElement,
  } = useAudioPlaylist();

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (backgroundLocation?.pathname) {
      const returnTo = `${backgroundLocation.pathname}${backgroundLocation.search || ""}${backgroundLocation.hash || ""}`;
      navigate(returnTo, { replace: true });
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

  const handleSkip = (deltaSeconds) => {
    if (!Number.isFinite(duration) || !duration) return;
    seek(Math.min(Math.max(progress + deltaSeconds, 0), duration));
  };

  const handleDownload = () => {
    toast("Download em breve.");
  };

  const heroSrc = currentTrack?.heroImage || currentTrack?.cover || DEFAULT_COVER_PLACEHOLDER;
  const safeProgress = Math.min(progress, duration || progress || 0);
  const pct = duration ? (safeProgress / duration) * 100 : 0;
  const isCinematic = tracks.length > 1;
  // Progresso da JORNADA (cena atual + fração dentro dela), não do áudio.
  const journeyPct = isCinematic ? Math.min(100, ((currentIndex + pct / 100) / tracks.length) * 100) : pct;

  if (hydrating && !currentTrack) {
    return (
      <div className="cinematic-player cinematic-player-screen fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(var(--cinema-surface))] text-[rgb(var(--cinema-text))]">
        <p className="text-sm text-[rgb(var(--cinema-text-subtle))]">Carregando player...</p>
      </div>
    );
  }

  if (hydrateError && !currentTrack) {
    return (
      <div className="cinematic-player cinematic-player-screen fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-[rgb(var(--cinema-surface))] p-6 text-center text-[rgb(var(--cinema-text))]">
        <p className="text-sm text-[rgb(var(--cinema-text-subtle))]">{hydrateError}</p>
        <button
          type="button"
          onClick={() => navigate("/biblioteca")}
          className="rounded-full border border-[rgba(var(--color-accent-primary),0.3)] px-4 py-2 text-sm font-semibold hover:bg-[rgba(var(--color-accent-primary),0.1)]"
        >
          Voltar para a biblioteca
        </button>
      </div>
    );
  }

  if (!currentTrack) return null;

  const themeWork = {
    title: currentTrack.title,
    author: currentTrack.author,
    collectionTitle: currentTrack.collection || (isCinematic ? "Memoria Cinematografica" : "Essencia dos Livros"),
    sceneTitle: currentTrack.sceneTitle || currentTrack.title,
    sceneSubtitle: currentTrack.description,
    themeId: currentTrack.themeId,
  };

  return (
    <CinematicThemeEngine work={themeWork} themeId={currentTrack.themeId} audioElement={audioElement} isPlaying={isPlaying}>
      {({ audioEnergy }) => (
    <AnimatePresence>
      <Motion.section
        className="cinematic-player cinematic-player-screen fixed inset-0 z-[1000] overflow-y-auto overscroll-y-contain bg-[rgb(var(--cinema-surface))] text-[rgb(var(--cinema-text))] [touch-action:pan-y]"
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.6 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        role="dialog"
        aria-modal="true"
        aria-label="Player de áudio"
      >
        {/* Aura da Obra: borda de energia + poeira dourada + reflexo passando */}
        <EnergyBorder />
        <GoldenParticles />
        <div className="cinematic-shimmer" aria-hidden="true" />

        {/* Fundo: Player Hero, capa cinematográfica ou capa padrão, nessa ordem. */}
        <div className="fixed inset-0 z-0 overflow-hidden bg-[rgb(var(--cinema-surface))]">
          <Motion.img
            src={heroSrc}
            alt={currentTrack.title}
            className="h-full w-full object-cover object-center"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--cinema-surface),0.78)] via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* Cabeçalho interativo sempre acima do conteúdo e do fundo. */}
        <div className="fixed inset-x-0 top-0 z-[40] bg-gradient-to-b from-black/80 via-black/45 to-transparent px-4 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-md items-start justify-between gap-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Voltar"
              className="pointer-events-auto flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/15 bg-black/25 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {isCinematic ? "Memória Cinematográfica" : "Tocando agora"}
              </p>
              <h1 className="mt-1 line-clamp-2 font-display text-lg font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                {currentTrack.title}
              </h1>
              <p className="mt-0.5 max-w-full truncate text-xs text-white/70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {currentTrack.author}
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Mais opções"
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/45"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <Motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-11 z-10 w-40 overflow-hidden rounded-2xl border border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--cinema-glass),0.97)] p-1 text-[rgb(var(--cinema-text))] shadow-2xl backdrop-blur-md"
                  >
                    <button
                      type="button"
                      onClick={toggleRepeat}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-[rgba(var(--color-accent-primary),0.12)]"
                    >
                      <span className="flex items-center gap-2">
                        <Repeat className="h-4 w-4" /> Repetir
                      </span>
                      {repeat && <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-accent-primary))]" />}
                    </button>
                    <div className="my-1 h-px bg-[rgba(var(--color-accent-primary),0.15)]" />
                    <p className="px-3 pb-0.5 pt-1 text-[10px] uppercase tracking-wide text-[rgb(var(--cinema-text-subtle))]">Velocidade</p>
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRate(s)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                          s === playbackRate
                            ? "bg-[rgba(var(--color-accent-primary),0.18)] font-semibold text-[rgb(var(--color-accent-primary))]"
                            : "hover:bg-[rgba(var(--color-accent-primary),0.12)]"
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

          {isCinematic && (
            <div className="mx-auto mt-3 w-full max-w-md px-1">
              <SceneProgress
                currentScene={currentIndex + 1}
                totalScenes={tracks.length}
                sceneProgress={journeyPct}
              />
            </div>
          )}
        </div>

        {/* Conteúdo — entra em cascata, ~100ms entre blocos */}
        <Motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative z-[2] mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[70dvh]"
        >
          {/* Frase em destaque */}
          {currentTrack.quote && (
            <Motion.div variants={fadeUpItem} className="mt-4 flex justify-center">
              <div className="max-w-[85%] rounded-2xl border border-[rgba(var(--color-accent-primary),0.14)] bg-[rgba(var(--color-accent-primary),0.04)] px-5 py-4 text-center">
                <p className="font-display text-lg leading-none text-[rgb(var(--color-accent-primary))]">“</p>
                <p className="-mt-2 font-display text-sm italic leading-relaxed text-[rgb(var(--cinema-text))]">{currentTrack.quote}</p>
              </div>
            </Motion.div>
          )}

          {/* Waveform + tempos */}
          <Motion.div variants={fadeUpItem} className="mt-5">
            <CinematicWaveform progressPercent={pct} audioEnergy={audioEnergy} onSeekFraction={(f) => duration && seek(f * duration)} />
            <div className="mt-1 flex items-center justify-between text-[11px] text-[rgb(var(--cinema-text-subtle))]">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </Motion.div>

          {/* Controles */}
          <Motion.div variants={fadeUpItem} className="mt-4 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => handleSkip(-15)}
              aria-label="Voltar 15 segundos"
              className="relative text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))]"
            >
              <RotateCcw className="h-6 w-6" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-bold">15</span>
            </button>
            <button
              type="button"
              onClick={playPrevious}
              disabled={!hasPrevious}
              aria-label="Cena anterior"
              className="text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))] disabled:opacity-30"
            >
              <SkipBack className="h-6 w-6" fill="currentColor" />
            </button>
            <EnergyButton onClick={togglePlay} isActive={isPlaying} ariaLabel={isPlaying ? "Pausar" : "Reproduzir"}>
              {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7 translate-x-[2px]" fill="currentColor" />}
            </EnergyButton>
            <button
              type="button"
              onClick={playNext}
              disabled={!hasNext}
              aria-label="Próxima cena"
              className="text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))] disabled:opacity-30"
            >
              <SkipForward className="h-6 w-6" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => handleSkip(15)}
              aria-label="Avançar 15 segundos"
              className="relative text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))]"
            >
              <RotateCw className="h-6 w-6" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-bold">15</span>
            </button>
          </Motion.div>

          {/* Narrador / Duração total / Trilha sonora */}
          {(currentTrack.narrator || currentTrack.totalDurationSeconds || currentTrack.soundtrack) && (
            <Motion.div variants={fadeUpItem} className="mt-6 flex items-stretch gap-2">
              {currentTrack.narrator && <MetadataCard icon={Mic} label="Narrador" value={currentTrack.narrator} />}
              {currentTrack.totalDurationSeconds ? (
                <MetadataCard icon={Clock} label="Duração total" value={formatLongDuration(currentTrack.totalDurationSeconds)} />
              ) : null}
              {currentTrack.soundtrack && <MetadataCard icon={Music} label="Trilha sonora" value={currentTrack.soundtrack} />}
            </Motion.div>
          )}

          {/* Curtir / Favoritar / Compartilhar / Download */}
          <Motion.div variants={fadeUpItem} className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              aria-label="Curtir"
              className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                liked ? "text-rose-500" : "text-[rgb(var(--cinema-text-subtle))] hover:text-[rgb(var(--cinema-text))]"
              }`}
            >
              <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
              Curtir
            </button>
            <button
              type="button"
              onClick={() => setFavorited((v) => !v)}
              aria-label="Favoritar"
              className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                favorited ? "text-[rgb(var(--color-accent-primary))]" : "text-[rgb(var(--cinema-text-subtle))] hover:text-[rgb(var(--cinema-text))]"
              }`}
            >
              <Bookmark className="h-5 w-5" fill={favorited ? "currentColor" : "none"} />
              Favoritar
            </button>
            <ShareButton
              track={currentTrack}
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))]"
            />
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Baixar"
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[rgb(var(--cinema-text-subtle))] transition hover:text-[rgb(var(--cinema-text))]"
            >
              <Download className="h-5 w-5" />
              Download
            </button>
          </Motion.div>

          {/* Avaliação por estrelas */}
          {bookId && (
            <div className="mt-4 flex flex-col items-center">
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
              <p className="mt-1 text-[11px] text-[rgb(var(--cinema-text-subtle))]">{myNota ? "Sua avaliação" : "Toque para avaliar"}</p>
            </div>
          )}

          {/* Fila */}
          {tracks.length > 1 && (
            <div className="mt-8">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[rgb(var(--cinema-text-subtle))]">Na fila · {tracks.length}</p>
              <div className="space-y-1 pr-1">
                {tracks.map((track, index) => {
                  const active = index === currentIndex;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectTrack(track.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                        active ? "bg-[rgba(var(--color-accent-primary),0.16)]" : "hover:bg-[rgba(var(--color-accent-primary),0.08)]"
                      }`}
                    >
                      <img src={track.cover ?? DEFAULT_COVER_PLACEHOLDER} alt="" className="h-9 w-7 flex-none rounded-md object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${active ? "text-[rgb(var(--cinema-text))]" : "text-[rgb(var(--cinema-text-subtle))]"}`}>{track.title}</span>
                        <span className="block truncate text-xs text-[rgb(var(--cinema-text-subtle))]">{track.author}</span>
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
        </Motion.div>
      </Motion.section>
    </AnimatePresence>
      )}
    </CinematicThemeEngine>
  );
}
