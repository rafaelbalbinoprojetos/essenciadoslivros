import React, { useEffect, useMemo, useState } from "react";
import { Search, X, LayoutGrid } from "lucide-react";
import { listBooks } from "../services/books.js";
import { ensureCoverSrc } from "../utils/covers.js";
import BookCard from "../components/BookCard.jsx";
import { useEngagement } from "../hooks/useEngagement.js";
import { hasCinematicExperience } from "../services/narratives.js";

const NEW_DAYS = 14;
function isRecent(dateStr) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_DAYS * 24 * 60 * 60 * 1000;
}
function toCard(book) {
  return {
    id: book.id,
    slug: book.slug,
    title: book.titulo,
    author: book.autor?.nome ?? "—",
    category: book.genero?.nome,
    cover: ensureCoverSrc(book.capa_url || book.capa_cinematica_url),
    heroImage: book.player_hero_url ? ensureCoverSrc(book.player_hero_url) : null,
    synopsis: book.sinopse,
    hasPdf: Boolean(book.pdf_url),
    hasAudio: Boolean(book.audio_url),
    hasNarrative: hasCinematicExperience(book),
    pdfUrl: book.pdf_url,
    audioUrl: book.audio_url,
    isNew: isRecent(book.data_adicao),
  };
}

export default function MuralPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [genreId, setGenreId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { items } = await listBooks({ limit: 500, status: "ativo" });
        if (active) setBooks(items ?? []);
      } catch (err) {
        console.error("[Mural] erro:", err);
        if (active) setError(err.message ?? "Não foi possível carregar o acervo.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Gêneros que realmente têm livros (para os chips de filtro).
  const genresInUse = useMemo(() => {
    const map = new Map();
    books.forEach((b) => {
      if (b.genero?.id && !map.has(b.genero.id)) map.set(b.genero.id, b.genero.nome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [books]);

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      books.filter((b) => {
        const matchGenre = !genreId || b.genero?.id === genreId;
        const matchQuery =
          !normalized ||
          (b.titulo || "").toLowerCase().includes(normalized) ||
          (b.autor?.nome || "").toLowerCase().includes(normalized);
        return matchGenre && matchQuery;
      }),
    [books, genreId, normalized],
  );

  // Agrupa em seções por gênero.
  const sections = useMemo(() => {
    const map = new Map();
    filtered.forEach((b) => {
      const key = b.genero?.nome || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const bookIds = useMemo(() => books.map((b) => b.id), [books]);
  const { likeCounts, liked, saved, toggleLike, toggleSave } = useEngagement(bookIds);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--color-accent-primary))] text-white shadow-lg">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[rgb(var(--text-primary))]">Mural do acervo</h1>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Tudo num só lugar — busque e filtre na hora.</p>
          </div>
        </div>

        {/* Busca instantânea */}
        <div className="flex items-center gap-2 rounded-2xl border border-[rgba(var(--color-accent-primary),0.2)] bg-[rgba(var(--surface-card),0.8)] px-4 py-2.5 shadow-sm backdrop-blur">
          <Search className="h-4 w-4 flex-none text-[rgb(var(--text-subtle))]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou autor…"
            className="flex-1 bg-transparent text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-subtle))] focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="text-[rgb(var(--text-subtle))] transition hover:text-[rgb(var(--text-primary))]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro por gênero */}
        {genresInUse.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <FilterChip active={genreId === null} onClick={() => setGenreId(null)}>
              Todos
            </FilterChip>
            {genresInUse.map((g) => (
              <FilterChip key={g.id} active={genreId === g.id} onClick={() => setGenreId(g.id)}>
                {g.nome}
              </FilterChip>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="rounded-[24px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.7)] p-10 text-center text-sm text-[rgb(var(--text-secondary))]">
          Carregando acervo…
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-red-300/40 bg-red-50/70 p-6 text-sm text-red-800">⚠ {error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[24px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.7)] p-12 text-center">
          <p className="font-display text-lg font-semibold text-[rgb(var(--text-primary))]">Nenhum título encontrado</p>
          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
            {query ? `Nada para “${query}”.` : "Ajuste o filtro de gênero."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map(([genreName, items]) => (
            <section key={genreName} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[rgba(var(--color-accent-primary),0.15)] pb-2">
                <h2 className="font-display text-lg font-semibold text-[rgb(var(--text-primary))]">{genreName}</h2>
                <span className="text-xs font-semibold text-[rgb(var(--text-subtle))]">{items.length} {items.length === 1 ? "título" : "títulos"}</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {items.map((book) => (
                  <BookCard
                    key={book.id}
                    book={toCard(book)}
                    likeCount={likeCounts[book.id] || 0}
                    liked={liked.has(book.id)}
                    saved={saved.has(book.id)}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[rgb(var(--color-accent-primary))] text-white shadow-sm"
          : "border border-[rgba(var(--color-accent-primary),0.25)] bg-[rgba(var(--surface-card),0.7)] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--color-accent-primary),0.08)]"
      }`}
    >
      {children}
    </button>
  );
}
