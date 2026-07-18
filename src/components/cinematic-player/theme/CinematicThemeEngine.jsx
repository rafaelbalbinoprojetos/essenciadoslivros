import React, { useRef } from "react";
import { useAudioEnergy } from "../hooks/useAudioEnergy.js";
import { useDevicePerformance } from "../hooks/useDevicePerformance.js";
import { useIntersectionActivity } from "../hooks/useIntersectionActivity.js";
import { CinematicThemeProvider } from "./CinematicThemeProvider.jsx";
import { GlowLayer } from "./GlowLayer.jsx";
import { NoiseLayer } from "./NoiseLayer.jsx";
import { ParticleLayer } from "./ParticleLayer.jsx";
import { ScanlineLayer } from "./ScanlineLayer.jsx";

export function CinematicThemeEngine({ work, themeId, audioElement, isPlaying, children }) {
  const rootRef = useRef(null);
  const active = useIntersectionActivity(rootRef, true);
  const performanceMode = useDevicePerformance();
  const audioEnergy = useAudioEnergy(audioElement, { active, isPlaying });

  return (
    <div ref={rootRef} className="cinematic-engine-root">
      <CinematicThemeProvider work={work} themeId={themeId} audioEnergy={audioEnergy}>
        {(theme) => (
          <>
            <GlowLayer />
            <ParticleLayer theme={theme} audioEnergy={audioEnergy} active={active} performanceMode={performanceMode} />
            {theme.effects.scanlines && <ScanlineLayer opacity={theme.effects.scanlineOpacity} />}
            {theme.effects.filmGrain && <NoiseLayer opacity={theme.effects.filmGrainOpacity} />}
            {children({ theme, audioEnergy, active, performanceMode })}
          </>
        )}
      </CinematicThemeProvider>
    </div>
  );
}

