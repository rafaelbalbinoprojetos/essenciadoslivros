import React from "react";

export function NoiseLayer({ opacity = 0.08 }) {
  return <div className="cinematic-noise-layer" style={{ opacity }} aria-hidden="true" />;
}

