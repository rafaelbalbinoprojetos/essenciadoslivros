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
    collection: book.colecao?.nome ?? null,
    totalDurationSeconds: (book.duracao_audio || 0) * 60,
  };
}

/** Resolve e monta as cenas da narrativa cinematográfica para a fila do player. */
export async function buildNarrativeTracks(book, narrative, coverSrc) {
  const tracks = narrative?.faixas ?? [];
  if (!tracks.length) return [];

  const narrativeCover = narrative.capa_url ? ensureCoverSrc(narrative.capa_url) : coverSrc;
  const authorName = book?.autor?.nome ?? "Conteúdo Essência";
  const collection = book?.colecao?.nome ?? null;
  const totalDurationSeconds = tracks.reduce((sum, track) => sum + (track.duracao_segundos || 0), 0);

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
      description: track.descricao ?? null,
      quote: track.frase_destaque ?? null,
      narrator: narrative.narrador ?? null,
      soundtrack: narrative.trilha_sonora ?? null,
      collection,
      totalDurationSeconds,
    })),
  );

  return resolved.filter((track) => track.source);
}
