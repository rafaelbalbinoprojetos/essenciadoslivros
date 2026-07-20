import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, ChevronDown, Headphones, LibraryBig, Search, Sparkles, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listBooks } from "../services/books.js";
import { ensureCoverSrc } from "../utils/covers.js";
import { hasCinematicExperience } from "../services/narratives.js";

const SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "antigas", label: "Mais antigas" },
  { value: "titulo", label: "Título: A–Z" },
  { value: "autor", label: "Autor: A–Z" },
];

const MEDIA_OPTIONS = [
  { value: "todos", label: "Toda mídia" },
  { value: "audio", label: "Com áudio" },
  { value: "pdf", label: "Com PDF" },
  { value: "cinematica", label: "Experiência cinematográfica" },
];

const TYPE_LABELS = {
  livro: "Livros",
  filme: "Filmes",
  jogo: "Jogos",
  anime: "Animes",
  serie: "Séries",
  dorama: "Doramas",
  biografia: "Biografias",
  tecnico: "Técnicos",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function hasPdf(book) {
  return Boolean(book.pdf_url || book.pdf_cinematica_url || book.pdf_enciclopedico_url || book.pdf_guia_editorial_url);
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", { sensitivity: "base" });
}

function formatType(type) {
  if (!type) return "Obra";
  return TYPE_LABELS[type]?.replace(/s$/, "") || type;
}

function SelectFilter({ value, onChange, label, children }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-[#8b6b32]/45 bg-[#0e0e0c]/90 py-2 pl-3 pr-9 text-sm text-[#ead7aa] outline-none transition hover:border-[#c59a4d]/70 focus:border-[#d4a657] focus:ring-2 focus:ring-[#d4a657]/15"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b7904d]" />
    </label>
  );
}

function ArchiveCard({ book }) {
  const cover = ensureCoverSrc(book.capa_url || book.capa_cinematica_url);
  const cinematic = hasCinematicExperience(book);
  const media = [book.audio_url && "Áudio", hasPdf(book) && "PDF", cinematic && "Cinemática"].filter(Boolean);

  return (
    <article className="group relative overflow-hidden rounded-[4px] border border-[#80612d]/55 bg-[#0c0c0a] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.95)] transition duration-300 hover:-translate-y-1 hover:border-[#c39649]/80 hover:shadow-[0_24px_55px_-25px_rgba(197,150,73,0.25)]">
      <Link to={`/biblioteca/${book.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a657]" aria-label={`Abrir ${book.titulo}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#171610]">
          <img
            src={cover}
            alt={`Capa de ${book.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035] group-hover:brightness-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/[0.03]" />
          <span className="absolute left-3 top-3 rounded-full border border-[#d4a657]/35 bg-black/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e5c989] backdrop-blur-sm">
            {formatType(book.tipo_obra)}
          </span>
        </div>

        <div className="relative min-h-[98px] border-t border-[#80612d]/50 px-3.5 py-3">
          <div className="pr-7">
            <h2 className="line-clamp-2 font-display text-[17px] font-medium leading-[1.15] text-[#e4c47e] transition group-hover:text-[#f3d999]">
              {book.titulo}
            </h2>
            <p className="mt-1.5 truncate text-xs text-[#b9ad96]">{book.autor?.nome || "Autor não informado"}</p>
          </div>
          <ArrowUpRight className="absolute right-3 top-3.5 h-4 w-4 text-[#9f7a3b] opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          {media.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {media.map((item) => (
                <span key={item} className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8f836d]">{item}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[4px] border border-[#80612d]/25 bg-[#11110e]">
      <div className="aspect-[4/5] bg-[#242117]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded bg-[#2e291d]" />
        <div className="h-3 w-1/2 rounded bg-[#242117]" />
      </div>
    </div>
  );
}

export default function AcervoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = searchParams.get("busca") || "";
  const genre = searchParams.get("genero") || "todos";
  const type = searchParams.get("tipo") || "todos";
  const media = searchParams.get("midia") || "todos";
  const sort = searchParams.get("ordem") || "recentes";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listBooks({ limit: 1000, status: "ativo" })
      .then(({ items }) => {
        if (active) setBooks(items || []);
      })
      .catch((loadError) => {
        console.error("[Acervo] erro ao carregar obras:", loadError);
        if (active) setError(loadError?.message || "Não foi possível carregar o acervo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const genres = useMemo(() => {
    const unique = new Map();
    books.forEach((book) => {
      if (book.genero?.id) unique.set(book.genero.id, book.genero.nome);
    });
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => compareText(a.name, b.name));
  }, [books]);

  const types = useMemo(() => {
    return [...new Set(books.map((book) => book.tipo_obra).filter(Boolean))]
      .sort((a, b) => compareText(TYPE_LABELS[a] || a, TYPE_LABELS[b] || b));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const result = books.filter((book) => {
      const searchable = normalizeText([book.titulo, book.subtitulo, book.autor?.nome, book.genero?.nome].filter(Boolean).join(" "));
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (genre !== "todos" && book.genero?.id !== genre) return false;
      if (type !== "todos" && book.tipo_obra !== type) return false;
      if (media === "audio" && !book.audio_url) return false;
      if (media === "pdf" && !hasPdf(book)) return false;
      if (media === "cinematica" && !hasCinematicExperience(book)) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sort === "titulo") return compareText(a.titulo, b.titulo);
      if (sort === "autor") return compareText(a.autor?.nome, b.autor?.nome) || compareText(a.titulo, b.titulo);
      const dateA = new Date(a.data_adicao || 0).getTime();
      const dateB = new Date(b.data_adicao || 0).getTime();
      return sort === "antigas" ? dateA - dateB : dateB - dateA;
    });
  }, [books, genre, media, query, sort, type]);

  function setFilter(key, value, defaultValue = "todos") {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  const hasFilters = Boolean(query || genre !== "todos" || type !== "todos" || media !== "todos" || sort !== "recentes");

  return (
    <div className="relative -mx-4 -mt-6 min-h-full overflow-hidden bg-[#090a08] px-4 pb-20 pt-8 text-[#e7ddc8] md:-mx-8 md:px-8 md:pt-10">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_5%,rgba(170,126,54,0.18),transparent_30%),radial-gradient(circle_at_85%_35%,rgba(66,77,45,0.2),transparent_34%),linear-gradient(115deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:auto,auto,34px_34px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#1b180e]/80 to-transparent" />

      <div className="relative mx-auto max-w-[1500px]">
        <header className="border-b border-[#80612d]/35 pb-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#a9894e]">
                <LibraryBig className="h-4 w-4" /> Biblioteca Essência
              </div>
              <h1 className="font-display text-4xl font-semibold tracking-[0.02em] text-[#e5c77f] sm:text-5xl">Acervo de obras</h1>
              <p className="mt-2 font-display text-base italic text-[#a99d86] sm:text-lg">Todas as histórias, ideias e universos reunidos em um só lugar.</p>
            </div>
            <div className="flex items-baseline gap-2 text-[#c99d50]">
              <span className="font-display text-3xl">{loading ? "—" : filteredBooks.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">{filteredBooks.length === 1 ? "obra" : "obras"}</span>
            </div>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(150px,0.7fr))]">
            <label className="relative block">
              <span className="sr-only">Pesquisar obras</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d7a40]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setFilter("busca", event.target.value, "")}
                placeholder="Título, autor ou gênero..."
                className="h-11 w-full rounded-xl border border-[#8b6b32]/45 bg-[#0e0e0c]/90 py-2 pl-10 pr-10 text-sm text-[#ead7aa] outline-none placeholder:text-[#716957] hover:border-[#c59a4d]/70 focus:border-[#d4a657] focus:ring-2 focus:ring-[#d4a657]/15"
              />
              {query && (
                <button type="button" onClick={() => setFilter("busca", "", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8169] hover:text-[#e5c77f]" aria-label="Limpar pesquisa">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <SelectFilter value={genre} onChange={(value) => setFilter("genero", value)} label="Filtrar por gênero">
              <option value="todos">Todos os gêneros</option>
              {genres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectFilter>

            <SelectFilter value={type} onChange={(value) => setFilter("tipo", value)} label="Filtrar por tipo">
              <option value="todos">Todos os tipos</option>
              {types.map((item) => <option key={item} value={item}>{TYPE_LABELS[item] || item}</option>)}
            </SelectFilter>

            <SelectFilter value={media} onChange={(value) => setFilter("midia", value)} label="Filtrar por mídia">
              {MEDIA_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </SelectFilter>

            <SelectFilter value={sort} onChange={(value) => setFilter("ordem", value, "recentes")} label="Ordenar obras">
              {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </SelectFilter>
          </div>
        </header>

        <main className="pt-7">
          {error ? (
            <div className="rounded-xl border border-red-800/40 bg-red-950/25 p-8 text-center text-sm text-red-200">{error}</div>
          ) : loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 12 }, (_, index) => <CardSkeleton key={index} />)}
            </div>
          ) : filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredBooks.map((book) => <ArchiveCard key={book.id} book={book} />)}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#80612d]/45 bg-black/20 px-6 text-center">
              <BookOpen className="h-8 w-8 text-[#96743d]" />
              <h2 className="mt-4 font-display text-xl text-[#e5c77f]">Nenhuma obra encontrada</h2>
              <p className="mt-1 max-w-md text-sm text-[#8f8572]">Tente alterar a pesquisa ou remover alguns filtros para ampliar o acervo.</p>
              {hasFilters && <button type="button" onClick={clearFilters} className="mt-5 rounded-lg border border-[#a47c39]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#d9bb78] hover:bg-[#d4a657]/10">Limpar filtros</button>}
            </div>
          )}

          {!loading && !error && filteredBooks.length > 0 && (
            <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[#80612d]/30 pt-5 text-xs text-[#756d5e]">
              <span>{filteredBooks.length} de {books.length} obras exibidas</span>
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Headphones className="h-3.5 w-3.5" /> áudio</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> experiência</span>
              </span>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
