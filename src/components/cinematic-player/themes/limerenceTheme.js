import { baseTheme } from "./baseTheme.js";

export const limerenceTheme = {
  ...baseTheme,
  id: "limerence",
  name: "Emotional Violet",
  colors: {
    background: "#130b18",
    surface: "rgba(30, 14, 39, 0.82)",
    primary: "#b174f5",
    secondary: "#d3669d",
    accent: "#ffc5df",
    text: "#f8eafe",
    mutedText: "#c9a8d6",
    border: "rgba(177, 116, 245, 0.34)",
    glow: "#cf8cff",
    danger: "#ff7e9f",
  },
  frame: { ...baseTheme.frame, style: "organic", glowIntensity: 0.34 },
  texture: { type: "linen", opacity: 0.16, blendMode: "soft-light" },
  particles: { type: "energy-orbs", amount: 20, speed: 0.2, size: 1.4, opacity: 0.44, reactsToAudio: true },
  energy: { buttonStyle: "emotional", intensity: 0.7, pulseDuration: 4.8, orbitingParticles: true, audioReactive: true },
  waveform: { style: "organic", activeColor: "#d9a7ff", inactiveColor: "rgba(211, 102, 157, 0.22)", glowColor: "#ffc5df", barWidth: 4, gap: 3, sensitivity: 0.56 },
};

