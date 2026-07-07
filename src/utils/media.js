import { createSignedUrl, BUCKETS } from "../lib/storage.js";

const DRIVE_ID_PATTERN = /[-\w]{10,}/;
const DRIVE_HOSTS = ["drive.google.com", "docs.google.com", "drive.usercontent.google.com", "drive.googleusercontent.com"];

function extractDriveId(value = "") {
  const match = value.match(DRIVE_ID_PATTERN);
  return match ? match[0] : "";
}

function buildDriveProxyUrl(fileId) {
  return `/api/media/audio?id=${encodeURIComponent(fileId)}`;
}

export function buildAudioSource(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";

  try {
    const url = new URL(value);
    if (DRIVE_HOSTS.some((host) => url.hostname.includes(host))) {
      const id = url.searchParams.get("id") ?? extractDriveId(url.pathname);
      if (id) {
        return buildDriveProxyUrl(id);
      }
    }
  } catch {
    const id = extractDriveId(value);
    if (id) {
      return buildDriveProxyUrl(id);
    }
  }

  return value;
}

/**
 * Resolve a fonte de áudio de forma assíncrona.
 * - URL completa (Drive ou direta): trata como antes (buildAudioSource).
 * - Caminho do bucket privado "audios": gera link assinado temporário.
 */
export async function resolveAudioSource(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";

  // Já é uma URL http(s) → mantém o comportamento anterior.
  if (/^https?:\/\//i.test(value)) {
    return buildAudioSource(value);
  }

  // Caso contrário, é um caminho no bucket privado de áudios → assina.
  try {
    const signed = await createSignedUrl(BUCKETS.audios, value, 3600);
    return signed ?? "";
  } catch (error) {
    console.error("[media] Falha ao gerar link assinado do áudio:", error);
    return "";
  }
}

/**
 * Resolve a URL de um PDF/ePub.
 * - URL completa: retorna como está.
 * - Caminho do bucket privado "pdfs": gera link assinado temporário.
 */
export async function resolvePdfSource(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  try {
    const signed = await createSignedUrl(BUCKETS.pdfs, value, 3600);
    return signed ?? "";
  } catch (error) {
    console.error("[media] Falha ao gerar link assinado do PDF:", error);
    return "";
  }
}

/** Gera a URL temporária de uma cena da narrativa cinematográfica. */
export async function resolveNarrativeSource(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return (await createSignedUrl(BUCKETS.narrativas, value, 21600)) ?? "";
  } catch (error) {
    console.error("[media] Falha ao assinar cena narrativa:", error);
    return "";
  }
}

/** Abre uma mídia em nova aba, inclusive quando a URL precisa ser assinada. */
export async function openResolvedMedia(rawValue, resolver) {
  if (!rawValue || typeof window === "undefined") return false;

  const pendingTab = window.open("about:blank", "_blank");
  if (pendingTab) pendingTab.opener = null;

  try {
    const url = await resolver(rawValue);
    if (!url) {
      pendingTab?.close();
      return false;
    }
    if (pendingTab) pendingTab.location.replace(url);
    else window.location.assign(url);
    return true;
  } catch (error) {
    pendingTab?.close();
    console.error("[media] Falha ao abrir mídia:", error);
    return false;
  }
}
