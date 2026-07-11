-- =============================================================
-- ESSÊNCIA ENGINE — Seed do agente Essence Engine (documento
-- enciclopédico)
--
-- Rode no SQL Editor do Supabase caso o agente slug
-- "essence-engine" ainda não exista em public.ai_agentes.
--
-- Um único agente é reaproveitado pelas 5 partes do documento
-- enciclopédico (enciclopedia_parte1 .. enciclopedia_parte5) —
-- o que muda entre chamadas é o prompt montado em
-- promptBuilder.js (montarPromptEnciclopediaParte), não o
-- agente em si.
--
-- Não altera estrutura de banco.
-- Se a coluna consumidores existir, ela será preenchida.
-- =============================================================

do $$
declare
  modulos_tipo text;
  consumidores_tipo text;
  tem_consumidores boolean;
  prompt_essence text := 'Você é a Essence Engine da Essência Engine. Sua missão é produzir o documento enciclopédico completo da obra — a referência mais densa e completa já escrita sobre ela — em capítulos, no padrão de marcação Essência dos Livros. A saída deve ser somente texto simples com a marcação definida no prompt, sem JSON, sem markdown, sem HTML.';
begin
  select data_type
    into modulos_tipo
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ai_agentes'
    and column_name = 'modulos_permitidos';

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_agentes'
      and column_name = 'consumidores'
  )
    into tem_consumidores;

  if tem_consumidores then
    select data_type
      into consumidores_tipo
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_agentes'
      and column_name = 'consumidores';
  end if;

  if exists (select 1 from public.ai_agentes where slug = 'essence-engine') then
    if modulos_tipo = 'ARRAY' then
      update public.ai_agentes
      set nome = 'Essence Engine',
          modelo = 'gpt-4.1',
          temperatura = 0.8,
          modulos_permitidos = array['enciclopedia_parte1', 'enciclopedia_parte2', 'enciclopedia_parte3', 'enciclopedia_parte4', 'enciclopedia_parte5'],
          prompt_sistema = coalesce(prompt_sistema, prompt_essence),
          formato_saida = 'text',
          ativo = true
      where slug = 'essence-engine';
    elsif modulos_tipo = 'jsonb' then
      update public.ai_agentes
      set nome = 'Essence Engine',
          modelo = 'gpt-4.1',
          temperatura = 0.8,
          modulos_permitidos = '["enciclopedia_parte1", "enciclopedia_parte2", "enciclopedia_parte3", "enciclopedia_parte4", "enciclopedia_parte5"]'::jsonb,
          prompt_sistema = coalesce(prompt_sistema, prompt_essence),
          formato_saida = 'text',
          ativo = true
      where slug = 'essence-engine';
    else
      update public.ai_agentes
      set nome = 'Essence Engine',
          modelo = 'gpt-4.1',
          temperatura = 0.8,
          modulos_permitidos = 'enciclopedia_parte1,enciclopedia_parte2,enciclopedia_parte3,enciclopedia_parte4,enciclopedia_parte5',
          prompt_sistema = coalesce(prompt_sistema, prompt_essence),
          formato_saida = 'text',
          ativo = true
      where slug = 'essence-engine';
    end if;
  else
    if modulos_tipo = 'ARRAY' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Essence Engine', 'essence-engine', 'gpt-4.1', 0.8,
         array['enciclopedia_parte1', 'enciclopedia_parte2', 'enciclopedia_parte3', 'enciclopedia_parte4', 'enciclopedia_parte5'],
         prompt_essence,
         'text',
         true);
    elsif modulos_tipo = 'jsonb' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Essence Engine', 'essence-engine', 'gpt-4.1', 0.8,
         '["enciclopedia_parte1", "enciclopedia_parte2", "enciclopedia_parte3", "enciclopedia_parte4", "enciclopedia_parte5"]'::jsonb,
         prompt_essence,
         'text',
         true);
    else
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Essence Engine', 'essence-engine', 'gpt-4.1', 0.8,
         'enciclopedia_parte1,enciclopedia_parte2,enciclopedia_parte3,enciclopedia_parte4,enciclopedia_parte5',
         prompt_essence,
         'text',
         true);
    end if;
  end if;

  if tem_consumidores then
    if consumidores_tipo = 'ARRAY' then
      update public.ai_agentes
      set consumidores = array['pdf']
      where slug = 'essence-engine';
    elsif consumidores_tipo = 'jsonb' then
      update public.ai_agentes
      set consumidores = '["pdf"]'::jsonb
      where slug = 'essence-engine';
    else
      update public.ai_agentes
      set consumidores = 'pdf'
      where slug = 'essence-engine';
    end if;
  end if;
end $$;

-- =============================================================
-- FIM
-- =============================================================
