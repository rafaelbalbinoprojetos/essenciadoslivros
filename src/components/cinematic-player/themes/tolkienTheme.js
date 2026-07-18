import { baseTheme } from "./baseTheme.js";

export const tolkienTheme = {
  ...baseTheme,
  id: "tolkien",
  name: "Golden Manuscript",
  colors: {
    background: "#130f08",
    surface: "rgba(31, 24, 13, 0.84)",
    primary: "#caa45a",
    secondary: "#6f5a32",
    accent: "#f4dfa8",
    text: "#f6ead0",
    mutedText: "#c4b18c",
    border: "rgba(202, 164, 90, 0.42)",
    glow: "#f0cc78",
    danger: "#d47f54",
  },
  frame: { ...baseTheme.frame, style: "museum", glowIntensity: 0.3 },
  texture: { type: "dark-paper", opacity: 0.2, blendMode: "soft-light" },
  particles: { type: "gold-dust", amount: 24, speed: 0.22, size: 1, opacity: 0.48, reactsToAudio: true },
  energy: { buttonStyle: "arcane", intensity: 0.72, pulseDuration: 4.4, orbitingParticles: true, audioReactive: true },
  waveform: { ...baseTheme.waveform, style: "cinematic", activeColor: "#f0cc78", glowColor: "#f4dfa8" },
};

