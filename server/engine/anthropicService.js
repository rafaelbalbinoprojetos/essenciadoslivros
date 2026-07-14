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

  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return anthropicClient;
}

export async function executarAgenteAnthropic({
  agente,
  contexto,
  schema = null,
  promptMontado = null,
}) {
  if (!agente || !contexto) throw new Error("agente e contexto são obrigatórios.");

  const modelo = agente.modelo || ENGINE_CONFIG.modeloAnthropicDefault;
  const temperatura = Number(agente.temperatura ?? 0.3);
  const saidaTextual = agente.formato_saida === "text";
  const inicio = Date.now();

  const conteudoUsuario = promptMontado
    ? promptMontado
    : JSON.stringify({ contexto, schema, instrucoes: { idioma: "pt-BR" } }, null, 2);

  engineStep(agente?.nome || agente?.slug || "Agente Anthropic", "→", {
    modelo,
    prompt_montado: Boolean(promptMontado),
  });

  const resposta = await getAnthropicClient().messages.create({
    model: modelo,
    max_tokens: 8000,
    temperature: temperatura,
    system: agente.prompt_sistema,
    messages: [{ role: "user", content: conteudoUsuario }],
  });

  const fim = Date.now();
  const conteudo = resposta.content?.[0]?.text;

  if (!conteudo) throw new Error("A Anthropic não retornou conteúdo.");

  if (saidaTextual) {
    return {
      saida: conteudo,
      modelo,
      provider: "anthropic",
      modo: "messages",
      tempo_ms: fim - inicio,
      tokens_input: resposta.usage?.input_tokens ?? null,
      tokens_output: resposta.usage?.output_tokens ?? null,
      tokens_total: (resposta.usage?.input_tokens ?? 0) + (resposta.usage?.output_tokens ?? 0),
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
    tokens_input: resposta.usage?.input_tokens ?? null,
    tokens_output: resposta.usage?.output_tokens ?? null,
    tokens_total: (resposta.usage?.input_tokens ?? 0) + (resposta.usage?.output_tokens ?? 0),
    resposta_bruta: conteudo,
  };
}
