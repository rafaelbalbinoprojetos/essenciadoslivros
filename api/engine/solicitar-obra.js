import { supabaseAdmin } from "../../server/engine/supabaseAdmin.js";

function normalizarTituloParaComparacao(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use POST.",
      });
    }

    const { titulo, tipo_obra = "livro", sinopse = null } = req.body || {};
    const tituloLimpo = String(titulo || "").trim();
    const tituloNormalizado = normalizarTituloParaComparacao(tituloLimpo);

    if (!tituloLimpo || tituloLimpo.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "Título da obra é obrigatório.",
      });
    }

    console.log("[ENGINE] solicitar-obra titulo normalizado", {
      titulo: tituloLimpo,
      tituloNormalizado,
      tipo_obra,
    });

    const { data: candidatas, error: candidatasError } = await supabaseAdmin
      .from("livros")
      .select("id, titulo, tipo_obra, status")
      .eq("tipo_obra", tipo_obra)
      .neq("status", "excluido");

    if (candidatasError) {
      throw new Error(candidatasError.message);
    }

    const existente = (candidatas || []).find((item) => (
      normalizarTituloParaComparacao(item.titulo) === tituloNormalizado
    ));

    if (existente) {
      console.log("[ENGINE] solicitar-obra obra existente encontrada", {
        id: existente.id,
        titulo: existente.titulo,
        tituloNormalizado,
      });

      return res.status(200).json({
        ok: true,
        existente: true,
        mensagem: "Obra já existente encontrada.",
        livro: existente,
        proxima_etapa: "curador_beu",
      });
    }

    console.log("[ENGINE] solicitar-obra nenhuma obra existente encontrada", {
      tituloNormalizado,
      tipo_obra,
    });

    const { data: livro, error: livroError } = await supabaseAdmin
      .from("livros")
      .insert({
        titulo: tituloLimpo,
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
      existente: false,
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
