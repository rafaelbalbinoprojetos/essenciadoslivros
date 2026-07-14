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
  capa_cinematica_url,
  pdf_url,
  pdf_cinematica_url,
  pdf_enciclopedico_url,
  pdf_guia_editorial_url,
  audio_url,
  tem_experiencia_cinematica,
  titulo_cinematico,
  descricao_cinematica,
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
  ),
  narrativa:narrativas (
    id,
    status,
    faixas:narrativa_faixas (
      id,
      status
    )
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

export async function listBooksAddedRecently({ days = 3, limit = 8 } = {}) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(BOOKS_TABLE)
    .select("id, titulo, tipo_obra, capa_url, capa_cinematica_url, data_adicao")
    .eq("status", "ativo")
    .gte("data_adicao", cutoff)
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

export async function updateBook(id, payload) {
  if (!id) throw new Error("Informe o identificador do livro.");
  const { data, error } = await supabase.from(BOOKS_TABLE).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Registros relacionados (narrativas, avaliações, engajamento, progresso de
// jornadas) têm "on delete cascade" pra livros — apagam junto. Arquivos no
// Storage (capa, pdf, áudio) não são removidos automaticamente por isto.
export async function deleteBook(id) {
  if (!id) throw new Error("Informe o identificador do livro.");
  const { error } = await supabase.from(BOOKS_TABLE).delete().eq("id", id);
  if (error) throw error;
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
