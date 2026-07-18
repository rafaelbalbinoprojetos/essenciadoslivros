import React from "react";
import { DEFAULT_COVER_PLACEHOLDER } from "../../utils/covers.js";

export function CinematicHero({ image, title, theme }) {
  const src = image || DEFAULT_COVER_PLACEHOLDER;

  return (
    <div className="cinematic-hero">
      <img
        src={src}
        alt={title || ""}
        className="cinematic-hero__image"
        style={{
          filter: `saturate(${theme.hero.saturation}) contrast(${theme.hero.contrast}) brightness(${theme.hero.brightness})`,
        }}
      />
      <div className="cinematic-hero__overlay" />
      <div className="cinematic-hero__vignette" />
      <div className="cinematic-hero__texture" />
      <div className="cinematic-hero__fade" />
    </div>
  );
}

