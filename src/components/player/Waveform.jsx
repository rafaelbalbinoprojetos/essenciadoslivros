import React, { useMemo, useRef } from "react";

// Waveform decorativa e clicável (seek por posição).
export default function Waveform({ pct, onSeekFraction }) {
  const bars = useMemo(() => {
    const N = 48;
    return Array.from({ length: N }, (_, i) => 0.28 + Math.abs(Math.sin(i * 0.7) * 0.55 + Math.cos(i * 0.27) * 0.18));
  }, []);
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeekFraction?.(frac);
  };

  return (
    <div ref={containerRef} onClick={handleClick} className="flex h-10 cursor-pointer items-center gap-[3px]">
      {bars.map((h, i) => {
        const played = (i + 0.5) / bars.length <= pct / 100;
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${Math.min(100, h * 100)}%`,
              background: played ? "rgb(var(--color-accent-primary))" : "rgba(var(--color-accent-primary),0.22)",
            }}
          />
        );
      })}
    </div>
  );
}
