import { listBooks } from "./books.js";
import { listJourneys } from "./journeys.js";
import { supabase } from "../lib/supabase.js";

async function safeQuery(label, request) {
  const { data, error } = await request;
  if (error) {
    console.warn(`[profile] ${label}:`, error.message);
    return [];
  }
  return data ?? [];
}

export async function getProfileMuseumData(userId) {
  const [{ items: books }, journeys, progress, reviews, likes, saves] = await Promise.all([
    listBooks({ limit: 1000, status: "ativo" }),
    listJourneys(userId),
    userId
      ? safeQuery(
        "progresso_leitura",
        supabase.from("progresso_leitura").select("*").eq("usuario_id", userId).order("ultima_atividade", { ascending: false }),
      )
      : Promise.resolve([]),
    userId
      ? safeQuery(
        "avaliacoes",
        supabase.from("avaliacoes").select("*").eq("usuario_id", userId).order("criado_em", { ascending: false }),
      )
      : Promise.resolve([]),
    userId
      ? safeQuery(
        "curtidas",
        supabase.from("curtidas").select("*").eq("usuario_id", userId).order("criado_em", { ascending: false }),
      )
      : Promise.resolve([]),
    userId
      ? safeQuery(
        "salvos",
        supabase.from("salvos").select("*").eq("usuario_id", userId).order("criado_em", { ascending: false }),
      )
      : Promise.resolve([]),
  ]);

  return {
    books: books ?? [],
    journeys: journeys ?? [],
    progress,
    reviews,
    likes,
    saves,
  };
}
