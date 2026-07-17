import React from "react";

// Card de metadata do player (Narrador / Duração / Trilha sonora) — vidro
// escuro + borda dourada quase invisível, ícone + rótulo pequeno + valor.
export default function MetadataCard({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--cinema-glass),0.55)] px-3 py-3 text-center backdrop-blur-md">
      <Icon className="mx-auto h-4 w-4 text-[rgb(var(--color-accent-primary))]" aria-hidden="true" />
      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--cinema-text-subtle))]">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-[rgb(var(--cinema-text))]">{value}</p>
    </div>
  );
}
