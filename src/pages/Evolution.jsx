import React from "react";
import { SAMPLE_PROGRESS } from "../data/fitness.js";

export default function EvolutionPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Minha evolu��o</p>
        <h1 className="mt-3 text-3xl font-semibold">Acompanhe peso, medidas, PRs e fotos num s� lugar.</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Atualize semanalmente para liberar compara��es com IA, proje��es e alertas de plat�.
        </p>
      </section>

      <section className="rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Peso corporal</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">?sltimas 6 semanas</h2>
          </div>
          <button className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-xs font-semibold text-[#32C5FF]">Registrar peso</button>
        </header>
        <div className="mt-6 flex h-52 items-end gap-3 rounded-3xl bg-gradient-to-b from-slate-100 to-white p-5 dark:from-slate-800 dark:to-slate-900">
          {SAMPLE_PROGRESS.weightHistory.map((entry) => (
            <div key={entry.week} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-full bg-gradient-to-t from-[#32C5FF] to-[#67FF9A]"
                style={{ height: `${entry.value * 2}%` }}
              />
              <p className="text-xs font-semibold text-[rgb(var(--text-secondary))]">{entry.week}</p>
              <p className="text-[10px] text-[rgb(var(--text-subtle))]">{entry.value} kg</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Medidas</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Fitas atualizadas</h2>
          </header>
          <ul className="mt-4 space-y-3">
            {SAMPLE_PROGRESS.measures.map((measure) => (
              <li
                key={measure.label}
                className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">{measure.label}</p>
                  <p className="text-xl font-semibold text-[rgb(var(--text-primary))]">{measure.value} cm</p>
                </div>
                <span className="text-xs font-semibold text-[#67FF9A]">
                  {measure.delta > 0 ? "+" : ""}
                  {measure.delta} cm
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">PRs</p>
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Personal records</h2>
            </div>
            <button className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-xs font-semibold text-[#32C5FF]">Registrar PR</button>
          </header>
          <ul className="mt-4 space-y-3">
            {SAMPLE_PROGRESS.prs.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div>
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{pr.name}</p>
                  <p className="text-xs text-[rgb(var(--text-subtle))]">{pr.delta} em rela��o ao �ltimo registro</p>
                </div>
                <span className="text-lg font-semibold text-[rgb(var(--text-primary))]">{pr.value}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Fotos de progresso</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Linha do tempo visual</h2>
          </div>
          <button className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-xs font-semibold text-[#32C5FF]">Enviar nova foto</button>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SAMPLE_PROGRESS.photos.map((photo) => (
            <figure key={photo.id} className="rounded-[28px] border border-white/50 bg-white/80 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
              <img src={photo.url} alt={photo.angle} className="h-64 w-full rounded-2xl object-cover" loading="lazy" />
              <figcaption className="mt-3 text-sm text-[rgb(var(--text-secondary))]">
                <p className="font-semibold text-[rgb(var(--text-primary))]">
                  {photo.angle} ??? {photo.date}
                </p>
                <p className="text-xs text-[rgb(var(--text-subtle))]">{photo.analysis}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
