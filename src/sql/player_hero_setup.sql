-- Arte vertical usada no Hero do player cinematografico. A etapa
-- player_hero_image usa capa_cinematica_url como referencia obrigatoria.

alter table public.livros
  add column if not exists player_hero_url text;

comment on column public.livros.player_hero_url is
  'URL publica da arte vertical do Hero do player, gerada a partir da capa cinematica.';
