import { useState } from "react";
import toast from "react-hot-toast";

export default function EngineSolicitarObra() {
  const [titulo, setTitulo] = useState("");
  const [tipoObra, setTipoObra] = useState("livro");
  const [criandoObra, setCriandoObra] = useState(false);
  const [executandoCurador, setExecutandoCurador] = useState(false);
  const [resultadoCriacao, setResultadoCriacao] = useState(null);
  const [resultadoCurador, setResultadoCurador] = useState(null);

  async function solicitarObra(e) {
    e.preventDefault();
    let curadorFoiIniciado = false;
    setCriandoObra(true);
    setExecutandoCurador(false);
    setResultadoCriacao(null);
    setResultadoCurador(null);

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
      toast.success("Obra criada como rascunho!");
      setTitulo("");

      const obraId = data?.livro?.id;

      if (!obraId) {
        throw new Error("Obra criada, mas o id não foi retornado pela API.");
      }

      setCriandoObra(false);
      setExecutandoCurador(true);
      curadorFoiIniciado = true;
      console.log("[ENGINE] iniciando executar-etapa", data.livro?.id);

      const etapaResponse = await fetch("/api/engine/executar-etapa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          obraId,
          tipoEtapa: "curador_beu",
        }),
      });

      const etapaData = await etapaResponse.json();
      console.log("[ENGINE] resposta executar-etapa", etapaData);
      setResultadoCurador(etapaData);

      if (!etapaResponse.ok || etapaData?.ok === false) {
        throw new Error(etapaData.error || "Erro ao executar curador_beu.");
      }

      toast.success("Curador IA executado em modo Engine!");
    } catch (error) {
      console.error("[ENGINE] erro no fluxo", error);
      toast.error(error.message);
      if (curadorFoiIniciado) {
        setResultadoCurador((atual) => atual || {
          ok: false,
          etapa: "curador_beu",
          error: error.message,
        });
      }
    } finally {
      setCriandoObra(false);
      setExecutandoCurador(false);
    }
  }

  const loading = criandoObra || executandoCurador;

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
                : "Solicitar obra"}
          </button>
        </form>

        {(criandoObra || executandoCurador) && (
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
          </div>
        )}

        {resultadoCriacao && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Resultado da criação da obra
            </h2>
            <pre className="bg-black border border-zinc-800 rounded-2xl p-5 overflow-auto text-sm text-emerald-300">
              {JSON.stringify(resultadoCriacao, null, 2)}
            </pre>
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
      </div>
    </div>
  );
}
