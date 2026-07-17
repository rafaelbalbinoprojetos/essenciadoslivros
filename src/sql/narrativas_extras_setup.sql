-- =============================================================
-- NARRATIVAS — campos extras (narrador, trilha sonora, frase da cena)
--
-- Complementa src/sql/narrativas_setup.sql com colunas usadas pelo
-- CinematicPlayer: nome de quem narra e da trilha sonora (por
-- narrativa) e uma frase em destaque por cena. Todas opcionais —
-- ficam nulas até serem preenchidas por obra; a UI já trata a
-- ausência delas sem quebrar layout.
--
-- Rode este arquivo no SQL Editor do Supabase, depois de
-- narrativas_setup.sql.
-- =============================================================

alter table public.narrativas add column if not exists narrador text;
alter table public.narrativas add column if not exists trilha_sonora text;

alter table public.narrativa_faixas add column if not exists frase_destaque text;

-- =============================================================
-- FIM
-- =============================================================
