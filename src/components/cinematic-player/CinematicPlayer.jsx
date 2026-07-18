import React from "react";
import { ChevronDown } from "lucide-react";
import { CinematicHero } from "./CinematicHero.jsx";
import { CinematicWaveform } from "./CinematicWaveform.jsx";
import { PlaybackControls } from "./PlaybackControls.jsx";
import { PlayerActions } from "./PlayerActions.jsx";
import { PlayerMetadata } from "./PlayerMetadata.jsx";
import { SceneMetadata } from "./SceneMetadata.jsx";
import { SceneProgress } from "./SceneProgress.jsx";
import { SceneQuote } from "./SceneQuote.jsx";
import { CinematicThemeEngine } from "./theme/CinematicThemeEngine.jsx";
import { ThemedFrame } from "./theme/ThemedFrame.jsx";
import "./cinematic-player.css";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function buildSceneData(work, progress, duration, currentIndex, totalTracks) {
  const safeDuration = Math.max(duration || 0, 0);
  const safeProgress = Math.min(progress || 0, safeDuration || progress || 0);
  return {
    currentScene: Math.max(1, currentIndex + 1),
    totalScenes: Math.max(totalTracks || 1, currentIndex + 1, 1),
    sceneProgress: safeDuration ? (safeProgress / safeDuration) * 100 : 0,
    currentTime: safeProgress,
    duration: safeDuration,
    sceneTitle: work.sceneTitle || "MemÃ³ria em curso",
    sceneSubtitle: work.sceneSubtitle || work.collectionTitle || "ExperiÃªncia cinematogrÃ¡fica",
    sceneQuote: work.sceneQuote || null,
    quoteAuthor: work.quoteAuthor || null,
  };
}

export function CinematicPlayer({
  work,
  audioElement,
  isPlaying,
  progress,
  duration,
  hasNext,
  hasPrevious,
  tracks,
  currentIndex,
  playbackRate,
  repeat,
  speedOpen,
  liked,
  rating,
  ratingHover,
  canRate,
  onClose,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onSelectTrack,
  onSetRate,
  onToggleSpeed,
  onCloseSpeed,
  onToggleRepeat,
  onToggleLike,
  onShare,
  onRate,
  onRatingHover,
}) {
  const scene = buildSceneData(work, progress, duration, currentIndex, tracks.length);

  return (
    <CinematicThemeEngine work={work} themeId={work.themeId} audioElement={audioElement} isPlaying={isPlaying}>
      {({ theme, audioEnergy }) => (
        <div className="cinematic-player__shell">
          <button type="button" aria-label="Minimizar" onClick={onClose} className="cinematic-player__close">
            <ChevronDown className="h-5 w-5" />
          </button>

          <CinematicHero image={work.heroImage} title={work.title} theme={theme} />

          <div className="cinematic-player__content">
            <div className="cinematic-player__eyebrow">{work.collectionTitle || "ESSENCIA DOS LIVROS"}</div>
            <PlayerMetadata
              title={work.title}
              author={work.author}
              liked={liked}
              onToggleLike={onToggleLike}
              onShare={onShare}
              rating={rating}
              ratingHover={ratingHover}
              onRatingHover={onRatingHover}
              onRate={onRate}
              canRate={canRate}
            />

            <SceneProgress currentScene={scene.currentScene} totalScenes={scene.totalScenes} sceneProgress={scene.sceneProgress} />

            <div className="cinematic-player__scene-grid">
              <SceneMetadata
                sceneTitle={scene.sceneTitle}
                sceneSubtitle={scene.sceneSubtitle}
                narrator={work.narrator}
                totalExperienceDuration={work.totalExperienceDuration}
              />
              <SceneQuote quote={scene.sceneQuote} author={scene.quoteAuthor} />
            </div>

            <ThemedFrame variant="player" className="cinematic-player__transport">
              <CinematicWaveform
                progressPercent={scene.sceneProgress}
                audioEnergy={audioEnergy}
                onSeekFraction={(fraction) => duration && onSeek?.(fraction * duration)}
              />
              <div className="cinematic-player__times">
                <span>{formatTime(scene.currentTime)}</span>
                <span>{formatTime(scene.duration)}</span>
              </div>
              <PlaybackControls
                isPlaying={isPlaying}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onPlayPrevious={onPlayPrevious}
                onPlayNext={onPlayNext}
                onTogglePlay={onTogglePlay}
                playbackRate={playbackRate}
                onSetRate={onSetRate}
                speedOpen={speedOpen}
                onToggleSpeed={onToggleSpeed}
                onCloseSpeed={onCloseSpeed}
                repeat={repeat}
                onToggleRepeat={onToggleRepeat}
              />
            </ThemedFrame>

            <PlayerActions tracks={tracks} currentIndex={currentIndex} isPlaying={isPlaying} onSelectTrack={onSelectTrack} />
          </div>
        </div>
      )}
    </CinematicThemeEngine>
  );
}

