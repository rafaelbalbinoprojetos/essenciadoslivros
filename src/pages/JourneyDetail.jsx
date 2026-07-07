import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Route as RouteIcon,
  Play,
  BookOpen,
  Check,
  Lock,
  RotateCcw,
  Headphones,
  CircleDot,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getJourney, startJourney, restartJourney, completeItem } from "../services/journeys.js";
import JourneyRewardModal from "../components/JourneyRewardModal.jsx";

const NIVEL_LABEL = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
const TIPO_LABEL = {
  resumo_audio: "Resumo em áudio",
  resumo: "Resumo",
  audiobook: "Audiobook",
  reflexao: "Reflexão",
  quiz: "Quiz",
  mentor_ia: "Mentor IA",
};
const STATUS_LABEL = {
  concluido: "Concluído",
  em_andamento: "Em andamento",
  disponivel: "Disponível",
  bloqueado: "Bloqueado",
};

function formatMinutes(min) {
  const total = Number(min) || 0;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}min` : `${h}h`;
}

export default function JourneyDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState(null);

  const firstName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || "").split(" ")[0];

  const load = useCallback(async () => {
    try {
      const result = await getJourney(slug, user?.id);
      setData(result);
    } catch (err) {
      console.error("[JourneyDetail] erro:", err);
      setError(err.message ?? "Não foi possível carregar a jornada.");
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  const handleStart = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      await startJourney(user?.id, data.journey.id);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    if (!data || busy) return;
    setBusy(true);
    try {
      await restartJourney(user?.id, data.journey.id);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (item) => {
    if (!data || busy) return;
    setBusy(true);
    try {
      const result = await completeItem(user?.id, data.journey, item);
      setReward(result);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const goToCurrent = () => {
    const current = data?.items?.[data.currentIndex] ?? data?.items?.find((i) => i.status !== "concluido");
    if (current?.livro_id) navigate(`/biblioteca/${current.livro_id}`);
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl py-16 text-center text-sm text-[rgb(var(--text-secondary))]">Carregando jornada…</div>;
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-sm text-red-600">⚠ {error ?? "Jornada não encontrada."}</p>
        <Link to="/jornadas" className="mt-4 inline-block text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">
          ← Voltar às jornadas
        </Link>
      </div>
    );
  }

  const { journey, items, userJourney } = data;
  const started = Boolean(userJourney);
  const percent = Math.round(userJourney?.progresso_percent || 0);
  const concluidos = userJourney?.itens_concluidos || 0;
  const finished = userJourney?.status === "concluida";
  const accent = journey.cor || "rgb(var(--color-accent-primary))";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link to="/jornadas" className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]">
        <ArrowLeft className="h-4 w-4" /> Jornadas
      </Link>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[32px] border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgba(var(--surface-card),0.9)] p-7 shadow-[0_40px_90px_-60px_rgba(40,25,10,0.85)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: accent }} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: accent }}>
                <RouteIcon className="h-7 w-7" />
              </span>
              <span className="rounded-full bg-[rgba(var(--color-accent-primary),0.12)] px-3 py-1 text-xs font-semibold text-[color:rgb(var(--color-accent-dark))]">
                {NIVEL_LABEL[journey.nivel] ?? "Iniciante"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[rgb(var(--text-primary))]">{journey.nome}</h1>
            <p className="text-[rgb(var(--text-secondary))]">{journey.descricao}</p>
            {journey.objetivo && (
              <p className="text-sm italic text-[color:rgba(var(--color-secondary-primary),0.9)]">“{journey.objetivo}”</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-medium text-[rgb(var(--text-subtle))]">
              <span>{items.length} aulas</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatMinutes(journey.tempo_total_min)}</span>
              {started && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{concluidos}/{items.length} concluídos</span>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-56">
            {started && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[rgb(var(--text-subtle))]">
                  <span>Progresso</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(var(--color-accent-primary),0.16)]">
                  <div className="h-full rounded-full bg-[rgb(var(--color-accent-primary))]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={started ? goToCurrent : handleStart}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[rgb(var(--color-accent-dark))] disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {finished ? "Revisar jornada" : started ? "Continuar jornada" : "Começar jornada"}
            </button>
            {started && (
              <button
                type="button"
                onClick={handleRestart}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(var(--color-accent-primary),0.3)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--text-secondary))] transition hover:bg-[rgba(var(--color-accent-primary),0.08)] disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" /> Recomeçar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="space-y-1">
        <h2 className="mb-3 font-display text-xl font-semibold text-[rgb(var(--text-primary))]">A trilha</h2>
        <ol className="relative space-y-3">
          {items.map((item, index) => (
            <TimelineItem
              key={item.id}
              item={item}
              index={index}
              isLast={index === items.length - 1}
              onComplete={() => handleComplete(item)}
              busy={busy}
            />
          ))}
          {items.length === 0 && (
            <li className="rounded-2xl border border-dashed border-[rgba(var(--color-accent-primary),0.25)] p-6 text-center text-sm text-[rgb(var(--text-secondary))]">
              Esta jornada ainda não tem itens. Vincule livros em <code>jornada_itens</code>.
            </li>
          )}
        </ol>
      </section>

      <JourneyRewardModal
        open={Boolean(reward)}
        reward={reward}
        userName={firstName}
        onClose={() => setReward(null)}
        onContinue={() => {
          const next = reward?.nextItem;
          setReward(null);
          if (next?.livro_id) navigate(`/biblioteca/${next.livro_id}`);
        }}
      />
    </div>
  );
}

function TimelineItem({ item, index, isLast, onComplete, busy }) {
  const title = item.titulo_customizado || item.livro?.titulo || "Item da jornada";
  const author = item.livro?.autor?.nome ?? "—";
  const isAudio = (item.tipo || "").includes("audio");
  const status = item.status;

  const dot =
    status === "concluido"
      ? "bg-emerald-500 text-white"
      : status === "em_andamento"
      ? "bg-[rgb(var(--color-accent-primary))] text-white"
      : status === "bloqueado"
      ? "bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--text-subtle))]"
      : "bg-[rgba(var(--color-accent-primary),0.2)] text-[color:rgb(var(--color-accent-dark))]";

  const actionLabel =
    status === "concluido" ? "Revisar" : status === "em_andamento" ? "Continuar" : isAudio ? "Ouvir" : "Ler";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative flex gap-4 rounded-[22px] border p-4 transition ${
        status === "em_andamento"
          ? "border-[rgba(var(--color-accent-primary),0.45)] bg-[rgba(var(--color-accent-primary),0.06)]"
          : "border-[rgba(var(--color-accent-primary),0.14)] bg-[rgba(var(--surface-card),0.7)]"
      }`}
    >
      {/* linha + número */}
      <div className="flex flex-col items-center">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold shadow-sm ${dot}`}>
          {status === "concluido" ? <Check className="h-4 w-4" /> : status === "bloqueado" ? <Lock className="h-4 w-4" /> : index + 1}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-[rgba(var(--color-accent-primary),0.2)]" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-[rgb(var(--text-primary))]">{title}</p>
          <p className="truncate text-xs text-[rgb(var(--text-secondary))]">{author}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-[rgb(var(--text-subtle))]">
            <span className="inline-flex items-center gap-1">
              {isAudio ? <Headphones className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
              {TIPO_LABEL[item.tipo] ?? "Resumo"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatMinutes(item.duracao_min)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <CircleDot className="h-3 w-3" /> {STATUS_LABEL[status]}
            </span>
          </p>
        </div>

        <div className="flex flex-none items-center gap-2 pt-1 sm:pt-0">
          {item.livro_id && status !== "bloqueado" && (
            <Link
              to={`/biblioteca/${item.livro_id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-accent-primary))] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))]"
            >
              {isAudio ? <Headphones className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {actionLabel}
            </Link>
          )}
          {status !== "concluido" && status !== "bloqueado" && (
            <button
              type="button"
              onClick={onComplete}
              disabled={busy}
              title="Marcar como concluído"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(var(--color-accent-primary),0.35)] text-[color:rgb(var(--color-accent-dark))] transition hover:bg-[rgba(var(--color-accent-primary),0.1)] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}
