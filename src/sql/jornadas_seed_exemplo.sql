-- =============================================================
-- 🌱 SEED DE EXEMPLO — Jornadas
-- Cria uma jornada de teste e vincula os primeiros livros do seu
-- catálogo, para você ver a feature funcionando de imediato.
-- Idempotente: pode rodar mais de uma vez.
-- Rode DEPOIS do jornadas_setup.sql.
-- =============================================================

-- 1) Cria/atualiza a jornada
insert into jornadas (nome, slug, descricao, objetivo, icone, cor, nivel, ordem)
values (
  'Inteligência Financeira',
  'inteligencia-financeira',
  'Construa uma mentalidade financeira sólida com os clássicos sobre dinheiro, hábitos e investimento.',
  'Pensar melhor sobre dinheiro e construir liberdade.',
  'wallet',
  '#b9854b',
  'iniciante',
  1
)
on conflict (slug) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      objetivo = excluded.objetivo,
      icone = excluded.icone,
      cor = excluded.cor,
      nivel = excluded.nivel;

-- 2) Limpa itens antigos dessa jornada (idempotência)
delete from jornada_itens
where jornada_id = (select id from jornadas where slug = 'inteligencia-financeira');

-- 3) Vincula os primeiros livros do catálogo, em ordem de cadastro
insert into jornada_itens (jornada_id, livro_id, ordem, tipo, duracao_min)
select
  (select id from jornadas where slug = 'inteligencia-financeira'),
  l.id,
  row_number() over (order by l.criado_em),
  'resumo_audio',
  coalesce(l.duracao_audio, 15)
from (select id, criado_em, duracao_audio from livros order by criado_em limit 6) l;

-- 4) Atualiza contadores (total de itens e tempo total)
update jornadas
set total_itens = (select count(*) from jornada_itens where jornada_id = jornadas.id),
    tempo_total_min = (select coalesce(sum(duracao_min), 0) from jornada_itens where jornada_id = jornadas.id)
where slug = 'inteligencia-financeira';

-- =============================================================
-- Dica: para criar mais jornadas, repita o bloco trocando
-- nome/slug/cor/icone e ajustando quais livros entram (item 3).
-- Ícones suportados no card (campo "icone"):
--   wallet, comunicacao, performance, disciplina, lideranca,
--   empreendedorismo, ia, filosofia, psicologia, produtividade,
--   criatividade, saude, espiritualidade, carreira, relacionamentos, vendas
-- =============================================================
