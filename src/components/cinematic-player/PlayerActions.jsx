import React from "react";
import { Play, Pause } from "lucide-react";
import { DEFAULT_COVER_PLACEHOLDER } from "../../utils/covers.js";

export function PlayerActions({ tracks, currentIndex, isPlaying, onSelectTrack }) {
  if (!tracks?.length || tracks.length <= 1) return null;

  return (
    <div className="player-queue">
      <p>Na fila Â· {tracks.length}</p>
      <div>
        {tracks.map((track, index) => {
          const active = index === currentIndex;
          return (
            <button key={track.id} type="button" onClick={() => onSelectTrack(track.id)} className={active ? "is-active" : ""}>
              <img src={track.cover ?? DEFAULT_COVER_PLACEHOLDER} alt="" />
              <span>
                <strong>{track.title}</strong>
                <small>{track.author}</small>
              </span>
              {active && (isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

