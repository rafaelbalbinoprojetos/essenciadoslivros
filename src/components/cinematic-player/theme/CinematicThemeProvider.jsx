import React, { useMemo } from "react";
import { getCinematicTheme, inferThemeId } from "../themes/themeRegistry.js";

export function CinematicThemeProvider({ work, themeId, audioEnergy, children }) {
  const selectedThemeId = themeId || inferThemeId(work);
  const theme = getCinematicTheme(selectedThemeId);

  const cssVariables = useMemo(() => ({
    "--cinematic-bg": theme.colors.background,
    "--cinematic-surface": theme.colors.surface,
    "--cinematic-primary": theme.colors.primary,
    "--cinematic-secondary": theme.colors.secondary,
    "--cinematic-accent": theme.colors.accent,
    "--cinematic-text": theme.colors.text,
    "--cinematic-muted": theme.colors.mutedText,
    "--cinematic-border": theme.colors.border,
    "--cinematic-glow": theme.colors.glow,
    "--cinematic-danger": theme.colors.danger || theme.colors.accent,
    "--audio-energy": Number(audioEnergy?.overall || 0).toFixed(3),
    "--audio-bass": Number(audioEnergy?.bass || 0).toFixed(3),
    "--audio-mids": Number(audioEnergy?.mids || 0).toFixed(3),
    "--audio-highs": Number(audioEnergy?.highs || 0).toFixed(3),
    "--audio-peak": Number(audioEnergy?.peak || 0).toFixed(3),
    "--wave-active": theme.waveform.activeColor,
    "--wave-inactive": theme.waveform.inactiveColor,
    "--wave-glow": theme.waveform.glowColor,
    "--theme-texture-opacity": theme.texture.opacity,
    "--theme-texture-blend": theme.texture.blendMode,
    "--hero-overlay-opacity": theme.hero.overlayOpacity,
    "--hero-vignette-opacity": theme.hero.vignetteOpacity,
    "--hero-saturation": theme.hero.saturation,
    "--hero-contrast": theme.hero.contrast,
    "--hero-brightness": theme.hero.brightness,
    "--energy-pulse-duration": `${theme.energy.pulseDuration}s`,
    "--title-family": theme.typography.titleFamily,
    "--body-family": theme.typography.bodyFamily,
    "--title-letter-spacing": theme.typography.titleLetterSpacing,
  }), [audioEnergy, theme]);

  return (
    <section
      className="cinematic-player"
      data-theme={theme.id}
      data-frame={theme.frame.style}
      data-waveform={theme.waveform.style}
      data-energy={theme.energy.buttonStyle}
      style={cssVariables}
    >
      {children(theme)}
    </section>
  );
}

