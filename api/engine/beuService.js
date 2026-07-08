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
    .eq("livro_id", obraId)
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
      livro_id: obraId,
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