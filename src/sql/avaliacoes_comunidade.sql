-- =============================================================
-- ⭐ AVALIAÇÕES DA COMUNIDADE — Essência dos Livros
-- Torna as avaliações públicas (leitura) para exibir média e
-- comentários; escrita continua restrita ao dono.
-- Rode no SQL Editor do Supabase.
-- =============================================================

-- Nome do autor da avaliação (denormalizado, para exibir sem
-- precisar acessar auth.users).
alter table avaliacoes add column if not exists usuario_nome text;

alter table avaliacoes enable row level security;

-- Remove políticas antigas (privadas), em qualquer um dos nomes usados.
drop policy if exists "avaliacoes_select" on avaliacoes;
drop policy if exists "avaliacoes_insert" on avaliacoes;
drop policy if exists "avaliacoes_update" on avaliacoes;
drop policy if exists "Usuário vê apenas suas avaliações" on avaliacoes;
drop policy if exists "Usuário cria avaliação própria" on avaliacoes;
drop policy if exists "Usuário atualiza apenas suas avaliações" on avaliacoes;

-- Leitura PÚBLICA (qualquer usuário autenticado vê todas as avaliações).
create policy "avaliacoes_select_publico"
  on avaliacoes for select to authenticated using (true);

-- Escrita: cada um cria/edita/apaga apenas a sua.
create policy "avaliacoes_write_dono"
  on avaliacoes for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- =============================================================
-- ✅ FIM. A média é calculada na aplicação a partir destas linhas.
--    (Futuro: media_nota/total_avaliacoes em livros via trigger.)
-- =============================================================
