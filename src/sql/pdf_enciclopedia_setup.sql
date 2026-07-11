-- =============================================================
-- 📄 PDF ENCICLOPÉDICO — Essência dos Livros
-- Adiciona a coluna que guarda a URL (assinada) do documento
-- enciclopédico gerado pela etapa "enciclopedia_pdf" da Engine
-- (ESSENCE ENGINE — Motor de Documento Enciclopédico).
--
-- O bucket 'pdfs' já existe e é privado (ver storage_setup.sql).
-- A Engine faz upload nele e grava aqui uma URL assinada de
-- longa duração (10 anos) para servir a leitura sem precisar
-- de um endpoint adicional de geração de URL sob demanda.
--
-- Rode este bloco no SQL Editor do Supabase.
-- =============================================================

alter table public.livros
  add column if not exists pdf_enciclopedico_url text;

comment on column public.livros.pdf_enciclopedico_url is
  'URL assinada (bucket privado "pdfs") do documento enciclopédico da obra, gerado pela etapa enciclopedia_pdf da Engine (ESSENCE ENGINE).';
