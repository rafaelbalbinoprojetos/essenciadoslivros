-- =============================================================
-- IDENTIDADE VISUAL CINEMATOGRÁFICA — Essência dos Livros
-- Rode este arquivo uma vez no SQL Editor do Supabase.
-- =============================================================

alter table public.livros
  add column if not exists capa_cinematica_url text,
  add column if not exists tem_experiencia_cinematica boolean not null default false,
  add column if not exists titulo_cinematico text,
  add column if not exists descricao_cinematica text;

comment on column public.livros.capa_url is
  'Capa principal da obra, usada na biblioteca, e-book e podcast.';
comment on column public.livros.capa_cinematica_url is
  'Capa opcional usada somente na experiência Memória Cinematográfica.';
comment on column public.livros.tem_experiencia_cinematica is
  'Ativa explicitamente a experiência cinematográfica da obra.';
comment on column public.livros.titulo_cinematico is
  'Título editorial opcional da experiência cinematográfica.';
comment on column public.livros.descricao_cinematica is
  'Descrição emocional opcional da experiência cinematográfica.';

create index if not exists livros_experiencia_cinematica_idx
  on public.livros (tem_experiencia_cinematica)
  where tem_experiencia_cinematica = true;

-- Sincroniza obras que já possuem narrativas ativas.
update public.livros as l
set tem_experiencia_cinematica = true,
    titulo_cinematico = coalesce(l.titulo_cinematico, n.titulo),
    descricao_cinematica = coalesce(l.descricao_cinematica, n.descricao)
from public.narrativas as n
where n.livro_id = l.id
  and n.status = 'ativo';

