-- =============================================================
-- ❤️ ENGAJAMENTO — Essência dos Livros
-- curtidas  : "curtir" (contagem pública, social)
-- salvos    : "salvar" (lista pessoal, privada)
-- Rode no SQL Editor do Supabase (depois do supabase_setup.sql).
-- =============================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- ❤️ curtidas
-- -------------------------------------------------------------
create table if not exists curtidas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  livro_id uuid not null references livros(id) on delete cascade,
  criado_em timestamp default now(),
  unique (usuario_id, livro_id)
);
create index if not exists idx_curtidas_livro on curtidas (livro_id);

alter table curtidas enable row level security;
drop policy if exists "curtidas_select_publico" on curtidas;
drop policy if exists "curtidas_write_dono" on curtidas;
-- Leitura pública (para contar as curtidas de cada obra).
create policy "curtidas_select_publico" on curtidas for select to authenticated using (true);
-- Escrita: cada um curte/descurte só em nome próprio.
create policy "curtidas_write_dono" on curtidas for all to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- -------------------------------------------------------------
-- 🔖 salvos (lista pessoal)
-- -------------------------------------------------------------
create table if not exists salvos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  livro_id uuid not null references livros(id) on delete cascade,
  criado_em timestamp default now(),
  unique (usuario_id, livro_id)
);
create index if not exists idx_salvos_user on salvos (usuario_id);

alter table salvos enable row level security;
drop policy if exists "salvos_rw_dono" on salvos;
-- Privado: cada um só vê/edita a própria lista.
create policy "salvos_rw_dono" on salvos for all to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- =============================================================
-- ✅ FIM.
-- =============================================================
