import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBookById } from "../services/books.js";
import { DEFAULT_COVER_PLACEHOLDER, ensureCoverSrc } from "../utils/covers.js";
import { buildAudioSource } from "../utils/media.js";

const AUTHOR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='gradient' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2334315b'/%3E%3Cstop offset='100%25' stop-color='%235f5677'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' rx='72' fill='url(%23gradient)'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='rgba(255,255,255,0.8)' font-family='Helvetica,Arial,sans-serif' font-size='72'%3EE%3C/text%3E%3C/svg%3E";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

function getAuthorInitials(name = "") {
  if (!name) return "A";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchBook() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBookById(bookId);
        if (active) {
          setBook(data);
        }
      } catch (err) {
        console.error("[BookDetails] erro ao carregar livro:", err);
        if (active) {
          setError(err?.message ?? "Não foi possível carregar os detalhes do livro.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchBook();
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return undefined;

    const handleLoaded = () => {
      setAudioDuration(node.duration || 0);
    };
    const handleTimeUpdate = () => {
      setAudioProgress(node.currentTime || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(node.duration || 0);
    };

    node.addEventListener("loadedmetadata", handleLoaded);
    node.addEventListener("timeupdate", handleTimeUpdate);
    node.addEventListener("play", handlePlay);
    node.addEventListener("pause", handlePause);
    node.addEventListener("ended", handleEnded);

    return () => {
      node.removeEventListener("loadedmetadata", handleLoaded);
      node.removeEventListener("timeupdate", handleTimeUpdate);
      node.removeEventListener("play", handlePlay);
      node.removeEventListener("pause", handlePause);
      node.removeEventListener("ended", handleEnded);
    };
  }, [book?.audio_url]);

  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [book?.audio_url]);

  const coverSrc = useMemo(() => ensureCoverSrc(book?.capa_url), [book]);
  const authorName = book?.autor?.nome ?? "Autor não informado";
  const authorInitials = useMemo(() => getAuthorInitials(authorName), [authorName]);
  const authorAvatar = useMemo(() => {
    const avatarUrl = book?.autor?.avatar_url;
    if (!avatarUrl) return null;
    return ensureCoverSrc(avatarUrl, AUTHOR_PLACEHOLDER);
  }, [book]);

  const genre = book?.genero?.nome;
  const collection = book?.colecao?.nome;
  const synopsis = book?.sinopse ?? "Sinopse não informada ainda.";
  const audioSource = useMemo(() => buildAudioSource(book?.audio_url), [book?.audio_url]);
  const hasAudio = Boolean(audioSource);
  const hasPdf = Boolean(book?.pdf_url);

  const handlePlaybackToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Falha ao iniciar áudio", err);
      });
    }
  };

  const handleSeek = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setAudioProgress(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const renderHero = () => {
    if (loading) {
      return (
        <div className="rounded-[32px] border border-white/10 bg-white/40 p-8 text-center text-sm text-[rgb(var(--text-secondary))] dark:bg-white/5">
          Carregando detalhes do título...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[32px] border border-red-200/50 bg-red-50/80 p-8 text-center text-sm text-red-900 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
          <p>{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/70 dark:text-red-100"
              onClick={() => navigate("/biblioteca")}
            >
              Voltar para a biblioteca
            </button>
            <button
              type="button"
              className="rounded-full border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/70 dark:text-red-100"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    if (!book) return null;

    return (
      <div className="grid gap-8 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.9)] p-6 shadow-[0_35px_90px_-70px_rgba(15,10,35,0.9)] lg:grid-cols-[minmax(280px,1fr),minmax(0,2fr)]">
        <div className="space-y-4">
          <img
            src={coverSrc}
            alt={book.titulo}
            className="mx-auto h-[420px] w-full max-w-[320px] rounded-[32px] object-cover shadow-2xl"
          />
          <div className="flex flex-wrap gap-3">
            {hasPdf && (
              <a
                href={book.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.4)] transition hover:bg-[rgb(var(--color-accent-dark))]"
              >
                Abrir PDF
              </a>
            )}
            <button
              type="button"
              onClick={() => navigate("/biblioteca")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
            >
              Voltar para a biblioteca
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Obra Essência</p>
            <h1 className="font-display text-4xl font-semibold text-[rgb(var(--text-primary))]">{book.titulo}</h1>
            {book.subtitulo && <p className="text-lg text-[rgb(var(--text-secondary))]">{book.subtitulo}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-[rgb(var(--text-secondary))]">
              {genre && <span className="rounded-full border border-[rgba(255,255,255,0.2)] px-3 py-1">{genre}</span>}
              {collection && <span className="rounded-full border border-[rgba(255,255,255,0.2)] px-3 py-1">Coleção {collection}</span>}
              {book.duracao_audio && <span className="rounded-full border border-[rgba(255,255,255,0.2)] px-3 py-1">{book.duracao_audio} min</span>}
              {book.status && <span className="rounded-full border border-[rgba(255,255,255,0.2)] px-3 py-1 capitalize">{book.status}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-white/5 p-4 backdrop-blur">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#b38b59] text-xl font-semibold text-white">
                {authorInitials}
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.7)]">Criador</p>
              <p className="text-xl font-semibold text-[rgb(var(--text-primary))]">{authorName}</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{book.autor?.bio ?? "Autor convidado Essência."}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Descrição</h2>
            <p className="text-base leading-relaxed text-[rgb(var(--text-secondary))] whitespace-pre-line">{synopsis}</p>
          </div>

          <div className="space-y-4 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Audiobook</p>
                <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{hasAudio ? "Pronto para ouvir" : "Audio indisponível"}</p>
              </div>
              {hasAudio && (
                <button
                  type="button"
                  onClick={handlePlaybackToggle}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-accent-primary))] text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.35)] transition hover:bg-[rgb(var(--color-accent-dark))]"
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
              )}
            </div>
            {hasAudio ? (
              <>
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 0}
                  value={audioProgress}
                  onChange={handleSeek}
                  className="w-full accent-[rgb(var(--color-accent-primary))]"
                />
                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
                  <span>{formatTime(audioProgress)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
                <audio ref={audioRef} src={audioSource} preload="metadata" />
              </>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Cadastre um link de áudio para liberar o player personalizado desta obra.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMeta = () => {
    if (!book) return null;
    return (
      <section className="grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.85)] p-6 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Status</p>
          <p className="text-lg font-semibold text-[rgb(var(--text-primary))] capitalize">{book.status ?? "indisponível"}</p>
          <p className="text-sm text-[rgb(var(--text-secondary))]">Controle e edição no painel editorial.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Lançamento</p>
          <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
            {book.data_lancamento ? new Date(book.data_lancamento).toLocaleDateString("pt-BR") : "Não informado"}
          </p>
          <p className="text-sm text-[rgb(var(--text-secondary))]">Data cadastrada no formulário de obras.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Coleção</p>
          <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{collection ?? "Livre"}</p>
          <p className="text-sm text-[rgb(var(--text-secondary))]">Organize em curadorias exclusivas.</p>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
        >
          ← Voltar
        </button>
        <Link
          to="/biblioteca"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-white/10"
        >
          Biblioteca
        </Link>
      </div>

      {renderHero()}
      {renderMeta()}
    </div>
  );
}
