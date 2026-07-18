import React, { useMemo, useRef } from "react";

export function CinematicWaveform({ progressPercent = 0, audioEnergy, onSeekFraction }) {
  const containerRef = useRef(null);
  const bars = useMemo(() => {
    const count = 56;
    return Array.from({ length: count }, (_, i) => (
      0.24 + Math.abs(Math.sin(i * 0.68) * 0.5 + Math.cos(i * 0.23) * 0.2)
    ));
  }, []);

  const handleClick = (event) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeekFraction?.(fraction);
  };

  return (
    <div className="cinematic-waveform" ref={containerRef} onClick={handleClick}>
      <div className="cinematic-waveform__energy" style={{ opacity: 0.16 + (audioEnergy?.overall || 0) * 0.42 }} />
      {bars.map((height, index) => {
        const played = ((index + 0.5) / bars.length) * 100 <= progressPercent;
        const pulse = 1 + (audioEnergy?.mids || 0) * 0.26;
        return (
          <span
            key={index}
            className={`cinematic-waveform__bar ${played ? "is-played" : ""}`}
            style={{ height: `${Math.min(100, height * 100 * pulse)}%` }}
          />
        );
      })}
    </div>
  );
}

