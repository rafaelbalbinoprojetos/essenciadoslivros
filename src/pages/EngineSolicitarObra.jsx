import { useState } from "react";
import toast from "react-hot-toast";

export default function EngineSolicitarObra() {
  const [titulo, setTitulo] = useState("");
  const [tipoObra, setTipoObra] = useState("livro");
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

        {(criandoObra || executandoCurador || executandoEditor || executandoDiretor || executandoNarrativa || executandoHeritagePrompt || executandoCapaPrompt || atualizandoDados) && (
          <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
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
