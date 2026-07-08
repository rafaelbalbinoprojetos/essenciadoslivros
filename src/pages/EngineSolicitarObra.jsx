import { useState } from "react";
import toast from "react-hot-toast";

export default function EngineSolicitarObra() {
  const [titulo, setTitulo] = useState("");
  const [tipoObra, setTipoObra] = useState("livro");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function solicitarObra(e) {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
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

      if (!data.ok) {
        throw new Error(data.error || "Erro ao solicitar obra.");
      }

      setResultado(data);
      toast.success("Obra criada como rascunho!");
      setTitulo("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

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
            {loading ? "Criando obra..." : "Solicitar obra"}
          </button>
        </form>

        {resultado && (
          <pre className="mt-6 bg-black border border-zinc-800 rounded-2xl p-5 overflow-auto text-sm text-emerald-300">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}