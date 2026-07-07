import { supabase } from "../lib/supabase.js";

const BOOK_FIELDS = "id, titulo, capa_url, audio_url, duracao_audio, autor:autor_id ( nome )";

// ---------------------------------------------------------------
// Helpers de cálculo de status (não-restritivo: tudo acessível,
// rótulo varia pela posição). 'bloqueado' só se desbloqueado=false.
// ---------------------------------------------------------------
function itemDisplayStatus(item, userItem, isCurrent) {
  if (userItem?.status === "concluido") return "concluido";
  if (item.desbloqueado === false) return "bloqueado";
  if (isCurrent) return "em_andamento";
  return "disponivel";
}

/** Lista as jornadas ativas com o progresso do usuário mesclado. */
export async function listJourneys(userId) {
  const { data: journeys, error } = await supabase
    .from("jornadas")
    .select("*")
    .eq("ativa", true)
    .order("ordem", { ascending: true });
  if (error) throw error;

  let progressByJourney = {};
  if (userId) {
    const { data: progress } = await supabase
      .from("usuario_jornadas")
      .select("*")
      .eq("usuario_id", userId);
    (progress ?? []).forEach((row) => {
      progressByJourney[row.jornada_id] = row;
    });
  }

  return (journeys ?? []).map((j) => ({
    ...j,
    progresso: progressByJourney[j.id] ?? null,
  }));
}

/** Detalha uma jornada por slug (ou id) com itens + status do usuário. */
export async function getJourney(slugOrId, userId) {
  let { data: journey } = await supabase
    .from("jornadas")
    .select("*")
    .eq("slug", slugOrId)
    .maybeSingle();

  if (!journey) {
    const byId = await supabase.from("jornadas").select("*").eq("id", slugOrId).maybeSingle();
    journey = byId.data;
  }
  if (!journey) throw new Error("Jornada não encontrada.");

  const { data: items } = await supabase
    .from("jornada_itens")
    .select(`*, livro:livro_id ( ${BOOK_FIELDS} )`)
    .eq("jornada_id", journey.id)
    .order("ordem", { ascending: true });

  let userItems = {};
  let userJourney = null;
  if (userId) {
    const [{ data: uItems }, { data: uJourney }] = await Promise.all([
      supabase
        .from("usuario_jornada_itens")
        .select("*")
        .eq("usuario_id", userId)
        .eq("jornada_id", journey.id),
      supabase
        .from("usuario_jornadas")
        .select("*")
        .eq("usuario_id", userId)
        .eq("jornada_id", journey.id)
        .maybeSingle(),
    ]);
    (uItems ?? []).forEach((row) => {
      userItems[row.jornada_item_id] = row;
    });
    userJourney = uJourney ?? null;
  }

  const orderedItems = items ?? [];
  const currentIndex = orderedItems.findIndex((it) => userItems[it.id]?.status !== "concluido");

  const enrichedItems = orderedItems.map((item, index) => ({
    ...item,
    userItem: userItems[item.id] ?? null,
    status: itemDisplayStatus(item, userItems[item.id], index === currentIndex),
  }));

  return { journey, items: enrichedItems, userJourney, currentIndex };
}

