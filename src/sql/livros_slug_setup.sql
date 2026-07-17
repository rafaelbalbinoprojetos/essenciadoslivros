-- =============================================================
-- SLUG DE LIVROS — Essência dos Livros
--
-- Adiciona public.livros.slug, usado pelas novas rotas do player
-- (/obra/:slug/player) em vez do id bruto. O slug é gerado
-- automaticamente a partir do título na criação da obra (trigger
-- abaixo) e permanece imutável em edições posteriores — assim
-- links já compartilhados não quebram quando o título muda.
--
-- Pré-requisitos:
--   • tabela public.livros já existente
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

create extension if not exists unaccent;

alter table public.livros add column if not exists slug text;

-- -------------------------------------------------------------
-- 1) Função utilitária de slugificação (minúsculas, sem acento,
--    tudo que não é [a-z0-9] vira hífen).
-- -------------------------------------------------------------
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- -------------------------------------------------------------
-- 2) Trigger: preenche slug automaticamente no insert quando
--    vier vazio. Não mexe em slug já definido (edição de título
--    não altera a URL da obra).
-- -------------------------------------------------------------
create or replace function public.livros_set_slug()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  suffix int := 0;
  final_slug text;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then
    return new;
  end if;

  candidate := public.slugify(new.titulo);
  if candidate = '' then
    candidate := 'obra';
  end if;

  final_slug := candidate;
  while exists (
    select 1 from public.livros
    where slug = final_slug and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    final_slug := candidate || '-' || suffix::text;
  end loop;

  new.slug := final_slug;
  return new;
end;
$$;

drop trigger if exists livros_set_slug on public.livros;
create trigger livros_set_slug
before insert on public.livros
for each row execute function public.livros_set_slug();

-- -------------------------------------------------------------
-- 3) Backfill dos livros já cadastrados (roda uma vez).
-- -------------------------------------------------------------
do $$
declare
  livro record;
  candidate text;
  suffix int;
  final_slug text;
begin
  for livro in select id, titulo from public.livros where slug is null or trim(slug) = '' loop
    candidate := public.slugify(livro.titulo);
    if candidate = '' then
      candidate := 'obra';
    end if;

    suffix := 0;
    final_slug := candidate;
    while exists (
      select 1 from public.livros where slug = final_slug and id <> livro.id
    ) loop
      suffix := suffix + 1;
      final_slug := candidate || '-' || suffix::text;
    end loop;

    update public.livros set slug = final_slug where id = livro.id;
  end loop;
end $$;

-- -------------------------------------------------------------
-- 4) Unicidade + índice (depois do backfill, pra não falhar por
--    valores nulos/duplicados que já existiam).
-- -------------------------------------------------------------
alter table public.livros drop constraint if exists livros_slug_unique;
alter table public.livros add constraint livros_slug_unique unique (slug);
create index if not exists livros_slug_idx on public.livros (slug);

-- =============================================================
-- FIM
-- =============================================================
