import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ETAPAS_PIPELINE, ETAPA_LABELS, ETAPA_LABELS_CURTOS } from "../constants/engineEtapas.js";
import { formatarTokens, formatarCustoUsd } from "../utils/engineCusto.js";

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

const ETAPAS_SELECIONAVEIS = [...ETAPAS_PIPELINE, "atualizar_dados"];

function criarSelecaoDeEtapas(valor) {
  return Object.fromEntries(ETAPAS_SELECIONAVEIS.map((etapa) => [etapa, valor]));
}

function contarEtapasConcluidas(obra) {
  const concluidas = new Set(obra.etapas_concluidas || []);
  return ETAPAS_PIPELINE.filter((etapa) => concluidas.has(etapa)).length;
}

function valorOrdenavel(obra, coluna) {
  if (coluna === "titulo") return (obra.titulo || "").toLowerCase();
  if (coluna === "tipo_obra") return (obra.tipo_obra || "").toLowerCase();
  if (coluna === "status") return (obra.status || "").toLowerCase();
  if (coluna === "total") return contarEtapasConcluidas(obra);
  if (coluna === "custo_total_usd") return Number(obra.custo_total_usd) || 0;
  if (ETAPAS_PIPELINE.includes(coluna)) {
    return new Set(obra.etapas_concluidas || []).has(coluna) ? 1 : 0;
  }
  return "";
}

function IndicadorOrdenacao({ coluna, ordenacao }) {
  if (ordenacao.coluna !== coluna) return null;
  return <span className="ml-1 inline-block">{ordenacao.direcao === "asc" ? "▲" : "▼"}</span>;
}

