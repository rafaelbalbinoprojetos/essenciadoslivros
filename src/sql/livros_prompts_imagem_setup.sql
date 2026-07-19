-- =============================================================
-- PROMPTS DE IMAGEM DA ENGINE — Essência dos Livros
--
-- Persiste na própria obra os prompts finais usados pelas etapas:
--   heritage_prompt
--   capa_cinematica_prompt
--   player_hero_prompt
--
-- Idempotente: pode ser executado novamente com segurança.
-- =============================================================

alter table public.livros
  add column if not exists heritage_prompt text,
  add column if not exists capa_cinematica_prompt text,
  add column if not exists player_hero_prompt text;

comment on column public.livros.heritage_prompt is
  'Prompt final gerado pela etapa heritage_prompt da Essência Engine.';

comment on column public.livros.capa_cinematica_prompt is
  'Prompt final gerado pela etapa capa_cinematica_prompt da Essência Engine.';

comment on column public.livros.player_hero_prompt is
  'Prompt final gerado pela etapa player_hero_prompt da Essência Engine.';
