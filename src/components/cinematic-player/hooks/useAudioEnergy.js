import { useEffect, useRef, useState } from "react";

const SILENT_ENERGY = { overall: 0, bass: 0, mids: 0, highs: 0, peak: 0 };
const AMBIENT_ENERGY = { overall: 0.18, bass: 0.11, mids: 0.14, highs: 0.08, peak: 0.16 };
const ANALYSER_CACHE = new WeakMap();

function average(values, start, end) {
  let total = 0;
  let count = 0;
  for (let i = start; i < end; i += 1) {
    total += values[i] || 0;
    count += 1;
  }
  return count ? total / count / 255 : 0;
}

function canReadAudioFrequencies(audioElement) {
  const source = audioElement?.currentSrc || audioElement?.src || "";
  if (!source || typeof window === "undefined") return false;
  if (source.startsWith("blob:") || source.startsWith("data:")) return true;

  try {
    const url = new URL(source, window.location.href);
    return url.origin === window.location.origin || Boolean(audioElement.crossOrigin);
  } catch {
    return false;
  }
}

export function useAudioEnergy(audioElement, { active = true, isPlaying = false } = {}) {
  const [snapshot, setSnapshot] = useState(SILENT_ENERGY);
  const energyRef = useRef({ ...SILENT_ENERGY });
  const sourceKey = audioElement?.currentSrc || audioElement?.src || "";

  useEffect(() => {
    if (!audioElement || !active || !isPlaying) {
      energyRef.current = { ...SILENT_ENERGY };
      setSnapshot(SILENT_ENERGY);
      return undefined;
    }

    if (!canReadAudioFrequencies(audioElement)) {
      energyRef.current = { ...AMBIENT_ENERGY };
      setSnapshot(AMBIENT_ENERGY);
      return undefined;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    let frame = 0;
    let cancelled = false;
    let analyserSetup;

    try {
      analyserSetup = ANALYSER_CACHE.get(audioElement);
      if (!analyserSetup) {
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const source = context.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(context.destination);
        analyserSetup = {
          context,
          analyser,
          data: new Uint8Array(analyser.frequencyBinCount),
        };
        ANALYSER_CACHE.set(audioElement, analyserSetup);
      }
    } catch {
      return undefined;
    }

    const tick = () => {
      if (cancelled) return;
      const { analyser, data } = analyserSetup;
      analyser.getByteFrequencyData(data);
      const bassEnd = Math.max(2, Math.floor(data.length * 0.15));
      const midsEnd = Math.max(bassEnd + 1, Math.floor(data.length * 0.55));
      const raw = {
        bass: average(data, 0, bassEnd),
        mids: average(data, bassEnd, midsEnd),
        highs: average(data, midsEnd, data.length),
      };
      raw.overall = Math.min(1, raw.bass * 0.42 + raw.mids * 0.36 + raw.highs * 0.22);
      raw.peak = Math.min(1, Math.max(...data) / 255);

      const previous = energyRef.current;
      energyRef.current = {
        overall: previous.overall * 0.82 + raw.overall * 0.18,
        bass: previous.bass * 0.82 + raw.bass * 0.18,
        mids: previous.mids * 0.82 + raw.mids * 0.18,
        highs: previous.highs * 0.82 + raw.highs * 0.18,
        peak: previous.peak * 0.82 + raw.peak * 0.18,
      };

      setSnapshot(energyRef.current);
      frame = requestAnimationFrame(tick);
    };

    if (analyserSetup.context.state === "suspended") {
      analyserSetup.context.resume().catch(() => {});
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, audioElement, isPlaying, sourceKey]);

  return snapshot;
}
