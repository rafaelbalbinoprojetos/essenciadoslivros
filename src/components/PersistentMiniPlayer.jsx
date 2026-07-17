import React from "react";
import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Pause, Play, X } from "lucide-react";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import { DEFAULT_COVER_PLACEHOLDER } from "../utils/covers.js";

export default function PersistentMiniPlayer() {
  const { currentTrack, isPlaying, togglePlay, clearQueue } = useAudioPlaylist();
  const navigate = useNavigate();
  const location = useLocation();
  const isPlayerRouteActive = useMatch("/obra/:slug/player/*");

  if (!currentTrack || isPlayerRouteActive) return null;

  const handleOpen = () => {
    if (!currentTrack.slug) return;
    const path = `/obra/${currentTrack.slug}/player${currentTrack.sceneId ? `/cena-${currentTrack.sceneId}` : ""}`;
    navigate(path, { state: { backgroundLocation: location } });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-[45] flex justify-center px-3 md:bottom-4">
      <Motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-[rgba(var(--color-accent-primary),0.25)] bg-[rgb(var(--surface-card))]/95 p-2.5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.5)] backdrop-blur"
      >
        <button type="button" onClick={handleOpen} aria-label="Abrir player" className="flex-none overflow-hidden rounded-xl ring-1 ring-black/5">
          <Motion.img
            layoutId={`artwork-${currentTrack.id}`}
            src={currentTrack.cover ?? DEFAULT_COVER_PLACEHOLDER}
            alt={currentTrack.title}
            className="h-12 w-12 object-cover"
          />
        </button>
        <button type="button" onClick={handleOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{currentTrack.title}</p>
          <p className="truncate text-xs text-[rgb(var(--text-subtle))]">{currentTrack.author}</p>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[rgb(var(--color-accent-primary))] text-white transition hover:bg-[rgb(var(--color-accent-dark))]"
        >
          {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={clearQueue}
          aria-label="Fechar player"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[rgb(var(--text-subtle))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)] hover:text-[rgb(var(--text-primary))]"
        >
          <X className="h-4 w-4" />
        </button>
      </Motion.div>
    </div>
  );
}
