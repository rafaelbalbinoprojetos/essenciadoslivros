-- =============================================================
-- 📄 PDF CINEMÁTICO — Essência dos Livros
-- Adiciona a coluna que guarda a URL (assinada) do PDF gerado
-- pela etapa "pdf_cinematica" da Engine.
--
-- O bucket 'pdfs' já existe e é privado (ver storage_setup.sql).
-- A Engine faz upload nele e grava aqui uma URL assinada de
-- longa duração (10 anos) para servir a leitura sem precisar
-- de um endpoint adicional de geração de URL sob demanda.
--
-- Rode este bloco no SQL Editor do Supabase.
-- =============================================================

alter table public.livros
  add column if not exists pdf_cinematica_url text;

comment on column public.livros.pdf_cinematica_url is
  'URL assinada (bucket privado "pdfs") do PDF da narrativa cinematográfica, gerado pela etapa pdf_cinematica da Engine.';
