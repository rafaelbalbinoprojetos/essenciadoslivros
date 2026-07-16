-- =============================================================
-- 🎬 TEM EXPERIÊNCIA CINEMÁTICA — Essência dos Livros
-- Adiciona a coluna booleana que indica se o livro possui
-- PDF cinemático gerado, e mantém ela sincronizada com
-- pdf_cinematica_url via trigger.
--
-- Rode este bloco no SQL Editor do Supabase.
-- =============================================================

alter table public.livros
  add column if not exists tem_exoperiencia_cinematica boolean not null default false;

comment on column public.livros.tem_exoperiencia_cinematica is
  'Indica se o livro possui PDF da narrativa cinematográfica (sincronizado automaticamente com pdf_cinematica_url).';

-- Atualiza os registros existentes
update public.livros
  set tem_exoperiencia_cinematica = (pdf_cinematica_url is not null and pdf_cinematica_url <> '');

-- Mantém sincronizado em inserts/updates futuros
create or replace function public.sync_tem_exoperiencia_cinematica()
returns trigger as $$
begin
  new.tem_exoperiencia_cinematica := (new.pdf_cinematica_url is not null and new.pdf_cinematica_url <> '');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_tem_exoperiencia_cinematica on public.livros;

create trigger trg_sync_tem_exoperiencia_cinematica
before insert or update of pdf_cinematica_url on public.livros
for each row
execute function public.sync_tem_exoperiencia_cinematica();
