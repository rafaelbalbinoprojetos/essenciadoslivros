import { listarObrasParaEngine } from "../../server/engine/obrasListService.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use GET.",
      });
    }

    const obras = await listarObrasParaEngine();

    return res.status(200).json({
      ok: true,
      obras,
    });
  } catch (error) {
    console.error("Erro em /api/engine/listar-obras:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
