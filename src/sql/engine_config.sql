-- =============================================================
-- ENGINE CONFIG
-- Configuracao dinamica da Engine (mock e modo de teste da
-- narrativa cinematica), editavel direto no Supabase sem
-- precisar trocar variavel de ambiente no Vercel e fazer redeploy.
--
-- Tabela singleton: sempre existe exatamente 1 linha (id = true).
--
-- Pre-requisito: public.is_admin() criada pelos scripts base.
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

create table if not exists public.engine_config (
  id boolean primary key default true,
  mock boolean not null default true,
  narrativa_teste boolean not null default false,
  atualizado_em timestamptz not null default now(),
  constraint engine_config_singleton check (id)
);

insert into public.engine_config (id, mock, narrativa_teste)
values (true, true, false)
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
-- FIM. Para alternar o modo de teste, edite a linha direto na
-- tabela (Table Editor do Supabase ou):
--   update public.engine_config set mock = false, narrativa_teste = true;
-- =============================================================
