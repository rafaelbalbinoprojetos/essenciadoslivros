import { useMemo } from "react";
import { useReducedMotion } from "./useReducedMotion.js";

export function useDevicePerformance() {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (reducedMotion) return "reduced";
    if (typeof navigator === "undefined") return "balanced";

    const memory = Number(navigator.deviceMemory) || 4;
    const cores = Number(navigator.hardwareConcurrency) || 4;
    const narrow = typeof window !== "undefined" && window.innerWidth < 420;

    if (memory <= 2 || cores <= 2 || narrow) return "reduced";
    if (memory <= 4 || cores <= 4) return "balanced";
    return "full";
  }, [reducedMotion]);
}

