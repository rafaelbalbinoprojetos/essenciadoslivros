import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import heritageReferenceFallback from "../image/CAPA_REFERENCIA_HERITAGE.png";
import {
  ENGINE_REFERENCE_TYPES,
  getEngineReferencesByType,
  replaceEngineReference,
  updateEngineReferenceUsage,
} from "../services/engineReferences.js";
import { isAdminUser } from "../utils/admin.js";

const STATUS_CONFIG = {
  loading: {
    label: "em andamento",
    textClass: "text-amber-200",
    dotClass: "border-amber-300 border-t-transparent animate-spin",
  },
  done: {
    label: "concluído",
    textClass: "text-emerald-300",
    dotClass: "border-emerald-400 bg-emerald-400/15 text-emerald-200",
    icon: "✓",
  },
  manual: {
    label: "manual",
    textClass: "text-purple-300",
    dotClass: "border-purple-400 bg-purple-400/10 text-purple-200",
    icon: "•",
  },
  waiting: {
    label: "aguardando",
    textClass: "text-zinc-500",
    dotClass: "border-zinc-700 bg-zinc-900 text-zinc-500",
    icon: "•",
  },
  error: {
    label: "erro",
    textClass: "text-red-300",
    dotClass: "border-red-400 bg-red-400/10 text-red-200",
    icon: "!",
  },
};

function getStepStatus({ active, result, manualWhenIdle = false }) {
  if (active) return "loading";
  if (result?.ok === false) return "error";
  if (result) return "done";
  if (manualWhenIdle) return "manual";
  return "waiting";
}

