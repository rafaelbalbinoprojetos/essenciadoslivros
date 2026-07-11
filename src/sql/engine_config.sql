-- =============================================================
-- ENGINE CONFIG
-- Configuracao dinamica da Engine (modo de Testes da narrativa
-- cinematica), editavel direto no Supabase sem precisar trocar
-- variavel de ambiente no Vercel e fazer redeploy.
--
-- testes = true  -> narrativa cinematica gera so 2 cenas + Convite
--                    (chamada real a OpenAI, so que mais barata).
-- testes = false -> narrativa cinematica gera todas as 12-14 cenas.
-- As demais etapas (curador, editor, diretor, heritage, capa,
-- imagens, pdf) sempre chamam a OpenAI normalmente, independente
-- deste flag.
--
-- Tabela singleton: sempre existe exatamente 1 linha (id = true).
--
-- Pre-requisito: public.is_admin() criada pelos scripts base.
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

create table if not exists public.engine_config (
  id boolean primary key default true,
  testes boolean not null default false,
  atualizado_em timestamptz not null default now(),
  constraint engine_config_singleton check (id)
);

-- Migra instalacoes que ja tinham a versao antiga (colunas mock/narrativa_teste)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'engine_config' and column_name = 'narrativa_teste'
  ) then
    alter table public.engine_config add column if not exists testes boolean not null default false;
    update public.engine_config set testes = coalesce(narrativa_teste, false);
    alter table public.engine_config drop column if exists narrativa_teste;
    alter table public.engine_config drop column if exists mock;
  end if;
end $$;

insert into public.engine_config (id, testes)
values (true, false)
on conflict (id) do nothing;

create or replace function public.set_engine_config_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_engine_config_atualizado_em
  on public.engine_config;

create trigger set_engine_config_atualizado_em
before update on public.engine_config
for each row
execute function public.set_engine_config_atualizado_em();

alter table public.engine_config enable row level security;

drop policy if exists "engine_config_read" on public.engine_config;
create policy "engine_config_read"
  on public.engine_config
  for select
  to authenticated
  using (true);

drop policy if exists "engine_config_admin_write" on public.engine_config;
create policy "engine_config_admin_write"
  on public.engine_config
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- FIM. Para alternar o modo de Testes direto no banco:
--   update public.engine_config set testes = true;
-- Mas o normal e usar o toggle na propria pagina da Engine.
-- =============================================================
