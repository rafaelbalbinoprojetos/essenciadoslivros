import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Route as RouteIcon, Play, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getActiveJourney, listJourneys } from "../services/journeys.js";

function formatMinutes(min) {
  const total = Number(min) || 0;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}min` : `${h}h`;
}

export default function JourneyHomeSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const act = await getActiveJourney(user?.id);
        if (!alive) return;
        setActive(act);
        if (!act) {
          const all = await listJourneys(user?.id);
          if (alive) setSuggestions(all.slice(0, 4));
        }
      } catch (err) {
        console.error("[JourneyHomeSection] erro:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <section className="h-40 animate-pulse rounded-[28px] border border-[rgba(var(--color-accent-primary),0.14)] bg-[rgba(var(--surface-card),0.6)]" />
    );
  }

  // --- Jornada em andamento ---
  if (active) {
    const { journey, userJourney, currentItem, currentNumber, total, remainingMin } = active;
    const percent = Math.round(userJourney?.progresso_percent || 0);
    const itemTitle = currentItem?.titulo_customizado || currentItem?.livro?.titulo || "Próxima aula";
    const accent = journey.cor || "rgb(var(--color-accent-primary))";

    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[30px] border border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--surface-card),0.92)] p-6 shadow-[0_40px_90px_-60px_rgba(40,25,10,0.8)] backdrop-blur-xl md:p-7"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
        <p className="relative text-xs font-semibold uppercase tracking-[0.32em] text-[color:rgba(var(--color-secondary-primary),0.8)]">
          Continue sua jornada
        </p>
        <div className="relative mt-3 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: accent }}>
              <RouteIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">{journey.nome}</h2>
              <p className="mt-0.5 text-sm text-[rgb(var(--text-secondary))]">
                Aula {currentNumber} de {total} · {percent}% concluído
              </p>
              <p className="mt-2 text-sm font-medium text-[rgb(var(--text-primary))]">Próxima: {itemTitle}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[rgb(var(--text-subtle))]">
                <Clock className="h-3.5 w-3.5" /> Tempo estimado: {formatMinutes(currentItem?.duracao_min || remainingMin)}
              </p>
              <div className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[rgba(var(--color-accent-primary),0.16)]">
                <div className="h-full rounded-full bg-[rgb(var(--color-accent-primary))]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-none flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => currentItem?.livro_id && navigate(`/biblioteca/${currentItem.livro_id}`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[rgb(var(--color-accent-dark))]"
            >
              <Play className="h-4 w-4" /> Continuar agora
            </button>
            <Link
              to={`/jornadas/${journey.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(var(--color-accent-primary),0.3)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--text-secondary))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)]"
            >
              Ver jornada
            </Link>
          </div>
        </div>
      </motion.section>
    );
  }

  // --- Nenhuma jornada iniciada ---
  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-[30px] border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgba(var(--surface-card),0.85)] p-6 shadow-[0_40px_90px_-60px_rgba(40,25,10,0.8)] backdrop-blur-xl md:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:rgba(var(--color-secondary-primary),0.8)]">
        Comece por um objetivo
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">
        Escolha um objetivo para começar
      </h2>
      <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
        Você escolhe o que quer aprender. A Essência monta o caminho.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {suggestions.map((j) => (
          <Link
            key={j.id}
            to={`/jornadas/${j.slug}`}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-base),0.6)] px-4 py-3 transition hover:border-[rgba(var(--color-accent-primary),0.4)] hover:bg-[rgba(var(--color-accent-primary),0.06)]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: j.cor || "rgb(var(--color-accent-primary))" }}>
                <RouteIcon className="h-4 w-4" />
              </span>
              <span className="font-display text-sm font-semibold text-[rgb(var(--text-primary))]">{j.nome}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-[rgb(var(--text-subtle))] transition group-hover:translate-x-1 group-hover:text-[color:rgb(var(--color-accent-dark))]" />
          </Link>
        ))}
      </div>
      <Link to="/jornadas" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">
        Ver todas as jornadas <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
