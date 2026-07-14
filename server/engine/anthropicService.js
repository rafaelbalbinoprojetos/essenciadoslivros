/* global process */

import Anthropic from "@anthropic-ai/sdk";
import { ENGINE_CONFIG } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";

let anthropicClient = null;

function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: {
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
  });

  return anthropicClient;
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

// O prompt_sistema é marcado com cache_control: ephemeral.
// A Anthropic armazena o processamento desse bloco por até 5 minutos
// (renovável a cada hit). Chamadas subsequentes com o mesmo conteúdo
// pagam 10% do preço normal de input tokens para esse bloco.
// Só os tokens variáveis (contexto da obra, BEU, prompt montado)
// são cobrados integralmente.
function criarBlocoSistema(promptSistema) {
  return [
    {
      type: "text",
      text: promptSistema,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function extrairUso(usage) {
  const input = usage?.input_tokens ?? null;
  const output = usage?.output_tokens ?? null;
  const cacheWrite = usage?.cache_creation_input_tokens ?? 0;
  const cacheRead = usage?.cache_read_input_tokens ?? 0;

  return {
    tokens_input: input,
    tokens_output: output,
    tokens_total: (input ?? 0) + (output ?? 0),
    cache_write_tokens: cacheWrite,
    cache_read_tokens: cacheRead,
    // Tokens efetivamente cobrados a preço cheio de input
    tokens_input_cobrados: (input ?? 0) - cacheRead,
  };
}

async function executarMessages({ agente, contexto, schema, promptMontado }) {
  const modelo = agente.modelo || ENGINE_CONFIG.modeloAnthropicDefault || "claude-sonnet-4-6";
  const temperatura = Number(agente.temperatura ?? 0.3);
  const saidaTextual = agente.formato_saida === "text";
  const inicio = Date.now();

  const conteudoUsuario = criarConteudoUsuario({ contexto, schema, promptMontado });
  const blocoSistema = criarBlocoSistema(agente.prompt_sistema);

  const resposta = await getAnthropicClient().messages.create({
    model: modelo,
    max_tokens: 8000,
    temperature: temperatura,
    system: blocoSistema,
    messages: [{ role: "user", content: conteudoUsuario }],
  });

  const fim = Date.now();
  const conteudo = resposta.content?.[0]?.text;

  if (!conteudo) {
    throw new Error("A Anthropic não retornou conteúdo.");
  }

  const uso = extrairUso(resposta.usage);

  engineStep("Anthropic — uso de tokens", "→", {
    modelo,
    tokens_input: uso.tokens_input,
    tokens_output: uso.tokens_output,
    cache_write: uso.cache_write_tokens,
    cache_read: uso.cache_read_tokens,
    tokens_cobrados_cheio: uso.tokens_input_cobrados,
  });

  if (saidaTextual) {
    return {
      saida: conteudo,
      modelo,
      provider: "anthropic",
      modo: "messages",
      tempo_ms: fim - inicio,
      tokens_input: uso.tokens_input,
      tokens_output: uso.tokens_output,
      tokens_total: uso.tokens_total,
      cache_write_tokens: uso.cache_write_tokens,
      cache_read_tokens: uso.cache_read_tokens,
      resposta_bruta: conteudo,
    };
  }

  let json;

  try {
    const limpo = conteudo.replace(/```json|```/g, "").trim();
    json = JSON.parse(limpo);
  } catch {
    throw new Error("Resposta da Anthropic não é um JSON válido.");
  }

  return {
    saida: json,
    modelo,
    provider: "anthropic",
    modo: "messages",
    tempo_ms: fim - inicio,
    tokens_input: uso.tokens_input,
    tokens_output: uso.tokens_output,
    tokens_total: uso.tokens_total,
    cache_write_tokens: uso.cache_write_tokens,
    cache_read_tokens: uso.cache_read_tokens,
    resposta_bruta: conteudo,
  };
}

export async function executarAgenteAnthropic({
  agente,
  contexto,
  schema = null,
  promptMontado = null,
}) {
  if (!agente) throw new Error("agente é obrigatório.");
  if (!contexto) throw new Error("contexto é obrigatório.");

  engineStep(agente?.nome || agente?.slug || "Agente Anthropic", "→", {
    modelo: agente.modelo || ENGINE_CONFIG.modeloAnthropicDefault,
    prompt_montado: Boolean(promptMontado),
    formato_saida: agente.formato_saida,
  });

  return executarMessages({ agente, contexto, schema, promptMontado });
}