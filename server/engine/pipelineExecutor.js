import { buscarAgentePorSlug } from "./agenteService.js";
import {
  buscarBEUAtual,
  mergeBEUComModulosPermitidos,
  mergeBEUExistenteComSaidaEditor,
  salvarOuAtualizarBEU,
} from "./beuService.js";
import { buildContext } from "./contextBuilder.js";
import { ENGINE_CONFIG } from "./engineConfig.js";
import { obterEngineConfigDinamica } from "./engineConfigService.js";
import { engineStep, saveEngineJsonLog } from "./engineLogger.js";
import {
  concluirExecucaoAgente,
  criarExecucaoAgente,
  falharExecucaoAgente,
} from "./execucaoService.js";
import {
  gerarImagemCinematicaComReferencia,
  gerarImagemHeritageComReferencia,
} from "./imageGenerationService.js";
import { executarAgenteOpenAI } from "./openaiService.js";
import { gerarPdfCinematico } from "./pdfCinematicaService.js";
import { montarPromptAgente } from "./promptBuilder.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const DEFINICOES_ETAPAS = {
  curador_beu: {
    ordem: 1,
    agenteSlug: "curador-ia",
    executor: executarCuradorBEU,
  },
  editor_beu: {
    ordem: 2,
    agenteSlug: "editor-ia",
    executor: executarEditorBEU,
  },
  diretor_criativo: {
    ordem: 3,
    agenteSlug: "diretor-criativo",
    executor: executarDiretorCriativo,
  },
  narrativa_cinematica: {
    ordem: 4,
    agenteSlug: "narrador-cinematico",
    executor: executarNarrativaCinematica,
  },
  heritage_prompt: {
    ordem: 5,
    agenteSlug: "heritage-prompt",
    executor: executarPromptImagem,
  },
  capa_cinematica_prompt: {
    ordem: 6,
    agenteSlug: "capa-cinematica-prompt",
    executor: executarPromptImagem,
  },
  heritage_image: {
    ordem: 7,
    executor: executarImagemHeritage,
  },
  capa_cinematica_image: {
    ordem: 8,
    executor: executarImagemCinematica,
  },
  pdf_cinematica: {
    ordem: 9,
    executor: executarPdfCinematica,
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

async function buscarUltimaNarrativaCinematica(obraId) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("saida")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", "narrativa_cinematica")
    .eq("status", "concluido")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar narrativa cinematográfica: ${error.message}`);
  }

  return typeof data?.saida === "string" ? data.saida : null;
}

async function buscarUltimaSaidaEtapa({ obraId, tipoEtapa }) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("saida")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", tipoEtapa)
    .eq("status", "concluido")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar saida da etapa ${tipoEtapa}: ${error.message}`);
  }

  return data?.saida ?? null;
}

async function executarCuradorBEU({ obraId }) {
  let execucao = null;
  let etapa = null;
  const tipoEtapa = "curador_beu";
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);

    engineStep("Context Builder", "→");
    const contexto = await buildContext(obraId);
    engineStep("Context Builder", "✓");

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
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
      tipoEtapa,
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

    const tituloPesquisado = resultado.saida?.identificacao?.titulo;

    if (typeof tituloPesquisado === "string" && tituloPesquisado.trim()) {
      const { error: erroTitulo } = await supabaseAdmin
        .from("livros")
        .update({ titulo: tituloPesquisado.trim() })
        .eq("id", obraId);

      if (erroTitulo) {
        console.error("Erro ao atualizar título da obra com a pesquisa do curador:", erroTitulo.message);
      } else {
        engineStep("Título da obra atualizado", "✓", { titulo: tituloPesquisado.trim() });
      }
    }

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

async function executarEditorBEU({ obraId }) {
  let execucao = null;
  let etapa = null;
  const tipoEtapa = "editor_beu";
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);

    engineStep("Context Builder", "→");
    const contexto = await buildContext(obraId);
    engineStep("Context Builder", "✓");

    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });

    const beuAtual = beuAtualRegistro.payload;
    engineStep("BEU atual carregada", "✓", { payloadId: beuAtualRegistro.id });

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
    });

    entrada.prompt_montado = Boolean(promptMontado);
    entrada.prompt_tamanho_aproximado = promptMontado?.length ?? null;

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });
    await saveEngineJsonLog({ runId, name: "beu_atual", data: beuAtual });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
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
      tipoEtapa,
    });

    const beuComEditor = mergeBEUExistenteComSaidaEditor({
      beuAtual,
      saidaEditor: resultado.saida,
    });

    const custoEstimado = calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    const payload = await salvarOuAtualizarBEU({
      obraId,
      payload: beuComEditor,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    engineStep("BEU enriquecida salva", "✓", { payloadId: payload.id });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado.saida });
    await saveEngineJsonLog({ runId, name: "beu_final", data: beuComEditor });

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

