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
import { executarAgenteAnthropic } from "./anthropicService.js";
import { executarAgenteOpenAI } from "./openaiService.js";
import { gerarPdfCinematico } from "./pdfCinematicaService.js";
import { gerarPdfEnciclopedico } from "./pdfEnciclopediaService.js";
import { gerarPdfGuiaEditorial } from "./pdfGuiaEditorialService.js";
import {
  calcularAssinaturaBloco,
  calcularBlocosProducaoNarrativa,
  consolidarBlocosNarrativa,
  gerarResumoContinuidadeBloco,
  montarPromptAgente,
  montarPromptIndiceComplexidadeNarrativa,
  montarPromptMapeadorArcos,
  montarPromptNarrativaCinematicaBloco,
  montarPromptNarrativeBlueprint,
  validarNarrativeBlueprint,
} from "./promptBuilder.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const PARTES_ENCICLOPEDIA_ORDEM = [
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
];

// Guia Editorial Essência — trilha de obras conceituais/técnicas
// (tipo_obra = "tecnico"), alternativa à narrativa cinematográfica.
// Reaproveita a faixa de "ordem" 4-7 (a mesma da trilha narrativa/heritage/
// capa/pdf_cinematica) de propósito: as duas trilhas nunca coexistem na
// mesma obra, então não há conflito real de ordenação.
const PARTES_GUIA_EDITORIAL_ORDEM = [
  "guia_editorial_parte1",
  "guia_editorial_parte2",
  "guia_editorial_parte3",
];

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
  guia_editorial_parte1: {
    ordem: 4,
    agenteSlug: "guia-editorial-ia",
    executor: executarGuiaEditorialParte,
  },
  guia_editorial_parte2: {
    ordem: 5,
    agenteSlug: "guia-editorial-ia",
    executor: executarGuiaEditorialParte,
  },
  guia_editorial_parte3: {
    ordem: 6,
    agenteSlug: "guia-editorial-ia",
    executor: executarGuiaEditorialParte,
  },
  guia_editorial_pdf: {
    ordem: 7,
    executor: executarGuiaEditorialPdf,
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
  enciclopedia_parte1: {
    ordem: 10,
    agenteSlug: "essence-engine",
    executor: executarEnciclopediaParte,
  },
  enciclopedia_parte2: {
    ordem: 11,
    agenteSlug: "essence-engine",
    executor: executarEnciclopediaParte,
  },
  enciclopedia_parte3: {
    ordem: 12,
    agenteSlug: "essence-engine",
    executor: executarEnciclopediaParte,
  },
  enciclopedia_parte4: {
    ordem: 13,
    agenteSlug: "essence-engine",
    executor: executarEnciclopediaParte,
  },
  enciclopedia_parte5: {
    ordem: 14,
    agenteSlug: "essence-engine",
    executor: executarEnciclopediaParte,
  },
  enciclopedia_pdf: {
    ordem: 15,
    executor: executarEnciclopediaPdf,
  },
};

const ETAPAS_SUPORTADAS = new Set(Object.keys(DEFINICOES_ETAPAS));

function normalizarErro(error) {
  if (!error) return "Erro desconhecido.";
  if (typeof error === "string") return error;
  return error.message || JSON.stringify(error);
}

// Cache em memória (processo do servidor) dos preços por modelo, para não
// bater no Supabase a cada etapa. Modelos sem linha em ai_precos_modelo
// (ex.: modelos de imagem, ainda não precificados) resolvem para null e o
// custo da etapa fica null — mesmo comportamento de antes desta tabela existir.
const cachePrecosModelo = new Map();

async function buscarPrecoModelo(modelo) {
  if (!modelo) return null;
  if (cachePrecosModelo.has(modelo)) return cachePrecosModelo.get(modelo);

  const { data, error } = await supabaseAdmin
    .from("ai_precos_modelo")
    .select("preco_input_1m, preco_output_1m")
    .eq("modelo", modelo)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao buscar preço do modelo ${modelo}:`, error.message);
    return null;
  }

  cachePrecosModelo.set(modelo, data || null);
  return data || null;
}

async function calcularCustoEstimado({ modelo, tokensInput, tokensOutput } = {}) {
  const preco = await buscarPrecoModelo(modelo);

  if (!preco || (preco.preco_input_1m == null && preco.preco_output_1m == null)) {
    return null;
  }

  const custoInput = ((tokensInput || 0) / 1_000_000) * (preco.preco_input_1m || 0);
  const custoOutput = ((tokensOutput || 0) / 1_000_000) * (preco.preco_output_1m || 0);

  return Number((custoInput + custoOutput).toFixed(6));
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
  modelo = null,
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
      modelo,
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

    const custoEstimado = await calcularCustoEstimado({
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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

    const custoEstimado = await calcularCustoEstimado({
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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

    const custoEstimado = await calcularCustoEstimado({
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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

// Sobe sempre que MOTOR_NARRATIVA_CINEMATICA_V4 ou MOTOR_NARRATIVE_BLUEPRINT_V1
// mudarem de um jeito que invalide blocos já gerados — isso quebra a
// assinatura de idempotência de propósito, forçando regeneração.
const VERSAO_MOTOR_NARRATIVA_CINEMATICA = "narrativa-v4-blueprint-v1";

// Sinaliza que já existe uma execução em andamento desta sub-etapa (outra
// invocação HTTP ainda não terminou de escrever o "concluido"). Não é um
// erro real — o chamador deve devolver finalizado:false e deixar o front-end
// tentar de novo, em vez de disparar uma segunda chamada de IA em paralelo.
class EtapaEmAndamentoError extends Error {
  constructor(fase) {
    super(`Sub-etapa "${fase}" já está em andamento em outra invocação.`);
    this.name = "EtapaEmAndamentoError";
    this.fase = fase;
  }
}

// Uma sub-etapa "processando" mais nova que isso é considerada travada
// (invocação anterior morreu sem concluir nem falhar) e pode ser retomada;
// abaixo disso, assume-se que a outra invocação ainda está rodando a chamada
// de IA. Fica com folga do maxDuration de 300s do endpoint (vercel.json).
const LIMITE_PROCESSANDO_EM_ANDAMENTO_MS = 4 * 60 * 1000;

// Idempotência contra sobreposição: sem isso, duas invocações HTTP que caem
// na janela entre "nenhum concluido ainda" e "concluido salvo" (dois cliques,
// duas abas, retry do próprio navegador) passam ambas no check de
// buscarSubEtapaConcluidaComAssinatura, ambas chamam a IA de novo e ambas
// gravam um registro "concluido" com a mesma assinatura — daí o loop que
// nunca reaproveita nada, mesmo com dezenas de registros corretos no banco.
async function buscarProcessandoEmAndamento({ obraId, tipoEtapa }) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("id, started_at")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", tipoEtapa)
    .eq("status", "processando")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao verificar sub-etapa em andamento ${tipoEtapa}: ${error.message}`);
  }

  if (!data?.started_at) return null;

  const decorridoMs = Date.now() - new Date(data.started_at).getTime();
  return decorridoMs < LIMITE_PROCESSANDO_EM_ANDAMENTO_MS ? data : null;
}

