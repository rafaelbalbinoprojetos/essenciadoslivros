import React, { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

const GOLD_DUST_COLORS = ["231, 195, 112", "214, 166, 74", "244, 216, 145"];

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

    const count = window.innerWidth < 768 ? 48 : 76;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.05 + 0.35,
      speed: Math.random() * 0.00022 + 0.00004,
      drift: (Math.random() - 0.5) * 0.00008,
      opacity: Math.random() * 0.35 + 0.18,
      phase: Math.random() * Math.PI * 2,
      color: GOLD_DUST_COLORS[Math.floor(Math.random() * GOLD_DUST_COLORS.length)],
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

      const now = performance.now() * 0.001;
      for (const particle of particles) {
        particle.y -= particle.speed;
        particle.x += particle.drift;
        if (particle.y < -0.05) {
          particle.y = 1.05;
          particle.x = Math.random();
        }
        if (particle.x < -0.03) particle.x = 1.03;
        if (particle.x > 1.03) particle.x = -0.03;

        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
        const shimmer = 0.72 + Math.sin(now * 0.8 + particle.phase) * 0.28;
        context.fillStyle = `rgba(${particle.color}, ${particle.opacity * shimmer})`;
        context.shadowBlur = particle.radius * 2.5;
        context.shadowColor = `rgba(${particle.color}, 0.35)`;
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
