import React, { useMemo } from "react";

const MODE_LIMIT = { full: 40, balanced: 24, reduced: 8 };

function particleGlyph(type) {
  if (type === "embers") return "cinematic-particle--ember";
  if (type === "radioactive-dust") return "cinematic-particle--radioactive";
  if (type === "energy-orbs") return "cinematic-particle--orb";
  if (type === "gold-dust") return "cinematic-particle--gold";
  if (type === "spores") return "cinematic-particle--spore";
  return "cinematic-particle--dust";
}

export function ParticleLayer({ theme, active = true, performanceMode = "balanced" }) {
  const amount = Math.min(theme.particles.amount || 0, MODE_LIMIT[performanceMode] ?? MODE_LIMIT.balanced);
  const particles = useMemo(() => Array.from({ length: amount }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 53) % 100}%`,
    delay: `${-(index * 0.37).toFixed(2)}s`,
    duration: `${(8 + (index % 9) * 1.2) / Math.max(theme.particles.speed || 0.25, 0.1)}s`,
    scale: 0.7 + (index % 5) * 0.16,
  })), [amount, theme.particles.speed]);

  if (!active || theme.particles.type === "none" || !particles.length) return null;

  return (
    <div className="cinematic-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`cinematic-particle ${particleGlyph(theme.particles.type)}`}
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            opacity: theme.particles.opacity,
            transform: `scale(${particle.scale})`,
          }}
        />
      ))}
    </div>
  );
}

