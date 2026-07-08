// src/engine/context/buildContext.ts

import { createClient } from "@/lib/supabase/server";

export async function buildContext(obraId: string) {
  const supabase = createClient();

  const { data: obra, error } = await supabase
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
      tem_experiencia_cinematica,
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
    throw new Error("Obra não encontrada para montar contexto.");
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
    },

    autoria: {
      autor: obra.autores
        ? {
            id: obra.autores.id,
            nome: obra.autores.nome,
          }
        : null,
    },

    classificacao: {
      genero: obra.generos
        ? {
            id: obra.generos.id,
            nome: obra.generos.nome,
          }
        : null,

      colecao: obra.colecoes
        ? {
            id: obra.colecoes.id,
            nome: obra.colecoes.nome,
          }
        : null,

      universo: obra.universos
        ? {
            id: obra.universos.id,
            nome: obra.universos.nome,
            slug: obra.universos.slug,
            descricao: obra.universos.descricao,
          }
        : null,

      franquia: obra.franquias
        ? {
            id: obra.franquias.id,
            nome: obra.franquias.nome,
            slug: obra.franquias.slug,
            descricao: obra.franquias.descricao,
          }
        : null,
    },

    arquivos_existentes: {
      capa_url: obra.capa_url,
      capa_cinematica_url: obra.capa_cinematica_url,
    },

    instrucoes_contexto: {
      idioma_saida: "pt-BR",
      projeto: "Essência dos Livros",
      objetivo:
        "Construir uma Base Editorial Universal para alimentar PDF, narrativa cinematográfica, capas, Suno e metadados do site.",
    },
  };
}