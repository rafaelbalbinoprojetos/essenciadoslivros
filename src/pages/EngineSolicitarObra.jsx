import { useCallback, useEffect, useMemo, useState } from "react";
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
import { descreverFaseNarrativa } from "../constants/engineEtapas.js";

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

const EXPECTED_STEP_DURATIONS_SECONDS = {
  criar_obra: 15,
  curador_beu: 15,
  editor_beu: 15,
  diretor_criativo: 20,
  // Agora inclui ICN + blueprint + N blocos sequenciais de escrita (a
  // quantidade de blocos escala com a complexidade da obra), por isso a
  // estimativa subiu — é só um ETA aproximado, o tempo real varia bastante.
  narrativa_cinematica: 900,
  heritage_prompt: 15,
  heritage_image: 180,
  capa_cinematica_prompt: 15,
  capa_cinematica_image: 180,
  player_hero_prompt: 1,
  player_hero_image: 180,
  pdf_cinematica: 30,
  guia_editorial_parte1: 150,
  guia_editorial_parte2: 150,
  guia_editorial_parte3: 150,
  guia_editorial_pdf: 40,
  enciclopedia_parte1: 120,
  enciclopedia_parte2: 180,
  enciclopedia_parte3: 180,
  enciclopedia_parte4: 180,
  enciclopedia_parte5: 120,
  enciclopedia_pdf: 40,
  atualizar_dados: 15,
};

// Trilha narrativa: obras de ficção/história — Harry Potter, Senhor dos
// Anéis, etc. Passa pela narrativa cinematográfica e pelas capas Heritage/
// cinemática.
const PIPELINE_STEP_DEFS_NARRATIVA = [
  { key: "curador_beu", label: "Curador (dados factuais)", colorClass: "text-amber-500 focus:ring-amber-500" },
  { key: "editor_beu", label: "Editor (interpretação emocional)", colorClass: "text-amber-500 focus:ring-amber-500" },
  { key: "diretor_criativo", label: "Diretor Criativo (sensorial, visual, sonoro)", colorClass: "text-sky-500 focus:ring-sky-500" },
  { key: "narrativa_cinematica", label: "Narrativa Cinematográfica", colorClass: "text-purple-500 focus:ring-purple-500" },
  { key: "heritage_prompt", label: "Prompt Heritage", colorClass: "text-orange-500 focus:ring-orange-500" },
  { key: "heritage_image", label: "Imagem Heritage", colorClass: "text-yellow-500 focus:ring-yellow-500" },
  { key: "capa_cinematica_prompt", label: "Prompt Capa Cinemática", colorClass: "text-fuchsia-500 focus:ring-fuchsia-500" },
  { key: "capa_cinematica_image", label: "Imagem Cinemática", colorClass: "text-rose-500 focus:ring-rose-500" },
  { key: "player_hero_prompt", label: "Prompt Player Hero", colorClass: "text-indigo-500 focus:ring-indigo-500" },
  { key: "player_hero_image", label: "Player Hero (usa a capa cinematográfica)", colorClass: "text-violet-500 focus:ring-violet-500" },
  { key: "pdf_cinematica", label: "PDF Cinemático", colorClass: "text-cyan-500 focus:ring-cyan-500" },
  { key: "enciclopedia_parte1", label: "Enciclopédia — Parte 1 (Ficha Técnica, Apresentação, Visão Geral)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte2", label: "Enciclopédia — Parte 2 (Narrativa Completa, Personagens, Universo)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte3", label: "Enciclopédia — Parte 3 (Criação, Equipe, Direção Artística, Trilha Sonora, Módulo Específico)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte4", label: "Enciclopédia — Parte 4 (Curiosidades, Easter Eggs, Impacto, Recepção, Premiações, Dados Comerciais)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte5", label: "Enciclopédia — Parte 5 (Por que Entrou para a História, Essência da Obra, Fontes)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_pdf", label: "Enciclopédia — Montar PDF final", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "atualizar_dados", label: "Salvar/Atualizar dados da obra (sinopse, autor, gênero, ano...)", colorClass: "text-emerald-500 focus:ring-emerald-500" },
];

// Trilha conceitual/técnica (tipo_obra = "tecnico"): livros como "O Corpo
// Fala" ou "A Coragem de Não Agradar". Em vez da narrativa cinematográfica,
// produz o Guia Editorial Essência — análise conceitual + resumo autoral,
// em 3 partes + PDF.
const PIPELINE_STEP_DEFS_TECNICO = [
  { key: "curador_beu", label: "Curador (dados factuais)", colorClass: "text-amber-500 focus:ring-amber-500" },
  { key: "editor_beu", label: "Editor (interpretação emocional)", colorClass: "text-amber-500 focus:ring-amber-500" },
  { key: "diretor_criativo", label: "Diretor Criativo (sensorial, visual, sonoro)", colorClass: "text-sky-500 focus:ring-sky-500" },
  { key: "guia_editorial_parte1", label: "Guia Editorial — Parte 1 (Apresentação, Panorama Histórico, Grande Questão, Grandes Princípios)", colorClass: "text-purple-500 focus:ring-purple-500" },
  { key: "guia_editorial_parte2", label: "Guia Editorial — Parte 2 (Conexões, Além da Obra, Aplicações, Estudos de Caso)", colorClass: "text-purple-500 focus:ring-purple-500" },
  { key: "guia_editorial_parte3", label: "Guia Editorial — Parte 3 (Laboratório Essência, Comparando Ideias, Leituras Cruzadas, Modelo Mental, Conclusão)", colorClass: "text-purple-500 focus:ring-purple-500" },
  { key: "guia_editorial_pdf", label: "Guia Editorial — Montar PDF final", colorClass: "text-purple-500 focus:ring-purple-500" },
  { key: "enciclopedia_parte1", label: "Enciclopédia — Parte 1 (Ficha Técnica, Apresentação, Visão Geral)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte2", label: "Enciclopédia — Parte 2 (Narrativa Completa, Personagens, Universo)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte3", label: "Enciclopédia — Parte 3 (Criação, Equipe, Direção Artística, Trilha Sonora, Módulo Específico)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte4", label: "Enciclopédia — Parte 4 (Curiosidades, Easter Eggs, Impacto, Recepção, Premiações, Dados Comerciais)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_parte5", label: "Enciclopédia — Parte 5 (Por que Entrou para a História, Essência da Obra, Fontes)", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "enciclopedia_pdf", label: "Enciclopédia — Montar PDF final", colorClass: "text-teal-500 focus:ring-teal-500" },
  { key: "atualizar_dados", label: "Salvar/Atualizar dados da obra (sinopse, autor, gênero, ano...)", colorClass: "text-emerald-500 focus:ring-emerald-500" },
];

