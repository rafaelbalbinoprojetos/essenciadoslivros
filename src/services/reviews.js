import { supabase } from "../lib/supabase.js";

const TABLE = "avaliacoes";

/** Lista as avaliações de uma obra + média e contagem. */
export async function getBookReviews(bookId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, usuario_id, usuario_nome, nota, comentario, criado_em")
    .eq("livro_id", bookId)
    .order("criado_em", { ascending: false });
  if (error) throw error;

  const reviews = data ?? [];
  const count = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.nota) || 0), 0);
  const average = count ? sum / count : 0;
  return { reviews, count, average };
}

/** Avaliação do próprio usuário para a obra (ou null). */
export async function getMyReview(userId, bookId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("usuario_id", userId)
    .eq("livro_id", bookId)
    .maybeSingle();
  if (error) {
    console.error("[reviews] getMyReview:", error);
    return null;
  }
  return data ?? null;
}

/** Cria ou atualiza a avaliação do usuário (1 por obra). */
export async function upsertReview(userId, bookId, { nota, comentario, usuarioNome }) {
  if (!userId) throw new Error("Usuário não autenticado.");
  const payload = {
    usuario_id: userId,
    livro_id: bookId,
    nota,
    usuario_nome: usuarioNome || null,
  };
  // Só mexe no comentário se ele foi explicitamente enviado (ex.: pelo
  // formulário). Avaliar só com estrelas (player) preserva o comentário.
  if (comentario !== undefined) {
    payload.comentario = comentario?.trim() || null;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: "usuario_id,livro_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Remove a avaliação do usuário. */
export async function deleteReview(userId, bookId) {
  if (!userId) throw new Error("Usuário não autenticado.");
  const { error } = await supabase.from(TABLE).delete().eq("usuario_id", userId).eq("livro_id", bookId);
  if (error) throw error;
}
