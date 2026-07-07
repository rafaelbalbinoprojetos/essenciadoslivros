import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Route as RouteIcon,
  Wallet,
  MessagesSquare,
  Zap,
  Target,
  Crown,
  Rocket,
  Brain,
  Sparkles,
  HeartPulse,
  Leaf,
  Briefcase,
  Users,
  Handshake,
  Lightbulb,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { listJourneys } from "../services/journeys.js";

const JOURNEY_ICONS = {
  wallet: Wallet,
  comunicacao: MessagesSquare,
  performance: Zap,
  disciplina: Target,
  lideranca: Crown,
  empreendedorismo: Rocket,
  ia: Brain,
  filosofia: Lightbulb,
  psicologia: Brain,
  produtividade: Clock,
  criatividade: Sparkles,
  saude: HeartPulse,
  espiritualidade: Leaf,
  carreira: Briefcase,
  relacionamentos: Users,
  vendas: Handshake,
};

const NIVEL_LABEL = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

function formatMinutes(min) {
  const total = Number(min) || 0;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}min` : `${h}h`;
}

function JourneyIcon({ name, className }) {
  const Icon = JOURNEY_ICONS[name] ?? RouteIcon;
  return <Icon className={className} />;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 24 } },
};

export default function JourneysPage() {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listJourneys(user?.id);
        if (active) setJourneys(data);
      } catch (err) {
        console.error("[Journeys] erro:", err);
        if (active) setError(err.message ?? "Não foi possível carregar as jornadas.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const started = useMemo(() => journeys.filter((j) => j.progresso), [journeys]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.75)]">
          Jornadas de aprendizado
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-[rgb(var(--text-primary))]">
          O que você quer aprender hoje?
        </h1>
        <p className="max-w-2xl text-[rgb(var(--text-secondary))]">
          Em vez de escolher um livro, escolha um objetivo. A Essência organiza o caminho —
          resumos, áudios e reflexões na ordem certa pra você evoluir todos os dias.
        </p>
      </header>

      {loading ? (
        <div className="rounded-[28px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.7)] p-10 text-center text-sm text-[rgb(var(--text-secondary))]">
          Carregando jornadas…
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-red-300/40 bg-red-50/70 p-6 text-sm text-red-800">⚠ {error}</div>
      ) : journeys.length === 0 ? (
        <div className="rounded-[28px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.7)] p-10 text-center">
          <RouteIcon className="mx-auto h-10 w-10 text-[color:rgba(var(--color-secondary-primary),0.7)]" />
          <p className="mt-4 font-display text-xl font-semibold text-[rgb(var(--text-primary))]">
            Nenhuma jornada cadastrada ainda
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[rgb(var(--text-secondary))]">
            Crie jornadas no Supabase (tabela <code>jornadas</code>) e vincule livros em{" "}
            <code>jornada_itens</code> para começar a guiar seus leitores.
          </p>
        </div>
      ) : (
        <>
          {started.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-[rgb(var(--text-primary))]">Continue de onde parou</h2>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {started.map((j) => (
                  <JourneyCard key={j.id} journey={j} />
                ))}
              </motion.div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[rgb(var(--text-primary))]">
              {started.length > 0 ? "Todas as jornadas" : "Escolha um objetivo para começar"}
            </h2>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {journeys.map((j) => (
                <JourneyCard key={j.id} journey={j} />
              ))}
            </motion.div>
          </section>
        </>
      )}
    </div>
  );
}

function JourneyCard({ journey }) {
  const progress = journey.progresso;
  const percent = progress ? Math.round(progress.progresso_percent || 0) : 0;
  const started = Boolean(progress);
  const accent = journey.cor || "rgb(var(--color-accent-primary))";

  return (
    <motion.div variants={cardVariants}>
      <Link
        to={`/jornadas/${journey.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.85)] p-6 shadow-[0_30px_70px_-58px_rgba(40,25,10,0.8)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_40px_80px_-50px_rgba(40,25,10,0.7)]"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{ background: accent, boxShadow: `0 16px 30px -16px ${journey.cor || "rgba(186,123,79,0.5)"}` }}
        >
          <JourneyIcon name={journey.icone} className="h-7 w-7" />
        </div>

        <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-[rgb(var(--text-primary))]">
          {journey.nome}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[rgb(var(--text-secondary))]">{journey.descricao}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[rgb(var(--text-subtle))]">
          <span>{journey.total_itens || 0} aulas</span>
          <span aria-hidden="true">·</span>
          <span>{formatMinutes(journey.tempo_total_min)}</span>
          <span aria-hidden="true">·</span>
          <span className="rounded-full bg-[rgba(var(--color-accent-primary),0.12)] px-2 py-0.5 text-[color:rgb(var(--color-accent-dark))]">
            {NIVEL_LABEL[journey.nivel] ?? "Iniciante"}
          </span>
        </div>

        {started && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[rgb(var(--text-subtle))]">
              <span>Progresso</span>
              <span>{percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(var(--color-accent-primary),0.15)]">
              <div
                className="h-full rounded-full bg-[rgb(var(--color-accent-primary))]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">
          {started ? "Continuar" : "Começar jornada"}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