function EngineProcessStep({ label, status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/70 bg-black/30 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-5 w-5 flex-none place-items-center rounded-full border text-[11px] font-bold ${config.dotClass}`}
          aria-hidden="true"
        >
          {status === "loading" ? "" : config.icon}
        </span>
        <span className="truncate font-medium text-zinc-200">{label}</span>
      </div>
      <span className={`shrink-0 text-xs font-semibold uppercase tracking-[0.18em] ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}

export default function EngineSolicitarObra() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [titulo, setTitulo] = useState("");
  const [tipoObra, setTipoObra] = useState("livro");
  const [engineReferences, setEngineReferences] = useState({});
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referenceUploading, setReferenceUploading] = useState(null);
  const [criandoObra, setCriandoObra] = useState(false);
  const [executandoCurador, setExecutandoCurador] = useState(false);
  const [executandoEditor, setExecutandoEditor] = useState(false);
  const [executandoDiretor, setExecutandoDiretor] = useState(false);
  const [executandoNarrativa, setExecutandoNarrativa] = useState(false);
  const [executandoHeritagePrompt, setExecutandoHeritagePrompt] = useState(false);
  const [executandoCapaPrompt, setExecutandoCapaPrompt] = useState(false);
  const [atualizandoDados, setAtualizandoDados] = useState(false);
  const [resultadoCriacao, setResultadoCriacao] = useState(null);
  const [resultadoCurador, setResultadoCurador] = useState(null);
  const [resultadoEditor, setResultadoEditor] = useState(null);
  const [resultadoDiretor, setResultadoDiretor] = useState(null);
  const [resultadoNarrativa, setResultadoNarrativa] = useState(null);
  const [resultadoHeritagePrompt, setResultadoHeritagePrompt] = useState(null);
  const [resultadoCapaPrompt, setResultadoCapaPrompt] = useState(null);
  const [resultadoAtualizacao, setResultadoAtualizacao] = useState(null);

  const loadEngineReferences = useCallback(async () => {
    setReferencesLoading(true);

    try {
      const references = await getEngineReferencesByType();
      setEngineReferences(references);
    } catch (error) {
      console.error("[ENGINE] erro ao carregar referencias visuais", error);
      toast.error("Nao foi possivel carregar as referencias visuais da Engine.");
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEngineReferences();
  }, [loadEngineReferences]);

  async function handleReferenceUpload(tipo, event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setReferenceUploading(tipo);

    try {
      const nextReference = await replaceEngineReference({
        tipo,
        file,
        userId: user?.id,
        usarComoReferencia: true,
      });

      setEngineReferences((current) => ({
        ...current,
        [tipo]: nextReference,
      }));
      toast.success("Referencia visual atualizada.");
    } catch (error) {
      console.error("[ENGINE] erro ao trocar referencia visual", error);
      toast.error(error.message || "Erro ao trocar referencia visual.");
    } finally {
      setReferenceUploading(null);
    }
  }

  async function handleReferenceUsageChange(tipo, checked) {
    const currentReference = engineReferences[tipo];

    if (!currentReference?.id) return;

    try {
      const nextReference = await updateEngineReferenceUsage(currentReference.id, checked);
      setEngineReferences((current) => ({
        ...current,
        [tipo]: nextReference,
      }));
      toast.success(checked ? "Referencia ativada para criacao." : "Referencia desativada para criacao.");
    } catch (error) {
      console.error("[ENGINE] erro ao atualizar uso da referencia", error);
      toast.error(error.message || "Erro ao atualizar referencia visual.");
    }
  }

  async function executarEtapaManual(tipoEtapa, obraIdParam = null) {
    const obraId = obraIdParam || resultadoCriacao?.livro?.id;

    if (!obraId) {
      toast.error("Nenhuma obra selecionada para executar a etapa.");
      return null;
    }

    const isCurador = tipoEtapa === "curador_beu";
    const isEditor = tipoEtapa === "editor_beu";
    const isDiretor = tipoEtapa === "diretor_criativo";
    const isNarrativa = tipoEtapa === "narrativa_cinematica";
    const isHeritagePrompt = tipoEtapa === "heritage_prompt";
    const isCapaPrompt = tipoEtapa === "capa_cinematica_prompt";

    if (isCurador) setExecutandoCurador(true);
    if (isEditor) setExecutandoEditor(true);
    if (isDiretor) setExecutandoDiretor(true);
    if (isNarrativa) setExecutandoNarrativa(true);
    if (isHeritagePrompt) setExecutandoHeritagePrompt(true);
    if (isCapaPrompt) setExecutandoCapaPrompt(true);

    try {
      console.log("[ENGINE] iniciando executar-etapa", { obraId, tipoEtapa });

      const response = await fetch("/api/engine/executar-etapa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          obraId,
          tipoEtapa,
        }),
      });

      const data = await response.json();
      console.log("[ENGINE] resposta executar-etapa", { tipoEtapa, data });

      if (isCurador) setResultadoCurador(data);
      if (isEditor) setResultadoEditor(data);
      if (isDiretor) setResultadoDiretor(data);
      if (isNarrativa) setResultadoNarrativa(data);
      if (isHeritagePrompt) setResultadoHeritagePrompt(data);
      if (isCapaPrompt) setResultadoCapaPrompt(data);

      if (!response.ok || data?.ok === false) {
        throw new Error(data.error || `Erro ao executar ${tipoEtapa}.`);
      }

      toast.success(`${tipoEtapa} executado com sucesso!`);
      return data;
    } catch (error) {
      console.error("[ENGINE] erro ao executar etapa", { tipoEtapa, error });
      toast.error(error.message);

      const fallback = {
        ok: false,
        etapa: tipoEtapa,
        error: error.message,
      };

      if (isCurador) setResultadoCurador((atual) => atual || fallback);
      if (isEditor) setResultadoEditor((atual) => atual || fallback);
      if (isDiretor) setResultadoDiretor((atual) => atual || fallback);
      if (isNarrativa) setResultadoNarrativa((atual) => atual || fallback);
      if (isHeritagePrompt) setResultadoHeritagePrompt((atual) => atual || fallback);
      if (isCapaPrompt) setResultadoCapaPrompt((atual) => atual || fallback);

      return null;
    } finally {
      if (isCurador) setExecutandoCurador(false);
      if (isEditor) setExecutandoEditor(false);
      if (isDiretor) setExecutandoDiretor(false);
      if (isNarrativa) setExecutandoNarrativa(false);
      if (isHeritagePrompt) setExecutandoHeritagePrompt(false);
      if (isCapaPrompt) setExecutandoCapaPrompt(false);
    }
  }

  async function atualizarDadosAusentes(obraIdParam = null) {
    const obraId = obraIdParam || resultadoCriacao?.livro?.id;

    if (!obraId) {
      toast.error("Nenhuma obra selecionada para atualizar.");
      return null;
    }

    setAtualizandoDados(true);
    setResultadoAtualizacao(null);

    try {
      console.log("[ENGINE] iniciando atualizar-dados-ausentes", obraId);

      const response = await fetch("/api/engine/atualizar-dados-ausentes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ obraId }),
      });

      const data = await response.json();
      console.log("[ENGINE] resposta atualizar-dados-ausentes", data);
      setResultadoAtualizacao(data);

      if (!response.ok || data?.ok === false) {
        throw new Error(data.error || "Erro ao atualizar dados ausentes.");
      }

      toast.success(data.atualizado ? "Dados ausentes atualizados." : "Nenhum dado ausente para atualizar.");
      return data;
    } catch (error) {
      console.error("[ENGINE] erro ao atualizar dados ausentes", error);
      toast.error(error.message);
      setResultadoAtualizacao((atual) => atual || {
        ok: false,
        error: error.message,
      });
      return null;
    } finally {
      setAtualizandoDados(false);
    }
  }

  async function solicitarObra(e) {
    e.preventDefault();
    setCriandoObra(true);
    setExecutandoCurador(false);
    setExecutandoEditor(false);
    setExecutandoDiretor(false);
    setExecutandoNarrativa(false);
    setExecutandoHeritagePrompt(false);
    setExecutandoCapaPrompt(false);
    setAtualizandoDados(false);
    setResultadoCriacao(null);
    setResultadoCurador(null);
    setResultadoEditor(null);
    setResultadoDiretor(null);
    setResultadoNarrativa(null);
    setResultadoHeritagePrompt(null);
    setResultadoCapaPrompt(null);
    setResultadoAtualizacao(null);

    try {
      console.log("[ENGINE] iniciando solicitar-obra");

      const response = await fetch("/api/engine/solicitar-obra", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo,
          tipo_obra: tipoObra,
        }),
      });

      const data = await response.json();
      console.log("[ENGINE] resposta solicitar-obra", data);

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Erro ao solicitar obra.");
      }

      setResultadoCriacao(data);
      toast.success(data.existente ? "Obra já existe no catálogo." : "Obra criada como rascunho!");
      setTitulo("");

      const obraId = data?.livro?.id;

      if (!obraId) {
        throw new Error("Obra criada, mas o id não foi retornado pela API.");
      }

      if (data.existente === true) {
        console.log("[ENGINE] obra existente, pipeline automática não será executada", obraId);
        setCriandoObra(false);
        return;
      }

      setCriandoObra(false);
      const curador = await executarEtapaManual("curador_beu", obraId);
      if (curador?.ok) {
        const editor = await executarEtapaManual("editor_beu", obraId);
        if (editor?.ok) {
          await executarEtapaManual("diretor_criativo", obraId);
        }
      }
    } catch (error) {
      console.error("[ENGINE] erro no fluxo", error);
      toast.error(error.message);
    } finally {
      setCriandoObra(false);
      setExecutandoCurador(false);
      setExecutandoEditor(false);
      setExecutandoDiretor(false);
      setExecutandoNarrativa(false);
      setExecutandoHeritagePrompt(false);
      setExecutandoCapaPrompt(false);
      setAtualizandoDados(false);
    }
  }

  const loading = criandoObra || executandoCurador || executandoEditor || executandoDiretor || executandoNarrativa || executandoHeritagePrompt || executandoCapaPrompt || atualizandoDados;
  const hasRequestedWork = Boolean(
    resultadoCriacao
    || resultadoCurador
    || resultadoEditor
    || resultadoDiretor
    || resultadoNarrativa
    || resultadoHeritagePrompt
    || resultadoCapaPrompt
    || resultadoAtualizacao
    || loading,
  );
  const optionalStepsEnabled = Boolean(resultadoCriacao?.livro?.id);
  const engineProgressSteps = [
    {
      label: "Criando obra",
      status: getStepStatus({ active: criandoObra, result: resultadoCriacao }),
    },
    {
      label: "Executando curador",
      status: getStepStatus({ active: executandoCurador, result: resultadoCurador }),
    },
    {
      label: "Executando editor",
      status: getStepStatus({ active: executandoEditor, result: resultadoEditor }),
    },
    {
      label: "Executando diretor criativo",
      status: getStepStatus({ active: executandoDiretor, result: resultadoDiretor }),
    },
    {
      label: "Gerando narrativa cinematográfica",
      status: getStepStatus({
        active: executandoNarrativa,
        result: resultadoNarrativa,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    {
      label: "Gerando prompt Heritage",
      status: getStepStatus({
        active: executandoHeritagePrompt,
        result: resultadoHeritagePrompt,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    {
      label: "Gerando prompt da capa cinematográfica",
      status: getStepStatus({
        active: executandoCapaPrompt,
        result: resultadoCapaPrompt,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    {
      label: "Atualizando dados ausentes",
      status: getStepStatus({ active: atualizandoDados, result: resultadoAtualizacao }),
    },
  ];
  const referenceCards = [
    {
      tipo: ENGINE_REFERENCE_TYPES.heritage,
      title: "Capa referencia Heritage",
      description: "Biblia visual da colecao Heritage Collection.",
      fallbackUrl: heritageReferenceFallback,
      fallbackLabel: "Fallback local: CAPA_REFERENCIA_HERITAGE.png",
    },
    {
      tipo: ENGINE_REFERENCE_TYPES.cinematica,
      title: "Capa referencia Cinematica",
      description: "Referencia visual para capa de apresentacao de audio.",
      fallbackUrl: null,
      fallbackLabel: "Nenhuma referencia cinematica cadastrada.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Essência Engine</h1>
        <p className="text-zinc-400 mb-8">
          Solicite uma nova obra para iniciar a criação da Base Editorial Universal.
        </p>

        <form
          onSubmit={solicitarObra}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"
        >
          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              Título da obra
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Harry Potter e o Cálice de Fogo"
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              Tipo da obra
            </label>
            <select
              value={tipoObra}
              onChange={(e) => setTipoObra(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-amber-400"
            >
              <option value="livro">Livro</option>
              <option value="filme">Filme</option>
              <option value="jogo">Jogo</option>
              <option value="anime">Anime</option>
              <option value="serie">Série</option>
              <option value="dorama">Dorama</option>
              <option value="biografia">Biografia</option>
              <option value="tecnico">Livro técnico</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 text-black font-semibold py-3 hover:bg-amber-400 disabled:opacity-60"
          >
            {criandoObra
              ? "Criando obra..."
              : executandoCurador
                ? "Executando curador..."
                : executandoEditor
                  ? "Executando editor..."
                  : executandoDiretor
                    ? "Executando diretor criativo..."
                    : executandoNarrativa
                      ? "Gerando narrativa cinematográfica..."
                      : executandoHeritagePrompt
                        ? "Gerando prompt Heritage..."
                        : executandoCapaPrompt
                          ? "Gerando prompt da capa cinematográfica..."
                      : atualizandoDados
                        ? "Atualizando dados..."
                        : "Solicitar obra"}
          </button>
        </form>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
                Referencias visuais
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">Capas de referencia da Engine</h2>
            </div>
            {referencesLoading && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                carregando
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {referenceCards.map((card) => {
              const currentReference = engineReferences[card.tipo];
              const imageUrl = currentReference?.public_url || card.fallbackUrl;
              const isUploading = referenceUploading === card.tipo;
              const usesReference = currentReference
                ? Boolean(currentReference.usar_como_referencia)
                : Boolean(card.fallbackUrl);

              return (
                <div key={card.tipo} className="rounded-xl border border-zinc-800 bg-black/35 p-4">
                  <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={card.title}
                        className="aspect-[4/5] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[4/5] place-items-center px-6 text-center text-sm text-zinc-500">
                        Nenhuma imagem cadastrada
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="font-semibold text-zinc-100">{card.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{card.description}</p>
                    <p className="mt-2 truncate text-xs text-zinc-500">
                      {currentReference?.nome || card.fallbackLabel}
                    </p>
                  </div>

                  <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={usesReference}
                      disabled={!currentReference || Boolean(referenceUploading) || referencesLoading}
                      onChange={(event) => handleReferenceUsageChange(card.tipo, event.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-black text-amber-500 focus:ring-amber-500"
                    />
                    Usar como referencia para criar imagem
                  </label>

                  <label className={`mt-4 block w-full rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${
                    isAdmin
                      ? "cursor-pointer border-amber-500/60 text-amber-100 hover:bg-amber-500/10"
                      : "cursor-not-allowed border-zinc-800 text-zinc-500"
                  }`}>
                    {isUploading ? "Enviando..." : "Trocar imagem"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                      disabled={!isAdmin || Boolean(referenceUploading)}
                      onChange={(event) => handleReferenceUpload(card.tipo, event)}
                      className="hidden"
                    />
                  </label>

                  {!isAdmin && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Apenas administradores podem trocar referencias.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {hasRequestedWork && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Pipeline</p>
                <h2 className="mt-1 text-base font-semibold text-white">Acompanhamento da Engine</h2>
              </div>
              {loading ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  processando
                </span>
              ) : (
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  pronto
                </span>
              )}
            </div>

            <div className="grid gap-3">
              {engineProgressSteps.map((step) => (
                <EngineProcessStep key={step.label} label={step.label} status={step.status} />
              ))}
            </div>

            <div className="hidden">
            <div className="flex items-center justify-between">
              <span>Criando obra</span>
              <span className={criandoObra ? "text-amber-300" : "text-emerald-300"}>
                {criandoObra ? "em andamento" : resultadoCriacao ? "concluído" : "aguardando"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Executando curador</span>
              <span className={executandoCurador ? "text-amber-300" : resultadoCurador ? "text-emerald-300" : "text-zinc-500"}>
                {executandoCurador ? "em andamento" : resultadoCurador ? "concluído" : "aguardando"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Executando editor</span>
              <span className={executandoEditor ? "text-amber-300" : resultadoEditor ? "text-emerald-300" : "text-zinc-500"}>
                {executandoEditor ? "em andamento" : resultadoEditor ? "concluído" : "aguardando"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Executando diretor criativo</span>
              <span className={executandoDiretor ? "text-amber-300" : resultadoDiretor ? "text-emerald-300" : "text-zinc-500"}>
                {executandoDiretor ? "em andamento" : resultadoDiretor ? "concluído" : "aguardando"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Gerando narrativa cinematográfica</span>
              <span className={executandoNarrativa ? "text-amber-300" : resultadoNarrativa ? "text-emerald-300" : "text-zinc-500"}>
                {executandoNarrativa ? "em andamento" : resultadoNarrativa ? "concluído" : "manual"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Gerando prompt Heritage</span>
              <span className={executandoHeritagePrompt ? "text-amber-300" : resultadoHeritagePrompt ? "text-emerald-300" : "text-zinc-500"}>
                {executandoHeritagePrompt ? "em andamento" : resultadoHeritagePrompt ? "concluído" : "manual"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Gerando prompt da capa cinematográfica</span>
              <span className={executandoCapaPrompt ? "text-amber-300" : resultadoCapaPrompt ? "text-emerald-300" : "text-zinc-500"}>
                {executandoCapaPrompt ? "em andamento" : resultadoCapaPrompt ? "concluído" : "manual"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Atualizando dados ausentes</span>
              <span className={atualizandoDados ? "text-amber-300" : resultadoAtualizacao ? "text-emerald-300" : "text-zinc-500"}>
                {atualizandoDados ? "em andamento" : resultadoAtualizacao ? "concluído" : "aguardando"}
              </span>
            </div>
            </div>
          </div>
        )}

        {resultadoCriacao && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da criação da obra
            </h2>
            {resultadoCriacao.existente === true && (
              <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Obra já existe no catálogo.</p>
                <p className="mt-1 text-amber-100/75">
                  A pipeline automática não foi executada. Use os botões abaixo se quiser reprocessar manualmente.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("curador_beu")}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
                  >
                    Reprocessar Curador
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("editor_beu")}
                    className="rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10 disabled:opacity-60"
                  >
                    Reprocessar Editor
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("diretor_criativo")}
                    className="rounded-xl border border-sky-500/60 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/10 disabled:opacity-60"
                  >
                    Reprocessar Diretor Criativo
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => atualizarDadosAusentes()}
                    className="rounded-xl border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-60"
                  >
                    Atualizar dados ausentes
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("narrativa_cinematica")}
                    className="rounded-xl border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-500/10 disabled:opacity-60"
                  >
                    Gerar Narrativa Cinematográfica
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("heritage_prompt")}
                    className="rounded-xl border border-orange-500/60 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-500/10 disabled:opacity-60"
                  >
                    Gerar Prompt Heritage
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("capa_cinematica_prompt")}
                    className="rounded-xl border border-fuchsia-500/60 px-4 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/10 disabled:opacity-60"
                  >
                    Gerar Prompt Capa Cinemática
                  </button>
                </div>
              </div>
            )}
            <pre className="bg-black border border-zinc-800 rounded-2xl p-5 overflow-auto text-sm text-emerald-300">
              {JSON.stringify(resultadoCriacao, null, 2)}
            </pre>
            {resultadoCriacao?.livro?.id && resultadoCriacao.existente !== true && (
              <div className="mt-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-100">
                <p className="font-semibold">Narrativa Cinematográfica</p>
                <p className="mt-1 text-purple-100/75">
                  Esta etapa é manual e usa a BEU já enriquecida pelo Curador, Editor e Diretor Criativo.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => executarEtapaManual("narrativa_cinematica")}
                  className="mt-4 rounded-xl border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-500/10 disabled:opacity-60"
                >
                  Gerar Narrativa Cinematográfica
                </button>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("heritage_prompt")}
                    className="rounded-xl border border-orange-500/60 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-500/10 disabled:opacity-60"
                  >
                    Gerar Prompt Heritage
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executarEtapaManual("capa_cinematica_prompt")}
                    className="rounded-xl border border-fuchsia-500/60 px-4 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/10 disabled:opacity-60"
                  >
                    Gerar Prompt Capa Cinemática
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {resultadoCurador && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da execução curador_beu
            </h2>
            <pre className={`bg-black border rounded-2xl p-5 overflow-auto text-sm ${resultadoCurador.ok ? "border-zinc-800 text-emerald-300" : "border-red-900 text-red-300"}`}>
              {JSON.stringify(resultadoCurador, null, 2)}
            </pre>
          </section>
        )}

        {resultadoEditor && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da execução editor_beu
            </h2>
            <pre className={`bg-black border rounded-2xl p-5 overflow-auto text-sm ${resultadoEditor.ok ? "border-zinc-800 text-emerald-300" : "border-red-900 text-red-300"}`}>
              {JSON.stringify(resultadoEditor, null, 2)}
            </pre>
          </section>
        )}

        {resultadoDiretor && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da execução diretor_criativo
            </h2>
            <pre className={`bg-black border rounded-2xl p-5 overflow-auto text-sm ${resultadoDiretor.ok ? "border-zinc-800 text-emerald-300" : "border-red-900 text-red-300"}`}>
              {JSON.stringify(resultadoDiretor, null, 2)}
            </pre>
          </section>
        )}

        {resultadoAtualizacao && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da atualização de dados ausentes
            </h2>
            <pre className={`bg-black border rounded-2xl p-5 overflow-auto text-sm ${resultadoAtualizacao.ok ? "border-zinc-800 text-emerald-300" : "border-red-900 text-red-300"}`}>
              {JSON.stringify(resultadoAtualizacao, null, 2)}
            </pre>
          </section>
        )}

        {resultadoNarrativa && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da narrativa_cinematica
            </h2>
            {resultadoNarrativa.ok && typeof resultadoNarrativa.saida === "string" ? (
              <textarea
                readOnly
                value={resultadoNarrativa.saida}
                className="min-h-[520px] w-full rounded-2xl border border-purple-900 bg-black p-5 text-sm leading-7 text-purple-100 outline-none"
              />
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoNarrativa, null, 2)}
              </pre>
            )}
          </section>
        )}

        {resultadoHeritagePrompt && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do heritage_prompt
            </h2>
            {resultadoHeritagePrompt.ok && typeof resultadoHeritagePrompt.saida === "string" ? (
              <textarea
                readOnly
                value={resultadoHeritagePrompt.saida}
                className="min-h-[420px] w-full rounded-2xl border border-orange-900 bg-black p-5 text-sm leading-7 text-orange-100 outline-none"
              />
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoHeritagePrompt, null, 2)}
              </pre>
            )}
          </section>
        )}

        {resultadoCapaPrompt && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do capa_cinematica_prompt
            </h2>
            {resultadoCapaPrompt.ok && typeof resultadoCapaPrompt.saida === "string" ? (
              <textarea
                readOnly
                value={resultadoCapaPrompt.saida}
                className="min-h-[420px] w-full rounded-2xl border border-fuchsia-900 bg-black p-5 text-sm leading-7 text-fuchsia-100 outline-none"
              />
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoCapaPrompt, null, 2)}
              </pre>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
