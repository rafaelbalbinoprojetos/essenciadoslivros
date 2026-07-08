import { supabaseAdmin } from "./supabaseAdmin.js";

export async function buscarAgentePorSlug(slug) {
  if (!slug) {
    throw new Error("Slug do agente é obrigatório.");
  }

  const { data: agente, error } = await supabaseAdmin
    .from("ai_agentes")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .single();

  if (error || !agente) {
    throw new Error(`Agente não encontrado: ${slug}`);
  }

  return agente;
}