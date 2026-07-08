/* global process */

import OpenAI from "openai";
import { ENGINE_CONFIG, isEngineMockEnabled } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

function extrairNomeAutor(contexto) {
  return contexto?.autoria?.autor?.nome || "Autoria não informada";
}

function criarBEUMock({ contexto, agente }) {
  const obra = contexto?.obra || {};
  const classificacao = contexto?.classificacao || {};
  const titulo = obra.titulo || "Obra sem título";
  const tipoObra = obra.tipo_obra || "livro";

  return {
    identificacao: {
      titulo,
      subtitulo: obra.subtitulo || null,
      tipo_obra: tipoObra,
      idioma_base: "pt-BR",
      versao_beu: ENGINE_CONFIG.versaoBEU,
      fonte: "engine_mock",
    },
    classificacao: {
      genero: classificacao.genero?.nome || null,
      colecao: classificacao.colecao?.nome || null,
      universo: classificacao.universo?.nome || null,
      franquia: classificacao.franquia?.nome || null,
    },
    autoria: {
      autor: extrairNomeAutor(contexto),
      papel_autoral: "Autor ou criador principal da obra",
    },
    narrativa: {
      premissa:
        obra.sinopse ||
        `Base editorial mockada para validar a pipeline da obra "${titulo}" sem consumir tokens da OpenAI.`,
      conflito_central:
        "Conflito central gerado em modo mock para validar persistência, execução e rastreabilidade da Engine.",
      temas: [
        "memória",
        "jornada",
        "transformação",
        "legado",
      ],
      personagens_principais: [],
      arco_emocional: [
        "convite",
        "descoberta",
        "conflito",
        "revelação",
        "legado",
      ],
    },
    editorial: {
      tom: "curatorial, objetivo e premium",
      promessa_editorial:
        "Transformar a obra em uma base reutilizável para PDF, narrativa cinematográfica, capas, Suno e metadados.",
      publico_alvo:
        "Leitores e exploradores culturais interessados em experiências editoriais guiadas por IA.",
      usos_previstos: [
        "pdf_editorial",
        "narrativa_cinematografica",
        "capas",
        "suno",
        "metadados",
      ],
    },
    metadados_engine: {
      agente: agente?.slug || "curador-ia",
      modelo: "mock-engine",
      gerado_em: new Date().toISOString(),
      mock: true,
    },
  };
}

function criarMensagens({ agente, contexto, schema }) {
  return [
    {
      role: "system",
      content: agente.prompt_sistema,
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          contexto,
          schema,
          instrucoes: {
            idioma: "pt-BR",
            formato: "JSON válido",
            nao_inventar_fatos: true,
          },
        },
        null,
        2,
      ),
    },
  ];
}

async function executarChatCompletions({ agente, contexto, schema }) {
  const modelo = agente.modelo || ENGINE_CONFIG.modeloDefault;
  const temperatura = Number(agente.temperatura ?? 0.3);
  const mensagens = criarMensagens({ agente, contexto, schema });
  const inicio = Date.now();

  const resposta = await getOpenAIClient().chat.completions.create({
    model: modelo,
    temperature: temperatura,
    messages: mensagens,
    response_format: { type: "json_object" },
  });

  const fim = Date.now();
  const conteudo = resposta.choices?.[0]?.message?.content;

  if (!conteudo) {
    throw new Error("A OpenAI não retornou conteúdo.");
  }

  let json;

  try {
    json = JSON.parse(conteudo);
  } catch {
    throw new Error("Resposta da OpenAI não é um JSON válido.");
  }

  return {
    saida: json,
    modelo,
    provider: "openai",
    modo: "chat_completions",
    tempo_ms: fim - inicio,
    tokens_input: resposta.usage?.prompt_tokens ?? null,
    tokens_output: resposta.usage?.completion_tokens ?? null,
    tokens_total: resposta.usage?.total_tokens ?? null,
    resposta_bruta: conteudo,
  };
}

async function executarMock({ agente, contexto }) {
  engineStep("Curador IA", "→", { modo: "mock" });
  engineStep("Mock", "✓", "OpenAI não será chamada nesta execução.");

  const saida = criarBEUMock({ contexto, agente });

  return {
    saida,
    modelo: "mock-engine",
    provider: "mock",
    modo: "mock",
    tempo_ms: 0,
    tokens_input: 0,
    tokens_output: 0,
    tokens_total: 0,
    resposta_bruta: JSON.stringify(saida),
  };
}

export async function executarAgenteOpenAI({
  agente,
  contexto,
  schema = null,
  modo = "chat_completions",
}) {
  if (!agente) {
    throw new Error("Agente é obrigatório.");
  }

  if (!contexto) {
    throw new Error("Contexto é obrigatório.");
  }

  if (isEngineMockEnabled()) {
    return executarMock({ agente, contexto });
  }

  if (modo !== "chat_completions") {
    throw new Error(`Modo OpenAI ainda não implementado: ${modo}`);
  }

  engineStep("Curador IA", "→", { modo, modelo: agente.modelo || ENGINE_CONFIG.modeloDefault });
  return executarChatCompletions({ agente, contexto, schema });
}