async function executarDiretorCriativo({ obraId }) {
  let execucao = null;
  let etapa = null;
  const tipoEtapa = "diretor_criativo";
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);

    engineStep("Context Builder", "→");
    const contexto = await buildContext(obraId);
    engineStep("Context Builder", "✓");

    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });

    const beuAtual = beuAtualRegistro.payload;
    engineStep("BEU atual carregada", "✓", { payloadId: beuAtualRegistro.id });

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
    });

    entrada.prompt_montado = Boolean(promptMontado);
    entrada.prompt_tamanho_aproximado = promptMontado?.length ?? null;

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });
    await saveEngineJsonLog({ runId, name: "beu_atual", data: beuAtual });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
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
      tipoEtapa,
    });

    const beuComDirecao = mergeBEUComModulosPermitidos({
      beuAtual,
      saida: resultado.saida,
      modulosPermitidos: ["sensorial", "visual", "sonoro"],
    });

    const custoEstimado = calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    const payload = await salvarOuAtualizarBEU({
      obraId,
      payload: beuComDirecao,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    engineStep("BEU com direção criativa salva", "✓", { payloadId: payload.id });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado.saida });
    await saveEngineJsonLog({ runId, name: "beu_final", data: beuComDirecao });

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

async function executarNarrativaCinematica({ obraId }) {
  let execucao = null;
  let etapa = null;
  const tipoEtapa = "narrativa_cinematica";
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    const { testes } = await obterEngineConfigDinamica();

    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa, testes });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);

    engineStep("Context Builder", "→");
    const contexto = await buildContext(obraId);
    engineStep("Context Builder", "✓");

    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });

    const beuAtual = beuAtualRegistro.payload;
    engineStep("BEU atual carregada", "✓", { payloadId: beuAtualRegistro.id });

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      testes,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      persistencia: "ai_pipeline_etapas.saida",
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
    });

    entrada.prompt_montado = Boolean(promptMontado);
    entrada.prompt_tamanho_aproximado = promptMontado?.length ?? null;

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });
    await saveEngineJsonLog({ runId, name: "beu_atual", data: beuAtual });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
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
      tipoEtapa,
    });

    const custoEstimado = calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    engineStep("Narrativa cinematográfica gerada", "✓", {
      caracteres: typeof resultado.saida === "string" ? resultado.saida.length : null,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado.saida });

    await concluirExecucaoAgente({
      execucaoId: execucao.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });

    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });

    engineStep("Pipeline concluída", "✓", {
      obraId,
      tipoEtapa,
      payloadId: beuAtualRegistro.id,
    });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      tokens: {
        input: resultado.tokens_input,
        output: resultado.tokens_output,
        total: resultado.tokens_total,
      },
      saida: resultado.saida,
      testes,
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

async function executarPromptImagem({ obraId, tipoEtapa }) {
  let execucao = null;
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const agente = await buscarAgentePorSlug(definicao.agenteSlug);
    const contexto = await buildContext(obraId);
    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    const beuAtual = beuAtualRegistro.payload;
    const narrativaCinematica = await buscarUltimaNarrativaCinematica(obraId);

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      narrativa_cinematica_disponivel: Boolean(narrativaCinematica),
      persistencia: "ai_pipeline_etapas.saida",
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
      narrativaCinematica,
    });

    entrada.prompt_montado = Boolean(promptMontado);
    entrada.prompt_tamanho_aproximado = promptMontado?.length ?? null;

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });
    await saveEngineJsonLog({ runId, name: "beu_atual", data: beuAtual });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
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
      tipoEtapa,
    });
    const custoEstimado = calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado.saida });
    await concluirExecucaoAgente({
      execucaoId: execucao.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado.saida,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
      custoEstimado,
    });

    engineStep("Pipeline concluída", "✓", { obraId, tipoEtapa });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      tokens: {
        input: resultado.tokens_input,
        output: resultado.tokens_output,
        total: resultado.tokens_total,
      },
      saida: resultado.saida,
    };
  } catch (error) {
    const erro = normalizarErro(error);
    engineStep("Pipeline falhou", "✕", { obraId, tipoEtapa, erro });

    if (execucao?.id) await falharExecucaoAgente({ execucaoId: execucao.id, erro });
    if (etapa?.id) await falharEtapaPipeline({ etapaId: etapa.id, erro });
    throw error;
  }
}

