import { supabase } from "../lib/supabase.js";
import { BUCKETS, removeFromBucket } from "../lib/storage.js";

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

// capa_url/capa_cinematica_url guardam a URL pública completa; pdf_cinematica_url,
// pdf_enciclopedico_url e pdf_guia_editorial_url guardam uma URL ASSINADA (com
// token, que pode já ter expirado); pdf_url e audio_url guardam o caminho cru
// dentro do bucket. Esta função normaliza os três formatos pro caminho relativo
// que o Storage precisa pra apagar o arquivo — e descarta URLs de outro host
// (ex.: capa hospedada no Google Drive), que não são nossas pra apagar.
function extrairCaminhoDoStorage(valor, bucket) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return null;

  if (!/^https?:\/\//i.test(texto)) {
    return texto;
  }

  try {
    const url = new URL(texto);
    const marcador = "/storage/v1/object/";
    const indice = url.pathname.indexOf(marcador);
    if (indice === -1) return null;

    const resto = url.pathname.slice(indice + marcador.length); // "public/capas/..." ou "sign/pdfs/..."
    const [, bucketNaUrl, ...partesCaminho] = resto.split("/");
    if (bucketNaUrl !== bucket || partesCaminho.length === 0) return null;

    return decodeURIComponent(partesCaminho.join("/"));
  } catch {
    return null;
  }
}

async function coletarCaminhosDeAudioDaNarrativa(livroId) {
  const { data, error } = await supabase
    .from("narrativas")
    .select("faixas:narrativa_faixas(audio_path)")
    .eq("livro_id", livroId);

  if (error) {
    console.error("[books] erro ao buscar faixas de narrativa para limpeza de storage:", error);
    return [];
  }

  return (data ?? [])
    .flatMap((narrativa) => narrativa.faixas ?? [])
    .map((faixa) => faixa.audio_path)
    .filter(Boolean);
}

// Registros relacionados (narrativas, avaliações, engajamento, progresso de
// jornadas) têm "on delete cascade" pra livros — apagam junto no banco. Os
// arquivos no Storage (capa, PDFs, áudio, cenas narradas) não são apagados
// pela cascata, então são removidos aqui manualmente, na melhor tentativa:
// se algum arquivo já não existir ou faltar permissão, isso não impede a
// obra de ser excluída do catálogo.
export async function deleteBook(id) {
  if (!id) throw new Error("Informe o identificador do livro.");

  const livro = await getBookById(id).catch(() => null);
  const caminhosNarrativa = await coletarCaminhosDeAudioDaNarrativa(id);

  const { error } = await supabase.from(BOOKS_TABLE).delete().eq("id", id);
  if (error) throw error;

  const remocoes = [];
  const agendarRemocao = (bucket, valor) => {
    const caminho = extrairCaminhoDoStorage(valor, bucket);
    if (caminho) remocoes.push(removeFromBucket(bucket, [caminho]));
  };

  agendarRemocao(BUCKETS.capas, livro?.capa_url);
  agendarRemocao(BUCKETS.capas, livro?.capa_cinematica_url);
  agendarRemocao(BUCKETS.pdfs, livro?.pdf_url);
  agendarRemocao(BUCKETS.pdfs, livro?.pdf_cinematica_url);
  agendarRemocao(BUCKETS.pdfs, livro?.pdf_enciclopedico_url);
  agendarRemocao(BUCKETS.pdfs, livro?.pdf_guia_editorial_url);
  agendarRemocao(BUCKETS.audios, livro?.audio_url);

  if (caminhosNarrativa.length > 0) {
    remocoes.push(removeFromBucket(BUCKETS.narrativas, caminhosNarrativa));
  }

  const resultados = await Promise.allSettled(remocoes);
  resultados.forEach((resultado) => {
    if (resultado.status === "rejected") {
      console.error("[books] falha ao remover arquivo do storage após excluir obra:", resultado.reason);
    }
  });
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
