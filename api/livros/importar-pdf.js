import { processarImportacaoPdf } from "../../server/engine/importacaoLoteService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido. Use POST.",
    });
  }

  try {
    const { storagePath, nomeArquivo } = req.body || {};

    if (!storagePath || !nomeArquivo) {
      return res.status(400).json({
        ok: false,
        error: "storagePath e nomeArquivo são obrigatórios.",
      });
    }

    const resultado = await processarImportacaoPdf({ storagePath, nomeArquivo });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro em /api/livros/importar-pdf:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
