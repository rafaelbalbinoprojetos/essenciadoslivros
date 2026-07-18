import React from "react";
import { ThemedFrame } from "./theme/ThemedFrame.jsx";

export function SceneMetadata({ sceneTitle, sceneSubtitle, narrator, totalExperienceDuration }) {
  return (
    <ThemedFrame variant="metadata" className="scene-metadata">
      <span>{sceneTitle || "Cena em reproduÃ§Ã£o"}</span>
      {sceneSubtitle && <strong>{sceneSubtitle}</strong>}
      <small>{[narrator, totalExperienceDuration].filter(Boolean).join(" Â· ") || "ExperiÃªncia cinematogrÃ¡fica"}</small>
    </ThemedFrame>
  );
}

