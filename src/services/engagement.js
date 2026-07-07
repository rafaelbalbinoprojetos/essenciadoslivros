import { supabase } from "../lib/supabase.js";

/**
 * Busca, para uma lista de livros: contagem de curtidas, quais o
 * usuário curtiu e quais ele salvou.
 */
export async function getEngagement(userId, bookIds = []) {
  const ids = bookIds.filter(Boolean);
  if (!ids.length) return { likeCounts: {}, likedByMe: new Set(), savedByMe: new Set() };

  const likesQuery = supabase.from("curtidas").select("livro_id, usuario_id").in("livro_id", ids);
  const savesQuery = userId
    ? supabase.from("salvos").select("livro_id").eq("usuario_id", userId).in("livro_id", ids)
    : Promise.resolve({ data: [] });

  const [likesRes, savesRes] = await Promise.all([likesQuery, savesQuery]);

  const likeCounts = {};
  const likedByMe = new Set();
  (likesRes.data ?? []).forEach((row) => {
    likeCounts[row.livro_id] = (likeCounts[row.livro_id] || 0) + 1;
    if (userId && row.usuario_id === userId) likedByMe.add(row.livro_id);
  });
  const savedByMe = new Set((savesRes.data ?? []).map((r) => r.livro_id));

  return { likeCounts, likedByMe, savedByMe };
}

export async function setLike(userId, bookId, on) {
  if (!userId) throw new Error("Usuário não autenticado.");
  if (on) {
    const { error } = await supabase
      .from("curtidas")
      .upsert({ usuario_id: userId, livro_id: bookId }, { onConflict: "usuario_id,livro_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("curtidas").delete().eq("usuario_id", userId).eq("livro_id", bookId);
    if (error) throw error;
  }
}

export async function setSave(userId, bookId, on) {
  if (!userId) throw new Error("Usuário não autenticado.");
  if (on) {
    const { error } = await supabase
      .from("salvos")
      .upsert({ usuario_id: userId, livro_id: bookId }, { onConflict: "usuario_id,livro_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("salvos").delete().eq("usuario_id", userId).eq("livro_id", bookId);
    if (error) throw error;
  }
}
