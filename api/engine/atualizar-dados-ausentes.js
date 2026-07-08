import { atualizarDadosAusentesDaObra } from "../../server/engine/dadosAusentesService.js";
import { buscarBEUAtual } from "../../server/engine/beuService.js";
import { ENGINE_CONFIG } from "../../server/engine/engineConfig.js";
import { executarEtapaPipeline } from "../../server/engine/pipelineExecutor.js";

async function garantirBEUAtual({ obraId }) {
  try {
    return {
      registro: await buscarBEUAtual({ obraId, versao: ENGINE_CONFIG.versaoBEU }),
      etapasExecutadas: [],
    };
  } catch {
    const curador = await executarEtapaPipeline({ obraId, tipoEtapa: "curador_beu" });
    const editor = curador?.ok
      ? await executarEtapaPipeline({ obraId, tipoEtapa: "editor_beu" })
      : null;

    return {
      registro: await buscarBEUAtual({ obraId, versao: ENGINE_CONFIG.versaoBEU }),
      etapasExecutadas: [curador, editor].filter(Boolean),
    };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido. Use POST.",
      });
    }

    const { obraId } = req.body || {};

    if (!obraId) {
      return res.status(400).json({
        ok: false,
        error: "obraId é obrigatório.",
      });
    }

    console.log("[ENGINE] atualizar dados ausentes iniciado", { obraId });

    const { registro, etapasExecutadas } = await garantirBEUAtual({ obraId });
    const resultado = await atualizarDadosAusentesDaObra({
      obraId,
      beu: registro.payload,
    });

    console.log("[ENGINE] atualizar dados ausentes concluído", {
      obraId,
      atualizado: resultado.atualizado,
      campos_atualizados: resultado.campos_atualizados,
      etapas_executadas: etapasExecutadas.map((etapa) => etapa.etapa),
    });

    return res.status(200).json({
      ok: true,
      obraId,
      payloadId: registro.id,
      etapas_executadas: etapasExecutadas,
      ...resultado,
    });
  } catch (error) {
    console.error("Erro em /api/engine/atualizar-dados-ausentes:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno.",
    });
  }
}
