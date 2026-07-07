import { supabase } from "../lib/supabase.js";

export function hasActiveNarrative(book) {
  const relation = Array.isArray(book?.narrativa) ? book.narrativa[0] : book?.narrativa;
  return Boolean(
    relation?.status === "ativo"
    && relation?.faixas?.some((track) => track.status === "ativo"),
  );
}

export function hasCinematicExperience(book) {
  return Boolean(
    book?.tem_experiencia_cinematica
    || book?.capa_cinematica_url
    || hasActiveNarrative(book),
  );
}

export async function getNarrativeByBook(bookId) {
  if (!bookId) return null;
  const { data, error } = await supabase
    .from("narrativas")
    .select("*, faixas:narrativa_faixas(*)")
    .eq("livro_id", bookId)
    .order("ordem", { referencedTable: "narrativa_faixas", ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveNarrative(bookId, payload) {
  if (!bookId) throw new Error("Informe a obra da narrativa.");
  const { data, error } = await supabase
    .from("narrativas")
    .upsert({ livro_id: bookId, ...payload }, { onConflict: "livro_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addNarrativeTracks(narrativeId, tracks) {
  if (!narrativeId) throw new Error("Informe a narrativa das cenas.");
  if (!tracks.length) return [];
  const rows = tracks.map((track, index) => ({
    narrativa_id: narrativeId,
    ordem: track.ordem ?? index + 1,
    titulo: track.titulo,
    descricao: track.descricao || null,
    audio_path: track.audio_path,
    duracao_segundos: track.duracao_segundos || null,
    status: "ativo",
  }));
  const { data, error } = await supabase
    .from("narrativa_faixas")
    .insert(rows)
    .select()
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateNarrativeTrack(trackId, payload) {
  if (!trackId) throw new Error("Informe a cena que será atualizada.");
  const { data, error } = await supabase
    .from("narrativa_faixas")
    .update(payload)
    .eq("id", trackId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNarrativeTrack(trackId) {
  if (!trackId) throw new Error("Informe a cena que será excluída.");
  const { error } = await supabase
    .from("narrativa_faixas")
    .delete()
    .eq("id", trackId);
  if (error) throw error;
}
