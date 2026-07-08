import { supabaseAdmin } from "./supabaseAdmin.js";

export async function salvarOuAtualizarBEU({ obraId, payload, versao = "1.0" }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório.");
  }

  if (!payload) {
    throw new Error("payload da BEU é obrigatório.");
  }

  const { data: existente } = await supabaseAdmin
    .from("obras_payloads_universais")
    .select("id")
    .eq("obra_id", obraId)
    .eq("versao", versao)
    .maybeSingle();

  if (existente?.id) {
    const { data, error } = await supabaseAdmin
      .from("obras_payloads_universais")
      .update({
        payload,
        status: "gerado",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("obras_payloads_universais")
    .insert({
      obra_id: obraId,
      versao,
      tipo_obra: payload?.identificacao?.tipo_obra || "livro",
      payload,
      status: "gerado",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function buscarBEUAtual({ obraId, versao = "1.0" }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório.");
  }

  const { data, error } = await supabaseAdmin
    .from("obras_payloads_universais")
    .select("*")
    .eq("obra_id", obraId)
    .eq("versao", versao)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`BEU não encontrada para a obra ${obraId}. Execute curador_beu antes de editor_beu.`);
  }

  return data;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeBEUExistenteComSaidaEditor({ beuAtual, saidaEditor }) {
  if (!isPlainObject(beuAtual)) {
    throw new Error("BEU atual inválida para merge.");
  }

  if (!isPlainObject(saidaEditor)) {
    throw new Error("Saída do Editor inválida para merge.");
  }

  const modulosPermitidos = new Set(["emocional", "essencia", "legado"]);
  const merged = structuredClone(beuAtual);

  for (const [modulo, valor] of Object.entries(saidaEditor)) {
    if (!modulosPermitidos.has(modulo)) continue;

    if (isPlainObject(valor) && isPlainObject(merged[modulo])) {
      merged[modulo] = {
        ...merged[modulo],
        ...valor,
      };
    } else {
      merged[modulo] = valor;
    }
  }

  return merged;
}
