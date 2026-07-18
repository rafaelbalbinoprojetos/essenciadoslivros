import React from "react";
import { ThemedFrame } from "./theme/ThemedFrame.jsx";

export function SceneQuote({ quote, author }) {
  if (!quote) return null;

  return (
    <ThemedFrame variant="quote" className="scene-quote">
      <p>{quote}</p>
      {author && <span>{author}</span>}
    </ThemedFrame>
  );
}

