import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFichaById, listFichaTreinos } from "../services/fichas.js";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveMediaUrl } from "../utils/media.js";

const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80";
const SUPER_USER_EMAIL = "balbino10@hotmail.com";
const LEVEL_LABELS = {
  iniciante: "Iniciante",
  intermediario: "Intermediario",
  avancado: "Avancado",
  pro: "Pro",
};

function formatDate(value) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FichaDetailsPage() {
  const { fichaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, ficha: null });
  const [treinoState, setTreinoState] = useState({ loading: true, error: null, items: [] });

  useEffect(() => {
    let active = true;
    async function loadFicha() {
      setState({ loading: true, error: null, ficha: null });
      setTreinoState({ loading: true, error: null, items: [] });
      try {
        const ficha = await getFichaById(fichaId);
        if (!active) return;
        if (!ficha) {
          setState({ loading: false, error: "Ficha nao encontrada.", ficha: null });
          setTreinoState({ loading: false, error: null, items: [] });
          return;
        }
        setState({ loading: false, error: null, ficha });
        try {
          const treinos = await listFichaTreinos(ficha.id);
          if (!active) return;
          setTreinoState({ loading: false, error: null, items: treinos });
        } catch (treinoError) {
          if (!active) return;
          setTreinoState({
            loading: false,
            error: treinoError?.message ?? "Nao foi possivel carregar os treinos vinculados.",
            items: [],
          });
        }
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          error: err?.message ?? "Nao foi possivel carregar os detalhes da ficha.",
          ficha: null,
        });
        setTreinoState({ loading: false, error: null, items: [] });
      }
    }
    loadFicha();
    return () => {
      active = false;
    };
  }, [fichaId]);

  const { loading, error, ficha } = state;
  const { loading: treinosLoading, error: treinosError, items: treinos } = treinoState;
  const isOwner = useMemo(() => {
    if (!user) return false;
    if (user.email && user.email.toLowerCase() === SUPER_USER_EMAIL) {
      return true;
    }
    return Boolean(user?.id && ficha?.usuario_id === user.id);
  }, [user, ficha]);
  const handleEditFicha = () => {
    if (!ficha?.id) return;
    navigate(`/fichas/${ficha.id}/editar`);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]"
        >
          Voltar
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={handleEditFicha}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/80"
          >
            Editar ficha
          </button>
        )}
      </div>

      {loading && (
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-10 text-white shadow-2xl">
          <p className="text-sm font-semibold text-white/70">Carregando ficha...</p>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-[32px] border border-[#FF8F8F]/30 bg-[#2B0C0C] p-8 text-white">
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-white/80">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/fichas")}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Voltar para fichas
            </button>
          </div>
        </section>
      )}

      {ficha && (
        <>
          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-6 text-white shadow-2xl lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  {ficha.visibilidade === "privada" ? "Ficha privada" : "Ficha publica"}
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{ficha.nome}</h1>
                <p className="mt-4 text-lg text-white/80">{ficha.descricao ?? "Ficha sem descricao detalhada ainda."}</p>

                <dl className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Nivel</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{LEVEL_LABELS[ficha.nivel] ?? ficha.nivel ?? "Livre"}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Objetivo</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{ficha.objetivo ?? "Custom"}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Criada em</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{formatDate(ficha.criado_em)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Atualizada em</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{formatDate(ficha.atualizado_em)}</dd>
                  </div>
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40">
                    Usar esta ficha
                  </button>
                  {isOwner ? (
                    <Link
                      to={`/fichas/${ficha.id}/editar`}
                      className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60"
                    >
                      Editar ficha
                    </Link>
                  ) : (
                    <button className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60">
                      Duplicar para minha conta
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
                <img
                  src={resolveMediaUrl(ficha.capa_url || ficha.thumbnail_url) || FALLBACK_THUMBNAIL}
                  alt={ficha.nome}
                  className="h-64 w-full rounded-3xl border border-white/10 object-cover"
                />
                <p className="mt-4 text-sm text-white/70">
                  Atualize as midias desta ficha direto no Supabase (campos `thumbnail_url` e `capa_url`) para melhorar a apresentacao no catalogo.
                </p>
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-xs text-white/70">
                  <p className="font-semibold text-white">ID da ficha</p>
                  <p className="mt-1 break-all text-white/80">{ficha.id}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
            <header className="mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Estrutura</p>
              <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Exercicios vinculados</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Dados carregados da tabela <code>ficha_exercicios</code>. Ajuste as ordens e observacoes direto no Supabase para refletir aqui.
              </p>
            </header>
            {isOwner && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-[rgb(var(--text-primary))]">
                  Precisa adicionar ou remover exercicios? Abra o modo de edicao para ajustar essa ficha.
                </p>
                <button
                  type="button"
                  onClick={handleEditFicha}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#0f1f3c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f1f3c] transition hover:border-[#32C5FF] hover:text-[#32C5FF] dark:border-white/50 dark:text-white"
                >
                  Editar exercicios
                </button>
              </div>
            )}

            {treinosLoading ? (
              <div className="rounded-3xl border border-white/20 p-6 text-center text-[rgb(var(--text-secondary))]">
                <p className="text-sm font-semibold">Carregando treinos...</p>
              </div>
            ) : treinosError ? (
              <div className="rounded-3xl border border-[#FF8F8F]/30 bg-[#2B0C0C] p-6 text-white">
                <p className="text-lg font-semibold">Nao foi possivel listar os treinos.</p>
                <p className="mt-2 text-sm text-white/80">{treinosError}</p>
              </div>
            ) : treinos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/40 p-8 text-center text-[rgb(var(--text-secondary))]">
                <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">Nenhum treino estruturado ainda.</p>
                <p className="mt-2 text-sm">
                  Adicione registros na tabela <code>ficha_treinos</code> e vincule exercicios em <code>ficha_exercicios</code> para liberar o passo a passo.
                </p>
              </div>
            ) : (
              treinos.map((treino) => {
                const subdivisaoTitulo =
                  treino.subdivisao_label ?? (treino.subdivisao ? `Treino ${treino.subdivisao}` : null);
                const tituloPrincipal = treino.nome ?? "Treino sem nome";
                const treinoReferencia = subdivisaoTitulo ? `${subdivisaoTitulo} · ${tituloPrincipal}` : tituloPrincipal;
                return (
                  <div key={treino.id} className="mb-8 last:mb-0">
                    <div className="mb-3">
                      {subdivisaoTitulo ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
                          {subdivisaoTitulo}
                        </p>
                      ) : null}
                      <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">{tituloPrincipal}</h3>
                      {treino.descricao ? (
                        <p className="text-sm text-[rgb(var(--text-secondary))]">{treino.descricao}</p>
                      ) : null}
                    </div>
                    {Array.isArray(treino.ficha_exercicios) && treino.ficha_exercicios.length > 0 ? (
                      <FichaExercisesTable exercicios={treino.ficha_exercicios} />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/40 p-6 text-center text-[rgb(var(--text-secondary))] dark:border-slate-800">
                        <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                          Nenhum exercicio vinculado a este treino.
                        </p>
                        <p className="mt-2 text-sm">
                          Inclua registros em <code>ficha_exercicios</code> relacionando-os ao {treinoReferencia}.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FichaExercisesTable({ exercicios = [] }) {
  const items = Array.isArray(exercicios) ? exercicios : [];

  return (
    <div className="overflow-x-auto rounded-[28px] border border-white/20 bg-white/70 shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
      <table className="min-w-full text-sm">
        <thead className="bg-white/80 text-left text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] dark:bg-slate-900/40">
          <tr>
            <th className="px-4 py-3">Exercicio</th>
            <th className="px-4 py-3">Series</th>
            <th className="px-4 py-3">Repeticoes</th>
            <th className="px-4 py-3">Carga</th>
            <th className="px-4 py-3">Descanso</th>
            <th className="px-4 py-3">Observacoes</th>
            <th className="px-4 py-3 text-right">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const exercicioMeta = item.exercicios ?? item.exercicio ?? {};
            return (
              <tr key={item.id} className="border-t border-white/40 text-[rgb(var(--text-primary))] dark:border-slate-800">
                <td className="px-4 py-3">
                  <p className="font-semibold">{exercicioMeta?.nome ?? "Exercicio sem nome"}</p>
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    {exercicioMeta?.grupo ?? "Grupo livre"}
                    {exercicioMeta?.equipamento ? ` - ${exercicioMeta.equipamento}` : ""}
                  </p>
                </td>
              <td className="px-4 py-3">{item.series ?? "—"}</td>
              <td className="px-4 py-3">{item.repeticoes ?? "—"}</td>
              <td className="px-4 py-3">{item.carga ? `${item.carga} kg` : "Ajuste percepcao"}</td>
              <td className="px-4 py-3">{item.descanso_segundos ? `${item.descanso_segundos}s` : "Conforme sentir"}</td>
              <td className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">{item.observacoes ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {exercicioMeta?.video_url ? (
                  <a
                    href={exercicioMeta.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#32C5FF] px-3 py-1 text-xs font-semibold text-[#32C5FF] transition hover:bg-[#32C5FF]/10"
                  >
                    Ver video
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="text-xs text-[rgb(var(--text-secondary))]">Sem video</span>
                )}
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
