import { baseTheme } from "./baseTheme.js";

export const godOfWarTheme = {
  ...baseTheme,
  id: "godOfWar",
  name: "Norse Bronze Archive",
  colors: {
    background: "#0d0b09",
    surface: "rgba(19, 15, 12, 0.86)",
    primary: "#b7783d",
    secondary: "#7f9fb1",
    accent: "#f2c879",
    text: "#f4e4c8",
    mutedText: "#b8a78e",
    border: "rgba(183, 120, 61, 0.42)",
    glow: "#e08a3d",
    danger: "#b93a2f",
  },
  frame: { ...baseTheme.frame, style: "ancient", cornerSize: 16, glowIntensity: 0.38 },
  texture: { type: "stone", opacity: 0.24, blendMode: "overlay" },
  particles: { type: "embers", amount: 28, speed: 0.38, size: 1.2, opacity: 0.5, reactsToAudio: true },
  energy: { buttonStyle: "ancestral", intensity: 0.82, pulseDuration: 3.8, orbitingParticles: true, audioReactive: true },
  waveform: { style: "rune", activeColor: "#e5a65b", inactiveColor: "rgba(127, 159, 177, 0.22)", glowColor: "#f2c879", barWidth: 3, gap: 3, sensitivity: 0.72 },
  effects: { ...baseTheme.effects, shimmer: true },
};

