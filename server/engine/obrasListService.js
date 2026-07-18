import { supabaseAdmin } from "./supabaseAdmin.js";

const CAMPOS_LIVRO = [
  "id",
  "titulo",
  "tipo_obra",
  "status",
  "capa_url",
  "capa_cinematica_url",
  "player_hero_url",
  "pdf_cinematica_url",
  "pdf_enciclopedico_url",
  "pdf_guia_editorial_url",
  "sinopse",
  "autor_id",
  "genero_id",
  "data_lancamento",
  "tem_experiencia_cinematica",
  "atualizado_em",
].join(", ");

// Etapas rastreadas via ai_pipeline_etapas. "atualizar_dados" fica de fora
// de propósito: não é uma etapa da pipeline (executarEtapaPipeline), é um
// endpoint próprio e deve sempre poder rodar de novo (ela é quem promove
// status rascunho -> ativo).
const ETAPAS_RASTREADAS = [
  "curador_beu",
  "editor_beu",
  "diretor_criativo",
  "narrativa_cinematica",
  "heritage_prompt",
  "heritage_image",
  "capa_cinematica_prompt",
  "capa_cinematica_image",
  "player_hero_image",
  "pdf_cinematica",
  "guia_editorial_parte1",
  "guia_editorial_parte2",
  "guia_editorial_parte3",
  "guia_editorial_pdf",
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
  "enciclopedia_pdf",
];

export async function listarObrasParaEngine() {
  const { data: livros, error: erroLivros } = await supabaseAdmin
    .from("livros")
    .select(CAMPOS_LIVRO)
    .order("titulo", { ascending: true });

  if (erroLivros) {
    throw new Error(`Erro ao listar obras: ${erroLivros.message}`);
  }

  const { data: etapas, error: erroEtapas } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("obra_id, tipo_etapa, tokens_input, tokens_output, custo_estimado")
    .eq("status", "concluido")
    .in("tipo_etapa", ETAPAS_RASTREADAS);

  if (erroEtapas) {
    throw new Error(`Erro ao listar etapas concluídas: ${erroEtapas.message}`);
  }

  const etapasConcluidasPorObra = new Map();
  const custosPorObra = new Map();

  (etapas || []).forEach((etapa) => {
    if (!etapasConcluidasPorObra.has(etapa.obra_id)) {
      etapasConcluidasPorObra.set(etapa.obra_id, new Set());
    }
    etapasConcluidasPorObra.get(etapa.obra_id).add(etapa.tipo_etapa);

    if (!custosPorObra.has(etapa.obra_id)) {
      custosPorObra.set(etapa.obra_id, { tokensInput: 0, tokensOutput: 0, custoUsd: 0 });
    }
    const custoObra = custosPorObra.get(etapa.obra_id);
    custoObra.tokensInput += etapa.tokens_input || 0;
    custoObra.tokensOutput += etapa.tokens_output || 0;
    custoObra.custoUsd += etapa.custo_estimado || 0;
  });

  return (livros || []).map((livro) => {
    const custo = custosPorObra.get(livro.id);
    return {
      ...livro,
      etapas_concluidas: [...(etapasConcluidasPorObra.get(livro.id) || [])],
      tokens_input_total: custo?.tokensInput ?? 0,
      tokens_output_total: custo?.tokensOutput ?? 0,
      custo_total_usd: custo ? Number(custo.custoUsd.toFixed(6)) : 0,
    };
  });
}