function obterPipelineStepDefs(tipoObra) {
  return tipoObra === "tecnico" ? PIPELINE_STEP_DEFS_TECNICO : PIPELINE_STEP_DEFS_NARRATIVA;
}

const PIPELINE_STEP_DEFS_TODAS = [...PIPELINE_STEP_DEFS_NARRATIVA, ...PIPELINE_STEP_DEFS_TECNICO].filter(
  (etapa, indice, lista) => lista.findIndex((item) => item.key === etapa.key) === indice,
);

const ENCICLOPEDIA_STEP_KEYS = [
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
  "enciclopedia_pdf",
];

const GUIA_EDITORIAL_STEP_KEYS = [
  "guia_editorial_parte1",
  "guia_editorial_parte2",
  "guia_editorial_parte3",
  "guia_editorial_pdf",
];

const ETAPA_LABELS_ENCICLOPEDIA = Object.fromEntries(
  PIPELINE_STEP_DEFS_TODAS
    .filter((etapa) => ENCICLOPEDIA_STEP_KEYS.includes(etapa.key))
    .map((etapa) => [etapa.key, etapa.label]),
);

const ETAPA_LABELS_GUIA_EDITORIAL = Object.fromEntries(
  PIPELINE_STEP_DEFS_TODAS
    .filter((etapa) => GUIA_EDITORIAL_STEP_KEYS.includes(etapa.key))
    .map((etapa) => [etapa.key, etapa.label]),
);

const ENCICLOPEDIA_PROGRESS_LABELS = {
  enciclopedia_parte1: "Gerando enciclopédia — parte 1",
  enciclopedia_parte2: "Gerando enciclopédia — parte 2",
  enciclopedia_parte3: "Gerando enciclopédia — parte 3",
  enciclopedia_parte4: "Gerando enciclopédia — parte 4",
  enciclopedia_parte5: "Gerando enciclopédia — parte 5",
  enciclopedia_pdf: "Montando PDF da enciclopédia",
};

const GUIA_EDITORIAL_PROGRESS_LABELS = {
  guia_editorial_parte1: "Gerando Guia Editorial — parte 1",
  guia_editorial_parte2: "Gerando Guia Editorial — parte 2",
  guia_editorial_parte3: "Gerando Guia Editorial — parte 3",
  guia_editorial_pdf: "Montando PDF do Guia Editorial",
};

function criarSelecaoDeEtapas(valor, stepDefs) {
  return Object.fromEntries(stepDefs.map((etapa) => [etapa.key, valor]));
}

