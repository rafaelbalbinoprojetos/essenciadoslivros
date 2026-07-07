import React, { useEffect, useMemo, useState } from "react";
import { Film, Play, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listBooks } from "../services/books.js";
import { hasCinematicExperience } from "../services/narratives.js";
import { ensureCoverSrc } from "../utils/covers.js";

function getNarrative(book) {
  return Array.isArray(book?.narrativa) ? book.narrativa[0] : book?.narrativa;
}

export default function CinematicMemoriesPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listBooks({ limit: 120, status: "ativo", orderBy: "data_adicao", ascending: false })
      .then(({ items }) => {
        if (active) setBooks(items.filter(hasCinematicExperience));
      })
      .catch((requestError) => {
        console.error("[CinematicMemories] erro ao carregar coleção:", requestError);
        if (active) setError("Não foi possível carregar as memórias cinematográficas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const totalScenes = useMemo(() => books.reduce((sum, book) => {
    const tracks = getNarrative(book)?.faixas ?? [];
    return sum + tracks.filter((track) => track.status === "ativo").length;
  }, 0), [books]);

  return (
    <div className="space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-[32px] border border-[rgba(83,61,42,0.14)] bg-[linear-gradient(125deg,rgba(35,28,43,0.98),rgba(75,53,43,0.94))] px-6 py-10 text-white shadow-[0_30px_70px_-48px_rgba(28,18,12,0.9)] md:px-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[rgba(var(--color-accent-primary),0.22)] blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.42em] text-white/60">
            <Sparkles className="h-4 w-4" /> Coleção especial
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">Memórias Cinematográficas</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/72">
            Jornadas narradas como lembrança — experiências sonoras criadas para reviver obras que permanecem.
          </p>
          {!loading && !error && (
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-white/48">
              {books.length} {books.length === 1 ? "obra" : "obras"} · {totalScenes} {totalScenes === 1 ? "cena" : "cenas"}
            </p>
          )}
        </div>
      </header>

      {loading && <p className="py-12 text-center text-sm text-[rgb(var(--text-secondary))]">Preparando a coleção...</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
      {!loading && !error && books.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-[rgba(var(--color-accent-primary),0.25)] p-10 text-center">
          <Film className="mx-auto h-8 w-8 text-[rgb(var(--color-accent-primary))]" />
          <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">Nenhuma memória cinematográfica publicada ainda.</p>
        </div>
      )}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => {
          const narrative = getNarrative(book);
          const scenes = (narrative?.faixas ?? []).filter((track) => track.status === "ativo").length;
          const cover = ensureCoverSrc(book.capa_cinematica_url || book.capa_url);
          return (
            <article key={book.id} className="group overflow-hidden rounded-[26px] border border-[rgba(83,61,42,0.14)] bg-[rgb(var(--surface-card))] shadow-[0_26px_60px_-42px_rgba(50,35,20,0.68)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_66px_-38px_rgba(50,35,20,0.72)]">
              <button
                type="button"
                onClick={() => navigate(`/biblioteca/${book.id}#narrativa`)}
                aria-label={`Abrir Memória Cinematográfica de ${book.titulo}`}
                className="relative block aspect-[3/4] w-full overflow-hidden bg-[#090806] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--color-accent-primary))]"
              >
                <img src={cover} alt={book.titulo} loading="lazy" className="h-full w-full object-contain pt-2" />
                <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/48 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                  Memória Cinematográfica
                </span>
                <span className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
              </button>
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[rgb(var(--color-accent-dark))]">{book.genero?.nome ?? "Obra Essência"}</p>
                <h2 className="mt-2 line-clamp-2 font-display text-2xl font-semibold leading-tight text-[rgb(var(--text-primary))]">{book.titulo}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[rgb(var(--text-secondary))]">
                  {book.descricao_cinematica || narrative?.descricao || "Uma jornada narrada como lembrança — por alguém que esteve lá."}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(83,61,42,0.1)] pt-4">
                  <span className="text-xs font-semibold text-[rgb(var(--text-subtle))]">{scenes} {scenes === 1 ? "cena" : "cenas"}</span>
                  <button type="button" onClick={() => navigate(`/biblioteca/${book.id}#narrativa`)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))]">
                    <Play className="h-3.5 w-3.5" fill="currentColor" /> Iniciar experiência
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
