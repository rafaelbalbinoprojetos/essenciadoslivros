import React, { useState } from "react";
import { BookOpen, Bookmark, Film, Headphones, Heart, MoveUpRight } from "lucide-react";

function formatLikes(value) {
  return (Number(value) || 0).toLocaleString("pt-BR");
}

export default function EssenceArchiveCard({
  title,
  author,
  category,
  coverUrl,
  hasAudio = false,
  hasPdf = false,
  hasNarrative = false,
  likes = 0,
  liked = false,
  synopsis = "",
  onLike,
  onOpen,
  saved = false,
  onSave,
  onOpenAudio,
  onOpenPdf,
  onOpenNarrative,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasSynopsis = Boolean(synopsis?.trim());

  return (
    <article className="group isolate w-full">
      <div className="relative z-10 aspect-[3/4] w-full overflow-hidden rounded-[16px_16px_0_0] border border-[rgba(83,61,42,0.12)] bg-[rgb(var(--surface-card))] shadow-[0_14px_34px_-27px_rgba(54,39,25,0.48)] transition-shadow duration-[340ms] ease-out group-hover:shadow-[0_20px_42px_-26px_rgba(54,39,25,0.58)]">
        <button
          type="button"
          onClick={onLike}
          disabled={!onLike}
          aria-pressed={liked}
          aria-label={liked ? `Remover curtida. ${formatLikes(likes)} curtidas` : `Curtir. ${formatLikes(likes)} curtidas`}
          className={`absolute left-4 top-4 z-20 inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-md backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent-primary))] disabled:cursor-default ${
            liked
              ? "border-rose-300/70 bg-rose-50/90 text-rose-600"
              : "border-[rgba(83,61,42,0.16)] bg-[rgba(255,252,244,0.84)] text-[rgb(var(--text-secondary))] hover:bg-white"
          }`}
        >
          <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
          {formatLikes(likes)}
        </button>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            aria-label={saved ? "Remover dos salvos" : "Salvar obra"}
            title={saved ? "Salvo" : "Salvar obra"}
            className={`absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent-primary))] ${
              saved
                ? "border-[rgba(var(--color-accent-primary),0.4)] bg-[rgb(var(--color-accent-primary))] text-white"
                : "border-[rgba(83,61,42,0.16)] bg-[rgba(255,252,244,0.82)] text-[rgb(var(--text-secondary))] hover:bg-white"
            }`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir ${title}`}
            className="h-full w-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--color-accent-primary))]"
          >
          <img
            src={coverUrl}
            alt={`Capa de ${title}`}
            loading="lazy"
            className="block h-full w-full object-contain pt-2"
          />
        </button>
      </div>

      <div className="relative z-20 -mt-px rounded-[0_0_20px_20px] border border-t-0 border-[rgba(83,61,42,0.14)] bg-[linear-gradient(145deg,rgba(247,240,228,0.98),rgba(238,228,212,0.96))] px-4 pb-3.5 pt-4 shadow-[0_18px_38px_-30px_rgba(54,39,25,0.62)] backdrop-blur-sm transition-shadow duration-[340ms] md:group-hover:shadow-[0_23px_44px_-29px_rgba(54,39,25,0.58)] dark:bg-[linear-gradient(145deg,rgba(48,42,58,0.98),rgba(38,33,48,0.97))]">
        <span className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-accent-primary),0.35)] to-transparent" />

        {category && (
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[rgb(var(--color-accent-dark))]/70">
            {category}
          </p>
        )}

        <button type="button" onClick={onOpen} className="mt-1 block w-full text-left focus-visible:outline-none focus-visible:underline">
          <h3 className="line-clamp-2 font-display text-lg font-semibold leading-tight text-[rgb(var(--text-primary))]">
            {title}
          </h3>
          <p className="mt-1 truncate text-sm text-[rgb(var(--text-secondary))]">{author}</p>
        </button>

        <div className="mt-3 flex min-h-7 items-center gap-1.5 border-t border-[rgba(83,61,42,0.1)] pt-2.5">
          {hasAudio ? <button
            type="button"
            onClick={onOpenAudio}
            disabled={!onOpenAudio}
            aria-label="Abrir áudio"
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.12)] bg-white/55 px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-secondary))] transition hover:bg-white disabled:cursor-default"
            title="Abrir áudio"
          >
            <Headphones className="h-3.5 w-3.5 text-[rgb(var(--color-accent-primary))]" aria-hidden="true" />
            Áudio
          </button> : <span
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.08)] px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-subtle))] opacity-55"
            title="Áudio indisponível"
          >
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            Áudio
          </span>}
          {hasPdf ? <button
            type="button"
            onClick={onOpenPdf}
            disabled={!onOpenPdf}
            aria-label="Abrir e-book"
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.12)] bg-white/55 px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-secondary))] transition hover:bg-white disabled:cursor-default"
            title="Abrir e-book"
          >
            <BookOpen className="h-3.5 w-3.5 text-[rgb(var(--color-accent-primary))]" aria-hidden="true" />
            E-book
          </button> : <span
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.08)] px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-subtle))] opacity-55"
            title="E-book indisponível"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            E-book
          </span>}
          {hasNarrative ? <button
            type="button"
            onClick={onOpenNarrative}
            disabled={!onOpenNarrative}
            aria-label="Abrir narrativa cinematográfica"
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.12)] bg-white/55 px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-secondary))] transition hover:bg-white disabled:cursor-default"
            title="Abrir narrativa cinematográfica"
          >
            <Film className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-accent-primary))]" aria-hidden="true" />
            Narrativa
          </button> : <span
            className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[rgba(83,61,42,0.08)] px-1.5 py-1 text-[9px] font-semibold text-[rgb(var(--text-subtle))] opacity-55"
            title="Narrativa indisponível"
          >
            <Film className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Narrativa
          </span>}
        </div>

        {hasSynopsis && (
          <>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-[340ms] ease-out group-hover:grid-rows-[1fr] group-hover:opacity-100 ${
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="line-clamp-3 border-t border-[rgba(83,61,42,0.1)] pt-3 text-sm leading-relaxed text-[rgb(var(--text-secondary))]">
                  {synopsis}
                </p>
                <button type="button" onClick={onOpen} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--color-accent-dark))] hover:underline">
                  Abrir ficha <MoveUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              className="mt-2 min-h-9 w-full rounded-lg text-xs font-semibold text-[rgb(var(--color-accent-dark))] transition hover:bg-white/45 md:hidden"
            >
              {expanded ? "Recolher essência" : "Ver essência"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
