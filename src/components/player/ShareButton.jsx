import React from "react";
import { Share2 } from "lucide-react";

export default function ShareButton({ track, className }) {
  const handleShare = async () => {
    if (!track) return;
    const text = `${track.title} — ${track.author} · Essência dos Livros`;
    try {
      if (navigator.share) await navigator.share({ title: track.title, text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch {
      /* cancelado pelo usuário */
    }
  };

  return (
    <button type="button" onClick={handleShare} aria-label="Compartilhar" className={className}>
      <Share2 className="h-5 w-5" />
    </button>
  );
}
