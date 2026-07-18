import React from "react";

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function SceneProgress({ currentScene = 1, totalScenes = 1, sceneProgress = 0 }) {
  const pct = clampPercent(sceneProgress);

  return (
    <div className="scene-progress" aria-label={`Cena ${currentScene} de ${totalScenes}, ${Math.round(pct)}%`}>
      <div className="scene-progress__label">
        <span>CENA {currentScene} DE {Math.max(totalScenes, currentScene)}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="scene-progress__track">
        <span className="scene-progress__bar" style={{ width: `${pct}%` }} />
        <span className="scene-progress__marker" style={{ left: `${pct}%` }}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 1.5 16.5 9 9 16.5 1.5 9 9 1.5Z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

