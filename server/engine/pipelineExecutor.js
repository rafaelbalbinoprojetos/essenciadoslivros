import { buscarAgentePorSlug } from "./agenteService.js";
import { salvarOuAtualizarBEU } from "./beuService.js";
import { buildContext } from "./contextBuilder.js";
import { ENGINE_CONFIG } from "./engineConfig.js";
import { engineStep, saveEngineJsonLog } from "./engineLogger.js";
import {
  concluirExecucaoAgente,
  criarExecucaoAgente,
  falharExecucaoAgente,
} from "./execucaoService.js";
import { executarAgenteOpenAI } from "./openaiService.js";
import { montarPromptAgente } from "./promptBuilder.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const DEFINICOES_ETAPAS = {
  curador_beu: {
    ordem: 1,
    agenteSlug: "curador-ia",
    executor: executarCuradorBEU,
  },
};

const ETAPAS_SUPORTADAS = new Set(Object.keys(DEFINICOES_ETAPAS));

function normalizarErro(error) {
  if (!error) return "Erro desconhecido.";
  if (typeof error === "string") return error;
  return error.message || JSON.stringify(error);
}

function calcularCustoEstimado() {
  // Mantido nulo por enquanto. Quando a tabela de preços/modelos estiver definida,
  // este ponto centraliza o cálculo sem alterar o fluxo da pipeline.
  return null;
}

function criarRunId({ obraId, tipoEtapa }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${obraId}-${tipoEtapa}-${timestamp}`;
}

async function registrarInicioEtapa({
  obraId,
  payloadId = null,
  tipoEtapa,
  entrada = null,
  ordem = 1,
}) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .insert({
      obra_id: obraId,
      payload_id: payloadId,
      tipo_etapa: tipoEtapa,
      status: "processando",
      ordem,
      entrada,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao registrar etapa da pipeline: ${error.message}`);
  }

  return data;
}

async function concluirEtapaPipeline({
  etapaId,
  payloadId,
  saida,
  tokensInput = null,
  tokensOutput = null,
  custoEstimado = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .update({
      payload_id: payloadId,
      status: "concluido",
      saida,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      custo_estimado: custoEstimado,
      completed_at: new Date().toISOString(),
    })
    .eq("id", etapaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao concluir etapa da pipeline: ${error.message}`);
  }

  return data;
}

async function falharEtapaPipeline({ etapaId, erro }) {
  if (!etapaId) return null;

  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .update({
      status: "erro",
      erro,
      completed_at: new Date().toISOString(),
    })
    .eq("id", etapaId)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao marcar etapa da pipeline como erro:", error.message);
    return null;
  }

  return data;
}

async function executarCuradorBEU({ obraId }) {
  let execucao = null;
  let etapa = null;
  const tipoEtapa = "curador_beu";
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", {
      obraId,
      tipoEtapa,
      mock: ENGINE_CONFIG.mock,
    });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);

    engineStep("Context Builder", "→");
    const contexto = await buildContext(obraId);
    engineStep("Context Builder", "✓");

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      mock: ENGINE_CONFIG.mock,
      versao_beu: ENGINE_CONFIG.versaoBEU,
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
    });

    entrada.prompt_montado = Boolean(promptMontado);
    entrada.prompt_tamanho_aproximado = promptMontado?.length ?? null;

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });

    etapa = await registrarInicioEtapa({
      obraId,
      tipoEtapa,
      entrada,
      ordem: definicao.ordem,
    });

    execucao = await criarExecucaoAgente({
      agenteId: agente.id,
      obraId,
      contexto,
      entrada,
      modelo: agente.modelo,
    });

    const resultado = await executarAgenteOpenAI({
      agente,
      contexto,
      schema: null,
      promptMontado,
    });

    const custoEstimado = calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    const payload = await salvarOuAtualizarBEU({
      obraId,
      payload: resultado.saida,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    engineStep("BEU salva", "✓", { payloadId: payload.id });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado.saida });

    await concluirExecucaoAgente({
      execucaoId: execucao.id,
      payloadId: payload.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });

    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: payload.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });

    engineStep("Pipeline concluída", "✓", {
      obraId,
      tipoEtapa,
      payloadId: payload.id,
    });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: payload.id,
      tokens: {
        input: resultado.tokens_input,
        output: resultado.tokens_output,
        total: resultado.tokens_total,
      },
      saida: resultado.saida,
      mock: resultado.modo === "mock",
    };
  } catch (error) {
    const erro = normalizarErro(error);
    engineStep("Pipeline falhou", "✕", { obraId, tipoEtapa, erro });

    if (execucao?.id) {
      await falharExecucaoAgente({ execucaoId: execucao.id, erro });
    }

    if (etapa?.id) {
      await falharEtapaPipeline({ etapaId: etapa.id, erro });
    }

    throw error;
  }
}

export async function executarEtapaPipeline({ obraId, tipoEtapa }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório.");
  }

  if (!tipoEtapa) {
    throw new Error("tipoEtapa é obrigatório.");
  }

  if (!ETAPAS_SUPORTADAS.has(tipoEtapa)) {
    throw new Error(`Etapa não suportada: ${tipoEtapa}`);
  }

  const definicao = DEFINICOES_ETAPAS[tipoEtapa];

  if (!definicao?.executor) {
    throw new Error(`Executor não implementado para etapa: ${tipoEtapa}`);
  }

  return definicao.executor({ obraId });
}
