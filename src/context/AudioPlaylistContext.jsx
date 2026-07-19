import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildAudioSource } from "../utils/media.js";
import { createSignedUrl, BUCKETS } from "../lib/storage.js";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const AudioPlaylistContext = createContext(null);

// Vinheta de abertura tocada antes de cada título (pré-rolagem).
const INTRO_PATH = "INTRO.mp3";

function normalizeTracks(tracks = []) {
  const occurrences = new Map();
  const normalized = [];

  tracks.forEach((track, index) => {
    if (!track) return;
    const rawSource = track.source ?? track.audio_url ?? track.audioUrl ?? "";
    const source = buildAudioSource(rawSource);
    if (!source) return;

    const baseId = track.id ?? track.bookId ?? track.detailsId ?? `track-${index}`;
    const count = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, count + 1);
    const uniqueId = count ? `${baseId}#${count}` : baseId;

    normalized.push({
      id: uniqueId,
      bookId: track.bookId ?? track.detailsId ?? track.id ?? null,
      slug: track.slug ?? null,
      sceneId: track.sceneId ?? null,
      title: track.title ?? "Audiobook Essência",
      author: track.author ?? track.subtitle ?? "Conteúdo Essência",
      cover: track.cover ?? null,
      heroImage:
        track.heroImage
        ?? track.player_hero_url
        ?? track.capa_cinematica_url
        ?? track.capa_url
        ?? track.cover
        ?? null,
      themeId: track.themeId ?? track.cinematic_theme_id ?? track.cinematicThemeId ?? null,
      collectionTitle: track.collectionTitle ?? track.collection_title ?? null,
      sceneTitle: track.sceneTitle ?? track.scene_title ?? null,
      sceneSubtitle: track.sceneSubtitle ?? track.scene_subtitle ?? null,
      sceneQuote: track.sceneQuote ?? track.scene_quote ?? null,
      quoteAuthor: track.quoteAuthor ?? track.quote_author ?? null,
      source,
      skipIntro: Boolean(track.skipIntro),
      skipProgress: Boolean(track.skipProgress),
      description: track.description ?? null,
      quote: track.quote ?? null,
      narrator: track.narrator ?? null,
      soundtrack: track.soundtrack ?? null,
      collection: track.collection ?? null,
      totalDurationSeconds: track.totalDurationSeconds ?? null,
    });
  });

  return normalized;
}

