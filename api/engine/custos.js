import { listarCustosIA } from "../../server/engine/custosService.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use GET.",
      });
    }

    const { porObra, porEtapa } = await listarCustosIA();

    return res.status(200).json({
      ok: true,
      porObra,
      porEtapa,
    });
  } catch (error) {
    console.error("Erro em /api/engine/custos:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
