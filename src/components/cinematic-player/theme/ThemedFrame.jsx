import React from "react";

export function FrameCorner({ position }) {
  return (
    <svg className={`frame-corner frame-corner--${position}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21V7.5C3 5 5 3 7.5 3H21" />
      <path d="M7 17V9.5C7 8.1 8.1 7 9.5 7H17" />
    </svg>
  );
}

export function ThemedFrame({ variant = "player", className = "", children }) {
  return (
    <div className={`themed-frame themed-frame--${variant} ${className}`}>
      <FrameCorner position="top-left" />
      <FrameCorner position="top-right" />
      <FrameCorner position="bottom-left" />
      <FrameCorner position="bottom-right" />
      <div className="themed-frame__content">{children}</div>
    </div>
  );
}

