import React, { useMemo, useRef } from "react";

// Waveform decorativa e clicável (seek por posição).
export default function Waveform({ pct, onSeekFraction }) {
  const bars = useMemo(() => {
    const N = 72;
    return Array.from(
      { length: N },
      (_, i) => 0.18 + Math.abs(Math.sin(i * 0.9) * 0.5 + Math.cos(i * 0.37) * 0.25 + Math.sin(i * 0.15) * 0.15),
    );
  }, []);
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeekFraction?.(frac);
  };

  const safePct = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div ref={containerRef} onClick={handleClick} className="relative flex h-12 cursor-pointer items-center gap-[2px]">
      {bars.map((h, i) => {
        const played = (i + 0.5) / bars.length <= safePct / 100;
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${Math.min(100, h * 100)}%`,
              background: played ? "rgb(var(--color-accent-primary))" : "rgba(var(--color-accent-primary),0.3)",
              boxShadow: played ? "0 0 6px rgba(var(--color-accent-primary),0.7)" : "none",
            }}
          />
        );
      })}
      {/* Indicador de posição — "o momento atual da narrativa" */}
      <span
        className="pointer-events-none absolute top-0 h-full w-[2px] rounded-full bg-[rgb(var(--color-accent-primary))] shadow-[0_0_10px_3px_rgba(var(--color-accent-primary),0.85)] transition-[left]"
        style={{ left: `${safePct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