/** Inicia (ou retoma) uma jornada para o usuário. */
export async function startJourney(userId, journeyId) {
  if (!userId) throw new Error("Usuário não autenticado.");
  const { data, error } = await supabase
    .from("usuario_jornadas")
    .upsert(
      {
        usuario_id: userId,
        jornada_id: journeyId,
        status: "em_andamento",
      },
      { onConflict: "usuario_id,jornada_id", ignoreDuplicates: false },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Reinicia uma jornada: apaga progresso dos itens e zera a jornada. */
export async function restartJourney(userId, journeyId) {
  if (!userId) throw new Error("Usuário não autenticado.");
  await supabase
    .from("usuario_jornada_itens")
    .delete()
    .eq("usuario_id", userId)
    .eq("jornada_id", journeyId);

  const { data, error } = await supabase
    .from("usuario_jornadas")
    .upsert(
      {
        usuario_id: userId,
        jornada_id: journeyId,
        status: "em_andamento",
        progresso_percent: 0,
        itens_concluidos: 0,
        tempo_estudado_min: 0,
        concluido_em: null,
      },
      { onConflict: "usuario_id,jornada_id" },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Jornada ativa mais recente do usuário, com o item atual (para a Home). */
export async function getActiveJourney(userId) {
  if (!userId) return null;
  const { data: uJourney } = await supabase
    .from("usuario_jornadas")
    .select("*, jornada:jornada_id ( * )")
    .eq("usuario_id", userId)
    .eq("status", "em_andamento")
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!uJourney?.jornada) return null;

  const { data: items } = await supabase
    .from("jornada_itens")
    .select(`*, livro:livro_id ( ${BOOK_FIELDS} )`)
    .eq("jornada_id", uJourney.jornada_id)
    .order("ordem", { ascending: true });

  const { data: uItems } = await supabase
    .from("usuario_jornada_itens")
    .select("jornada_item_id, status")
    .eq("usuario_id", userId)
    .eq("jornada_id", uJourney.jornada_id);

  const completed = new Set((uItems ?? []).filter((u) => u.status === "concluido").map((u) => u.jornada_item_id));
  const ordered = items ?? [];
  const currentIndex = Math.max(0, ordered.findIndex((it) => !completed.has(it.id)));
  const currentItem = ordered[currentIndex] ?? ordered[0] ?? null;
  const remainingMin = ordered
    .slice(currentIndex)
    .reduce((sum, it) => sum + (it.duracao_min || 0), 0);

  return {
    userJourney: uJourney,
    journey: uJourney.jornada,
    currentItem,
    currentNumber: currentIndex + 1,
    total: ordered.length,
    remainingMin,
  };
}

/**
 * Marca um item como concluído e recalcula o progresso da jornada.
 * Retorna dados para o modal de recompensa.
 */
export async function completeItem(userId, journey, item) {
  if (!userId) throw new Error("Usuário não autenticado.");

  await supabase.from("usuario_jornada_itens").upsert(
    {
      usuario_id: userId,
      jornada_id: journey.id,
      jornada_item_id: item.id,
      livro_id: item.livro_id,
      status: "concluido",
      progresso_percent: 100,
      tempo_consumido_min: item.duracao_min || 0,
      concluido_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id,jornada_item_id" },
  );

  // Recalcula a partir de todos os itens da jornada.
  const [{ data: allItems }, { data: uItems }] = await Promise.all([
    supabase.from("jornada_itens").select("id, ordem, duracao_min, livro_id, titulo_customizado").eq("jornada_id", journey.id).order("ordem", { ascending: true }),
    supabase.from("usuario_jornada_itens").select("jornada_item_id, status, tempo_consumido_min").eq("usuario_id", userId).eq("jornada_id", journey.id),
  ]);

  const total = (allItems ?? []).length || journey.total_itens || 1;
  const completedSet = new Set((uItems ?? []).filter((u) => u.status === "concluido").map((u) => u.jornada_item_id));
  const concluidos = completedSet.size;
  const percent = Math.min(100, Math.round((concluidos / total) * 100));
  const tempoEstudado = (uItems ?? [])
    .filter((u) => u.status === "concluido")
    .reduce((sum, u) => sum + (u.tempo_consumido_min || 0), 0);
  const finished = concluidos >= total;

  await supabase.from("usuario_jornadas").upsert(
    {
      usuario_id: userId,
      jornada_id: journey.id,
      status: finished ? "concluida" : "em_andamento",
      progresso_percent: percent,
      itens_concluidos: concluidos,
      tempo_estudado_min: tempoEstudado,
      concluido_em: finished ? new Date().toISOString() : null,
    },
    { onConflict: "usuario_id,jornada_id" },
  );

  // Próximo item (primeiro não concluído na ordem).
  const nextItem = (allItems ?? []).find((it) => !completedSet.has(it.id)) ?? null;
  const xp = Math.max(40, (item.duracao_min || 10) * 4);

  return {
    bookTitle: item.titulo_customizado || item.livro?.titulo || "Item concluído",
    xp,
    percent,
    finished,
    nextItem,
  };
}