function PipelineStepSelector({ stepDefs, selectedSteps, onToggle, onSelectAll, onRun, running, disabled }) {
  const quantidadeSelecionada = stepDefs.filter((etapa) => selectedSteps[etapa.key]).length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-200">Selecione as etapas a buscar/gerar</p>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={() => onSelectAll(true)} className="font-semibold text-emerald-300 hover:underline">
            Marcar todas
          </button>
          <button type="button" onClick={() => onSelectAll(false)} className="font-semibold text-zinc-400 hover:underline">
            Desmarcar todas
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {stepDefs.map((etapa) => (
          <label
            key={etapa.key}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          >
            <input
              type="checkbox"
              checked={Boolean(selectedSteps[etapa.key])}
              onChange={() => onToggle(etapa.key)}
              disabled={disabled}
              className={`h-4 w-4 rounded border-zinc-700 bg-black ${etapa.colorClass}`}
            />
            {etapa.label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || quantidadeSelecionada === 0}
        onClick={onRun}
        className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
      >
        {running
          ? "Executando pipeline selecionada..."
          : `Executar ${quantidadeSelecionada} etapa${quantidadeSelecionada === 1 ? "" : "s"} selecionada${quantidadeSelecionada === 1 ? "" : "s"}`}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        Ao terminar cada etapa selecionada, imagens e PDF já sobem automaticamente para o Storage e a obra é atualizada no catálogo.
      </p>
    </div>
  );
}

function getStepStatus({ active, result, manualWhenIdle = false }) {
  if (active) return "loading";
  if (result?.ok === false) return "error";
  if (result) return "done";
  if (manualWhenIdle) return "manual";
  return "waiting";
}

function getStepProgressPercent(startedAt, now, expectedSeconds) {
  if (!startedAt) return 0;
  if (!expectedSeconds || expectedSeconds <= 0) return 0;

  const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
  const rawPercent = Math.floor((elapsedSeconds / expectedSeconds) * 100);

  return Math.min(99, Math.max(1, rawPercent));
}

function EngineProcessStep({ label, status, progressPercent = 0 }) {
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
        {status === "loading" ? `${config.label} - ${progressPercent}%` : config.label}
      </span>
    </div>
  );
}

export default function EngineSolicitarObra() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [titulo, setTitulo] = useState("");
  const [tipoObra, setTipoObra] = useState("livro");
  const pipelineStepDefs = useMemo(() => obterPipelineStepDefs(tipoObra), [tipoObra]);
  const [engineReferences, setEngineReferences] = useState({});
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referenceUploading, setReferenceUploading] = useState(null);
  const [criandoObra, setCriandoObra] = useState(false);
  const [executandoCurador, setExecutandoCurador] = useState(false);
  const [executandoEditor, setExecutandoEditor] = useState(false);
  const [executandoDiretor, setExecutandoDiretor] = useState(false);
  const [executandoNarrativa, setExecutandoNarrativa] = useState(false);
  const [executandoHeritagePrompt, setExecutandoHeritagePrompt] = useState(false);
  const [executandoHeritageImage, setExecutandoHeritageImage] = useState(false);
  const [executandoCapaPrompt, setExecutandoCapaPrompt] = useState(false);
  const [executandoCapaImage, setExecutandoCapaImage] = useState(false);
  const [executandoPlayerHeroPrompt, setExecutandoPlayerHeroPrompt] = useState(false);
  const [executandoPlayerHero, setExecutandoPlayerHero] = useState(false);
  const [executandoPdfCinematica, setExecutandoPdfCinematica] = useState(false);
  const [atualizandoDados, setAtualizandoDados] = useState(false);
  const [resultadoCriacao, setResultadoCriacao] = useState(null);
  const [resultadoCurador, setResultadoCurador] = useState(null);
  const [resultadoEditor, setResultadoEditor] = useState(null);
  const [resultadoDiretor, setResultadoDiretor] = useState(null);
  const [resultadoNarrativa, setResultadoNarrativa] = useState(null);
  const [narrativaProgresso, setNarrativaProgresso] = useState(null);
  const [narrativaPreview, setNarrativaPreview] = useState(null);
  const [resultadoHeritagePrompt, setResultadoHeritagePrompt] = useState(null);
  const [resultadoHeritageImage, setResultadoHeritageImage] = useState(null);
  const [resultadoCapaPrompt, setResultadoCapaPrompt] = useState(null);
  const [resultadoCapaImage, setResultadoCapaImage] = useState(null);
  const [resultadoPlayerHeroPrompt, setResultadoPlayerHeroPrompt] = useState(null);
  const [resultadoPlayerHero, setResultadoPlayerHero] = useState(null);
  const [resultadoPdfCinematica, setResultadoPdfCinematica] = useState(null);
  const [resultadoAtualizacao, setResultadoAtualizacao] = useState(null);
  const [executandoEnciclopedia, setExecutandoEnciclopedia] = useState({});
  const [resultadosEnciclopedia, setResultadosEnciclopedia] = useState({});
  const [executandoGuiaEditorial, setExecutandoGuiaEditorial] = useState({});
  const [resultadosGuiaEditorial, setResultadosGuiaEditorial] = useState({});
  const [selectedSteps, setSelectedSteps] = useState(() => criarSelecaoDeEtapas(true, obterPipelineStepDefs("livro")));
  const [testesAtivo, setTestesAtivo] = useState(false);
  const [testesLoading, setTestesLoading] = useState(true);
  const [testesSaving, setTestesSaving] = useState(false);
  const [decisaoObraExistente, setDecisaoObraExistente] = useState(null);
  const [executandoPipelineSelecionada, setExecutandoPipelineSelecionada] = useState(false);
  const [stepStartedAt, setStepStartedAt] = useState({});
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const loading = criandoObra || executandoCurador || executandoEditor || executandoDiretor || executandoNarrativa || executandoHeritagePrompt || executandoHeritageImage || executandoCapaPrompt || executandoCapaImage || executandoPlayerHeroPrompt || executandoPlayerHero || executandoPdfCinematica || executandoPipelineSelecionada || atualizandoDados || Object.values(executandoEnciclopedia).some(Boolean) || Object.values(executandoGuiaEditorial).some(Boolean);

  useEffect(() => {
    setSelectedSteps(criarSelecaoDeEtapas(true, obterPipelineStepDefs(tipoObra)));
  }, [tipoObra]);

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

  useEffect(() => {
    async function loadTestes() {
      setTestesLoading(true);

      try {
        const response = await fetch("/api/engine/config");
        const data = await response.json();

        if (response.ok && data?.ok) {
          setTestesAtivo(Boolean(data.testes));
        }
      } catch (error) {
        console.error("[ENGINE] erro ao carregar modo de testes", error);
      } finally {
        setTestesLoading(false);
      }
    }

    loadTestes();
  }, []);

  async function handleToggleTestes(checked) {
    const anterior = testesAtivo;
    setTestesAtivo(checked);
    setTestesSaving(true);

    try {
      const response = await fetch("/api/engine/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testes: checked }),
      });

      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Erro ao atualizar modo de testes.");
      }

      toast.success(checked ? "Modo Testes ativado." : "Modo Testes desativado.");
    } catch (error) {
      console.error("[ENGINE] erro ao atualizar modo de testes", error);
      toast.error(error.message);
      setTestesAtivo(anterior);
    } finally {
      setTestesSaving(false);
    }
  }

  useEffect(() => {
    const activeSteps = {
      criar_obra: criandoObra,
      curador_beu: executandoCurador,
      editor_beu: executandoEditor,
      diretor_criativo: executandoDiretor,
      narrativa_cinematica: executandoNarrativa,
      heritage_prompt: executandoHeritagePrompt,
      heritage_image: executandoHeritageImage,
      capa_cinematica_prompt: executandoCapaPrompt,
      capa_cinematica_image: executandoCapaImage,
      player_hero_prompt: executandoPlayerHeroPrompt,
      player_hero_image: executandoPlayerHero,
      pdf_cinematica: executandoPdfCinematica,
      ...executandoEnciclopedia,
      atualizar_dados: atualizandoDados,
    };

    setStepStartedAt((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(activeSteps).forEach(([key, active]) => {
        if (active && !next[key]) {
          next[key] = Date.now();
          changed = true;
        }

        if (!active && next[key]) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [
    criandoObra,
    executandoCurador,
    executandoEditor,
    executandoDiretor,
    executandoNarrativa,
    executandoHeritagePrompt,
    executandoHeritageImage,
    executandoCapaPrompt,
    executandoCapaImage,
    executandoPlayerHeroPrompt,
    executandoPlayerHero,
    executandoPdfCinematica,
    executandoEnciclopedia,
    atualizandoDados,
  ]);

  useEffect(() => {
    if (!loading) return undefined;

    setTimerNow(Date.now());
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loading]);

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
    const isHeritageImage = tipoEtapa === "heritage_image";
    const isCapaPrompt = tipoEtapa === "capa_cinematica_prompt";
    const isCapaImage = tipoEtapa === "capa_cinematica_image";
    const isPlayerHeroPrompt = tipoEtapa === "player_hero_prompt";
    const isPlayerHero = tipoEtapa === "player_hero_image";
    const isPdfCinematica = tipoEtapa === "pdf_cinematica";
    const isEnciclopedia = ENCICLOPEDIA_STEP_KEYS.includes(tipoEtapa);
    const isGuiaEditorial = GUIA_EDITORIAL_STEP_KEYS.includes(tipoEtapa);

    if (isCurador) setExecutandoCurador(true);
    if (isEditor) setExecutandoEditor(true);
    if (isDiretor) setExecutandoDiretor(true);
    if (isNarrativa) {
      setExecutandoNarrativa(true);
      setNarrativaPreview(null);
    }
    if (isHeritagePrompt) setExecutandoHeritagePrompt(true);
    if (isHeritageImage) setExecutandoHeritageImage(true);
    if (isCapaPrompt) setExecutandoCapaPrompt(true);
    if (isCapaImage) setExecutandoCapaImage(true);
    if (isPlayerHeroPrompt) setExecutandoPlayerHeroPrompt(true);
    if (isPlayerHero) setExecutandoPlayerHero(true);
    if (isPdfCinematica) setExecutandoPdfCinematica(true);
    if (isEnciclopedia) setExecutandoEnciclopedia((atual) => ({ ...atual, [tipoEtapa]: true }));
    if (isGuiaEditorial) setExecutandoGuiaEditorial((atual) => ({ ...atual, [tipoEtapa]: true }));

    // narrativa_cinematica pode envolver ICN + Blueprint + vários blocos de
    // prosa — mais do que um único request HTTP aguenta sem estourar o
    // timeout do serverless function (504). O backend agora faz no máximo
    // UMA chamada de IA por invocação e devolve `finalizado: false` enquanto
    // ainda há trabalho; aqui a gente chama de novo até `finalizado: true`,
    // reaproveitando o que já foi salvo a cada volta.
    const MAX_TENTATIVAS_NARRATIVA = 80;

    try {
      console.log("[ENGINE] iniciando executar-etapa", { obraId, tipoEtapa });

      let data;
      let tentativas = 0;

      do {
        tentativas += 1;

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

        try {
          data = await response.json();
        } catch {
          throw new Error(
            response.status === 504
              ? "O servidor demorou demais para responder (tempo esgotado). O progresso já feito foi salvo — clique novamente para continuar de onde parou."
              : `Erro inesperado do servidor (status ${response.status}) ao executar ${tipoEtapa}.`,
          );
        }

        console.log("[ENGINE] resposta executar-etapa", { tipoEtapa, data, tentativas });

        if (isNarrativa && data?.ok && data?.finalizado === false) {
          setNarrativaProgresso(data);
        }

        if (isNarrativa && (data?.icn !== undefined || data?.cenas !== undefined || data?.blocos !== undefined)) {
          setNarrativaPreview((atual) => ({
            icn: data.icn ?? atual?.icn ?? null,
            icn_faixa: data.icn_faixa ?? atual?.icn_faixa ?? null,
            cenas: data.cenas ?? atual?.cenas ?? null,
            blocos: data.blocos ?? atual?.blocos ?? null,
          }));
        }
      } while (
        isNarrativa
        && data?.ok
        && data?.finalizado === false
        && tentativas < MAX_TENTATIVAS_NARRATIVA
      );

      if (isNarrativa && data?.ok && data?.finalizado === false) {
        const fase = descreverFaseNarrativa(data);
        throw new Error(
          `A narrativa cinematográfica não terminou depois de ${MAX_TENTATIVAS_NARRATIVA} chamadas (parou em: ${fase || data.fase || "desconhecido"}). O progresso já feito foi salvo — clique novamente para continuar de onde parou.`,
        );
      }

      if (isCurador) setResultadoCurador(data);
      if (isEditor) setResultadoEditor(data);
      if (isDiretor) setResultadoDiretor(data);
      if (isNarrativa) setResultadoNarrativa(data);
      if (isHeritagePrompt) setResultadoHeritagePrompt(data);
      if (isHeritageImage) setResultadoHeritageImage(data);
      if (isCapaPrompt) setResultadoCapaPrompt(data);
      if (isCapaImage) setResultadoCapaImage(data);
      if (isPlayerHeroPrompt) setResultadoPlayerHeroPrompt(data);
      if (isPlayerHero) setResultadoPlayerHero(data);
      if (isPdfCinematica) setResultadoPdfCinematica(data);
      if (isEnciclopedia) setResultadosEnciclopedia((atual) => ({ ...atual, [tipoEtapa]: data }));
      if (isGuiaEditorial) setResultadosGuiaEditorial((atual) => ({ ...atual, [tipoEtapa]: data }));

      if (data?.bloqueadoPorModeracao) {
        toast.error(
          `A OpenAI recusou gerar a imagem de "${tipoEtapa}" (moderação), mesmo após ajustar o prompt. A etapa foi interrompida sem imagem; gere um novo prompt antes de tentar novamente.`,
          { duration: 8000 },
        );
        return data;
      }

      if (!data?.ok) {
        throw new Error(data?.error || `Erro ao executar ${tipoEtapa}.`);
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
      if (isHeritageImage) setResultadoHeritageImage((atual) => atual || fallback);
      if (isCapaPrompt) setResultadoCapaPrompt((atual) => atual || fallback);
      if (isCapaImage) setResultadoCapaImage((atual) => atual || fallback);
      if (isPlayerHeroPrompt) setResultadoPlayerHeroPrompt((atual) => atual || fallback);
      if (isPlayerHero) setResultadoPlayerHero((atual) => atual || fallback);
      if (isPdfCinematica) setResultadoPdfCinematica((atual) => atual || fallback);
      if (isEnciclopedia) setResultadosEnciclopedia((atual) => ({ ...atual, [tipoEtapa]: atual[tipoEtapa] || fallback }));
      if (isGuiaEditorial) setResultadosGuiaEditorial((atual) => ({ ...atual, [tipoEtapa]: atual[tipoEtapa] || fallback }));

      return null;
    } finally {
      if (isCurador) setExecutandoCurador(false);
      if (isEditor) setExecutandoEditor(false);
      if (isDiretor) setExecutandoDiretor(false);
      if (isNarrativa) {
        setExecutandoNarrativa(false);
        setNarrativaProgresso(null);
      }
      if (isHeritagePrompt) setExecutandoHeritagePrompt(false);
      if (isHeritageImage) setExecutandoHeritageImage(false);
      if (isCapaPrompt) setExecutandoCapaPrompt(false);
      if (isCapaImage) setExecutandoCapaImage(false);
      if (isPlayerHeroPrompt) setExecutandoPlayerHeroPrompt(false);
      if (isPlayerHero) setExecutandoPlayerHero(false);
      if (isPdfCinematica) setExecutandoPdfCinematica(false);
      if (isEnciclopedia) setExecutandoEnciclopedia((atual) => ({ ...atual, [tipoEtapa]: false }));
      if (isGuiaEditorial) setExecutandoGuiaEditorial((atual) => ({ ...atual, [tipoEtapa]: false }));
    }
  }

  function toggleStepSelecionado(key) {
    setSelectedSteps((atual) => ({ ...atual, [key]: !atual[key] }));
  }

  function definirTodasEtapas(valor) {
    setSelectedSteps(criarSelecaoDeEtapas(valor, pipelineStepDefs));
  }

  async function executarPipelineSelecionada(obraIdParam = null) {
    const obraId = obraIdParam || resultadoCriacao?.livro?.id;

    if (!obraId) {
      toast.error("Nenhuma obra selecionada para executar a pipeline.");
      return;
    }

    const etapasParaRodar = pipelineStepDefs.filter((etapa) => selectedSteps[etapa.key]);

    if (etapasParaRodar.length === 0) {
      toast.error("Selecione ao menos uma etapa para executar.");
      return;
    }

    setExecutandoPipelineSelecionada(true);

    try {
      for (const etapa of etapasParaRodar) {
        const resultado = etapa.key === "atualizar_dados"
          ? await atualizarDadosAusentes(obraId)
          : await executarEtapaManual(etapa.key, obraId);

        if (!resultado?.ok) {
          toast.error(`Pipeline interrompida em "${etapa.label}". Corrija e rode as etapas restantes manualmente se quiser.`);
          return;
        }
      }

      toast.success("Pipeline concluída — imagens, PDF e dados já foram salvos na obra.");
    } finally {
      setExecutandoPipelineSelecionada(false);
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
    setExecutandoHeritageImage(false);
    setExecutandoCapaPrompt(false);
    setExecutandoCapaImage(false);
    setExecutandoPlayerHeroPrompt(false);
    setExecutandoPlayerHero(false);
    setExecutandoPdfCinematica(false);
    setAtualizandoDados(false);
    setExecutandoEnciclopedia({});
    setExecutandoGuiaEditorial({});
    setResultadoCriacao(null);
    setResultadoCurador(null);
    setResultadoEditor(null);
    setResultadoDiretor(null);
    setResultadoNarrativa(null);
    setResultadoHeritagePrompt(null);
    setResultadoHeritageImage(null);
    setResultadoCapaPrompt(null);
    setResultadoCapaImage(null);
    setResultadoPlayerHeroPrompt(null);
    setResultadoPlayerHero(null);
    setResultadoPdfCinematica(null);
    setResultadoAtualizacao(null);
    setResultadosEnciclopedia({});
    setResultadosGuiaEditorial({});
    setDecisaoObraExistente(null);
    setSelectedSteps(criarSelecaoDeEtapas(true, obterPipelineStepDefs(tipoObra)));

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
        console.log("[ENGINE] obra existente, aguardando decisão do usuário", obraId);
      }

      setCriandoObra(false);
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
      setExecutandoHeritageImage(false);
      setExecutandoCapaPrompt(false);
      setExecutandoCapaImage(false);
      setExecutandoPlayerHeroPrompt(false);
      setExecutandoPlayerHero(false);
      setExecutandoPdfCinematica(false);
      setAtualizandoDados(false);
    }
  }

  const hasRequestedWork = Boolean(
    resultadoCriacao
    || resultadoCurador
    || resultadoEditor
    || resultadoDiretor
    || resultadoNarrativa
    || resultadoHeritagePrompt
    || resultadoHeritageImage
    || resultadoCapaPrompt
    || resultadoCapaImage
    || resultadoPlayerHeroPrompt
    || resultadoPlayerHero
    || resultadoPdfCinematica
    || resultadoAtualizacao
    || Object.keys(resultadosEnciclopedia).length > 0
    || Object.keys(resultadosGuiaEditorial).length > 0
    || loading,
  );
  const optionalStepsEnabled = Boolean(resultadoCriacao?.livro?.id);
  const pipelineStepKeys = new Set(pipelineStepDefs.map((etapa) => etapa.key));
  const engineProgressStepsTodas = [
    {
      key: "criar_obra",
      label: "Criando obra",
      status: getStepStatus({ active: criandoObra, result: resultadoCriacao }),
    },
    {
      key: "curador_beu",
      label: "Executando curador",
      status: getStepStatus({ active: executandoCurador, result: resultadoCurador }),
    },
    {
      key: "editor_beu",
      label: "Executando editor",
      status: getStepStatus({ active: executandoEditor, result: resultadoEditor }),
    },
    {
      key: "diretor_criativo",
      label: "Executando diretor criativo",
      status: getStepStatus({ active: executandoDiretor, result: resultadoDiretor }),
    },
    {
      key: "narrativa_cinematica",
      label: "Gerando narrativa cinematográfica",
      status: getStepStatus({
        active: executandoNarrativa,
        result: resultadoNarrativa,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    ...GUIA_EDITORIAL_STEP_KEYS.map((key) => ({
      key,
      label: GUIA_EDITORIAL_PROGRESS_LABELS[key],
      status: getStepStatus({
        active: Boolean(executandoGuiaEditorial[key]),
        result: resultadosGuiaEditorial[key],
        manualWhenIdle: optionalStepsEnabled,
      }),
    })),
    {
      key: "heritage_prompt",
      label: "Gerando prompt Heritage",
      status: getStepStatus({
        active: executandoHeritagePrompt,
        result: resultadoHeritagePrompt,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    {
      key: "heritage_image",
      label: "Gerando imagem Heritage",
      status: getStepStatus({
        active: executandoHeritageImage,
        result: resultadoHeritageImage,
        manualWhenIdle: Boolean(resultadoHeritagePrompt?.ok),
      }),
    },
    {
      key: "capa_cinematica_prompt",
      label: "Gerando prompt da capa cinematográfica",
      status: getStepStatus({
        active: executandoCapaPrompt,
        result: resultadoCapaPrompt,
        manualWhenIdle: optionalStepsEnabled,
      }),
    },
    {
      key: "capa_cinematica_image",
      label: "Gerando imagem cinematográfica",
      status: getStepStatus({
        active: executandoCapaImage,
        result: resultadoCapaImage,
        manualWhenIdle: Boolean(resultadoCapaPrompt?.ok),
      }),
    },
    {
      key: "player_hero_prompt",
      label: "Preparando prompt do Player Hero",
      status: getStepStatus({
        active: executandoPlayerHeroPrompt,
        result: resultadoPlayerHeroPrompt,
        manualWhenIdle: Boolean(resultadoCapaImage?.ok),
      }),
    },
    {
      key: "player_hero_image",
      label: "Gerando Player Hero",
      status: getStepStatus({
        active: executandoPlayerHero,
        result: resultadoPlayerHero,
        manualWhenIdle: Boolean(resultadoPlayerHeroPrompt?.ok),
      }),
    },
    {
      key: "pdf_cinematica",
      label: "Gerando PDF cinematográfico",
      status: getStepStatus({
        active: executandoPdfCinematica,
        result: resultadoPdfCinematica,
        manualWhenIdle: Boolean(resultadoPlayerHero?.ok),
      }),
    },
    ...ENCICLOPEDIA_STEP_KEYS.map((key) => ({
      key,
      label: ENCICLOPEDIA_PROGRESS_LABELS[key],
      status: getStepStatus({
        active: Boolean(executandoEnciclopedia[key]),
        result: resultadosEnciclopedia[key],
        manualWhenIdle: optionalStepsEnabled,
      }),
    })),
    {
      key: "atualizar_dados",
      label: "Salvando/atualizando dados da obra",
      status: getStepStatus({ active: atualizandoDados, result: resultadoAtualizacao }),
    },
  ];
  // Só mostra as etapas relevantes para o tipo de obra selecionado
  // (narrativa cinematográfica OU Guia Editorial, nunca as duas).
  const engineProgressSteps = engineProgressStepsTodas.filter(
    (step) => step.key === "criar_obra" || pipelineStepKeys.has(step.key),
  );
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

        <section className="mb-6 rounded-2xl border border-purple-900/50 bg-purple-950/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                Modo Testes
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                Narrativa cinematográfica reduzida
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Ativado: a narrativa cinematográfica gera só 2 cenas + Convite, sem ICN nem Blueprint por IA (um único bloco, mais barato).
                Desativado: roda a pipeline completa — ICN mede a complexidade da obra, o Blueprint planeja as cenas e a escrita acontece em blocos, escalando com o tamanho real da obra. As demais etapas não são afetadas por este modo.
              </p>
              {!isAdmin && (
                <p className="mt-2 text-xs text-zinc-500">
                  Apenas administradores podem alternar este modo.
                </p>
              )}
            </div>
            <label className="relative inline-flex flex-none cursor-pointer items-center">
              <input
                type="checkbox"
                checked={testesAtivo}
                disabled={!isAdmin || testesLoading || testesSaving}
                onChange={(event) => handleToggleTestes(event.target.checked)}
                className="peer sr-only"
              />
              <div className="h-7 w-12 rounded-full bg-zinc-700 transition-colors peer-checked:bg-purple-500 peer-disabled:opacity-50" />
              <div className="absolute left-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </section>

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
                      ? `Gerando narrativa cinematográfica${narrativaProgresso ? ` (${descreverFaseNarrativa(narrativaProgresso)})` : "..."}`
                      : executandoHeritagePrompt
                        ? "Gerando prompt Heritage..."
                        : executandoHeritageImage
                          ? "Gerando imagem Heritage..."
                          : executandoCapaPrompt
                            ? "Gerando prompt da capa cinematográfica..."
                            : executandoCapaImage
                              ? "Gerando imagem cinematográfica..."
                              : executandoPlayerHeroPrompt
                                ? "Preparando prompt do Player Hero..."
                                : executandoPlayerHero
                                  ? "Gerando Player Hero..."
                                  : executandoPdfCinematica
                                    ? "Gerando PDF cinematográfico..."
                                    : atualizandoDados
                                      ? "Atualizando dados..."
                                      : "Solicitar obra"}
          </button>
        </form>

        {(executandoNarrativa || resultadoNarrativa) && narrativaPreview && (narrativaPreview.icn || narrativaPreview.cenas) && (
          <div className="mt-4 rounded-xl border border-purple-900 bg-purple-950/20 px-4 py-3 text-sm text-purple-100">
            <p className="font-semibold text-purple-200">Narrativa cinematográfica — previsão de escala</p>
            <p className="mt-1 text-purple-100/80">
              {narrativaPreview.icn
                ? `ICN ${narrativaPreview.icn}${narrativaPreview.icn_faixa ? ` — ${narrativaPreview.icn_faixa}` : ""}`
                : "Calculando complexidade (ICN)..."}
              {narrativaPreview.cenas ? ` · ${narrativaPreview.cenas} cenas previstas` : ""}
              {narrativaPreview.blocos
                ? ` em ${narrativaPreview.blocos} bloco${narrativaPreview.blocos > 1 ? "s" : ""} de produção`
                : ""}
            </p>
          </div>
        )}

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
                <EngineProcessStep
                  key={step.key}
                  label={step.label}
                  status={step.status}
                  progressPercent={getStepProgressPercent(
                    stepStartedAt[step.key],
                    timerNow,
                    EXPECTED_STEP_DURATIONS_SECONDS[step.key],
                  )}
                />
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
                {executandoNarrativa
                  ? descreverFaseNarrativa(narrativaProgresso) || "em andamento"
                  : resultadoNarrativa
                    ? "concluído"
                    : "manual"}
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
            {resultadoCriacao.existente === true && decisaoObraExistente === null && (
              <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Obra já existe no catálogo.</p>
                <p className="mt-1 text-amber-100/75">
                  Deseja pesquisar todas as informações novamente e substituir os dados atuais, ou prefere escolher manualmente o que atualizar?
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      definirTodasEtapas(true);
                      setDecisaoObraExistente("redo");
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
                  >
                    Sim, pesquisar tudo novamente e substituir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      definirTodasEtapas(false);
                      setDecisaoObraExistente("manual");
                    }}
                    className="rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10"
                  >
                    Não, quero escolher manualmente
                  </button>
                </div>
              </div>
            )}
            <pre className="bg-black border border-zinc-800 rounded-2xl p-5 overflow-auto text-sm text-emerald-300">
              {JSON.stringify(resultadoCriacao, null, 2)}
            </pre>
            {resultadoCriacao?.livro?.id
              && (resultadoCriacao.existente !== true || decisaoObraExistente !== null) && (
              <div className="mt-4 space-y-3">
                <PipelineStepSelector
                  stepDefs={pipelineStepDefs}
                  selectedSteps={selectedSteps}
                  onToggle={toggleStepSelecionado}
                  onSelectAll={definirTodasEtapas}
                  onRun={() => executarPipelineSelecionada()}
                  running={executandoPipelineSelecionada}
                  disabled={loading}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => atualizarDadosAusentes()}
                  className="rounded-xl border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-60"
                >
                  Salvar / Atualizar dados da obra
                </button>
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
              Resultado do salvamento/atualização de dados da obra
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

        {resultadoHeritageImage && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do heritage_image
            </h2>
            {resultadoHeritageImage.ok && resultadoHeritageImage.imagemUrl ? (
              <div className="rounded-2xl border border-yellow-900 bg-black p-5">
                <img
                  src={resultadoHeritageImage.imagemUrl}
                  alt="Capa Heritage gerada"
                  className="mx-auto max-h-[720px] rounded-xl border border-zinc-800 object-contain"
                />
                <a
                  href={resultadoHeritageImage.imagemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block truncate text-sm font-semibold text-yellow-200 hover:text-yellow-100"
                >
                  {resultadoHeritageImage.imagemUrl}
                </a>
                <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-yellow-100">
                  {JSON.stringify(resultadoHeritageImage, null, 2)}
                </pre>
              </div>
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoHeritageImage, null, 2)}
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

        {resultadoCapaImage && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do capa_cinematica_image
            </h2>
            {resultadoCapaImage.ok && resultadoCapaImage.imagemUrl ? (
              <div className="rounded-2xl border border-rose-900 bg-black p-5">
                <img
                  src={resultadoCapaImage.imagemUrl}
                  alt="Capa cinematica gerada"
                  className="mx-auto max-h-[720px] rounded-xl border border-zinc-800 object-contain"
                />
                <a
                  href={resultadoCapaImage.imagemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block truncate text-sm font-semibold text-rose-200 hover:text-rose-100"
                >
                  {resultadoCapaImage.imagemUrl}
                </a>
                <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-rose-100">
                  {JSON.stringify(resultadoCapaImage, null, 2)}
                </pre>
              </div>
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoCapaImage, null, 2)}
              </pre>
            )}
          </section>
        )}

        {resultadoPlayerHeroPrompt && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do player_hero_prompt
            </h2>
            {resultadoPlayerHeroPrompt.ok && typeof resultadoPlayerHeroPrompt.saida === "string" ? (
              <textarea
                readOnly
                value={resultadoPlayerHeroPrompt.saida}
                className="min-h-[520px] w-full rounded-2xl border border-indigo-900 bg-black p-5 text-sm leading-7 text-indigo-100 outline-none"
              />
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoPlayerHeroPrompt, null, 2)}
              </pre>
            )}
          </section>
        )}

        {resultadoPlayerHero && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do player_hero_image
            </h2>
            {resultadoPlayerHero.ok && resultadoPlayerHero.imagemUrl ? (
              <div className="rounded-2xl border border-violet-900 bg-black p-5">
                <img
                  src={resultadoPlayerHero.imagemUrl}
                  alt="Player Hero gerado"
                  className="mx-auto max-h-[820px] rounded-xl border border-zinc-800 object-contain"
                />
                <a
                  href={resultadoPlayerHero.imagemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block truncate text-sm font-semibold text-violet-200 hover:text-violet-100"
                >
                  {resultadoPlayerHero.imagemUrl}
                </a>
                <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-violet-100">
                  {JSON.stringify(resultadoPlayerHero, null, 2)}
                </pre>
              </div>
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoPlayerHero, null, 2)}
              </pre>
            )}
          </section>
        )}

        {resultadoPdfCinematica && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do pdf_cinematica
            </h2>
            {resultadoPdfCinematica.ok && resultadoPdfCinematica.pdfUrl ? (
              <div className="rounded-2xl border border-cyan-900 bg-black p-5">
                <a
                  href={resultadoPdfCinematica.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/60 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/10"
                >
                  Abrir PDF cinemático
                </a>
                <a
                  href={resultadoPdfCinematica.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block truncate text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  {resultadoPdfCinematica.pdfUrl}
                </a>
                <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-cyan-100">
                  {JSON.stringify(resultadoPdfCinematica, null, 2)}
                </pre>
              </div>
            ) : (
              <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                {JSON.stringify(resultadoPdfCinematica, null, 2)}
              </pre>
            )}
          </section>
        )}

        {ENCICLOPEDIA_STEP_KEYS.filter((key) => resultadosEnciclopedia[key]).map((key) => {
          const resultado = resultadosEnciclopedia[key];
          const isPdfFinal = key === "enciclopedia_pdf";

          return (
            <section key={key} className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Resultado — {ETAPA_LABELS_ENCICLOPEDIA[key] || key}
              </h2>
              {isPdfFinal ? (
                resultado.ok && resultado.pdfUrl ? (
                  <div className="rounded-2xl border border-teal-900 bg-black p-5">
                    <a
                      href={resultado.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-teal-500/60 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-500/10"
                    >
                      Abrir documento enciclopédico
                    </a>
                    <a
                      href={resultado.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block truncate text-sm font-semibold text-teal-200 hover:text-teal-100"
                    >
                      {resultado.pdfUrl}
                    </a>
                    <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-teal-100">
                      {JSON.stringify(resultado, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                    {JSON.stringify(resultado, null, 2)}
                  </pre>
                )
              ) : resultado.ok && typeof resultado.saida === "string" ? (
                <textarea
                  readOnly
                  value={resultado.saida}
                  className="min-h-[420px] w-full rounded-2xl border border-teal-900 bg-black p-5 text-sm leading-7 text-teal-100 outline-none"
                />
              ) : (
                <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                  {JSON.stringify(resultado, null, 2)}
                </pre>
              )}
            </section>
          );
        })}

        {GUIA_EDITORIAL_STEP_KEYS.filter((key) => resultadosGuiaEditorial[key]).map((key) => {
          const resultado = resultadosGuiaEditorial[key];
          const isPdfFinal = key === "guia_editorial_pdf";

          return (
            <section key={key} className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Resultado — {ETAPA_LABELS_GUIA_EDITORIAL[key] || key}
              </h2>
              {isPdfFinal ? (
                resultado.ok && resultado.pdfUrl ? (
                  <div className="rounded-2xl border border-purple-900 bg-black p-5">
                    <a
                      href={resultado.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-500/10"
                    >
                      Abrir Guia Editorial
                    </a>
                    <a
                      href={resultado.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block truncate text-sm font-semibold text-purple-200 hover:text-purple-100"
                    >
                      {resultado.pdfUrl}
                    </a>
                    <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-purple-100">
                      {JSON.stringify(resultado, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                    {JSON.stringify(resultado, null, 2)}
                  </pre>
                )
              ) : resultado.ok && typeof resultado.saida === "string" ? (
                <textarea
                  readOnly
                  value={resultado.saida}
                  className="min-h-[420px] w-full rounded-2xl border border-purple-900 bg-black p-5 text-sm leading-7 text-purple-100 outline-none"
                />
              ) : (
                <pre className="bg-black border border-red-900 rounded-2xl p-5 overflow-auto text-sm text-red-300">
                  {JSON.stringify(resultado, null, 2)}
                </pre>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
