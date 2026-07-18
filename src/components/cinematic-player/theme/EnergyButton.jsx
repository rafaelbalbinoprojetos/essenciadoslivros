import React, { useMemo } from "react";

export function EnergyButton({ children, isActive, disabled, ariaLabel, onClick }) {
  const orbiters = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`energy-button ${isActive ? "is-active" : ""}`}
    >
      <span className="energy-button__ambient-glow" />
      <span className="energy-button__outer-ring" />
      <span className="energy-button__pulse-ring energy-button__pulse-ring--one" />
      <span className="energy-button__pulse-ring energy-button__pulse-ring--two" />
      <span className="energy-button__orbit">
        {orbiters.map((item) => (
          <i key={item} style={{ "--orbiter-index": item }} />
        ))}
      </span>
      <span className="energy-button__shimmer" />
      <span className="energy-button__core">{children}</span>
    </button>
  );
}

