import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TIPO_OBRA_OPCOES = [
  { value: "todos", label: "Todos os tipos" },
  { value: "livro", label: "Livro" },
  { value: "filme", label: "Filme" },
  { value: "jogo", label: "Jogo" },
  { value: "anime", label: "Anime" },
  { value: "serie", label: "Série" },
  { value: "dorama", label: "Dorama" },
  { value: "biografia", label: "Biografia" },
  { value: "tecnico", label: "Livro técnico" },
];

const STATUS_OPCOES = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
];

const ETAPAS_PIPELINE = [
  "curador_beu",
  "editor_beu",
  "diretor_criativo",
  "narrativa_cinematica",
  "heritage_prompt",
  "heritage_image",
  "capa_cinematica_prompt",
  "capa_cinematica_image",
  "pdf_cinematica",
];

const ETAPA_LABELS = {
  curador_beu: "Curador",
  editor_beu: "Editor",
  diretor_criativo: "Diretor Criativo",
  narrativa_cinematica: "Narrativa Cinematográfica",
  heritage_prompt: "Prompt Heritage",
  heritage_image: "Imagem Heritage",
  capa_cinematica_prompt: "Prompt Capa Cinemática",
  capa_cinematica_image: "Imagem Cinemática",
  pdf_cinematica: "PDF Cinemático",
  atualizar_dados: "Salvar/Atualizar dados da obra",
};

async function chamarExecutarEtapa(obraId, tipoEtapa) {
  const response = await fetch("/api/engine/executar-etapa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obraId, tipoEtapa }),
  });

  return response.json();
}

async function chamarAtualizarDados(obraId) {
  const response = await fetch("/api/engine/atualizar-dados-ausentes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obraId }),
  });

  return response.json();
}

function etapasFaltantesDaObra(obra) {
  const concluidas = new Set(obra.etapas_concluidas || []);
  const faltantes = ETAPAS_PIPELINE.filter((etapa) => !concluidas.has(etapa));

  // "Salvar/Atualizar dados da obra" sempre entra: é ela quem promove o
  // status de rascunho para ativo, e isso deve acontecer toda vez que a
  // obra é tocada, não só quando falta algum campo.
  return [...faltantes, "atualizar_dados"];
}

function todasAsEtapas() {
  return [...ETAPAS_PIPELINE, "atualizar_dados"];
}

function contarEtapasConcluidas(obra) {
  const concluidas = new Set(obra.etapas_concluidas || []);
  return ETAPAS_PIPELINE.filter((etapa) => concluidas.has(etapa)).length;
}

