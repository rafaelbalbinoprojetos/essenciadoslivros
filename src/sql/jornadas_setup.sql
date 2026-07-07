-- =============================================================
-- 🧭 JORNADAS DE APRENDIZADO — Essência dos Livros
-- Organiza o conteúdo por objetivo do usuário (não por livro).
-- Rode este bloco no SQL Editor do Supabase.
--
-- Pré-requisitos: tabela `livros` e função `public.is_admin()`
-- já devem existir (vêm do supabase_setup.sql / catalogo_crud_admin.sql).
-- =============================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- 🧩 jornadas  (catálogo curado de trilhas)
-- -------------------------------------------------------------
create table if not exists jornadas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null,
  descricao text,
  objetivo text,
  icone text,
  capa_url text,
  cor text,
  nivel text check (nivel in ('iniciante', 'intermediario', 'avancado')) default 'iniciante',
  tempo_total_min integer default 0,
  total_itens integer default 0,
  ativa boolean default true,
  ordem integer default 0,
  criado_em timestamp default now()
);

-- -------------------------------------------------------------
-- 🔗 jornada_itens  (sequência de livros/resumos da jornada)
-- -------------------------------------------------------------
create table if not exists jornada_itens (
  id uuid primary key default uuid_generate_v4(),
  jornada_id uuid references jornadas(id) on delete cascade,
  livro_id uuid references livros(id) on delete cascade,
  ordem integer not null,
  titulo_customizado text,
  descricao_customizada text,
  tipo text check (tipo in ('resumo_audio', 'resumo', 'audiobook', 'reflexao', 'quiz', 'mentor_ia')) default 'resumo_audio',
  duracao_min integer default 0,
  desbloqueado boolean default true,
  criado_em timestamp default now()
);

create index if not exists idx_jornada_itens_jornada on jornada_itens (jornada_id, ordem);

-- -------------------------------------------------------------
-- 👤 usuario_jornadas  (quais jornadas o usuário iniciou)
-- -------------------------------------------------------------
create table if not exists usuario_jornadas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete cascade,
  status text check (status in ('nao_iniciada', 'em_andamento', 'concluida', 'pausada')) default 'em_andamento',
  progresso_percent numeric default 0,
  itens_concluidos integer default 0,
  tempo_estudado_min integer default 0,
  iniciado_em timestamp default now(),
  atualizado_em timestamp default now(),
  concluido_em timestamp,
  unique (usuario_id, jornada_id)
);

create index if not exists idx_usuario_jornadas_user on usuario_jornadas (usuario_id, atualizado_em desc);

-- -------------------------------------------------------------
-- 📍 usuario_jornada_itens  (progresso item a item)
-- -------------------------------------------------------------
create table if not exists usuario_jornada_itens (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete cascade,
  jornada_item_id uuid references jornada_itens(id) on delete cascade,
  livro_id uuid references livros(id) on delete cascade,
  status text check (status in ('bloqueado', 'pendente', 'em_andamento', 'concluido')) default 'pendente',
  progresso_percent numeric default 0,
  tempo_consumido_min integer default 0,
  iniciado_em timestamp,
  concluido_em timestamp,
  atualizado_em timestamp default now(),
  unique (usuario_id, jornada_item_id)
);

create index if not exists idx_usuario_jornada_itens_user on usuario_jornada_itens (usuario_id, jornada_id);

-- =============================================================
-- ⚙️ TRIGGERS: atualizar "atualizado_em"
-- =============================================================
create or replace function update_timestamp()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_usuario_jornadas_ts on usuario_jornadas;
create trigger trg_usuario_jornadas_ts before update on usuario_jornadas
  for each row execute procedure update_timestamp();

drop trigger if exists trg_usuario_jornada_itens_ts on usuario_jornada_itens;
create trigger trg_usuario_jornada_itens_ts before update on usuario_jornada_itens
  for each row execute procedure update_timestamp();

-- =============================================================
-- 🔒 RLS
--   • Catálogo de jornadas (jornadas, jornada_itens): leitura p/
--     qualquer logado; escrita só admin.
--   • Progresso (usuario_*): cada usuário só vê/edita o seu.
-- =============================================================
alter table jornadas              enable row level security;
alter table jornada_itens         enable row level security;
alter table usuario_jornadas      enable row level security;
alter table usuario_jornada_itens enable row level security;

-- jornadas
drop policy if exists "jornadas_select" on jornadas;
drop policy if exists "jornadas_write" on jornadas;
create policy "jornadas_select" on jornadas for select to authenticated using (true);
create policy "jornadas_write"  on jornadas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- jornada_itens
drop policy if exists "jornada_itens_select" on jornada_itens;
drop policy if exists "jornada_itens_write" on jornada_itens;
create policy "jornada_itens_select" on jornada_itens for select to authenticated using (true);
create policy "jornada_itens_write"  on jornada_itens for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- usuario_jornadas (por dono)
drop policy if exists "usuario_jornadas_rw" on usuario_jornadas;
create policy "usuario_jornadas_rw" on usuario_jornadas for all to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- usuario_jornada_itens (por dono)
drop policy if exists "usuario_jornada_itens_rw" on usuario_jornada_itens;
create policy "usuario_jornada_itens_rw" on usuario_jornada_itens for all to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- =============================================================
-- ✅ FIM. Próximo passo: cadastrar jornadas e vincular livros
--    (via jornada_itens). Veja jornadas_seed_exemplo.sql.
-- =============================================================
