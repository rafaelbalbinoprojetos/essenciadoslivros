-- =============================================================
-- ENGINE REFERENCIAS DE IMAGEM
-- Referencias visuais usadas pela pagina Engine para capas
-- Heritage e Cinematica.
--
-- Pre-requisito: public.is_admin() criada pelos scripts base.
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'engine-referencias',
  'engine-referencias',
  true,
  10485760,
  array['image/png','image/jpeg','image/jpg','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.engine_referencias_imagem (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('heritage', 'cinematica')),
  nome text not null,
  bucket text not null default 'engine-referencias',
  storage_path text not null,
  public_url text,
  usar_como_referencia boolean not null default true,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists engine_referencias_imagem_tipo_ativo_idx
  on public.engine_referencias_imagem (tipo)
  where ativo = true;

create or replace function public.set_engine_referencias_imagem_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_engine_referencias_imagem_atualizado_em
  on public.engine_referencias_imagem;

create trigger set_engine_referencias_imagem_atualizado_em
before update on public.engine_referencias_imagem
for each row
execute function public.set_engine_referencias_imagem_atualizado_em();

alter table public.engine_referencias_imagem enable row level security;

drop policy if exists "engine_referencias_read" on public.engine_referencias_imagem;
create policy "engine_referencias_read"
  on public.engine_referencias_imagem
  for select
  to authenticated
  using (true);

drop policy if exists "engine_referencias_admin_write" on public.engine_referencias_imagem;
create policy "engine_referencias_admin_write"
  on public.engine_referencias_imagem
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "engine_referencias_storage_read" on storage.objects;
create policy "engine_referencias_storage_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'engine-referencias');

drop policy if exists "engine_referencias_storage_admin_write" on storage.objects;
create policy "engine_referencias_storage_admin_write"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'engine-referencias' and public.is_admin())
  with check (bucket_id = 'engine-referencias' and public.is_admin());

-- =============================================================
-- FIM. Bucket e tabela prontos.
-- =============================================================
