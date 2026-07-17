import { resolveNarrativeSource } from "./media.js";
import { ensureCoverSrc } from "./covers.js";

/** Monta o track do audiobook simples (1 áudio por livro) para a fila do player. */
export function buildSimpleAudioTrack(book, coverSrc, audioSource) {
  if (!book || !audioSource) return null;
  return {
    id: book.id ?? "book-current",
    bookId: book.id ?? null,
    slug: book.slug ?? null,
    sceneId: null,
    title: book.titulo ?? "Audiobook Essência",
    author: book.autor?.nome ?? "Conteúdo Essência",
    cover: coverSrc,
    source: audioSource,
  };
}

/** Resolve e monta as cenas da narrativa cinematográfica para a fila do player. */
export async function buildNarrativeTracks(book, narrative, coverSrc) {
  const tracks = narrative?.faixas ?? [];
  if (!tracks.length) return [];

  const narrativeCover = narrative.capa_url ? ensureCoverSrc(narrative.capa_url) : coverSrc;
  const authorName = book?.autor?.nome ?? "Conteúdo Essência";

  const resolved = await Promise.all(
    tracks.map(async (track) => ({
      id: `narrative-${track.id}`,
      bookId: book?.id ?? null,
      slug: book?.slug ?? null,
      sceneId: track.id,
      title: track.titulo,
      author: narrative.titulo ?? authorName,
      cover: narrativeCover,
      source: await resolveNarrativeSource(track.audio_path),
      skipIntro: true,
      skipProgress: true,
    })),
  );

  return resolved.filter((track) => track.source);
}
