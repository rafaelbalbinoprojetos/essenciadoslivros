import React from "react";

export function ScanlineLayer({ opacity = 0.12 }) {
  return <div className="cinematic-scanlines" style={{ opacity }} aria-hidden="true" />;
}

