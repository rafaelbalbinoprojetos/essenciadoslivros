-- =============================================================
-- 🔒 RLS PARA AS TABELAS DE CATÁLOGO — Essência dos Livros
-- Aplicar no SQL Editor do Supabase.
--
-- Modelo: o catálogo (livros, autores, gêneros, coleções) é
-- conteúdo curado, compartilhado entre todos os usuários.
--   • Leitura  -> qualquer usuário autenticado
--   • Escrita  -> apenas administradores
--
-- "Administrador" é marcado em app_metadata.is_admin = true.
-- IMPORTANTE: use app_metadata (NÃO user_metadata). O usuário
-- consegue editar o próprio user_metadata via supabase.auth.updateUser,
-- mas NÃO consegue tocar em app_metadata — só a service key / dashboard.
--
-- O backend que usa a SERVICE KEY ignora o RLS por padrão, então
-- funções serverless continuam podendo escrever normalmente.
-- =============================================================

-- -------------------------------------------------------------
-- Função auxiliar: o usuário atual é admin?
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('balbino10@hotmail.com')
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

-- -------------------------------------------------------------
-- Habilitar RLS
-- -------------------------------------------------------------
alter table autores  enable row level security;
alter table generos  enable row level security;
alter table colecoes enable row level security;
alter table livros   enable row level security;

-- -------------------------------------------------------------
-- LEITURA: liberada para qualquer usuário autenticado
-- (remove e recria para ser idempotente)
-- -------------------------------------------------------------
drop policy if exists "catalogo_select_autores"  on autores;
drop policy if exists "catalogo_select_generos"  on generos;
drop policy if exists "catalogo_select_colecoes" on colecoes;
drop policy if exists "catalogo_select_livros"   on livros;

create policy "catalogo_select_autores"  on autores  for select to authenticated using (true);
create policy "catalogo_select_generos"  on generos  for select to authenticated using (true);
create policy "catalogo_select_colecoes" on colecoes for select to authenticated using (true);
create policy "catalogo_select_livros"   on livros   for select to authenticated using (true);

-- -------------------------------------------------------------
-- ESCRITA (insert/update/delete): apenas admins
-- -------------------------------------------------------------
drop policy if exists "catalogo_write_autores"  on autores;
drop policy if exists "catalogo_write_generos"  on generos;
drop policy if exists "catalogo_write_colecoes" on colecoes;
drop policy if exists "catalogo_write_livros"   on livros;

create policy "catalogo_write_autores"  on autores  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "catalogo_write_generos"  on generos  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "catalogo_write_colecoes" on colecoes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "catalogo_write_livros"   on livros   for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- COMO TORNAR SUA CONTA ADMIN
-- Rode UMA vez, trocando pelo seu email. Precisa de acesso de
-- service role (SQL Editor do Supabase já tem).
-- =============================================================
-- update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--       || jsonb_build_object('is_admin', true)
--   where email = 'rafaelbalbinoprojetos@gmail.com';
--
-- Depois faça logout/login no app para o novo token carregar a flag.
-- =============================================================