export default function EngineProcessarLote() {
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selecionadas, setSelecionadas] = useState({});
  const [processandoLote, setProcessandoLote] = useState(false);
  const [progresso, setProgresso] = useState(null);
  const [resultados, setResultados] = useState([]);

  const carregarObras = useCallback(async () => {
    setCarregando(true);

    try {
      const response = await fetch("/api/engine/listar-obras");
      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Erro ao listar obras.");
      }

      setObras(data.obras || []);
    } catch (error) {
      console.error("[ENGINE LOTE] erro ao carregar obras", error);
      toast.error(error.message || "Erro ao carregar obras.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarObras();
  }, [carregarObras]);

  const obrasFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();

    return obras.filter((obra) => {
      if (filtroTipo !== "todos" && obra.tipo_obra !== filtroTipo) return false;
      if (filtroStatus !== "todos" && obra.status !== filtroStatus) return false;
      if (buscaNormalizada && !String(obra.titulo || "").toLowerCase().includes(buscaNormalizada)) return false;
      return true;
    });
  }, [obras, busca, filtroTipo, filtroStatus]);

  const quantidadeSelecionada = useMemo(
    () => obrasFiltradas.filter((obra) => selecionadas[obra.id]).length,
    [obrasFiltradas, selecionadas],
  );

  function alternarSelecao(obraId) {
    setSelecionadas((atual) => ({ ...atual, [obraId]: !atual[obraId] }));
  }

  function selecionarVisiveis(valor) {
    setSelecionadas((atual) => {
      const proximo = { ...atual };
      obrasFiltradas.forEach((obra) => {
        proximo[obra.id] = valor;
      });
      return proximo;
    });
  }

  async function processarLote(modo) {
    const alvo = obrasFiltradas.filter((obra) => selecionadas[obra.id]);

    if (alvo.length === 0) {
      toast.error("Selecione ao menos uma obra.");
      return;
    }

    setProcessandoLote(true);
    setResultados([]);

    for (let indice = 0; indice < alvo.length; indice += 1) {
      const obra = alvo[indice];
      const etapas = modo === "todas" ? todasAsEtapas() : etapasFaltantesDaObra(obra);
      const etapasResultado = [];

      for (const etapa of etapas) {
        setProgresso({
          atual: indice + 1,
          total: alvo.length,
          obraTitulo: obra.titulo,
          etapaAtual: ETAPA_LABELS[etapa] || etapa,
        });

        const resultado = etapa === "atualizar_dados"
          ? await chamarAtualizarDados(obra.id)
          : await chamarExecutarEtapa(obra.id, etapa);

        const ok = Boolean(resultado?.ok);
        etapasResultado.push({
          etapa,
          ok,
          erro: ok ? null : (resultado?.error || "Erro desconhecido."),
        });

        if (!ok) break;
      }

      setResultados((atual) => [...atual, { obraId: obra.id, titulo: obra.titulo, etapas: etapasResultado }]);
    }

    setProgresso(null);
    setProcessandoLote(false);
    toast.success("Processamento em lote concluído.");
    carregarObras();
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Processar obras em lote</h1>
        <p className="mb-8 text-zinc-400">
          Selecione várias obras já cadastradas e rode a pipeline da Engine em sequência — sem precisar abrir uma por
          uma. Deixe esta aba aberta até o fim: o processamento roda aqui no navegador.
        </p>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título..."
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm outline-none focus:border-amber-400 sm:col-span-1"
            />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            >
              {TIPO_OBRA_OPCOES.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            >
              {STATUS_OPCOES.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => selecionarVisiveis(true)} className="font-semibold text-emerald-300 hover:underline">
                Marcar todas ({obrasFiltradas.length})
              </button>
              <button type="button" onClick={() => selecionarVisiveis(false)} className="font-semibold text-zinc-400 hover:underline">
                Desmarcar todas
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              {carregando ? "Carregando obras..." : `${obrasFiltradas.length} obra(s) na lista · ${quantidadeSelecionada} selecionada(s)`}
            </p>
          </div>

          <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2"> </th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Etapas</th>
                </tr>
              </thead>
              <tbody>
                {obrasFiltradas.map((obra) => {
                  const concluidas = contarEtapasConcluidas(obra);
                  return (
                    <tr key={obra.id} className="border-t border-zinc-800/70 hover:bg-black/30">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selecionadas[obra.id])}
                          onChange={() => alternarSelecao(obra.id)}
                          disabled={processandoLote}
                          className="h-4 w-4 rounded border-zinc-700 bg-black text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-zinc-100">{obra.titulo}</td>
                      <td className="px-3 py-2 text-zinc-400">{obra.tipo_obra}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          obra.status === "ativo"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-zinc-700/40 text-zinc-300"
                        }`}
                        >
                          {obra.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{concluidas}/{ETAPAS_PIPELINE.length}</td>
                    </tr>
                  );
                })}
                {!carregando && obrasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      Nenhuma obra encontrada com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={processandoLote || quantidadeSelecionada === 0}
              onClick={() => processarLote("todas")}
              className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
            >
              Atualizar todos os itens ({quantidadeSelecionada})
            </button>
            <button
              type="button"
              disabled={processandoLote || quantidadeSelecionada === 0}
              onClick={() => processarLote("faltantes")}
              className="rounded-xl border border-emerald-500/60 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              Atualizar somente os itens faltantes ({quantidadeSelecionada})
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            "Somente faltantes" pula etapas que essa obra já tem concluídas e vai direto para o que falta. Em
            ambos os modos, "Salvar/Atualizar dados da obra" roda sempre por último — é o que promove o status de
            rascunho para ativo.
          </p>
        </section>

        {progresso && (
          <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            <p className="font-semibold">
              Processando {progresso.atual}/{progresso.total} — {progresso.obraTitulo}
            </p>
            <p className="mt-1 text-amber-100/75">Etapa atual: {progresso.etapaAtual}</p>
          </section>
        )}

        {resultados.length > 0 && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado do lote ({resultados.length} obra{resultados.length === 1 ? "" : "s"} processada{resultados.length === 1 ? "" : "s"})
            </h2>
            <div className="space-y-3">
              {resultados.map((resultado) => {
                const falhou = resultado.etapas.some((etapa) => !etapa.ok);
                return (
                  <div
                    key={resultado.obraId}
                    className={`rounded-xl border p-4 ${falhou ? "border-red-900 bg-red-500/5" : "border-emerald-900 bg-emerald-500/5"}`}
                  >
                    <p className={`font-semibold ${falhou ? "text-red-200" : "text-emerald-200"}`}>
                      {resultado.titulo}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                      {resultado.etapas.map((etapa, indice) => (
                        <li key={`${resultado.obraId}-${etapa.etapa}-${indice}`}>
                          {etapa.ok ? "✓" : "✕"} {ETAPA_LABELS[etapa.etapa] || etapa.etapa}
                          {etapa.erro ? ` — ${etapa.erro}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
