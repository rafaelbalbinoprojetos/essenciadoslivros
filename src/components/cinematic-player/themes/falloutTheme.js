import { baseTheme } from "./baseTheme.js";

export const falloutTheme = {
  ...baseTheme,
  id: "fallout",
  name: "Fallout Retro Terminal",
  colors: {
    background: "#050906",
    surface: "rgba(6, 14, 8, 0.84)",
    primary: "#9cd955",
    secondary: "#426d2d",
    accent: "#c1ff72",
    text: "#d8e5cc",
    mutedText: "#8ea481",
    border: "rgba(156, 217, 85, 0.45)",
    glow: "#a7f45f",
    danger: "#f4b36b",
  },
  frame: { ...baseTheme.frame, style: "industrial", glowIntensity: 0.34 },
  texture: { type: "crt", opacity: 0.16, blendMode: "screen" },
  particles: { type: "radioactive-dust", amount: 24, speed: 0.42, size: 1, opacity: 0.55, reactsToAudio: true },
  energy: { buttonStyle: "radioactive", intensity: 0.8, pulseDuration: 3.2, orbitingParticles: true, audioReactive: true },
  waveform: { style: "pipboy", activeColor: "#b5f66c", inactiveColor: "rgba(112, 168, 74, 0.26)", glowColor: "#95e54d", barWidth: 2, gap: 2, sensitivity: 0.8 },
  effects: { ...baseTheme.effects, scanlines: true, scanlineOpacity: 0.15, shimmer: false },
};

