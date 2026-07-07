-- =============================================================
-- NARRATIVAS CINEMATOGRÁFICAS — Essência dos Livros
--
-- Modelo:
--   livros 1 ── 0..1 narrativas 1 ── N narrativa_faixas
--
-- Exemplo:
--   Tomb Raider (2013)
--     └── Narrativa cinematográfica
--           ├── Cena 1
--           ├── Cena 2
--           └── ... Cena 8
--
-- O campo livros.audio_url continua representando o áudio único
-- (podcast/audiobook). As cenas ficam nesta estrutura separada.
--
-- Pré-requisitos:
--   • tabela public.livros
--   • função public.is_admin()
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- 1) Ficha da narrativa vinculada à obra
-- -------------------------------------------------------------
create table if not exists public.narrativas (
  id uuid primary key default uuid_generate_v4(),
  livro_id uuid not null references public.livros(id) on delete cascade,
  titulo text not null,
  descricao text,
  capa_url text,
  status text not null default 'ativo'
    check (status in ('rascunho', 'ativo', 'inativo')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint narrativas_livro_unique unique (livro_id)
);

comment on table public.narrativas is
  'Ficha da narrativa cinematográfica de uma obra. Cada livro pode possuir uma narrativa.';

-- -------------------------------------------------------------
-- 2) Faixas/cenas da narrativa
-- -------------------------------------------------------------
create table if not exists public.narrativa_faixas (
  id uuid primary key default uuid_generate_v4(),
  narrativa_id uuid not null references public.narrativas(id) on delete cascade,
  ordem smallint not null check (ordem > 0),
  titulo text not null,
  descricao text,
  audio_path text not null,
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos >= 0),
  status text not null default 'ativo'
    check (status in ('rascunho', 'ativo', 'inativo')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint narrativa_faixas_ordem_unique unique (narrativa_id, ordem)
);

comment on column public.narrativa_faixas.audio_path is
  'Caminho do arquivo no bucket privado narrativas; não armazena URL assinada.';

create index if not exists narrativa_faixas_narrativa_ordem_idx
  on public.narrativa_faixas (narrativa_id, ordem);

create index if not exists narrativas_status_idx
  on public.narrativas (status);

-- -------------------------------------------------------------
-- 3) Atualização automática de atualizado_em
-- -------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists narrativas_set_atualizado_em on public.narrativas;
create trigger narrativas_set_atualizado_em
before update on public.narrativas
for each row execute function public.set_atualizado_em();

drop trigger if exists narrativa_faixas_set_atualizado_em on public.narrativa_faixas;
create trigger narrativa_faixas_set_atualizado_em
before update on public.narrativa_faixas
for each row execute function public.set_atualizado_em();

-- -------------------------------------------------------------
-- 4) RLS: leitura para usuários logados; escrita somente admin
-- -------------------------------------------------------------
alter table public.narrativas enable row level security;
alter table public.narrativa_faixas enable row level security;

drop policy if exists "narrativas_select" on public.narrativas;
create policy "narrativas_select"
  on public.narrativas for select
  to authenticated
  using (true);

drop policy if exists "narrativas_admin_write" on public.narrativas;
create policy "narrativas_admin_write"
  on public.narrativas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "narrativa_faixas_select" on public.narrativa_faixas;
create policy "narrativa_faixas_select"
  on public.narrativa_faixas for select
  to authenticated
  using (true);

drop policy if exists "narrativa_faixas_admin_write" on public.narrativa_faixas;
create policy "narrativa_faixas_admin_write"
  on public.narrativa_faixas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------
-- 5) Bucket privado para os arquivos das cenas
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'narrativas',
  'narrativas',
  false,
  157286400, -- 150 MB por cena
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "essencia_narrativas_read" on storage.objects;
create policy "essencia_narrativas_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'narrativas');

drop policy if exists "essencia_narrativas_admin_write" on storage.objects;
create policy "essencia_narrativas_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'narrativas' and public.is_admin())
  with check (bucket_id = 'narrativas' and public.is_admin());

-- =============================================================
-- EXEMPLO DE CADASTRO (não executado automaticamente)
-- =============================================================
-- with nova_narrativa as (
--   insert into public.narrativas (livro_id, titulo, descricao)
--   values (
--     'UUID-DO-LIVRO-TOMB-RAIDER',
--     'Tomb Raider 2013 — Narrativa cinematográfica',
--     'A jornada de Lara Croft em oito cenas narradas.'
--   )
--   returning id
-- )
-- insert into public.narrativa_faixas
--   (narrativa_id, ordem, titulo, audio_path, duracao_segundos)
-- select id, 1, 'Cena 1 — A expedição',
--   'tomb-raider-2013/cena-01.mp3', 480
-- from nova_narrativa;

-- Para as próximas cenas, use o id da narrativa:
-- insert into public.narrativa_faixas
--   (narrativa_id, ordem, titulo, audio_path, duracao_segundos)
-- values
--   ('UUID-DA-NARRATIVA', 2, 'Cena 2 — Yamatai',
--    'tomb-raider-2013/cena-02.mp3', 525);

-- =============================================================
-- FIM
-- =============================================================