// Agrupa registrarInicioEtapa + concluirEtapaPipeline/falharEtapaPipeline
// para as sub-etapas internas da narrativa cinematográfica (ICN, blueprint,
// cada bloco, consolidação). Cada uma vira uma linha própria e auditável em
// ai_pipeline_etapas, com tipo_etapa distinto de "narrativa_cinematica" —
// por isso fica invisível para ETAPAS_RASTREADAS/PIPELINE_STEP_DEFS do
// frontend, que só conhecem a etapa pública final.
async function executarSubEtapaNarrativa({ obraId, payloadId, tipoEtapa, ordem, entrada, executor }) {
  if (await buscarProcessandoEmAndamento({ obraId, tipoEtapa })) {
    throw new EtapaEmAndamentoError(tipoEtapa);
  }

  const etapa = await registrarInicioEtapa({ obraId, payloadId, tipoEtapa, entrada, ordem });

  try {
    const resultado = await executor();

    const custoEstimado = await calcularCustoEstimado({
      modelo: resultado.modelo ?? null,
      tokensInput: resultado.tokensInput ?? null,
      tokensOutput: resultado.tokensOutput ?? null,
    });

    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId,
      saida: resultado.saida,
      tokensInput: resultado.tokensInput ?? null,
      tokensOutput: resultado.tokensOutput ?? null,
      modelo: resultado.modelo ?? null,
      custoEstimado,
    });

    return { ...resultado, etapaId: etapa.id };
  } catch (error) {
    await falharEtapaPipeline({ etapaId: etapa.id, erro: normalizarErro(error) });
    throw error;
  }
}

