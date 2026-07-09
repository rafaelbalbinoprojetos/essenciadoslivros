import { BUCKETS, getPublicUrl, removeFromBucket, uploadToBucket } from "../lib/storage.js";
import { supabase } from "../lib/supabase.js";

const TABLE = "engine_referencias_imagem";

export const ENGINE_REFERENCE_TYPES = {
  heritage: "heritage",
  cinematica: "cinematica",
};

export async function getEngineReferencesByType() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("ativo", true)
    .order("tipo", { ascending: true });

  if (error) throw error;

  return (data || []).reduce((acc, item) => {
    acc[item.tipo] = item;
    return acc;
  }, {});
}

export async function updateEngineReferenceUsage(id, usarComoReferencia) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      usar_como_referencia: usarComoReferencia,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function replaceEngineReference({ tipo, file, userId, usarComoReferencia = true }) {
  if (!tipo) throw new Error("Tipo de referencia nao informado.");
  if (!file) throw new Error("Selecione uma imagem de referencia.");

  const { data: current, error: currentError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .maybeSingle();

  if (currentError) throw currentError;

  const storagePath = await uploadToBucket(BUCKETS.engineReferencias, file, {
    prefix: `${tipo}/`,
  });
  const publicUrl = getPublicUrl(BUCKETS.engineReferencias, storagePath);

  try {
    if (current?.id) {
      const { error: deactivateError } = await supabase
        .from(TABLE)
        .update({
          ativo: false,
          usar_como_referencia: false,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", current.id);

      if (deactivateError) throw deactivateError;
    }

    const { data: nextReference, error: insertError } = await supabase
      .from(TABLE)
      .insert({
        tipo,
        nome: file.name,
        bucket: BUCKETS.engineReferencias,
        storage_path: storagePath,
        public_url: publicUrl,
        usar_como_referencia: usarComoReferencia,
        ativo: true,
        criado_por: userId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (current?.storage_path) {
      await removeFromBucket(current.bucket || BUCKETS.engineReferencias, [current.storage_path]);
    }

    return nextReference;
  } catch (error) {
    await removeFromBucket(BUCKETS.engineReferencias, [storagePath]).catch(() => {});

    if (current?.id) {
      await supabase
        .from(TABLE)
        .update({
          ativo: true,
          usar_como_referencia: current.usar_como_referencia,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", current.id)
        .then(() => {})
        .catch(() => {});
    }

    throw error;
  }
}
