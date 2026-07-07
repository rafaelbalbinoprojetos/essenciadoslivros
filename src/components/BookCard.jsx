import React from "react";
import { useNavigate } from "react-router-dom";
import EssenceArchiveCard from "./EssenceArchiveCard.jsx";
import { openResolvedMedia, resolveAudioSource, resolvePdfSource } from "../utils/media.js";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";

/**
 * Card informativo de obra, reutilizável (Mural, Biblioteca...).
 * A capa preenche o card; as infos ficam sobre um degradê/vidro no rodapé.
 *
 * book: { id, title, author, category, cover, hasPdf, hasAudio, isNew }
 */
export default function BookCard({ book, likeCount = 0, liked = false, saved = false, onToggleLike, onToggleSave }) {
  const navigate = useNavigate();
  const { startPlaylist } = useAudioPlaylist();
  const detailTo = book.id ? `/biblioteca/${book.id}` : "/biblioteca";

  const handlePlayAudio = async () => {
    if (!book.audioUrl) return;
    const source = await resolveAudioSource(book.audioUrl);
    if (!source) return;
    startPlaylist([
      {
        id: book.id ?? `archive-${book.title}`,
        bookId: book.id ?? null,
        title: book.title ?? "Audiobook Essência",
        author: book.author ?? "Autor não informado",
        cover: book.cover,
        source,
      },
    ]);
  };

  return (
    <EssenceArchiveCard
      title={book.title}
      author={book.author}
      category={book.category}
      coverUrl={book.cover}
      hasAudio={book.hasAudio}
      hasPdf={book.hasPdf}
      hasNarrative={book.hasNarrative}
      likes={likeCount}
      liked={liked}
      synopsis={book.synopsis}
      onLike={onToggleLike ? () => onToggleLike(book.id) : undefined}
      onOpen={() => navigate(detailTo)}
      saved={saved}
      onSave={onToggleSave ? () => onToggleSave(book.id) : undefined}
      onOpenAudio={book.audioUrl ? handlePlayAudio : undefined}
      onOpenPdf={book.pdfUrl ? () => openResolvedMedia(book.pdfUrl, resolvePdfSource) : undefined}
      onOpenNarrative={book.hasNarrative ? () => navigate(`${detailTo}#narrativa`) : undefined}
    />
  );
}
