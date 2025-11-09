import { supabase } from "../lib/supabase.js";

const BOOKS_TABLE = "livros";
const AUTHORS_TABLE = "autores";
const GENRES_TABLE = "generos";
const COLLECTIONS_TABLE = "colecoes";
const BOOK_SELECT_FIELDS = `
  id,
  titulo,
  subtitulo,
  sinopse,
  capa_url,
  pdf_url,
  audio_url,
  status,
  destaque,
  duracao_audio,
  data_lancamento,
  data_adicao,
  autor:autor_id (
    id,
    nome
  ),
  genero:genero_id (
    id,
    nome
  ),
  colecao:colecao_id (
    id,
    nome
  )
`;

function baseBookQuery() {
  return supabase.from(BOOKS_TABLE).select(BOOK_SELECT_FIELDS, { count: "exact" });
}

export async function listAuthors() {
  const { data, error } = await supabase.from(AUTHORS_TABLE).select("id, nome").order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listGenres() {
  const { data, error } = await supabase.from(GENRES_TABLE).select("id, nome").order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listCollections() {
  const { data, error } = await supabase.from(COLLECTIONS_TABLE).select("id, nome").order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBooks({
  search = "",
  limit = 24,
  offset = 0,
  status = "ativo",
  featuredOnly = false,
  orderBy = "data_adicao",
  ascending = false,
} = {}) {
  let query = baseBookQuery().order(orderBy, { ascending });

  if (Number.isFinite(limit) && limit > 0) {
    const start = Math.max(offset, 0);
    query = query.range(start, start + limit - 1);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (featuredOnly) {
    query = query.eq("destaque", true);
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const wildcard = `%${trimmedSearch}%`;
    query = query.or(`titulo.ilike.${wildcard},sinopse.ilike.${wildcard}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: data ?? [],
    count: typeof count === "number" ? count : (data ?? []).length,
  };
}

export async function listRecentBooks(limit = 6) {
  const { data, error } = await baseBookQuery()
    .eq("status", "ativo")
    .order("data_adicao", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getBookById(bookId) {
  if (!bookId) throw new Error("Informe o identificador do livro.");
  const { data, error } = await baseBookQuery().eq("id", bookId).single();
  if (error) throw error;
  return data;
}

export async function createBook(payload) {
  const { data, error } = await supabase.from(BOOKS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function createAuthor(payload) {
  const { data, error } = await supabase.from(AUTHORS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function createCollection(payload) {
  const { data, error } = await supabase.from(COLLECTIONS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}
