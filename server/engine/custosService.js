import { supabaseAdmin } from "./supabaseAdmin.js";

export async function listarCustosIA() {
  const { data: porObra, error: erroObra } = await supabaseAdmin
    .from("vw_ai_custos_por_obra")
    .select("*")
    .order("custo_total_usd", { ascending: false });

  if (erroObra) {
    throw new Error(`Erro ao consultar vw_ai_custos_por_obra: ${erroObra.message}`);
  }

  const { data: porEtapa, error: erroEtapa } = await supabaseAdmin
    .from("vw_ai_custos_por_etapa")
    .select("*")
    .order("completed_at", { ascending: false });

  if (erroEtapa) {
    throw new Error(`Erro ao consultar vw_ai_custos_por_etapa: ${erroEtapa.message}`);
  }

  return {
    porObra: porObra || [],
    porEtapa: porEtapa || [],
  };
}
