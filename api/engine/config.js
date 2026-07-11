import {
  definirEngineTestes,
  obterEngineConfigDinamica,
} from "../../server/engine/engineConfigService.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const config = await obterEngineConfigDinamica();
      return res.status(200).json({ ok: true, ...config });
    }

    if (req.method === "POST") {
      const { testes } = req.body || {};

      if (typeof testes !== "boolean") {
        return res.status(400).json({
          ok: false,
          error: "testes é obrigatório e deve ser booleano.",
        });
      }

      const config = await definirEngineTestes(testes);
      return res.status(200).json({ ok: true, ...config });
    }

    return res.status(405).json({
      ok: false,
      error: "Método não permitido. Use GET ou POST.",
    });
  } catch (error) {
    console.error("Erro em /api/engine/config:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
