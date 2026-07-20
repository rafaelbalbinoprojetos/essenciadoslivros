-- Campos editoriais usados pela sala/exposicao de cada obra.
-- Idempotente: pode ser executado novamente no SQL Editor do Supabase.

alter table public.livros
  add column if not exists curadoria_editorial text,
  add column if not exists voce_sabia text,
  add column if not exists legado text,
  add column if not exists linha_tempo jsonb not null default '[]'::jsonb,
  add column if not exists galeria_exposicao jsonb not null default '[]'::jsonb,
  add column if not exists trilha_sonora jsonb not null default '[]'::jsonb;

comment on column public.livros.curadoria_editorial is
  'Texto editorial em destaque apresentado como carta de curadoria.';
comment on column public.livros.voce_sabia is
  'Curiosidade curta exibida na exposicao da obra.';
comment on column public.livros.legado is
  'Texto curto sobre o impacto e o legado da obra ou autor.';
comment on column public.livros.linha_tempo is
  'Lista JSON: [{"ano":"1997","titulo":"Marco","descricao":"...","imagem_url":"..."}].';
comment on column public.livros.galeria_exposicao is
  'Lista JSON: [{"titulo":"Objeto","imagem_url":"...","descricao":"..."}].';
comment on column public.livros.trilha_sonora is
  'Lista JSON: [{"titulo":"Faixa","artista":"...","audio_url":"..."}].';
