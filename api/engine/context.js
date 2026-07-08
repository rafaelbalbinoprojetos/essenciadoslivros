import { buildContext } from "./contextBuilder.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use POST.",
      });
    }

    const { obraId } = req.body || {};

    if (!obraId) {
      return res.status(400).json({
        ok: false,
        error: "obraId é obrigatório.",
      });
    }

    const contexto = await buildContext(obraId);

    return res.status(200).json({
      ok: true,
      contexto,
    });
  } catch (error) {
    console.error("Erro em /api/engine/context:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}