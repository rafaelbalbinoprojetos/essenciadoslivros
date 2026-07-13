-- =========================================================
-- Custos de IA por etapa da Engine
-- Rode este script no SQL Editor do Supabase (idempotente).
-- =========================================================

-- 1) Tabela de preços por modelo (USD por 1.000.000 de tokens)
create table if not exists public.ai_precos_modelo (
  modelo text primary key,
  provider text not null default 'openai',
  preco_input_1m numeric,
  preco_output_1m numeric,
  moeda text not null default 'USD',
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

alter table public.ai_precos_modelo enable row level security;

drop policy if exists "ai_precos_modelo_select" on public.ai_precos_modelo;
create policy "ai_precos_modelo_select"
  on public.ai_precos_modelo for select
  to authenticated
  using (true);

drop policy if exists "ai_precos_modelo_admin" on public.ai_precos_modelo;
create policy "ai_precos_modelo_admin"
  on public.ai_precos_modelo for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed inicial — CONFIRA e ajuste estes valores para a tabela de preços
-- vigente da OpenAI antes de usar em produção (mude e rode de novo quando
-- os preços da OpenAI mudarem; o "on conflict" mantém a linha atualizada).
insert into public.ai_precos_modelo (modelo, preco_input_1m, preco_output_1m)
values
  ('gpt-4.1',      2.00, 8.00),
  ('gpt-4.1-mini', 0.40, 1.60)
on conflict (modelo) do update set
  preco_input_1m = excluded.preco_input_1m,
  preco_output_1m = excluded.preco_output_1m,
  atualizado_em = now();

-- 2) ai_pipeline_etapas passa a guardar também o modelo usado na etapa
-- (hoje só ai_agente_execucoes tem essa coluna)
alter table public.ai_pipeline_etapas add column if not exists modelo text;

-- 3) View: cada linha = uma parte do processo (etapa) já com os dados da obra
create or replace view public.vw_ai_custos_por_etapa
with (security_invoker = true) as
select
  e.id as etapa_id,
  e.obra_id,
  l.titulo as obra_titulo,
  l.tipo_obra,
  e.tipo_etapa,
  e.status,
  e.ordem,
  e.modelo,
  e.tokens_input,
  e.tokens_output,
  coalesce(e.tokens_input, 0) + coalesce(e.tokens_output, 0) as tokens_total,
  e.custo_estimado as custo_estimado_usd,
  e.started_at,
  e.completed_at
from public.ai_pipeline_etapas e
join public.livros l on l.id = e.obra_id;

-- 4) View: custo total acumulado por obra
create or replace view public.vw_ai_custos_por_obra
with (security_invoker = true) as
select
  obra_id,
  obra_titulo,
  count(*) as etapas_registradas,
  sum(tokens_input) as tokens_input_total,
  sum(tokens_output) as tokens_output_total,
  sum(custo_estimado_usd) as custo_total_usd
from public.vw_ai_custos_por_etapa
group by obra_id, obra_titulo;
