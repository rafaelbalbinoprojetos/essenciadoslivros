-- =============================================================
-- VINCULAR PDFs CINEMATICOS DO STORAGE A TABELA livros
-- =============================================================
-- Estrutura esperada no bucket privado "pdfs":
--   engine/pdf_cinematica/{obraId}/{arquivo}.pdf
--
-- Regras:
--   1. O UUID da terceira parte do caminho identifica livros.id.
--   2. Se houver mais de um PDF para a obra, usa o mais recente.
--   3. Nao sobrescreve pdf_cinematica_url que ja esteja preenchido.
--   4. Salva o caminho cru do objeto. O aplicativo gera a URL assinada
--      temporaria somente quando o usuario abre o PDF.
--
-- Pode ser executado novamente: depois da primeira execucao, as obras ja
-- vinculadas simplesmente nao entram no UPDATE.

-- PREVIA: confira quais arquivos serao vinculados antes do UPDATE abaixo.
with arquivos_pdf as (
  select
    name as storage_path,
    split_part(name, '/', 3) as obra_id,
    coalesce(updated_at, created_at) as arquivo_atualizado_em,
    row_number() over (
      partition by split_part(name, '/', 3)
      order by coalesce(updated_at, created_at) desc nulls last, name desc
    ) as posicao
  from storage.objects
  where bucket_id = 'pdfs'
    and name like 'engine/pdf_cinematica/%/%'
    and lower(name) ~ '\.pdf$'
    and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
select
  l.id,
  l.titulo,
  a.storage_path as pdf_encontrado,
  a.arquivo_atualizado_em
from arquivos_pdf a
join public.livros l on l.id::text = a.obra_id
where a.posicao = 1
  and nullif(btrim(l.pdf_cinematica_url), '') is null
order by l.titulo;

-- ATUALIZACAO: vincula somente os cadastros que ainda estao vazios.
begin;

with arquivos_pdf as (
  select
    name as storage_path,
    split_part(name, '/', 3) as obra_id,
    row_number() over (
      partition by split_part(name, '/', 3)
      order by coalesce(updated_at, created_at) desc nulls last, name desc
    ) as posicao
  from storage.objects
  where bucket_id = 'pdfs'
    and name like 'engine/pdf_cinematica/%/%'
    and lower(name) ~ '\.pdf$'
    and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
), atualizados as (
  update public.livros l
  set
    pdf_cinematica_url = a.storage_path,
    atualizado_em = now()
  from arquivos_pdf a
  where a.posicao = 1
    and l.id::text = a.obra_id
    and nullif(btrim(l.pdf_cinematica_url), '') is null
  returning l.id, l.titulo, l.pdf_cinematica_url
)
select * from atualizados order by titulo;

commit;

-- DIAGNOSTICO OPCIONAL: pastas com UUID que nao correspondem a nenhum livro.
with pastas as (
  select distinct split_part(name, '/', 3) as obra_id
  from storage.objects
  where bucket_id = 'pdfs'
    and name like 'engine/pdf_cinematica/%/%'
    and lower(name) ~ '\.pdf$'
    and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
select p.obra_id as pasta_sem_livro
from pastas p
left join public.livros l on l.id::text = p.obra_id
where l.id is null
order by p.obra_id;