// Idempotência: procura uma sub-etapa já concluída com a mesma assinatura
// (mesma obra + versão de BEU + blueprint + motor + nº do bloco) para
// reaproveitar em vez de gastar tokens de novo numa nova tentativa. Devolve
// também os tokens já gastos, para o chamador poder somar o custo total
// mesmo quando o bloco foi gerado numa invocação HTTP anterior.
async function buscarSubEtapaConcluidaComAssinatura({ obraId, tipoEtapa, assinatura }) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("id, entrada, saida, tokens_input, tokens_output")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", tipoEtapa)
    .eq("status", "concluido")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar sub-etapa ${tipoEtapa}: ${error.message}`);
  }

  // Log temporário de diagnóstico: a comparação de assinatura estava sempre
  // falhando (obra regenerando arcos/ICN/blueprint do zero a cada chamada
  // HTTP mesmo com o registro "concluido" já salvo e com a assinatura batendo
  // no banco) e isso não é reproduzível lendo o código — precisa ver em
  // runtime o que esta função está realmente comparando. Remover depois que
  // a causa for confirmada.
  engineStep(`Debug reaproveitamento (${tipoEtapa})`, "?", {
    encontrouRegistro: Boolean(data),
    etapaIdEncontrada: data?.id ?? null,
    assinaturaEsperada: assinatura,
    assinaturaEncontrada: data?.entrada?.assinatura ?? null,
    tipoDaAssinaturaEncontrada: typeof data?.entrada?.assinatura,
    tipoDoEntrada: typeof data?.entrada,
    bateu: data?.entrada?.assinatura === assinatura,
  });

  if (!data || data.entrada?.assinatura !== assinatura) {
    return null;
  }

  return {
    etapaId: data.id,
    saida: data.saida ?? null,
    tokensInput: data.tokens_input || 0,
    tokensOutput: data.tokens_output || 0,
  };
}

// Teto de ICN por tipo de obra: o prompt do Narrative Scale Engine instrui a
// IA a julgar pela obra e não pelo rótulo do tipo de mídia — o que faz
// qualquer obra de franquia/IP conhecida (mesmo um livro ou filme avulso)
// pontuar alto em "memória cultural"/"arcos narrativos" e virar "obra épica"
// sem nenhum motivo real. Sem teto, isso fazia o Blueprint planejar 24-70+
// cenas e vários blocos de produção até para obras pequenas, estourando o
// limite de chamadas HTTP da narrativa cinematográfica (front-end desiste
// depois de 80 tentativas). livro/filme/jogo ficam presos perto do padrão
// histórico (12-18 cenas); só anime/série — as únicas obras genuinamente
// grandes deste catálogo — têm um teto mais alto, ainda assim limitado para
// não estourar o orçamento de chamadas.
const TETO_ICN_POR_TIPO = {
  musica: 2,
  album: 3,
  single: 1,
  podcast: 3,
  curta: 2,
  livro: 4,
  filme: 4,
  jogo: 4,
  anime: 7,
  serie: 7,
};

function aplicarTetoIcnPorTipo(analiseICN, tipoObra) {
  const tipo = String(tipoObra || "").toLowerCase().trim();
  const teto = TETO_ICN_POR_TIPO[tipo];
  if (!teto || analiseICN.icn <= teto) return analiseICN;

  return {
    ...analiseICN,
    icn: teto,
    faixa: `Teto aplicado por tipo de obra (${tipoObra})`,
    justificativa: `ICN original ${analiseICN.icn} reduzido para ${teto} — limite máximo para obras do tipo "${tipoObra}".`,
  };
}

// Obra Scope Engine: avalia se a obra precisa ser dividida em arcos/
// temporadas/volumes antes de qualquer análise narrativa. Roda antes do ICN.
// Não bloqueia a geração quando demanda_divisao é true — a seleção de qual
// arco gerar fica a cargo do frontend (implementação futura); por enquanto o
// mapeamento só fica disponível no banco para uso futuro.
async function calcularMapeamentoArcos({ contexto, beuAtual }) {
  const agenteArcos = {
    slug: "obra-scope-engine",
    nome: "Obra Scope Engine (Mapeador de Arcos)",
    modelo: ENGINE_CONFIG.modeloDefault,
    temperatura: 0.2,
    formato_saida: "json",
    prompt_sistema:
      "Você é um analista de escopo narrativo. Responda somente com o objeto JSON solicitado, sem nenhum texto fora dele.",
  };

  const promptMontado = montarPromptMapeadorArcos({ contexto, beuAtual });

  const resultado = await executarAgente({
    agente: agenteArcos,
    contexto,
    promptMontado,
  });

  const saida = resultado.saida ?? {};

  return {
    demanda_divisao: Boolean(saida.demanda_divisao),
    motivo: typeof saida.motivo === "string" ? saida.motivo : null,
    tipo_divisao: typeof saida.tipo_divisao === "string" ? saida.tipo_divisao : null,
    total_unidades: Number.isFinite(Number(saida.total_unidades)) ? Number(saida.total_unidades) : null,
    unidades: Array.isArray(saida.unidades) ? saida.unidades : [],
    tokens_input: resultado.tokens_input,
    tokens_output: resultado.tokens_output,
  };
}

// Narrative Scale Engine: mede a complexidade real da obra (ICN). Chamada de
// IA independente e barata, dedicada só a essa análise. Ao contrário da v1,
// não engole erros silenciosamente — se a IA não devolver um ICN válido,
// lança e interrompe a geração (a decisão de tolerar isso fica a cargo do
// chamador, que só usa esse caminho fora do modo de testes).
async function calcularIndiceComplexidadeNarrativa({ contexto, beuAtual }) {
  const agenteICN = {
    slug: "narrative-scale-engine",
    nome: "Narrative Scale Engine (ICN)",
    modelo: ENGINE_CONFIG.modeloDefault,
    temperatura: 0.2,
    formato_saida: "json",
    prompt_sistema:
      "Você é um analista de complexidade narrativa. Responda somente com o objeto JSON solicitado, sem nenhum texto fora dele.",
  };

  const promptMontado = await montarPromptIndiceComplexidadeNarrativa({ contexto, beuAtual });

  const resultado = await executarAgente({
    agente: agenteICN,
    contexto,
    promptMontado,
  });

  const saida = resultado.saida ?? {};
  const icnBruto = Number(saida.icn);

  if (!Number.isFinite(icnBruto) || icnBruto < 1 || icnBruto > 10) {
    throw new Error(`Narrative Scale Engine devolveu um ICN inválido: ${JSON.stringify(saida.icn)}`);
  }

  return {
    icn: Math.round(icnBruto),
    faixa: typeof saida.faixa === "string" ? saida.faixa : null,
    fatores: saida.fatores ?? null,
    justificativa: typeof saida.justificativa === "string" ? saida.justificativa : null,
    risco_compressao: typeof saida.risco_compressao === "string" ? saida.risco_compressao : null,
    duracao_base_recomendada_minutos: Number.isFinite(Number(saida.duracao_base_recomendada_minutos))
      ? Number(saida.duracao_base_recomendada_minutos)
      : null,
    cenas_base_recomendadas: Number.isFinite(Number(saida.cenas_base_recomendadas))
      ? Number(saida.cenas_base_recomendadas)
      : null,
    tokens_input: resultado.tokens_input,
    tokens_output: resultado.tokens_output,
  };
}

// Narrative Blueprint: decide COMO a obra deve ser contada (escopo, arcos,
// personagens, lista exata de cenas) antes de qualquer prosa. Blueprint
// inválido (estrutura quebrada, numeração de cenas errada, não aprovado
// para produção) lança erro — a geração para em vez de escrever cenas a
// partir de um plano ruim.
async function executarNarrativeBlueprint({ contexto, beuAtual, analiseICN }) {
  const agenteBlueprint = {
    slug: "narrative-blueprint-engine",
    nome: "Narrative Blueprint Engine",
    modelo: ENGINE_CONFIG.modeloDefault,
    temperatura: 0.3,
    formato_saida: "json",
    prompt_sistema:
      "Você é um planejador narrativo. Responda somente com o objeto JSON solicitado, sem nenhum texto fora dele.",
  };

  const promptMontado = await montarPromptNarrativeBlueprint({ contexto, beuAtual, analiseICN });

  const resultado = await executarAgente({
    agente: agenteBlueprint,
    contexto,
    promptMontado,
  });

  const blueprint = resultado.saida ?? null;
  const validacao = validarNarrativeBlueprint(blueprint);

  if (!validacao.valido) {
    throw new Error(`Narrative Blueprint inválido: ${validacao.erros.join(" | ")}`);
  }

  if (validacao.avisos.length) {
    engineStep("Narrative Blueprint com avisos", "!", { avisos: validacao.avisos });
  }

  return {
    blueprint,
    avisos: validacao.avisos,
    tokens_input: resultado.tokens_input,
    tokens_output: resultado.tokens_output,
  };
}

// Blueprint sintético usado só no modo de testes, sem nenhuma chamada de IA
// para ICN/Blueprint — mantém o modo de testes tão barato quanto antes (uma
// única chamada real, ao escritor). É um fallback explícito e registrado
// (o escopo já deixa claro que é modo de teste), nunca usado em produção.
function construirBlueprintSinteticoTeste({ contexto }) {
  const titulo = contexto?.obra?.titulo || "a obra";

  const cenaBase = (numero, emocao, resumo) => ({
    numero,
    titulo_interno: `Cena de teste ${numero}`,
    arco_id: "teste",
    acontecimento_base: resumo,
    unidade_dramatica: {
      situacao: resumo,
      personagens: [],
      desejo_ou_necessidade: "validar a infraestrutura de geração",
      conflito: "nenhum — cena de teste",
      escolha_ou_revelacao: "nenhuma — cena de teste",
      consequencia: "nenhuma — cena de teste",
    },
    emocao_dominante: emocao,
    intencao_dramatica: `Testar a geração da narrativa cinematográfica de ${titulo}.`,
    simbolo_central: "modo de teste",
    detalhe_sensorial_sugerido: null,
    eco_de_cena_anterior: null,
    gancho_para_proxima: null,
    duracao_estimada_minutos: 3,
    caracteres_alvo: { min: 2500, max: 4000 },
    prioridade: 1,
  });

  return {
    aprovado_para_producao: true,
    identificacao: { escopo_analisado: `Modo de teste — ${titulo}` },
    escala: { icn: 3, cenas_totais: 2 },
    cenas: [
      cenaBase(1, "CONTEMPLAÇÃO / SAUDADE", `Abertura de teste de ${titulo}.`),
      cenaBase(2, "ESPERANÇA CAUTELOSA", `Encerramento de teste de ${titulo}.`),
    ],
  };
}

// Continuidade programática (sem chamada de IA extra): extrai personagens e
// símbolos ativos direto das cenas do próprio bloco recém-planejado.
function extrairContextoContinuidadeDoBloco(bloco) {
  const ultimaCena = bloco.cenas[bloco.cenas.length - 1];
  const personagens = new Set();
  const simbolos = new Set();

  bloco.cenas.forEach((cena) => {
    (cena.unidade_dramatica?.personagens ?? []).forEach((nome) => personagens.add(nome));
    if (cena.simbolo_central) simbolos.add(cena.simbolo_central);
  });

  return {
    objetivo_do_bloco: ultimaCena?.gancho_para_proxima || ultimaCena?.unidade_dramatica?.consequencia || null,
    estado_emocional_de_saida: ultimaCena?.emocao_dominante || null,
    personagens_ativos: [...personagens],
    simbolos_ativos: [...simbolos],
  };
}

// Escreve a prosa de um único bloco (grupo de cenas) usando o agente real
// narrador-cinematico — mesma voz/modelo/temperatura de sempre.
async function executarBlocoNarrativaCinematica({
  agente,
  contexto,
  beuAtual,
  analiseICN,
  bloco,
  continuidadeAnterior,
  incluirConvite,
  incluirEncerramento,
}) {
  const promptMontado = montarPromptNarrativaCinematicaBloco({
    contexto,
    beuAtual,
    analiseICN,
    bloco,
    continuidadeAnterior,
    incluirConvite,
    incluirEncerramento,
  });

  const resultado = await executarAgente({
    agente,
    contexto,
    schema: null,
    promptMontado,
  });

  const texto = typeof resultado.saida === "string" ? resultado.saida : "";
  const continuidade = gerarResumoContinuidadeBloco({
    blueprintBloco: extrairContextoContinuidadeDoBloco(bloco),
    textoBlocoGerado: texto,
  });

  return {
    texto,
    continuidade,
    tokens_input: resultado.tokens_input,
    tokens_output: resultado.tokens_output,
  };
}

// Roteador de provider: le o campo "provider" do agente (coluna em
// ai_agentes, default "openai") e decide qual service de IA chamar. Permite
// migrar agente por agente para Anthropic sem alterar o resto do pipeline.
async function executarAgente({ agente, contexto, promptMontado, schema = null }) {
  const provider = agente.provider || "openai";

  if (provider === "anthropic") {
    return executarAgenteAnthropic({ agente, contexto, promptMontado, schema });
  }

  return executarAgenteOpenAI({ agente, contexto, promptMontado, schema });
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
    const payloadId = beuAtualRegistro.id;
    engineStep("BEU atual carregada", "✓", { payloadId });

    await saveEngineJsonLog({ runId, name: "contexto", data: contexto });
    await saveEngineJsonLog({ runId, name: "beu_atual", data: beuAtual });

    let analiseICN;
    let blueprint;
    // Identifica QUAL blueprint foi usado (id estável da linha em
    // ai_pipeline_etapas) em vez de um hash do conteúdo do blueprint — um
    // hash de JSON.stringify não é confiável entre chamadas HTTP porque o
    // Postgres/JSONB não garante preservar a ordem original das chaves do
    // objeto ao ser lido de volta, o que fazia os blocos nunca serem
    // reconhecidos como já gerados (regeneração infinita).
    let blueprintId;
    const tokensTotais = { input: 0, output: 0 };

    if (testes) {
      engineStep("Modo de testes ativo", "!", {
        info: "ICN e Blueprint pulados — usando blueprint sintético de 2 cenas",
      });
      blueprint = construirBlueprintSinteticoTeste({ contexto });
      blueprintId = "sintetico-teste";
      analiseICN = { icn: blueprint.escala.icn, faixa: "Modo de teste", risco_compressao: null };
    } else {
      const assinaturaArcos = calcularAssinaturaBloco({
        obraId,
        versaoBEU: ENGINE_CONFIG.versaoBEU,
        blueprintHash: "sem-blueprint",
        versaoMotor: VERSAO_MOTOR_NARRATIVA_CINEMATICA,
        numeroBloco: "arcos",
      });

      engineStep("Mapeador de Arcos (Obra Scope Engine)", "→");
      const arcosReaproveitadoBruto = await buscarSubEtapaConcluidaComAssinatura({
        obraId,
        tipoEtapa: "narrativa_cinematica_arcos",
        assinatura: assinaturaArcos,
      });

      // Mesma revalidação do ICN/Blueprint abaixo: um registro salvo como
      // "concluido" em uma versão anterior do motor pode estar corrompido e
      // não deve travar a geração para sempre.
      const arcosReaproveitado = arcosReaproveitadoBruto && 
        arcosReaproveitadoBruto.saida?.demanda_divisao !== undefined
        ? arcosReaproveitadoBruto
        : null;

      if (arcosReaproveitadoBruto && !arcosReaproveitado) {
        engineStep("Mapeador de Arcos (Obra Scope Engine)", "!", { info: "registro reaproveitável estava inválido — regenerando" });
      }

      let analiseArcos;

      if (arcosReaproveitado) {
        analiseArcos = arcosReaproveitado.saida;
        tokensTotais.input += arcosReaproveitado.tokensInput;
        tokensTotais.output += arcosReaproveitado.tokensOutput;
        engineStep("Mapeador de Arcos (Obra Scope Engine)", "↺", { info: "reaproveitado de uma tentativa anterior" });
      } else {
        const arcosExecucao = await executarSubEtapaNarrativa({
          obraId,
          payloadId,
          tipoEtapa: "narrativa_cinematica_arcos",
          ordem: definicao.ordem,
          entrada: { obra_id: obraId, versao_beu: ENGINE_CONFIG.versaoBEU, assinatura: assinaturaArcos },
          executor: async () => {
            const analise = await calcularMapeamentoArcos({ contexto, beuAtual });
            return {
              saida: analise,
              tokensInput: analise.tokens_input,
              tokensOutput: analise.tokens_output,
              modelo: ENGINE_CONFIG.modeloDefault,
            };
          },
        });
        analiseArcos = arcosExecucao.saida;
        await saveEngineJsonLog({ runId, name: "arcos", data: analiseArcos });
        engineStep("Mapeador de Arcos (Obra Scope Engine)", "✓", {
          demanda_divisao: analiseArcos.demanda_divisao,
          tipo_divisao: analiseArcos.tipo_divisao,
          total_unidades: analiseArcos.total_unidades,
        });

        // Não bloqueia a geração: a seleção de qual arco gerar é
        // responsabilidade do frontend (implementação futura). Por enquanto
        // a obra inteira continua sendo gerada normalmente, com o
        // mapeamento de arcos disponível no banco para uso futuro.
        if (analiseArcos.demanda_divisao) {
          engineStep("Mapeador de Arcos (Obra Scope Engine)", "!", {
            info: "obra demanda divisão em arcos — gerando a obra inteira normalmente por enquanto",
            motivo: analiseArcos.motivo,
          });
        }

        // Uma chamada de IA por invocação HTTP: devolve o controle agora,
        // mesmo padrão do ICN/Blueprint/blocos abaixo.
        return {
          ok: true,
          etapa: tipoEtapa,
          obraId,
          finalizado: false,
          fase: "arcos",
        };
      }

      // Disponibiliza o mapeamento de arcos para o ICN e o Blueprint como
      // contexto adicional, sem alterar o `contexto` usado pelos blocos de
      // prosa nem pelo restante da função.
      const contextoComArcos = { ...contexto, mapeamento_arcos: analiseArcos };

      const assinaturaICN = calcularAssinaturaBloco({
        obraId,
        versaoBEU: ENGINE_CONFIG.versaoBEU,
        blueprintHash: "sem-blueprint",
        versaoMotor: VERSAO_MOTOR_NARRATIVA_CINEMATICA,
        numeroBloco: "icn",
      });

      engineStep("Narrative Scale Engine (ICN)", "→");
      const icnReaproveitadoBruto = await buscarSubEtapaConcluidaComAssinatura({
        obraId,
        tipoEtapa: "narrativa_cinematica_icn",
        assinatura: assinaturaICN,
      });

      // Revalida o que foi reaproveitado do banco antes de confiar nele — um
      // registro salvo como "concluido" em uma versão anterior do motor pode
      // estar corrompido/incompleto e não deve travar a geração para sempre.
      const icnReaproveitado = icnReaproveitadoBruto && Number.isFinite(Number(icnReaproveitadoBruto.saida?.icn))
        ? icnReaproveitadoBruto
        : null;

      if (icnReaproveitadoBruto && !icnReaproveitado) {
        engineStep("Narrative Scale Engine (ICN)", "!", { info: "registro reaproveitável estava inválido — regenerando" });
      }

      if (icnReaproveitado) {
        analiseICN = icnReaproveitado.saida;
        tokensTotais.input += icnReaproveitado.tokensInput;
        tokensTotais.output += icnReaproveitado.tokensOutput;
        engineStep("Narrative Scale Engine (ICN)", "↺", { info: "reaproveitado de uma tentativa anterior" });
      } else {
        const icnExecucao = await executarSubEtapaNarrativa({
          obraId,
          payloadId,
          tipoEtapa: "narrativa_cinematica_icn",
          ordem: definicao.ordem,
          entrada: { obra_id: obraId, versao_beu: ENGINE_CONFIG.versaoBEU, assinatura: assinaturaICN },
          executor: async () => {
            const analise = await calcularIndiceComplexidadeNarrativa({ contexto: contextoComArcos, beuAtual });
            return {
              saida: analise,
              tokensInput: analise.tokens_input,
              tokensOutput: analise.tokens_output,
              modelo: ENGINE_CONFIG.modeloDefault,
            };
          },
        });
        analiseICN = aplicarTetoIcnPorTipo(icnExecucao.saida, contexto?.obra?.tipo_obra);
        await saveEngineJsonLog({ runId, name: "icn", data: analiseICN });
        engineStep("Narrative Scale Engine (ICN)", "✓", {
          icn: analiseICN.icn,
          faixa: analiseICN.faixa,
          risco_compressao: analiseICN.risco_compressao,
        });

        // Uma chamada de IA por invocação HTTP: devolve o controle agora para
        // nunca estourar o timeout do serverless function em obras longas. O
        // ICN já está salvo — a próxima chamada a esta etapa vai reaproveitá-lo
        // e seguir direto para o Blueprint.
        return {
          ok: true,
          etapa: tipoEtapa,
          obraId,
          finalizado: false,
          fase: "icn",
          icn: analiseICN.icn,
          icn_faixa: analiseICN.faixa,
        };
      }

      const assinaturaBlueprint = calcularAssinaturaBloco({
        obraId,
        versaoBEU: ENGINE_CONFIG.versaoBEU,
        blueprintHash: `icn-${analiseICN.icn}`,
        versaoMotor: VERSAO_MOTOR_NARRATIVA_CINEMATICA,
        numeroBloco: "blueprint",
      });

      engineStep("Narrative Blueprint", "→");
      const blueprintReaproveitadoBruto = await buscarSubEtapaConcluidaComAssinatura({
        obraId,
        tipoEtapa: "narrativa_cinematica_blueprint",
        assinatura: assinaturaBlueprint,
      });

      // Mesma revalidação do ICN acima: um Blueprint salvo como "concluido"
      // em uma tentativa anterior pode estar corrompido (ex.: 'cenas' vazio)
      // — sem isso, calcularBlocosProducaoNarrativa quebra e a obra nunca
      // mais sai do lugar até alguém apagar a linha manualmente no banco.
      const blueprintReaproveitado = blueprintReaproveitadoBruto
        && validarNarrativeBlueprint(blueprintReaproveitadoBruto.saida).valido
        ? blueprintReaproveitadoBruto
        : null;

      if (blueprintReaproveitadoBruto && !blueprintReaproveitado) {
        engineStep("Narrative Blueprint", "!", { info: "registro reaproveitável estava inválido — regenerando" });
      }

      if (blueprintReaproveitado) {
        blueprint = blueprintReaproveitado.saida;
        blueprintId = blueprintReaproveitado.etapaId;
        tokensTotais.input += blueprintReaproveitado.tokensInput;
        tokensTotais.output += blueprintReaproveitado.tokensOutput;
        await saveEngineJsonLog({ runId, name: "blueprint", data: blueprint });
        engineStep("Narrative Blueprint", "↺", { info: "reaproveitado de uma tentativa anterior" });
      } else {
        const blueprintExecucao = await executarSubEtapaNarrativa({
          obraId,
          payloadId,
          tipoEtapa: "narrativa_cinematica_blueprint",
          ordem: definicao.ordem,
          entrada: {
            obra_id: obraId,
            versao_beu: ENGINE_CONFIG.versaoBEU,
            icn: analiseICN.icn,
            assinatura: assinaturaBlueprint,
          },
          executor: async () => {
            const resultado = await executarNarrativeBlueprint({ contexto: contextoComArcos, beuAtual, analiseICN });
            return {
              saida: resultado.blueprint,
              tokensInput: resultado.tokens_input,
              tokensOutput: resultado.tokens_output,
              modelo: ENGINE_CONFIG.modeloDefault,
            };
          },
        });
        blueprint = blueprintExecucao.saida;
        blueprintId = blueprintExecucao.etapaId;
        await saveEngineJsonLog({ runId, name: "blueprint", data: blueprint });
        engineStep("Narrative Blueprint", "✓", {
          cenas_totais: blueprint.cenas.length,
          escopo: blueprint.identificacao?.escopo_analisado,
        });

        // Uma chamada de IA por invocação: devolve o controle agora. O
        // Blueprint já está salvo — a próxima chamada reaproveita e segue
        // direto para os blocos de prosa.
        return {
          ok: true,
          etapa: tipoEtapa,
          obraId,
          finalizado: false,
          fase: "blueprint",
          icn: analiseICN.icn,
          icn_faixa: analiseICN.faixa,
          cenas: blueprint.cenas.length,
          blocos: calcularBlocosProducaoNarrativa({
            cenas: blueprint.cenas,
            maxCenasPorBloco: 8,
            maxCaracteresPorBloco: 26000,
          }).length,
        };
      }
    }

    const blocosPlanejados = calcularBlocosProducaoNarrativa({
      cenas: blueprint.cenas,
      maxCenasPorBloco: 8,
      maxCaracteresPorBloco: 26000,
    });

    engineStep("Blocos de produção calculados", "✓", {
      total_blocos: blocosPlanejados.length,
      total_cenas: blueprint.cenas.length,
    });

    const textosBlocos = [];
    let continuidadeAnterior = null;

    for (const bloco of blocosPlanejados) {
      const incluirConvite = bloco.bloco === 1;
      const incluirEncerramento = bloco.bloco === blocosPlanejados.length;
      const tipoEtapaBloco = `narrativa_cinematica_bloco_${String(bloco.bloco).padStart(2, "0")}`;

      let textoBloco;
      let continuidadeBloco;

      if (testes) {
        engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "→");
        const resultadoBloco = await executarBlocoNarrativaCinematica({
          agente,
          contexto,
          beuAtual,
          analiseICN,
          bloco,
          continuidadeAnterior,
          incluirConvite,
          incluirEncerramento,
        });
        textoBloco = resultadoBloco.texto;
        continuidadeBloco = resultadoBloco.continuidade;
        tokensTotais.input += resultadoBloco.tokens_input || 0;
        tokensTotais.output += resultadoBloco.tokens_output || 0;
        engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "✓", { caracteres: textoBloco.length });
      } else {
        const assinaturaBloco = calcularAssinaturaBloco({
          obraId,
          versaoBEU: ENGINE_CONFIG.versaoBEU,
          blueprintHash: blueprintId,
          versaoMotor: VERSAO_MOTOR_NARRATIVA_CINEMATICA,
          numeroBloco: bloco.bloco,
        });

        const reaproveitadoBruto = await buscarSubEtapaConcluidaComAssinatura({
          obraId,
          tipoEtapa: tipoEtapaBloco,
          assinatura: assinaturaBloco,
        });

        // Mesma revalidação do ICN/Blueprint: descarta um bloco salvo como
        // "concluido" sem texto utilizável em vez de propagar string vazia
        // silenciosamente para o resto da narrativa.
        const reaproveitado = reaproveitadoBruto && typeof reaproveitadoBruto.saida?.texto === "string" && reaproveitadoBruto.saida.texto.trim()
          ? reaproveitadoBruto
          : null;

        if (reaproveitadoBruto && !reaproveitado) {
          engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "!", { info: "registro reaproveitável estava inválido — regenerando" });
        }

        if (reaproveitado) {
          engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "↺", {
            info: "reaproveitado de uma tentativa anterior",
          });
          textoBloco = reaproveitado.saida.texto;
          continuidadeBloco = reaproveitado.saida.continuidade;
          tokensTotais.input += reaproveitado.tokensInput;
          tokensTotais.output += reaproveitado.tokensOutput;
        } else {
          engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "→", {
            cenas: `${bloco.cenaInicial}-${bloco.cenaFinal}`,
          });

          const execucaoBloco = await executarSubEtapaNarrativa({
            obraId,
            payloadId,
            tipoEtapa: tipoEtapaBloco,
            ordem: definicao.ordem,
            entrada: {
              obra_id: obraId,
              versao_beu: ENGINE_CONFIG.versaoBEU,
              numero_bloco: bloco.bloco,
              cena_inicial: bloco.cenaInicial,
              cena_final: bloco.cenaFinal,
              assinatura: assinaturaBloco,
            },
            executor: async () => {
              const resultadoBloco = await executarBlocoNarrativaCinematica({
                agente,
                contexto,
                beuAtual,
                analiseICN,
                bloco,
                continuidadeAnterior,
                incluirConvite,
                incluirEncerramento,
              });
              return {
                saida: { texto: resultadoBloco.texto, continuidade: resultadoBloco.continuidade },
                tokensInput: resultadoBloco.tokens_input,
                tokensOutput: resultadoBloco.tokens_output,
                modelo: agente.modelo,
              };
            },
          });

          engineStep(`Bloco ${bloco.bloco}/${blocosPlanejados.length}`, "✓", {
            caracteres: execucaoBloco.saida.texto.length,
          });

          // Uma chamada de IA por invocação: devolve o controle agora em vez
          // de continuar para o próximo bloco. Este bloco já está salvo — a
          // próxima chamada a esta etapa reaproveita e gera o seguinte, até
          // não sobrar nenhum (aí consolida e finaliza).
          return {
            ok: true,
            etapa: tipoEtapa,
            obraId,
            finalizado: false,
            fase: "bloco",
            icn: analiseICN.icn,
            icn_faixa: analiseICN.faixa,
            cenas: blueprint.cenas.length,
            blocos: blocosPlanejados.length,
            progresso: { blocoAtual: bloco.bloco, totalBlocos: blocosPlanejados.length },
          };
        }
      }

      textosBlocos.push(textoBloco);
      continuidadeAnterior = continuidadeBloco;
    }

    const consolidado = consolidarBlocosNarrativa({ blocos: textosBlocos });

    if (!consolidado.valido) {
      throw new Error(`Falha ao consolidar narrativa cinematográfica: ${consolidado.erros.join(" | ")}`);
    }

    if (consolidado.avisos.length) {
      engineStep("Consolidação com avisos", "!", { avisos: consolidado.avisos });
    }

    if (!testes) {
      await executarSubEtapaNarrativa({
        obraId,
        payloadId,
        tipoEtapa: "narrativa_cinematica_consolidacao",
        ordem: definicao.ordem,
        entrada: {
          obra_id: obraId,
          blocos: blocosPlanejados.length,
          cenas_totais: blueprint.cenas.length,
          avisos: consolidado.avisos,
        },
        executor: async () => ({
          saida: { caracteres: consolidado.textoFinal.length, avisos: consolidado.avisos },
          tokensInput: 0,
          tokensOutput: 0,
        }),
      });
    }

    await saveEngineJsonLog({ runId, name: "saida", data: consolidado.textoFinal });

    engineStep("Narrativa cinematográfica gerada", "✓", {
      caracteres: consolidado.textoFinal.length,
      blocos: blocosPlanejados.length,
      cenas: blueprint.cenas.length,
    });

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: payloadId,
      testes,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      persistencia: "ai_pipeline_etapas.saida",
      icn: analiseICN?.icn ?? null,
      icn_faixa: analiseICN?.faixa ?? null,
      blueprint_cenas_totais: blueprint?.cenas?.length ?? null,
      blueprint_escopo: blueprint?.identificacao?.escopo_analisado ?? null,
      blocos_producao: blocosPlanejados.length,
    };

    await saveEngineJsonLog({ runId, name: "entrada", data: entrada });

    etapa = await registrarInicioEtapa({
      obraId,
      payloadId,
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

    const custoEstimado = await calcularCustoEstimado({
      modelo: agente.modelo,
      tokensInput: tokensTotais.input,
      tokensOutput: tokensTotais.output,
    });

    await concluirExecucaoAgente({
      execucaoId: execucao.id,
      payloadId,
      saida: consolidado.textoFinal,
      tokensInput: tokensTotais.input,
      tokensOutput: tokensTotais.output,
      custoEstimado,
    });

    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId,
      saida: consolidado.textoFinal,
      tokensInput: tokensTotais.input,
      tokensOutput: tokensTotais.output,
      modelo: agente.modelo,
      custoEstimado,
    });

    engineStep("Pipeline concluída", "✓", { obraId, tipoEtapa, payloadId });

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId,
      finalizado: true,
      tokens: {
        input: tokensTotais.input,
        output: tokensTotais.output,
        total: tokensTotais.input + tokensTotais.output,
      },
      modelo: agente.modelo,
      custoEstimado,
      saida: consolidado.textoFinal,
      testes,
      icn: analiseICN?.icn ?? null,
      icn_faixa: analiseICN?.faixa ?? null,
      blocos: blocosPlanejados.length,
      cenas: blueprint?.cenas?.length ?? null,
    };
  } catch (error) {
    if (error instanceof EtapaEmAndamentoError) {
      engineStep("Narrativa Cinematográfica", "…", {
        info: `sub-etapa "${error.fase}" já está em andamento em outra invocação — aguardando`,
      });

      return {
        ok: true,
        etapa: tipoEtapa,
        obraId,
        finalizado: false,
        fase: error.fase,
      };
    }

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
    const custoEstimado = await calcularCustoEstimado({
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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
      custoEstimado: await calcularCustoEstimado(),
    });

    if (resultado.bloqueado_por_moderacao) {
      engineStep("Pipeline concluida sem imagem", "!", {
        obraId,
        tipoEtapa,
        motivo: resultado.motivo,
      });
    } else {
      engineStep("Pipeline concluida", "✓", {
        obraId,
        tipoEtapa,
        imagem_url: resultado.imagem_url,
      });
    }

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      imagemUrl: resultado.imagem_url,
      storagePath: resultado.storage_path,
      referenciaVisual: resultado.referencia_visual,
      bloqueadoPorModeracao: Boolean(resultado.bloqueado_por_moderacao),
      motivoBloqueio: resultado.motivo || null,
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
      custoEstimado: await calcularCustoEstimado(),
    });

    if (resultado.bloqueado_por_moderacao) {
      engineStep("Pipeline concluida sem imagem", "!", {
        obraId,
        tipoEtapa,
        motivo: resultado.motivo,
      });
    } else {
      engineStep("Pipeline concluida", "✓", {
        obraId,
        tipoEtapa,
        imagem_url: resultado.imagem_url,
      });
    }

    return {
      ok: true,
      etapa: tipoEtapa,
      obraId,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      imagemUrl: resultado.imagem_url,
      storagePath: resultado.storage_path,
      referenciaVisual: resultado.referencia_visual,
      bloqueadoPorModeracao: Boolean(resultado.bloqueado_por_moderacao),
      motivoBloqueio: resultado.motivo || null,
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
      custoEstimado: await calcularCustoEstimado(),
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

async function executarEnciclopediaParte({ obraId, tipoEtapa }) {
  let execucao = null;
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });
  const indiceParte = PARTES_ENCICLOPEDIA_ORDEM.indexOf(tipoEtapa);

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

    const partesAnterioresTipos = PARTES_ENCICLOPEDIA_ORDEM.slice(0, indiceParte);
    const partesAnteriores = [];

    for (const tipoAnterior of partesAnterioresTipos) {
      const saidaAnterior = await buscarUltimaSaidaEtapa({ obraId, tipoEtapa: tipoAnterior });
      if (typeof saidaAnterior === "string" && saidaAnterior.trim()) {
        partesAnteriores.push(saidaAnterior);
      }
    }

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      partes_anteriores_disponiveis: partesAnteriores.length,
      persistencia: "ai_pipeline_etapas.saida",
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
      partesEnciclopediaAnteriores: partesAnteriores,
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

    const custoEstimado = await calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    engineStep("Parte da enciclopédia gerada", "✓", {
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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

async function executarEnciclopediaPdf({ obraId, tipoEtapa }) {
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
      persistencia: "storage.pdfs + livros.pdf_enciclopedico_url + ai_pipeline_etapas.saida",
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

    const resultado = await gerarPdfEnciclopedico({
      obraId,
      contexto,
      beuAtual: beuAtualRegistro.payload,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      custoEstimado: await calcularCustoEstimado(),
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

async function executarGuiaEditorialParte({ obraId, tipoEtapa }) {
  let execucao = null;
  let etapa = null;
  const definicao = DEFINICOES_ETAPAS[tipoEtapa];
  const runId = criarRunId({ obraId, tipoEtapa });
  const indiceParte = PARTES_GUIA_EDITORIAL_ORDEM.indexOf(tipoEtapa);

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

    const partesAnterioresTipos = PARTES_GUIA_EDITORIAL_ORDEM.slice(0, indiceParte);
    const partesAnteriores = [];

    for (const tipoAnterior of partesAnterioresTipos) {
      const saidaAnterior = await buscarUltimaSaidaEtapa({ obraId, tipoEtapa: tipoAnterior });
      if (typeof saidaAnterior === "string" && saidaAnterior.trim()) {
        partesAnteriores.push(saidaAnterior);
      }
    }

    const entrada = {
      tipo_etapa: tipoEtapa,
      agente_slug: agente.slug,
      obra_id: obraId,
      payload_id: beuAtualRegistro.id,
      versao_beu: ENGINE_CONFIG.versaoBEU,
      partes_anteriores_disponiveis: partesAnteriores.length,
      persistencia: "ai_pipeline_etapas.saida",
    };

    const promptMontado = await montarPromptAgente({
      agente,
      contexto,
      tipoEtapa,
      beuAtual,
      partesGuiaEditorialAnteriores: partesAnteriores,
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

    const custoEstimado = await calcularCustoEstimado({
      modelo: resultado.modelo,
      tokensInput: resultado.tokens_input,
      tokensOutput: resultado.tokens_output,
    });

    engineStep("Parte do Guia Editorial gerada", "✓", {
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
      modelo: resultado.modelo,
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
      modelo: resultado.modelo,
      custoEstimado,
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

async function executarGuiaEditorialPdf({ obraId, tipoEtapa }) {
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
      persistencia: "storage.pdfs + livros.pdf_guia_editorial_url + ai_pipeline_etapas.saida",
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

    const resultado = await gerarPdfGuiaEditorial({
      obraId,
      contexto,
      beuAtual: beuAtualRegistro.payload,
    });

    await saveEngineJsonLog({ runId, name: "saida", data: resultado });
    await concluirEtapaPipeline({
      etapaId: etapa.id,
      payloadId: beuAtualRegistro.id,
      saida: resultado,
      custoEstimado: await calcularCustoEstimado(),
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
