-- =============================================================
-- ESSÊNCIA ENGINE — Correção de atualizado_em
--
-- Motivo:
--   Algumas tabelas da Engine podem possuir trigger apontando para
--   public.set_atualizado_em(), que executa:
--
--     new.atualizado_em = now();
--
--   Se a tabela não tiver a coluna atualizado_em, qualquer UPDATE falha com:
--   record "new" has no field "atualizado_em"
--
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

alter table public.ai_pipeline_etapas
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.ai_agente_execucoes
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.obras_payloads_universais
  add column if not exists atualizado_em timestamptz not null default now();

-- Opcional, mas útil para consultas administrativas recentes.
create index if not exists ai_pipeline_etapas_atualizado_em_idx
  on public.ai_pipeline_etapas (atualizado_em desc);

create index if not exists ai_agente_execucoes_atualizado_em_idx
  on public.ai_agente_execucoes (atualizado_em desc);

create index if not exists obras_payloads_universais_atualizado_em_idx
  on public.obras_payloads_universais (atualizado_em desc);

-- =============================================================
-- FIM
-- =============================================================
