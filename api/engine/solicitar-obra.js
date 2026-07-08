import { supabaseAdmin } from "../../server/engine/supabaseAdmin.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use POST.",
      });
    }

    const { titulo, tipo_obra = "livro", sinopse = null } = req.body || {};

    if (!titulo || titulo.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        error: "Título da obra é obrigatório.",
      });
    }

    const { data: livro, error: livroError } = await supabaseAdmin
      .from("livros")
      .insert({
        titulo: titulo.trim(),
        tipo_obra,
        sinopse,
        status: "rascunho",
        destaque: false,
        tem_experiencia_cinematica: false,
      })
      .select("id, titulo, tipo_obra, status")
      .single();

    if (livroError) {
      throw new Error(livroError.message);
    }

    return res.status(200).json({
      ok: true,
      mensagem: "Obra solicitada e criada como rascunho.",
      livro,
      proxima_etapa: "curador_beu",
    });
  } catch (error) {
    console.error("Erro em /api/engine/solicitar-obra:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
