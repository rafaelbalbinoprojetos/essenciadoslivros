-- =============================================================
-- 🚀 SETUP COMPLETO DO BANCO — ESSÊNCIA DOS LIVROS
-- Para um projeto Supabase NOVO (PostgreSQL).
--
-- COMO USAR:
--   1. Crie o projeto novo no Supabase.
--   2. Abra: SQL Editor > New query.
--   3. Cole este arquivo inteiro e clique em "Run".
--   4. No fim, rode o bloco "TORNAR-SE ADMIN" (passo separado).
--
-- O script é idempotente: pode ser rodado mais de uma vez sem erro.
-- =============================================================

-- Extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- =============================================================
-- 🧩 TABELAS
-- =============================================================

-- Autores -----------------------------------------------------
create table if not exists autores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  bio text,
  foto_url text,
  nacionalidade text,
  data_nascimento date,
  criado_em timestamp default now()
);

-- Gêneros -----------------------------------------------------
create table if not exists generos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  descricao text,
  icone text,
  criado_em timestamp default now()
);

-- Coleções ----------------------------------------------------
create table if not exists colecoes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  capa_url text,
  criado_em timestamp default now()
);

-- Livros (obras do catálogo) ----------------------------------
create table if not exists livros (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  subtitulo text,
  autor_id uuid references autores(id) on delete set null,
  genero_id uuid references generos(id) on delete set null,
  colecao_id uuid references colecoes(id) on delete set null,
  sinopse text,
  capa_url text,
  capa_cinematica_url text,
  player_hero_url text,
  heritage_prompt text,
  capa_cinematica_prompt text,
  player_hero_prompt text,
  pdf_url text,
  audio_url text,
  tem_experiencia_cinematica boolean not null default false,
  titulo_cinematico text,
  descricao_cinematica text,
  duracao_audio numeric,
  data_lancamento date,
  data_adicao timestamp default now(),
  status text default 'ativo',
  destaque boolean default false,
  criado_em timestamp default now(),
  atualizado_em timestamp default now()
);

-- Progresso de leitura/escuta (por usuário) -------------------
create table if not exists progresso_leitura (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references auth.users(id) on delete cascade,
  livro_id uuid references livros(id) on delete cascade,
  tipo text check (tipo in ('leitura', 'audio')),
  progresso_percentual numeric default 0,
  tempo_reproduzido numeric default 0,
  ultima_atividade timestamp default now(),
  unique (usuario_id, livro_id, tipo)
);

-- Avaliações (por usuário) ------------------------------------
create table if not exists avaliacoes (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references auth.users(id) on delete cascade,
  livro_id uuid references livros(id) on delete cascade,
  nota numeric check (nota between 0 and 5),
  comentario text,
  usuario_nome text,
  criado_em timestamp default now(),
  unique (usuario_id, livro_id)
);

-- Assinaturas (fonte de verdade do plano) ---------------------
create table if not exists assinaturas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references auth.users(id) on delete cascade,
  plano text check (plano in ('Free', 'Essência Plus', 'Essência Premium')),
  ativo boolean default true,
  data_inicio timestamp default now(),
  data_fim timestamp,
  pagamento_id text,
  criado_em timestamp default now()
);

-- =============================================================
-- ⚙️ TRIGGER: atualizar "atualizado_em" automaticamente
-- =============================================================
create or replace function update_timestamp()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_livros_timestamp on livros;
create trigger update_livros_timestamp
before update on livros
for each row
execute procedure update_timestamp();

-- =============================================================
-- 👤 FUNÇÃO: o usuário atual é admin?
-- Usa app_metadata.is_admin (que o usuário NÃO consegue editar
-- sozinho — só a service key / dashboard).
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('balbino10@hotmail.com')
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

-- =============================================================
-- 🔒 ROW LEVEL SECURITY
-- =============================================================
alter table autores           enable row level security;
alter table generos           enable row level security;
alter table colecoes          enable row level security;
alter table livros            enable row level security;
alter table progresso_leitura enable row level security;
alter table avaliacoes        enable row level security;
alter table assinaturas       enable row level security;

-- ---------- CATÁLOGO: leitura p/ logados, escrita SÓ admin ----------
-- Modelo escolhido: só o admin (balbino10@hotmail.com, ver is_admin())
-- cria/edita/apaga o acervo. Leitura liberada a qualquer usuário logado.
drop policy if exists "catalogo_select_autores"  on autores;
drop policy if exists "catalogo_select_generos"  on generos;
drop policy if exists "catalogo_select_colecoes" on colecoes;
drop policy if exists "catalogo_select_livros"   on livros;
create policy "catalogo_select_autores"  on autores  for select to authenticated using (true);
create policy "catalogo_select_generos"  on generos  for select to authenticated using (true);
create policy "catalogo_select_colecoes" on colecoes for select to authenticated using (true);
create policy "catalogo_select_livros"   on livros   for select to authenticated using (true);

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

-- ---------- PROGRESSO: cada um vê/edita o seu ----------
drop policy if exists "progresso_select" on progresso_leitura;
drop policy if exists "progresso_insert" on progresso_leitura;
drop policy if exists "progresso_update" on progresso_leitura;
create policy "progresso_select" on progresso_leitura for select using (auth.uid() = usuario_id);
create policy "progresso_insert" on progresso_leitura for insert with check (auth.uid() = usuario_id);
create policy "progresso_update" on progresso_leitura for update using (auth.uid() = usuario_id);

-- ---------- AVALIAÇÕES: cada um vê/edita a sua ----------
-- Avaliações: leitura pública (comunidade), escrita só do dono.
drop policy if exists "avaliacoes_select" on avaliacoes;
drop policy if exists "avaliacoes_insert" on avaliacoes;
drop policy if exists "avaliacoes_update" on avaliacoes;
drop policy if exists "avaliacoes_select_publico" on avaliacoes;
drop policy if exists "avaliacoes_write_dono" on avaliacoes;
create policy "avaliacoes_select_publico" on avaliacoes for select to authenticated using (true);
create policy "avaliacoes_write_dono" on avaliacoes for all to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- ---------- ASSINATURAS: usuário só LÊ a sua. Escrita = só backend ----------
-- IMPORTANTE: não criamos política de escrita aqui de propósito.
-- Sem política de insert/update, usuários comuns NÃO conseguem se
-- auto-conceder premium. Só a SERVICE KEY (webhook do Mercado Pago)
-- escreve aqui, pois ela ignora o RLS.
drop policy if exists "assinaturas_select" on assinaturas;
drop policy if exists "Usuário vê apenas sua assinatura" on assinaturas;
drop policy if exists "Usuário cria/atualiza assinatura própria" on assinaturas;
create policy "assinaturas_select" on assinaturas for select using (auth.uid() = usuario_id);

-- =============================================================
-- 🌱 DADOS INICIAIS: gêneros
-- =============================================================
insert into generos (nome) values
  ('Ação'), ('Romance'), ('Filosofia'), ('Drama'),
  ('Biografia'), ('Técnico'), ('Fantasia')
on conflict (nome) do nothing;

-- =============================================================
-- ✅ FIM DO SETUP
-- =============================================================
-- Agora rode o bloco abaixo UMA vez para virar admin (troque o
-- email se precisar). Depois faça logout/login no app.
-- =============================================================
-- update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--       || jsonb_build_object('is_admin', true)
--   where email = 'rafaelbalbinoprojetos@gmail.com';
-- =============================================================
