import { supabaseAdmin } from "./supabaseAdmin.js";

const CAMPOS_LIVRO = [
  "id",
  "titulo",
  "tipo_obra",
  "status",
  "capa_url",
  "capa_cinematica_url",
  "pdf_cinematica_url",
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
  "pdf_cinematica",
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
    .select("obra_id, tipo_etapa")
    .eq("status", "concluido")
    .in("tipo_etapa", ETAPAS_RASTREADAS);

  if (erroEtapas) {
    throw new Error(`Erro ao listar etapas concluídas: ${erroEtapas.message}`);
  }

  const etapasConcluidasPorObra = new Map();

  (etapas || []).forEach((etapa) => {
    if (!etapasConcluidasPorObra.has(etapa.obra_id)) {
      etapasConcluidasPorObra.set(etapa.obra_id, new Set());
    }
    etapasConcluidasPorObra.get(etapa.obra_id).add(etapa.tipo_etapa);
  });

  return (livros || []).map((livro) => ({
    ...livro,
    etapas_concluidas: [...(etapasConcluidasPorObra.get(livro.id) || [])],
  }));
}
