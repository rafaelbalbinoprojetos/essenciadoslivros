import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getExerciseById } from "../services/exercises.js";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1600&q=80";

const LEVEL_BADGES = {
  iniciante: { label: "Iniciante", tone: "bg-emerald-500/10 border border-emerald-400/40 text-emerald-200" },
  intermediario: { label: "Intermediario", tone: "bg-sky-500/10 border border-sky-400/40 text-sky-200" },
  avancado: { label: "Avancado", tone: "bg-orange-500/10 border border-orange-400/40 text-orange-200" },
  pro: { label: "Pro", tone: "bg-fuchsia-500/10 border border-fuchsia-400/40 text-fuchsia-200" },
};

const RISK_BADGES = {
  baixo: { label: "Baixo impacto", tone: "bg-emerald-500/10 border border-emerald-400/40 text-emerald-200" },
  moderado: { label: "Moderado", tone: "bg-amber-500/10 border border-amber-400/40 text-amber-200" },
  alto: { label: "Alto risco", tone: "bg-rose-500/10 border border-rose-400/40 text-rose-200" },
};

function parseExecutionSteps(execucao) {
  if (!execucao) return [];
  return execucao
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeGroup(group) {
  if (!group) return "Grupo livre";
  return group.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ExerciseDetailsPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, exercise: null });

  useEffect(() => {
    let active = true;
    async function loadExercise() {
      setState({ loading: true, error: null, exercise: null });
      try {
        const data = await getExerciseById(exerciseId);
        if (!active) return;
        if (!data) {
          setState({ loading: false, error: "Exercicio nao encontrado.", exercise: null });
          return;
        }
        setState({ loading: false, error: null, exercise: data });
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          error: err?.message ?? "Nao foi possivel carregar os detalhes deste exercicio.",
          exercise: null,
        });
      }
    }
    loadExercise();
    return () => {
      active = false;
    };
  }, [exerciseId]);

  const { loading, error, exercise } = state;
  const steps = useMemo(() => parseExecutionSteps(exercise?.execucao ?? ""), [exercise]);
  const levelTag = exercise?.nivel ? LEVEL_BADGES[exercise.nivel.toLowerCase()] : null;
  const riskTag = exercise?.risco ? RISK_BADGES[exercise.risco.toLowerCase()] : null;

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]"
      >
        Voltar
      </button>

      {loading && (
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-10 text-white shadow-2xl">
          <p className="text-sm font-semibold text-white/70">Carregando dados do exercicio...</p>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-[32px] border border-[#FF8F8F]/30 bg-[#2B0C0C] p-8 text-white">
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-white/80">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/exercicios")}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Voltar para exercicios
            </button>
          </div>
        </section>
      )}

      {exercise && (
        <>
          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0b1f3a] to-[#041229] p-6 text-white shadow-2xl lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.6fr,1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Exercicio oficial</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{exercise.nome}</h1>
                <p className="mt-4 text-lg text-white/80">
                  {exercise.descricao ?? "Sem descricao detalhada ainda."}
                </p>

                <dl className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Grupo muscular</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{normalizeGroup(exercise.grupo)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Equipamento</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">
                      {exercise.equipamento ?? "Livre / custom"}
                    </dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Criado em</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{formatDate(exercise.criado_em)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Atualizado em</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{formatDate(exercise.atualizado_em)}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-3 text-xs">
                  {levelTag ? (
                    <span className={`rounded-full px-4 py-1 font-semibold uppercase tracking-[0.35em] ${levelTag.tone}`}>
                      {levelTag.label}
                    </span>
                  ) : null}
                  {riskTag ? (
                    <span className={`rounded-full px-4 py-1 font-semibold uppercase tracking-[0.35em] ${riskTag.tone}`}>
                      {riskTag.label}
                    </span>
                  ) : null}
                  {exercise.tipo_execucao ? (
                    <span className="rounded-full border border-white/20 px-4 py-1 font-semibold uppercase tracking-[0.35em] text-white/80">
                      {exercise.tipo_execucao.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to={`/treinos/novo?exercicios=${exercise.id}`}
                    className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-6 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/30"
                  >
                    Usar no construtor
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate("/exercicios")}
                    className="inline-flex items-center gap-3 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
                  >
                    Voltar para catalogo
                  </button>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
                <div className="relative h-72 overflow-hidden rounded-[28px] border border-white/10">
                  <img
                    src={exercise.imagem_url || DEFAULT_IMAGE}
                    alt={exercise.nome}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {exercise.video_url ? (
                    <a
                      href={exercise.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute left-4 top-4 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white"
                    >
                      Ver video ↗
                    </a>
                  ) : (
                    <span className="absolute left-4 top-4 rounded-full bg-black/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                      Sem video
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-white">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Ficha tecnica</p>
                  <p className="text-2xl font-semibold">{exercise.nome}</p>
                  <p className="text-sm text-white/70">
                    {exercise.descricao ?? "Cadastre observacoes no Supabase para enriquecer este bloco."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">Execucao guiada</p>
              {steps.length === 0 ? (
                <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">
                  Nenhuma instrução cadastrada ainda. Preencha o campo <code>execucao</code> no Supabase para orientar o aluno.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <li key={`step-${index}`} className="rounded-2xl border border-white/40 bg-white/40 p-4 text-[rgb(var(--text-primary))] dark:border-white/5 dark:bg-white/5">
                      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
                        Passo {index + 1}
                      </span>
                      <p className="mt-2 text-base">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">Metadados</p>
                <dl className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">ID publico</dt>
                    <dd className="mt-2 break-all text-[rgb(var(--text-primary))]">{exercise.id}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">Video</dt>
                    <dd className="mt-2 text-[rgb(var(--text-primary))]">
                      {exercise.video_url ? (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#32C5FF] underline-offset-4 hover:underline"
                        >
                          {exercise.video_url}
                        </a>
                      ) : (
                        "Sem URL cadastrada"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
                    <dt className="text-xs uppercase tracking-[0.35em]">Imagem</dt>
                    <dd className="mt-2 text-[rgb(var(--text-primary))]">
                      {exercise.imagem_url ? (
                        <a
                          href={exercise.imagem_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#67FF9A] underline-offset-4 hover:underline"
                        >
                          {exercise.imagem_url}
                        </a>
                      ) : (
                        "Usando imagem padrao"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
