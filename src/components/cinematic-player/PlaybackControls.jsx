import React from "react";
import { Gauge, Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react";
import { EnergyButton } from "./theme/EnergyButton.jsx";

function formatRate(rate) {
  return String(rate).replace(".", ",");
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlaybackControls({
  isPlaying,
  hasNext,
  hasPrevious,
  onPlayPrevious,
  onPlayNext,
  onTogglePlay,
  playbackRate,
  onSetRate,
  speedOpen,
  onToggleSpeed,
  onCloseSpeed,
  repeat,
  onToggleRepeat,
}) {
  return (
    <div className="playback-controls">
      <button type="button" onClick={onPlayPrevious} disabled={!hasPrevious} aria-label="Anterior" className="control-button">
        <SkipBack className="h-6 w-6" fill="currentColor" />
      </button>
      <EnergyButton onClick={onTogglePlay} isActive={isPlaying} ariaLabel={isPlaying ? "Pausar" : "Reproduzir"}>
        {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7 translate-x-[2px]" fill="currentColor" />}
      </EnergyButton>
      <button type="button" onClick={onPlayNext} disabled={!hasNext} aria-label="PrÃ³xima" className="control-button">
        <SkipForward className="h-6 w-6" fill="currentColor" />
      </button>
      <button type="button" onClick={onToggleRepeat} aria-label="Repetir" className={`control-button ${repeat ? "is-active" : ""}`}>
        <Repeat className="h-5 w-5" />
      </button>

      <div className="speed-control">
        <button type="button" onClick={onToggleSpeed} aria-label="Velocidade de reproduÃ§Ã£o" className={`speed-control__button ${playbackRate !== 1 ? "is-active" : ""}`}>
          <Gauge className="h-3.5 w-3.5" />
          {formatRate(playbackRate)}x
        </button>
        {speedOpen && (
          <div className="speed-control__menu">
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => {
                  onSetRate(speed);
                  onCloseSpeed?.();
                }}
                className={speed === playbackRate ? "is-active" : ""}
              >
                {formatRate(speed)}x{speed === 1 ? " Â· normal" : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

