-- =============================================================
-- 🔓 CATÁLOGO ABERTO — Essência dos Livros
-- Permite que QUALQUER usuário autenticado cadastre/edite
-- livros, autores, gêneros e coleções.
--
-- Substitui as políticas de escrita que eram restritas a admin.
-- Rode este bloco no SQL Editor do Supabase. Não precisa
-- logout/login: a regra checa o papel "authenticated", que sua
-- sessão atual já possui.
--
-- ATENÇÃO: neste modelo, qualquer usuário logado pode editar ou
-- apagar itens do acervo GLOBAL (inclusive de outros). Se um dia
-- quiser "cada um com o seu acervo", me avise que migramos para
-- RLS por dono (coluna usuario_id + políticas por usuário).
-- =============================================================

-- Garante que o RLS está ligado (idempotente)
alter table autores  enable row level security;
alter table generos  enable row level security;
alter table colecoes enable row level security;
alter table livros   enable row level security;

-- Remove as políticas de escrita antigas (admin-only)
drop policy if exists "catalogo_write_autores"  on autores;
drop policy if exists "catalogo_write_generos"  on generos;
drop policy if exists "catalogo_write_colecoes" on colecoes;
drop policy if exists "catalogo_write_livros"   on livros;

-- Cria políticas de escrita para qualquer usuário autenticado
create policy "catalogo_write_autores"  on autores  for all to authenticated
  using (true) with check (true);
create policy "catalogo_write_generos"  on generos  for all to authenticated
  using (true) with check (true);
create policy "catalogo_write_colecoes" on colecoes for all to authenticated
  using (true) with check (true);
create policy "catalogo_write_livros"   on livros   for all to authenticated
  using (true) with check (true);

-- (As políticas de leitura "catalogo_select_*" permanecem como estão:
--  leitura liberada para usuários autenticados.)
