import { supabaseAdmin } from "./supabaseAdmin.js";

export async function criarExecucaoAgente({
  agenteId,
  obraId,
  contexto,
  entrada = null,
  modelo = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("ai_agente_execucoes")
    .insert({
      agente_id: agenteId,
      obra_id: obraId,
      status: "processando",
      contexto,
      entrada,
      modelo,
      iniciado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function concluirExecucaoAgente({
  execucaoId,
  payloadId = null,
  saida,
  tokensInput = null,
  tokensOutput = null,
  custoEstimado = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("ai_agente_execucoes")
    .update({
      payload_id: payloadId,
      status: "concluido",
      saida,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      custo_estimado: custoEstimado,
      concluido_em: new Date().toISOString(),
    })
    .eq("id", execucaoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function falharExecucaoAgente({ execucaoId, erro }) {
  const { data, error } = await supabaseAdmin
    .from("ai_agente_execucoes")
    .update({
      status: "erro",
      erro,
      concluido_em: new Date().toISOString(),
    })
    .eq("id", execucaoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
}