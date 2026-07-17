import React, { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

function readAccentRgb() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--color-accent-primary");
  const [r, g, b] = raw.trim().split(/\s+/).map(Number);
  return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? `${r}, ${g}, ${b}` : "212, 166, 87";
}

// Poeira dourada flutuando lentamente atrás da interface do player.
export default function GoldenParticles() {
  const canvasRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const accentRgb = readAccentRgb();
    const count = window.innerWidth < 768 ? 22 : 38;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 2.5 + 1.5,
      speed: Math.random() * 0.00035 + 0.00008,
      opacity: Math.random() * 0.4 + 0.45,
    }));

    let animationFrame = 0;
    let paused = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      if (paused) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.y -= particle.speed;
        if (particle.y < -0.05) {
          particle.y = 1.05;
          particle.x = Math.random();
        }

        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${accentRgb}, ${particle.opacity})`;
        context.shadowBlur = 14;
        context.shadowColor = `rgba(${accentRgb}, 0.9)`;
        context.fill();
      }

      animationFrame = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      paused = document.hidden;
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return <canvas ref={canvasRef} className="golden-particles" aria-hidden="true" />;
}
