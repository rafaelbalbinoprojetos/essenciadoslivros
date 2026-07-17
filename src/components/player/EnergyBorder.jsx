import React from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

// Anel dourado que circula a borda do player (rotação + respiro ficam no CSS,
// em .energy-border — só o blur reage ao áudio via --audio-energy).
export default function EnergyBorder() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return <div className="energy-border" aria-hidden="true" />;
}
