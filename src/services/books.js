import { supabase } from "../lib/supabase.js";

const BOOKS_TABLE = "livros";
const AUTHORS_TABLE = "autores";
const GENRES_TABLE = "generos";
const COLLECTIONS_TABLE = "colecoes";

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
