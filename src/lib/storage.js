import { supabase } from "./supabase.js";

// Nomes dos buckets criados em src/sql/storage_setup.sql
export const BUCKETS = {
  capas: "capas", // público
  audios: "audios", // privado
  pdfs: "pdfs", // privado
  narrativas: "narrativas", // privado, múltiplas cenas por obra
};

// Normaliza o nome do arquivo para um caminho seguro de Storage.
function safeName(name = "") {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/**
 * Envia um arquivo para um bucket e retorna o caminho (path) salvo.
 * O caminho é único (timestamp + nome saneado).
 * @returns {Promise<string|null>} caminho do objeto dentro do bucket
 */
export async function uploadToBucket(bucket, file, { prefix = "" } = {}) {
  if (!file) return null;
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  const base = safeName(dot >= 0 ? file.name.slice(0, dot) : file.name) || "arquivo";
  const path = `${prefix}${Date.now()}-${base}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Remove objetos de um bucket privado/público. */
export async function removeFromBucket(bucket, paths = []) {
  const validPaths = paths.filter(Boolean);
  if (!validPaths.length) return;
  const { error } = await supabase.storage.from(bucket).remove(validPaths);
  if (error) throw error;
}

/** URL pública (use só para buckets públicos, ex.: capas). */
export function getPublicUrl(bucket, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/**
 * Gera um link assinado temporário (use para buckets privados:
 * áudios e PDFs). Padrão: 1 hora.
 */
export async function createSignedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
