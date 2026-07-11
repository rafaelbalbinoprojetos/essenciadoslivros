/* global process */

import OpenAI from "openai";
import { ENGINE_CONFIG } from "./engineConfig.js";
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

function criarConteudoUsuario({ contexto, schema, promptMontado }) {
  if (promptMontado) return promptMontado;

  return JSON.stringify(
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
  );
}

function criarMensagens({ agente, contexto, schema, promptMontado }) {
  return [
    {
      role: "system",
      content: agente.prompt_sistema,
    },
    {
      role: "user",
      content: criarConteudoUsuario({ contexto, schema, promptMontado }),
    },
  ];
}

async function executarChatCompletions({ agente, contexto, schema, promptMontado }) {
  const modelo = agente.modelo || ENGINE_CONFIG.modeloDefault;
  const temperatura = Number(agente.temperatura ?? 0.3);
  const mensagens = criarMensagens({ agente, contexto, schema, promptMontado });
  const saidaTextual = agente.formato_saida === "text";
  const inicio = Date.now();

  const resposta = await getOpenAIClient().chat.completions.create({
    model: modelo,
    temperature: temperatura,
    messages: mensagens,
    ...(saidaTextual ? {} : { response_format: { type: "json_object" } }),
  });

  const fim = Date.now();
  const conteudo = resposta.choices?.[0]?.message?.content;

  if (!conteudo) {
    throw new Error("A OpenAI não retornou conteúdo.");
  }

  if (saidaTextual) {
    return {
      saida: conteudo,
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

export async function executarAgenteOpenAI({
  agente,
  contexto,
  schema = null,
  modo = "chat_completions",
  promptMontado = null,
}) {
  if (!agente) {
    throw new Error("Agente é obrigatório.");
  }

  if (!contexto) {
    throw new Error("Contexto é obrigatório.");
  }

  if (modo !== "chat_completions") {
    throw new Error(`Modo OpenAI ainda não implementado: ${modo}`);
  }

  engineStep(agente?.nome || agente?.slug || "Agente IA", "→", {
    modo,
    modelo: agente.modelo || ENGINE_CONFIG.modeloDefault,
    prompt_montado: Boolean(promptMontado),
  });

  return executarChatCompletions({ agente, contexto, schema, promptMontado });
}