export function AudioPlaylistProvider({ children }) {
  const audioRef = useRef(null);
  const autoplayRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const pendingSeekRef = useRef(null);
  const lastPersistedRef = useRef({ trackId: null, seconds: 0, timestamp: 0 });
  const saveTimeoutRef = useRef(null);
  const introUrlRef = useRef({ url: "", at: 0 });
  const playingIntroRef = useRef(false);
  const realSourceRef = useRef(null);
  const loadingRef = useRef(false);
  const rateRef = useRef(1);
  const repeatRef = useRef(false);
  const { user } = useAuth();
  const [audioElement, setAudioElement] = useState(null);

  // Resolve (e cacheia por ~50min) o link assinado da vinheta.
  const getIntroUrl = useCallback(async () => {
    const cached = introUrlRef.current;
    const now = Date.now();
    if (cached.url && now - cached.at < 50 * 60 * 1000) {
      return cached.url;
    }
    try {
      const url = await createSignedUrl(BUCKETS.audios, INTRO_PATH, 3600);
      if (url) {
        introUrlRef.current = { url, at: now };
        return url;
      }
    } catch (err) {
      console.error("[AudioPlaylist] falha ao assinar a vinheta:", err);
    }
    return null;
  }, []);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeat, setRepeat] = useState(false);

  const setRate = useCallback((rate) => {
    const value = Number(rate) || 1;
    rateRef.current = value;
    setPlaybackRateState(value);
    const node = audioRef.current;
    if (node && !playingIntroRef.current) node.playbackRate = value;
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      repeatRef.current = !prev;
      return !prev;
    });
  }, []);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const hasNext = currentIndex >= 0 && currentIndex + 1 < tracks.length;
  const hasPrevious = currentIndex > 0;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return undefined;

    const handleLoaded = () => {
      setDuration(node.duration || 0);
      // Durante a vinheta não aplicamos o ponto de retomada do livro.
      if (!playingIntroRef.current && pendingSeekRef.current && node.duration) {
        const resumeAt = Math.max(0, Math.min(pendingSeekRef.current, node.duration - 0.5));
        node.currentTime = resumeAt;
        setProgress(resumeAt);
        pendingSeekRef.current = null;
      }
    };
    const handleTime = () => setProgress(node.currentTime || 0);
    const handleEnded = () => {
      // Fim da vinheta → emenda no conteúdo real (sem avançar a fila).
      if (playingIntroRef.current) {
        playingIntroRef.current = false;
        const real = realSourceRef.current;
        realSourceRef.current = null;
        if (real) {
          node.src = real;
          node.currentTime = 0;
          node.playbackRate = rateRef.current;
          setProgress(0);
          setDuration(0);
          const playPromise = node.play();
          if (playPromise?.catch) {
            playPromise.catch(() => setIsPlaying(false));
          }
        }
        return;
      }
      // Repetir a faixa atual.
      if (repeatRef.current) {
        node.currentTime = 0;
        setProgress(0);
        const playPromise = node.play();
        if (playPromise?.catch) {
          playPromise.catch(() => setIsPlaying(false));
        }
        return;
      }
      const activeIndex = currentIndexRef.current;
      const nextIndex = activeIndex + 1;
      if (activeIndex >= 0 && nextIndex < tracks.length) {
        // Ignora o evento pause disparado pelo navegador durante a troca de src.
        loadingRef.current = true;
        autoplayRef.current = true;
        currentIndexRef.current = nextIndex;
        setProgress(0);
        setDuration(0);
        setIsPlaying(true);
        setCurrentIndex(nextIndex);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const handlePlay = () => {
      loadingRef.current = false;
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (loadingRef.current) return;
      setIsPlaying(false);
    };

    node.addEventListener("loadedmetadata", handleLoaded);
    node.addEventListener("timeupdate", handleTime);
    node.addEventListener("ended", handleEnded);
    node.addEventListener("play", handlePlay);
    node.addEventListener("pause", handlePause);

    return () => {
      node.removeEventListener("loadedmetadata", handleLoaded);
      node.removeEventListener("timeupdate", handleTime);
      node.removeEventListener("ended", handleEnded);
      node.removeEventListener("play", handlePlay);
      node.removeEventListener("pause", handlePause);
    };
  }, [tracks.length]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return undefined;

    if (!currentTrack?.source) {
      node.pause();
      node.removeAttribute("src");
      playingIntroRef.current = false;
      realSourceRef.current = null;
      setProgress(0);
      setDuration(0);
      return undefined;
    }

    let cancelled = false;
    const shouldPlay = autoplayRef.current || isPlaying;
    autoplayRef.current = false;
    loadingRef.current = true; // evita que o efeito de play/pause brigue durante a resolução

    (async () => {
      const introUrl = currentTrack.skipIntro ? null : await getIntroUrl();
      if (cancelled) return;
      setProgress(0);
      setDuration(0);
      if (introUrl) {
        // Pré-rolagem: toca a vinheta (sempre 1x) e guarda o conteúdo real.
        playingIntroRef.current = true;
        realSourceRef.current = currentTrack.source;
        node.src = introUrl;
        node.playbackRate = 1;
      } else {
        playingIntroRef.current = false;
        realSourceRef.current = null;
        node.src = currentTrack.source;
        node.playbackRate = rateRef.current;
      }
      node.currentTime = 0;
      node.loop = false;
      if (shouldPlay) {
        const playPromise = node.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            loadingRef.current = false;
            setIsPlaying(false);
          });
        }
      } else {
        loadingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.source, currentTrack?.skipIntro, getIntroUrl]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node || !currentTrack?.source) return;
    if (loadingRef.current) return; // enquanto carrega/assina, o efeito de carga cuida do play
    if (isPlaying) {
      const playPromise = node.play();
      if (playPromise?.catch) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      node.pause();
    }
  }, [isPlaying, currentTrack?.source]);

  const clearQueue = useCallback(() => {
    const node = audioRef.current;
    if (node) {
      node.pause();
      node.removeAttribute("src");
    }
    setTracks([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    pendingSeekRef.current = null;
    currentIndexRef.current = -1;
  }, []);

  const startPlaylist = useCallback((inputTracks = [], options = {}) => {
    const normalized = normalizeTracks(inputTracks);
    if (!normalized.length) {
      clearQueue();
      return;
    }

    setTracks(normalized);
    const defaultIndex = 0;
    let nextIndex = defaultIndex;

    if (options.trackId) {
      const foundIndex = normalized.findIndex(
        (track) => track.id === options.trackId || track.bookId === options.trackId,
      );
      if (foundIndex >= 0) {
        nextIndex = foundIndex;
      }
    } else if (Number.isFinite(options.startIndex)) {
      nextIndex = Math.min(Math.max(options.startIndex, 0), normalized.length - 1);
    }

    const shouldAutoplay = options.autoplay ?? true;
    autoplayRef.current = shouldAutoplay;
    setCurrentIndex(nextIndex);
    setIsPlaying(shouldAutoplay);
  }, [clearQueue]);

  const togglePlay = useCallback(() => {
    if (!currentTrack?.source) return;
    setIsPlaying((prev) => !prev);
  }, [currentTrack?.source]);

  const playNext = useCallback(() => {
    if (!hasNext) return;
    autoplayRef.current = true;
    setCurrentIndex((prev) => Math.min(prev + 1, tracks.length - 1));
  }, [hasNext, tracks.length]);

  const playPrevious = useCallback(() => {
    if (!hasPrevious) return;
    autoplayRef.current = true;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [hasPrevious]);

  const seek = useCallback((value) => {
    const node = audioRef.current;
    if (!node || !Number.isFinite(value)) return;
    node.currentTime = value;
    setProgress(value);
  }, []);

  const addToQueue = useCallback(
    (inputTracks = [], options = {}) => {
      const normalized = normalizeTracks(inputTracks);
      if (!normalized.length) return;

      setTracks((prev) => {
        if (!prev.length) {
          const autoplay = options.autoplay ?? true;
          autoplayRef.current = autoplay;
          setCurrentIndex(0);
          setIsPlaying(autoplay);
          return normalized;
        }

        const next = [...prev];
        const insertIndex =
          options.playNext && currentIndexRef.current >= 0
            ? Math.min(currentIndexRef.current + 1, next.length)
            : next.length;
        next.splice(insertIndex, 0, ...normalized);

        if (options.autoplay) {
          autoplayRef.current = true;
          setCurrentIndex(insertIndex);
          setIsPlaying(true);
        }

        return next;
      });
    },
    [],
  );

  const removeTrack = useCallback(
    (trackId) => {
      if (!trackId) return;
      setTracks((prev) => {
        const index = prev.findIndex((track) => track.id === trackId);
        if (index === -1) return prev;
        const next = prev.filter((_, idx) => idx !== index);
        if (!next.length) {
          const node = audioRef.current;
          if (node) {
            node.pause();
            node.removeAttribute("src");
          }
          setCurrentIndex(-1);
          setIsPlaying(false);
          setProgress(0);
          setDuration(0);
          pendingSeekRef.current = null;
          currentIndexRef.current = -1;
          return [];
        }

        if (index < currentIndexRef.current) {
          setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        } else if (index === currentIndexRef.current) {
          const nextIndex = Math.min(index, next.length - 1);
          autoplayRef.current = true;
          setCurrentIndex(nextIndex);
        }

        return next;
      });
    },
    [],
  );

  const moveTrack = useCallback((trackId, direction) => {
    if (!trackId || !direction) return;
    setTracks((prev) => {
      const index = prev.findIndex((track) => track.id === trackId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      if (currentIndexRef.current === index) {
        setCurrentIndex(targetIndex);
      } else if (currentIndexRef.current === targetIndex) {
        setCurrentIndex(index);
      }
      return next;
    });
  }, []);

  const selectTrack = useCallback(
    (trackId) => {
      const index = tracks.findIndex((track) => track.id === trackId);
      if (index === -1) return;
      autoplayRef.current = true;
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks],
  );

  const persistProgress = useCallback(async (payload) => {
    try {
      const { error } = await supabase
        .from("progresso_leitura")
        .upsert(payload, { onConflict: "usuario_id,livro_id,tipo" });
      if (error) {
        console.error("[AudioPlaylist] erro ao salvar progresso:", error);
      }
    } catch (err) {
      console.error("[AudioPlaylist] falha inesperada ao salvar progresso:", err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentTrack?.skipProgress || !user?.id || !currentTrack?.bookId) {
      pendingSeekRef.current = null;
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("progresso_leitura")
          .select("tempo_reproduzido")
          .match({
            usuario_id: user.id,
            livro_id: currentTrack.bookId,
            tipo: "audio",
          })
          .maybeSingle();
        if (!active || error) return;
        if (data?.tempo_reproduzido) {
          pendingSeekRef.current = Number(data.tempo_reproduzido) || 0;
          const node = audioRef.current;
          if (node?.readyState >= 1 && pendingSeekRef.current > 0 && !playingIntroRef.current) {
            const resumeAt = Math.max(0, Math.min(pendingSeekRef.current, node.duration || pendingSeekRef.current));
            node.currentTime = resumeAt;
            setProgress(resumeAt);
            pendingSeekRef.current = null;
          }
        } else {
          pendingSeekRef.current = null;
        }
      } catch (err) {
        console.error("[AudioPlaylist] erro ao recuperar progresso:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentTrack?.bookId, currentTrack?.skipProgress, user?.id]);

  useEffect(() => {
    // Não persistir progresso enquanto a vinheta toca.
    if (playingIntroRef.current) return;
    if (currentTrack?.skipProgress || !user?.id || !currentTrack?.bookId || !duration) return;
    if (!Number.isFinite(progress) || progress < 5) return;
    const percent = Math.min(100, (progress / duration) * 100);
    if (!Number.isFinite(percent)) return;

    const last = lastPersistedRef.current;
    const now = Date.now();
    if (
      last.trackId === currentTrack.id &&
      Math.abs(last.seconds - progress) < 5 &&
      now - last.timestamp < 5000
    ) {
      return;
    }

    lastPersistedRef.current = { trackId: currentTrack.id, seconds: progress, timestamp: now };
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistProgress({
        usuario_id: user.id,
        livro_id: currentTrack.bookId,
        tipo: "audio",
        tempo_reproduzido: progress,
        progresso_percentual: percent,
      });
    }, 1000);
  }, [progress, duration, currentTrack?.id, currentTrack?.bookId, currentTrack?.skipProgress, user?.id, persistProgress]);

  const value = useMemo(
    () => ({
      tracks,
      currentTrack,
      currentIndex,
      isPlaying,
      hasNext,
      hasPrevious,
      duration,
      progress,
      playbackRate,
      repeat,
      audioElement,
      startPlaylist,
      playNext,
      playPrevious,
      togglePlay,
      seek,
      setRate,
      toggleRepeat,
      clearQueue,
      addToQueue,
      removeTrack,
      moveTrack,
      selectTrack,
    }),
    [
      tracks,
      currentTrack,
      currentIndex,
      isPlaying,
      hasNext,
      hasPrevious,
      duration,
      progress,
      playbackRate,
      repeat,
      audioElement,
      startPlaylist,
      playNext,
      playPrevious,
      togglePlay,
      seek,
      setRate,
      toggleRepeat,
      clearQueue,
      addToQueue,
      removeTrack,
      moveTrack,
      selectTrack,
    ],
  );

  return (
    <AudioPlaylistContext.Provider value={value}>
      {children}
      {/* Sem crossOrigin: as fontes de áudio (Supabase Storage) não mandam
          Access-Control-Allow-Origin, e com crossOrigin="anonymous" o
          navegador passa a exigir CORS de verdade e recusa carregar o
          áudio — silêncio total. Sem o atributo, a reprodução funciona
          normalmente; só a leitura do AnalyserNode fica "tainted" (sempre
          zero), então --audio-energy nunca reage ao grave — a borda e o
          botão continuam com o respiro/brilho base, só sem a reatividade. */}
      <audio
        ref={(node) => {
          audioRef.current = node;
          setAudioElement((current) => (current === node ? current : node));
        }}
        preload="metadata"
        hidden
      />
    </AudioPlaylistContext.Provider>
  );
}

export function useAudioPlaylist() {
  const context = useContext(AudioPlaylistContext);
  if (!context) {
    throw new Error("useAudioPlaylist deve ser usado dentro de AudioPlaylistProvider");
  }
  return context;
}
