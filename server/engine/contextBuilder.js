import { supabaseAdmin } from "./supabaseAdmin.js";

export async function buildContext(obraId) {
  if (!obraId) {
    throw new Error("obraId é obrigatório.");
  }

  const { data: obra, error } = await supabaseAdmin
    .from("livros")
    .select(`
      id,
      titulo,
      subtitulo,
      sinopse,
      data_lancamento,
      tipo_obra,
      capa_url,
      capa_cinematica_url,
      player_hero_url,
      heritage_prompt,
      capa_cinematica_prompt,
      player_hero_prompt,
      tem_experiencia_cinematica,
      titulo_cinematico,
      descricao_cinematica,
      autores (
        id,
        nome
      ),
      generos (
        id,
        nome
      ),
      colecoes (
        id,
        nome
      ),
      universos (
        id,
        nome,
        slug,
        descricao
      ),
      franquias (
        id,
        nome,
        slug,
        descricao
      )
    `)
    .eq("id", obraId)
    .single();

  if (error || !obra) {
    throw new Error(`Obra não encontrada: ${error?.message || obraId}`);
  }

  return {
    obra: {
      id: obra.id,
      titulo: obra.titulo,
      subtitulo: obra.subtitulo,
      sinopse: obra.sinopse,
      tipo_obra: obra.tipo_obra,
      data_lancamento: obra.data_lancamento,
      tem_experiencia_cinematica: obra.tem_experiencia_cinematica,
      titulo_cinematico: obra.titulo_cinematico,
      descricao_cinematica: obra.descricao_cinematica,
    },
    autoria: {
      autor: obra.autores || null,
    },
    classificacao: {
      genero: obra.generos || null,
      colecao: obra.colecoes || null,
      universo: obra.universos || null,
      franquia: obra.franquias || null,
    },
    arquivos_existentes: {
      capa_url: obra.capa_url,
      capa_cinematica_url: obra.capa_cinematica_url,
      player_hero_url: obra.player_hero_url,
    },
    prompts_imagem: {
      heritage_prompt: obra.heritage_prompt,
      capa_cinematica_prompt: obra.capa_cinematica_prompt,
      player_hero_prompt: obra.player_hero_prompt,
    },
    instrucoes_contexto: {
      idioma_saida: "pt-BR",
      projeto: "Essência dos Livros",
      objetivo:
        "Criar uma Base Editorial Universal para alimentar PDF, narrativa cinematográfica, capas, Suno e metadados do site.",
    },
  };
}