async function executarImagemHeritage({ obraId, tipoEtapa }) {
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const contexto = await buildContext(obraId);
    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    const promptHeritage = await buscarUltimaSaidaEtapa({
      obraId,
      tipoEtapa: "heritage_prompt",
    });

    if (typeof promptHeritage !== "string" || !promptHeritage.trim()) {
      throw new Error("Nenhum prompt Heritage concluido foi encontrado. Gere o prompt Heritage antes da imagem.");
    }

    const entrada = {
      tipo_etapa: tipoEtapa,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      prompt_origem: "ai_pipeline_etapas.heritage_prompt.saida",
      prompt_tamanho_aproximado: promptHeritage.length,
      persistencia: "storage.capas + livros.capa_url + ai_pipeline_etapas.saida",
    };

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
      tipoEtapa,
      entrada,
      ordem: definicao.ordem,
    });

    const resultado = await gerarImagemHeritageComReferencia({
      obraId,
      titulo: contexto?.obra?.titulo || "obra",
      prompt: promptHeritage,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      custoEstimado: calcularCustoEstimado(),
    });

    engineStep("Pipeline concluida", "✓", {
      obraId,
      tipoEtapa,
      imagem_url: resultado.imagem_url,
    });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      imagemUrl: resultado.imagem_url,
      storagePath: resultado.storage_path,
      referenciaVisual: resultado.referencia_visual,
    };
  } catch (error) {
    const erro = normalizarErro(error);
    engineStep("Pipeline falhou", "✕", { obraId, tipoEtapa, erro });

    if (etapa?.id) await falharEtapaPipeline({ etapaId: etapa.id, erro });
    throw error;
  }
}

async function executarImagemCinematica({ obraId, tipoEtapa }) {
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const contexto = await buildContext(obraId);
    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });
    const promptCinematico = await buscarUltimaSaidaEtapa({
      obraId,
      tipoEtapa: "capa_cinematica_prompt",
    });

    if (typeof promptCinematico !== "string" || !promptCinematico.trim()) {
      throw new Error("Nenhum prompt de capa cinematica concluido foi encontrado. Gere o prompt da capa cinematica antes da imagem.");
    }

    const entrada = {
      tipo_etapa: tipoEtapa,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      prompt_origem: "ai_pipeline_etapas.capa_cinematica_prompt.saida",
      prompt_tamanho_aproximado: promptCinematico.length,
      persistencia: "storage.capas + livros.capa_cinematica_url + ai_pipeline_etapas.saida",
    };

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
      tipoEtapa,
      entrada,
      ordem: definicao.ordem,
    });

    const resultado = await gerarImagemCinematicaComReferencia({
      obraId,
      titulo: contexto?.obra?.titulo || "obra",
      prompt: promptCinematico,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      custoEstimado: calcularCustoEstimado(),
    });

    engineStep("Pipeline concluida", "✓", {
      obraId,
      tipoEtapa,
      imagem_url: resultado.imagem_url,
    });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      imagemUrl: resultado.imagem_url,
      storagePath: resultado.storage_path,
      referenciaVisual: resultado.referencia_visual,
    };
  } catch (error) {
    const erro = normalizarErro(error);
    engineStep("Pipeline falhou", "✕", { obraId, tipoEtapa, erro });

    if (etapa?.id) await falharEtapaPipeline({ etapaId: etapa.id, erro });
    throw error;
  }
}

async function executarPdfCinematica({ obraId, tipoEtapa }) {
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });

  try {
    engineStep("Pipeline iniciada", "→", { obraId, tipoEtapa });

    const contexto = await buildContext(obraId);
    const beuAtualRegistro = await buscarBEUAtual({
      obraId,
      versao: ENGINE_CONFIG.versaoBEU,
    });

    const entrada = {
      tipo_etapa: tipoEtapa,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      persistencia: "storage.pdfs + livros.pdf_cinematica_url + ai_pipeline_etapas.saida",
    };

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId: beuAtualRegistro.id,
      tipoEtapa,
      entrada,
      ordem: definicao.ordem,
    });

    const resultado = await gerarPdfCinematico({
      obraId,
      contexto,
      beuAtual: beuAtualRegistro.payload,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      custoEstimado: calcularCustoEstimado(),
    });

    engineStep("Pipeline concluida", "✓", { obraId, tipoEtapa, pdf_url: resultado.pdf_url });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      pdfUrl: resultado.pdf_url,
      storagePath: resultado.storage_path,
    };
  } catch (error) {
    const erro = normalizarErro(error);
    engineStep("Pipeline falhou", "✕", { obraId, tipoEtapa, erro });

    if (etapa?.id) await falharEtapaPipeline({ etapaId: etapa.id, erro });
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

  return definicao.executor({ obraId, tipoEtapa });
}
