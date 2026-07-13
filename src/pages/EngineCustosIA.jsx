import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight } from "lucide-react";
import { labelEtapa } from "../constants/engineEtapas.js";
import { formatarTokens, formatarCustoUsd } from "../utils/engineCusto.js";

function formatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function IndicadorOrdenacao({ coluna, ordenacao }) {
  if (ordenacao.coluna !== coluna) return null;
  return <span className="ml-1 inline-block">{ordenacao.direcao === "asc" ? "▲" : "▼"}</span>;
}

function valorOrdenavel(obra, coluna) {
  if (coluna === "titulo") return (obra.obra_titulo || "").toLowerCase();
  if (coluna === "etapas") return Number(obra.etapas_registradas) || 0;
  if (coluna === "tokens_input") return Number(obra.tokens_input_total) || 0;
  if (coluna === "tokens_output") return Number(obra.tokens_output_total) || 0;
  if (coluna === "custo") return Number(obra.custo_total_usd) || 0;
  return "";
}

export default function EngineCustosIA() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [porObra, setPorObra] = useState([]);
  const [porEtapa, setPorEtapa] = useState([]);
  const [busca, setBusca] = useState("");
  const [expandidas, setExpandidas] = useState(() => new Set());
  const [ordenacao, setOrdenacao] = useState({ coluna: "custo", direcao: "desc" });

  const carregarCustos = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const response = await fetch("/api/engine/custos");
      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Erro ao carregar custos de IA.");
      }

      setPorObra(data.porObra || []);
      setPorEtapa(data.porEtapa || []);
    } catch (error) {
      console.error("[ENGINE CUSTOS] erro ao carregar", error);
      setErro(error.message || "Erro ao carregar custos de IA.");
      toast.error(error.message || "Erro ao carregar custos de IA.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCustos();
  }, [carregarCustos]);

  const etapasPorObra = useMemo(() => {
    const mapa = new Map();
    porEtapa.forEach((etapa) => {
      if (!mapa.has(etapa.obra_id)) mapa.set(etapa.obra_id, []);
      mapa.get(etapa.obra_id).push(etapa);
    });
    mapa.forEach((lista) => lista.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    return mapa;
  }, [porEtapa]);

  const obrasFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    if (!buscaNormalizada) return porObra;
    return porObra.filter((obra) => String(obra.obra_titulo || "").toLowerCase().includes(buscaNormalizada));
  }, [porObra, busca]);

  const obrasOrdenadas = useMemo(() => {
    const fator = ordenacao.direcao === "asc" ? 1 : -1;
    return [...obrasFiltradas].sort((a, b) => {
      const valorA = valorOrdenavel(a, ordenacao.coluna);
      const valorB = valorOrdenavel(b, ordenacao.coluna);
      if (valorA < valorB) return -1 * fator;
      if (valorA > valorB) return 1 * fator;
      return 0;
    });
  }, [obrasFiltradas, ordenacao]);

  const totais = useMemo(
    () =>
      porObra.reduce(
        (acc, obra) => ({
          tokensInput: acc.tokensInput + (Number(obra.tokens_input_total) || 0),
          tokensOutput: acc.tokensOutput + (Number(obra.tokens_output_total) || 0),
          custoUsd: acc.custoUsd + (Number(obra.custo_total_usd) || 0),
        }),
        { tokensInput: 0, tokensOutput: 0, custoUsd: 0 },
      ),
    [porObra],
  );

  function alternarOrdenacao(coluna) {
    setOrdenacao((atual) => {
      if (atual.coluna !== coluna) return { coluna, direcao: coluna === "titulo" ? "asc" : "desc" };
      return { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" };
    });
  }

  function alternarExpansao(obraId) {
    setExpandidas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(obraId)) proximo.delete(obraId);
      else proximo.add(obraId);
      return proximo;
    });
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Custos de IA</h1>
        <p className="mb-8 text-zinc-400">
          Tokens consumidos e custo estimado (USD) de cada etapa da Engine, por obra. Os valores dependem da tabela{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-amber-300">ai_precos_modelo</code> estar preenchida
          com os preços vigentes de cada modelo.
        </p>

        {erro && (
          <section className="mb-6 rounded-2xl border border-red-900 bg-red-500/5 p-5 text-sm text-red-200">
            <p className="font-semibold">Não foi possível carregar os custos.</p>
            <p className="mt-1 text-red-200/80">{erro}</p>
            <p className="mt-2 text-xs text-red-200/60">
              Se a tabela <code>ai_precos_modelo</code> ou as views ainda não existem, rode{" "}
              <code>src/sql/engine_custos_ia.sql</code> no SQL Editor do Supabase.
            </p>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Obras com registro</p>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{porObra.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Tokens (entrada / saída)</p>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {formatarTokens(totais.tokensInput)} <span className="text-zinc-600">/</span> {formatarTokens(totais.tokensOutput)}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-amber-300/80">Custo total estimado</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{formatarCustoUsd(totais.custoUsd)}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full max-w-xs rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            />
            <p className="text-xs text-zinc-500">
              {carregando ? "Carregando..." : `${obrasFiltradas.length} obra(s)`}
            </p>
          </div>

          <div className="max-h-[600px] overflow-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 w-8"> </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => alternarOrdenacao("titulo")} className="flex items-center hover:text-zinc-200">
                      Obra
                      <IndicadorOrdenacao coluna="titulo" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-center">
                    <button type="button" onClick={() => alternarOrdenacao("etapas")} className="mx-auto flex items-center hover:text-zinc-200">
                      Etapas
                      <IndicadorOrdenacao coluna="etapas" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button type="button" onClick={() => alternarOrdenacao("tokens_input")} className="ml-auto flex items-center hover:text-zinc-200">
                      Tokens in
                      <IndicadorOrdenacao coluna="tokens_input" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button type="button" onClick={() => alternarOrdenacao("tokens_output")} className="ml-auto flex items-center hover:text-zinc-200">
                      Tokens out
                      <IndicadorOrdenacao coluna="tokens_output" ordenacao={ordenacao} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button type="button" onClick={() => alternarOrdenacao("custo")} className="ml-auto flex items-center hover:text-zinc-200">
                      Custo (USD)
                      <IndicadorOrdenacao coluna="custo" ordenacao={ordenacao} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {obrasOrdenadas.map((obra) => {
                  const expandida = expandidas.has(obra.obra_id);
                  const etapas = etapasPorObra.get(obra.obra_id) || [];
                  return (
                    <Fragment key={obra.obra_id}>
                      <tr
                        className="cursor-pointer border-t border-zinc-800/70 hover:bg-black/30"
                        onClick={() => alternarExpansao(obra.obra_id)}
                      >
                        <td className="px-3 py-2 text-zinc-500">
                          {expandida ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-3 py-2 font-medium text-zinc-100">{obra.obra_titulo}</td>
                        <td className="px-3 py-2 text-center text-zinc-400">{obra.etapas_registradas}</td>
                        <td className="px-3 py-2 text-right text-zinc-400">{formatarTokens(obra.tokens_input_total)}</td>
                        <td className="px-3 py-2 text-right text-zinc-400">{formatarTokens(obra.tokens_output_total)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-300">{formatarCustoUsd(obra.custo_total_usd)}</td>
                      </tr>
                      {expandida && (
                        <tr className="border-t border-zinc-800/70 bg-black/20">
                          <td colSpan={6} className="px-3 py-3">
                            <table className="w-full text-left text-xs">
                              <thead className="text-[11px] uppercase tracking-wider text-zinc-600">
                                <tr>
                                  <th className="px-2 py-1.5">Etapa</th>
                                  <th className="px-2 py-1.5">Status</th>
                                  <th className="px-2 py-1.5">Modelo</th>
                                  <th className="px-2 py-1.5 text-right">Tokens in</th>
                                  <th className="px-2 py-1.5 text-right">Tokens out</th>
                                  <th className="px-2 py-1.5 text-right">Custo</th>
                                  <th className="px-2 py-1.5">Concluído em</th>
                                </tr>
                              </thead>
                              <tbody>
                                {etapas.map((etapa) => (
                                  <tr key={etapa.etapa_id} className="border-t border-zinc-800/50">
                                    <td className="px-2 py-1.5 text-zinc-200">{labelEtapa(etapa.tipo_etapa)}</td>
                                    <td className="px-2 py-1.5">
                                      <span
                                        className={
                                          etapa.status === "concluido"
                                            ? "text-emerald-400"
                                            : etapa.status === "erro"
                                              ? "text-red-400"
                                              : "text-zinc-500"
                                        }
                                      >
                                        {etapa.status}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-zinc-400">{etapa.modelo || "—"}</td>
                                    <td className="px-2 py-1.5 text-right text-zinc-400">{formatarTokens(etapa.tokens_input)}</td>
                                    <td className="px-2 py-1.5 text-right text-zinc-400">{formatarTokens(etapa.tokens_output)}</td>
                                    <td className="px-2 py-1.5 text-right text-amber-300">{formatarCustoUsd(etapa.custo_estimado_usd)}</td>
                                    <td className="px-2 py-1.5 text-zinc-500">{formatarData(etapa.completed_at)}</td>
                                  </tr>
                                ))}
                                {etapas.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="px-2 py-3 text-center text-zinc-600">
                                      Nenhuma etapa registrada.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!carregando && obrasOrdenadas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                      Nenhum custo registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
