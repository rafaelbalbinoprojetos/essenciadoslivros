-- =============================================================
-- ESSÊNCIA ENGINE — Seed do agente Editor IA
--
-- Rode no SQL Editor do Supabase caso o agente slug "editor-ia"
-- ainda não exista em public.ai_agentes.
--
-- Não altera estrutura de banco.
-- =============================================================

do $$
declare
  modulos_tipo text;
  prompt_editor text := 'Você é o Editor IA da Essência Engine. Sua missão é enriquecer a BEU objetiva criada pelo Curador com interpretação editorial, emocional e simbólica. Não altere fatos, não modifique módulos factuais e responda somente JSON válido com os módulos permitidos.';
begin
  select data_type
    into modulos_tipo
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ai_agentes'
    and column_name = 'modulos_permitidos';

  if exists (select 1 from public.ai_agentes where slug = 'editor-ia') then
    if modulos_tipo = 'ARRAY' then
      update public.ai_agentes
      set nome = 'Editor IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.75,
          modulos_permitidos = array['emocional', 'essencia', 'legado'],
          prompt_sistema = coalesce(prompt_sistema, prompt_editor),
          ativo = true
      where slug = 'editor-ia';
    elsif modulos_tipo = 'jsonb' then
      update public.ai_agentes
      set nome = 'Editor IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.75,
          modulos_permitidos = '["emocional", "essencia", "legado"]'::jsonb,
          prompt_sistema = coalesce(prompt_sistema, prompt_editor),
          ativo = true
      where slug = 'editor-ia';
    else
      update public.ai_agentes
      set nome = 'Editor IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.75,
          modulos_permitidos = 'emocional,essencia,legado',
          prompt_sistema = coalesce(prompt_sistema, prompt_editor),
          ativo = true
      where slug = 'editor-ia';
    end if;

    return;
  end if;

  if modulos_tipo = 'ARRAY' then
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Editor IA', 'editor-ia', 'gpt-4.1-mini', 0.75,
       array['emocional', 'essencia', 'legado'],
       prompt_editor,
       'json',
       true);
  elsif modulos_tipo = 'jsonb' then
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Editor IA', 'editor-ia', 'gpt-4.1-mini', 0.75,
       '["emocional", "essencia", "legado"]'::jsonb,
       prompt_editor,
       'json',
       true);
  else
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Editor IA', 'editor-ia', 'gpt-4.1-mini', 0.75,
       'emocional,essencia,legado',
       prompt_editor,
       'json',
       true);
  end if;
end $$;

-- =============================================================
-- FIM
-- =============================================================