function EtapaSelector({ selectedSteps, onToggle, onSelectAll, disabled }) {
  return (
    <div className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-200">Selecione quais etapas processar</p>
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
        {ETAPAS_SELECIONAVEIS.map((etapa) => (
          <label
            key={etapa}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          >
            <input
              type="checkbox"
              checked={Boolean(selectedSteps[etapa])}
              onChange={() => onToggle(etapa)}
              disabled={disabled}
              className="h-4 w-4 rounded border-zinc-700 bg-black text-amber-500 focus:ring-amber-500"
            />
            {ETAPA_LABELS[etapa]}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function EngineProcessarLote() {
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selecionadas, setSelecionadas] = useState({});
  const [selectedSteps, setSelectedSteps] = useState(() => criarSelecaoDeEtapas(true));
  const [processandoLote, setProcessandoLote] = useState(false);
  const [progresso, setProgresso] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: "asc" });

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

  const obrasOrdenadas = useMemo(() => {
    if (!ordenacao.coluna) return obrasFiltradas;

    const fator = ordenacao.direcao === "asc" ? 1 : -1;

    return [...obrasFiltradas].sort((a, b) => {
      const valorA = valorOrdenavel(a, ordenacao.coluna);
      const valorB = valorOrdenavel(b, ordenacao.coluna);

      if (valorA < valorB) return -1 * fator;
      if (valorA > valorB) return 1 * fator;
      return 0;
    });
  }, [obrasFiltradas, ordenacao]);

  const quantidadeSelecionada = useMemo(
    () => obrasFiltradas.filter((obra) => selecionadas[obra.id]).length,
    [obrasFiltradas, selecionadas],
  );

  const etapasSelecionadas = useMemo(
    () => ETAPAS_SELECIONAVEIS.filter((etapa) => selectedSteps[etapa]),
    [selectedSteps],
  );

  function alternarSelecao(obraId) {
    setSelecionadas((atual) => ({ ...atual, [obraId]: !atual[obraId] }));
  }

  function alternarEtapaSelecionada(etapa) {
    setSelectedSteps((atual) => ({ ...atual, [etapa]: !atual[etapa] }));
  }

  function definirTodasAsEtapas(valor) {
    setSelectedSteps(criarSelecaoDeEtapas(valor));
  }

  function alternarOrdenacao(coluna) {
    setOrdenacao((atual) => {
      if (atual.coluna !== coluna) return { coluna, direcao: "asc" };
      return { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" };
    });
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

    if (etapasSelecionadas.length === 0) {
      toast.error("Selecione ao menos uma etapa para processar.");
      return;
    }

    setProcessandoLote(true);
    setResultados([]);

    for (let indice = 0; indice < alvo.length; indice += 1) {
      const obra = alvo[indice];
      const concluidasObra = new Set(obra.etapas_concluidas || []);
      const etapas = modo === "faltantes"
        ? etapasSelecionadas.filter((etapa) => !concluidasObra.has(etapa))
        : etapasSelecionadas;
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
          tokens: resultado?.tokens || null,
          modelo: resultado?.modelo || null,
          custoEstimado: typeof resultado?.custoEstimado === "number" ? resultado.custoEstimado : null,
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
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => alternarOrdenacao("titulo")} className="flex items-center hover:text-zinc-200">
                      Título
                      <IndicadorOrdenacao coluna="titulo" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => alternarOrdenacao("tipo_obra")} className="flex items-center hover:text-zinc-200">
                      Tipo
                      <IndicadorOrdenacao coluna="tipo_obra" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => alternarOrdenacao("status")} className="flex items-center hover:text-zinc-200">
                      Status
                      <IndicadorOrdenacao coluna="status" ordenacao={ordenacao} />
                    </button>
                  </th>
                  {ETAPAS_PIPELINE.map((etapa) => (
                    <th key={etapa} className="whitespace-nowrap px-2 py-2 text-center" title={ETAPA_LABELS[etapa]}>
                      <button type="button" onClick={() => alternarOrdenacao(etapa)} className="mx-auto flex items-center hover:text-zinc-200">
                        {ETAPA_LABELS_CURTOS[etapa]}
                        <IndicadorOrdenacao coluna={etapa} ordenacao={ordenacao} />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">
                    <button type="button" onClick={() => alternarOrdenacao("total")} className="mx-auto flex items-center hover:text-zinc-200">
                      Total
                      <IndicadorOrdenacao coluna="total" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button type="button" onClick={() => alternarOrdenacao("custo_total_usd")} className="ml-auto flex items-center hover:text-zinc-200">
                      Custo
                      <IndicadorOrdenacao coluna="custo_total_usd" ordenacao={ordenacao} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {obrasOrdenadas.map((obra) => {
                  const concluidas = contarEtapasConcluidas(obra);
                  const concluidasSet = new Set(obra.etapas_concluidas || []);
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
                      {ETAPAS_PIPELINE.map((etapa) => {
                        const feita = concluidasSet.has(etapa);
                        return (
                          <td key={etapa} className="px-2 py-2 text-center" title={ETAPA_LABELS[etapa]}>
                            <span className={feita ? "font-semibold text-emerald-400" : "text-zinc-700"}>
                              {feita ? "✓" : "—"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center text-zinc-400">{concluidas}/{ETAPAS_PIPELINE.length}</td>
                      <td className="px-3 py-2 text-right text-zinc-400" title={`${formatarTokens(obra.tokens_input_total)} tokens in / ${formatarTokens(obra.tokens_output_total)} tokens out`}>
                        {formatarCustoUsd(obra.custo_total_usd)}
                      </td>
                    </tr>
                  );
                })}
                {!carregando && obrasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={6 + ETAPAS_PIPELINE.length} className="px-3 py-6 text-center text-zinc-500">
                      Nenhuma obra encontrada com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <EtapaSelector
            selectedSteps={selectedSteps}
            onToggle={alternarEtapaSelecionada}
            onSelectAll={definirTodasAsEtapas}
            disabled={processandoLote}
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={processandoLote || quantidadeSelecionada === 0 || etapasSelecionadas.length === 0}
              onClick={() => processarLote("todas")}
              className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
            >
              Atualizar todos os itens selecionados ({quantidadeSelecionada} obra{quantidadeSelecionada === 1 ? "" : "s"} · {etapasSelecionadas.length} etapa{etapasSelecionadas.length === 1 ? "" : "s"})
            </button>
            <button
              type="button"
              disabled={processandoLote || quantidadeSelecionada === 0 || etapasSelecionadas.length === 0}
              onClick={() => processarLote("faltantes")}
              className="rounded-xl border border-emerald-500/60 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              Atualizar somente os itens faltantes ({quantidadeSelecionada} obra{quantidadeSelecionada === 1 ? "" : "s"} · {etapasSelecionadas.length} etapa{etapasSelecionadas.length === 1 ? "" : "s"})
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Só as etapas marcadas acima são processadas. "Somente faltantes" pula, entre as etapas marcadas, as que
            essa obra já tem concluídas e vai direto para o que falta.
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Resultado do lote ({resultados.length} obra{resultados.length === 1 ? "" : "s"} processada{resultados.length === 1 ? "" : "s"})
              </h2>
              <p className="text-xs font-semibold text-amber-300">
                Custo desta execução: {formatarCustoUsd(
                  resultados.reduce(
                    (soma, r) => soma + r.etapas.reduce((s, e) => s + (e.custoEstimado || 0), 0),
                    0,
                  ),
                )}
              </p>
            </div>
            <div className="space-y-3">
              {resultados.map((resultado) => {
                const falhou = resultado.etapas.some((etapa) => !etapa.ok);
                const custoObra = resultado.etapas.reduce((soma, e) => soma + (e.custoEstimado || 0), 0);
                return (
                  <div
                    key={resultado.obraId}
                    className={`rounded-xl border p-4 ${falhou ? "border-red-900 bg-red-500/5" : "border-emerald-900 bg-emerald-500/5"}`}
                  >
                    <p className={`flex items-center justify-between font-semibold ${falhou ? "text-red-200" : "text-emerald-200"}`}>
                      <span>{resultado.titulo}</span>
                      {custoObra > 0 && (
                        <span className="text-xs font-normal text-zinc-400">{formatarCustoUsd(custoObra)}</span>
                      )}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                      {resultado.etapas.map((etapa, indice) => {
                        const tokens = etapa.tokens;
                        const temTokens = tokens && (tokens.input || tokens.output);
                        return (
                          <li key={`${resultado.obraId}-${etapa.etapa}-${indice}`}>
                            {etapa.ok ? "✓" : "✕"} {ETAPA_LABELS[etapa.etapa] || etapa.etapa}
                            {etapa.erro ? ` — ${etapa.erro}` : ""}
                            {etapa.ok && temTokens && (
                              <span className="text-zinc-500">
                                {" "}· {formatarTokens(tokens.input)} in / {formatarTokens(tokens.output)} out tokens
                                {etapa.modelo ? ` · ${etapa.modelo}` : ""}
                                {typeof etapa.custoEstimado === "number" ? ` · ${formatarCustoUsd(etapa.custoEstimado)}` : ""}
                              </span>
                            )}
                          </li>
                        );
                      })}
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
