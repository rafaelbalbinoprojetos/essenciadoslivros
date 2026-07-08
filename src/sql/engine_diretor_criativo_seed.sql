-- =============================================================
-- ESSÊNCIA ENGINE — Seed do agente Diretor Criativo IA
--
-- Rode no SQL Editor do Supabase caso o agente slug
-- "diretor-criativo" ainda não exista em public.ai_agentes.
--
-- Não altera estrutura de banco.
-- =============================================================

do $$
declare
  modulos_tipo text;
  prompt_diretor text := 'Você é o Diretor Criativo IA da Essência Engine. Sua missão é enriquecer a BEU com direção sensorial, visual e sonora. Não altere módulos factuais ou interpretativos já preenchidos. Não gere prompt de imagem, música ou roteiro cinematográfico. Responda somente JSON válido com os módulos permitidos.';
begin
  select data_type
    into modulos_tipo
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ai_agentes'
    and column_name = 'modulos_permitidos';

  if exists (select 1 from public.ai_agentes where slug = 'diretor-criativo') then
    if modulos_tipo = 'ARRAY' then
      update public.ai_agentes
      set nome = 'Diretor Criativo IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.85,
          modulos_permitidos = array['sensorial', 'visual', 'sonoro'],
          prompt_sistema = coalesce(prompt_sistema, prompt_diretor),
          ativo = true
      where slug = 'diretor-criativo';
    elsif modulos_tipo = 'jsonb' then
      update public.ai_agentes
      set nome = 'Diretor Criativo IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.85,
          modulos_permitidos = '["sensorial", "visual", "sonoro"]'::jsonb,
          prompt_sistema = coalesce(prompt_sistema, prompt_diretor),
          ativo = true
      where slug = 'diretor-criativo';
    else
      update public.ai_agentes
      set nome = 'Diretor Criativo IA',
          modelo = 'gpt-4.1-mini',
          temperatura = 0.85,
          modulos_permitidos = 'sensorial,visual,sonoro',
          prompt_sistema = coalesce(prompt_sistema, prompt_diretor),
          ativo = true
      where slug = 'diretor-criativo';
    end if;

    return;
  end if;

  if modulos_tipo = 'ARRAY' then
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Diretor Criativo IA', 'diretor-criativo', 'gpt-4.1-mini', 0.85,
       array['sensorial', 'visual', 'sonoro'],
       prompt_diretor,
       'json',
       true);
  elsif modulos_tipo = 'jsonb' then
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Diretor Criativo IA', 'diretor-criativo', 'gpt-4.1-mini', 0.85,
       '["sensorial", "visual", "sonoro"]'::jsonb,
       prompt_diretor,
       'json',
       true);
  else
    insert into public.ai_agentes
      (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
    values
      ('Diretor Criativo IA', 'diretor-criativo', 'gpt-4.1-mini', 0.85,
       'sensorial,visual,sonoro',
       prompt_diretor,
       'json',
       true);
  end if;
end $$;

-- =============================================================
-- FIM
-- =============================================================
