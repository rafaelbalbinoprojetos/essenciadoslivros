-- =============================================================
-- 🗄️ SUPABASE STORAGE — Essência dos Livros
-- Buckets para capas (público), áudios e PDFs (privados).
--
-- Modelo de acesso:
--   • Upload/editar/apagar: SOMENTE admin (public.is_admin()).
--   • Capas: leitura PÚBLICA (URL direta).
--   • Áudios e PDFs: privados — leitura só para usuários
--     autenticados, e o conteúdo abre via link assinado temporário.
--
-- Pré-requisito: a função public.is_admin() já deve existir
-- (vem do supabase_setup.sql / catalogo_crud_admin.sql).
--
-- Rode este bloco no SQL Editor do Supabase.
-- =============================================================

-- -------------------------------------------------------------
-- 1) Criar/atualizar os buckets
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capas', 'capas', true, 5242880,  -- 5 MB
  array['image/png','image/jpeg','image/jpg','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audios', 'audios', false, 78643200,  -- 75 MB
  array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/mp4','audio/x-m4a','audio/aac','audio/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdfs', 'pdfs', false, 31457280,  -- 30 MB
  array['application/pdf','application/epub+zip']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -------------------------------------------------------------
-- 2) Políticas de acesso (RLS em storage.objects)
-- -------------------------------------------------------------

-- Leitura pública das capas
drop policy if exists "essencia_capas_read" on storage.objects;
create policy "essencia_capas_read"
  on storage.objects for select
  to public
  using (bucket_id = 'capas');

-- Leitura de áudios/PDFs: só usuários autenticados (via link assinado)
drop policy if exists "essencia_media_read" on storage.objects;
create policy "essencia_media_read"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('audios', 'pdfs'));

-- Escrita (upload/editar/apagar) em todos os buckets: SOMENTE admin
drop policy if exists "essencia_admin_write" on storage.objects;
create policy "essencia_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id in ('capas', 'audios', 'pdfs') and public.is_admin())
  with check (bucket_id in ('capas', 'audios', 'pdfs') and public.is_admin());

-- =============================================================
-- ✅ FIM. Buckets prontos: capas (público), audios e pdfs (privados).
-- =============================================================
