import { executarEtapaPipeline } from "../../server/engine/pipelineExecutor.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use POST.",
      });
    }

    const { obraId, tipoEtapa = "curador_beu" } = req.body || {};

    if (!obraId) {
      return res.status(400).json({
        ok: false,
        error: "obraId é obrigatório.",
      });
    }

    const resultado = await executarEtapaPipeline({
      obraId,
      tipoEtapa,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro em /api/engine/executar-etapa:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
