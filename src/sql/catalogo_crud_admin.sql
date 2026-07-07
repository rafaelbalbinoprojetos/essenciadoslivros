-- =============================================================
-- 🔐 CRUD DO CATÁLOGO SÓ PARA O ADMIN — Essência dos Livros
-- Apenas balbino10@hotmail.com pode criar/editar/apagar conteúdo
-- (livros, autores, gêneros, coleções).
-- A LEITURA continua liberada para qualquer usuário autenticado.
--
-- Rode este bloco no SQL Editor do Supabase.
-- Não precisa logout/login: a regra usa o email do seu token,
-- que sua sessão atual já possui.
--
-- Para adicionar outro admin no futuro: ou inclua o email na
-- função abaixo, ou marque app_metadata.is_admin = true na conta.
-- =============================================================

-- Função: o usuário atual é admin?
-- (1) email na lista fixa  OU  (2) app_metadata.is_admin = true
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('balbino10@hotmail.com')
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

-- Garante RLS ligado (idempotente)
alter table autores  enable row level security;
alter table generos  enable row level security;
alter table colecoes enable row level security;
alter table livros   enable row level security;

-- LEITURA: liberada para qualquer usuário autenticado
drop policy if exists "catalogo_select_autores"  on autores;
drop policy if exists "catalogo_select_generos"  on generos;
drop policy if exists "catalogo_select_colecoes" on colecoes;
drop policy if exists "catalogo_select_livros"   on livros;
create policy "catalogo_select_autores"  on autores  for select to authenticated using (true);
create policy "catalogo_select_generos"  on generos  for select to authenticated using (true);
create policy "catalogo_select_colecoes" on colecoes for select to authenticated using (true);
create policy "catalogo_select_livros"   on livros   for select to authenticated using (true);

-- ESCRITA (create/update/delete): SOMENTE admin
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
