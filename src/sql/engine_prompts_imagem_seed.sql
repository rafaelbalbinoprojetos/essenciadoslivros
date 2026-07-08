-- =============================================================
-- ESSÊNCIA ENGINE — Agentes geradores de prompts de imagem
--
-- Rode uma vez no SQL Editor do Supabase.
-- Insere ou atualiza dados; não altera a estrutura do banco.
-- =============================================================

do $$
declare
  modulos_tipo text;
  agente record;
begin
  select data_type
    into modulos_tipo
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ai_agentes'
    and column_name = 'modulos_permitidos';

  for agente in
    select *
    from (values
      (
        'heritage-prompt',
        'Gerador de Prompt Heritage',
        0.70::numeric,
        'heritage_prompt',
        'Você é o diretor de arte da Heritage Collection da Essência dos Livros. Gere somente um prompt textual completo para IA de imagem. Não gere imagens, não invente fatos e não retorne explicações.'
      ),
      (
        'capa-cinematica-prompt',
        'Gerador de Prompt de Capa Cinemática',
        0.85::numeric,
        'capa_cinematica_prompt',
        'Você é o diretor de arte cinematográfico da Essência dos Livros. Gere somente um prompt textual completo para uma capa emocional. Não gere imagens, não invente fatos e não retorne explicações.'
      )
    ) as dados(slug, nome, temperatura, modulo, prompt_sistema)
  loop
    if exists (select 1 from public.ai_agentes where slug = agente.slug) then
      if modulos_tipo = 'ARRAY' then
        update public.ai_agentes
        set nome = agente.nome,
            modelo = 'gpt-4.1-mini',
            temperatura = agente.temperatura,
            modulos_permitidos = array[agente.modulo],
            prompt_sistema = agente.prompt_sistema,
            formato_saida = 'text',
            ativo = true
        where slug = agente.slug;
      elsif modulos_tipo = 'jsonb' then
        update public.ai_agentes
        set nome = agente.nome,
            modelo = 'gpt-4.1-mini',
            temperatura = agente.temperatura,
            modulos_permitidos = jsonb_build_array(agente.modulo),
            prompt_sistema = agente.prompt_sistema,
            formato_saida = 'text',
            ativo = true
        where slug = agente.slug;
      else
        update public.ai_agentes
        set nome = agente.nome,
            modelo = 'gpt-4.1-mini',
            temperatura = agente.temperatura,
            modulos_permitidos = agente.modulo,
            prompt_sistema = agente.prompt_sistema,
            formato_saida = 'text',
            ativo = true
        where slug = agente.slug;
      end if;
    else
      if modulos_tipo = 'ARRAY' then
        insert into public.ai_agentes
          (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
        values
          (agente.nome, agente.slug, 'gpt-4.1-mini', agente.temperatura,
           array[agente.modulo], agente.prompt_sistema, 'text', true);
      elsif modulos_tipo = 'jsonb' then
        insert into public.ai_agentes
          (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
        values
          (agente.nome, agente.slug, 'gpt-4.1-mini', agente.temperatura,
           jsonb_build_array(agente.modulo), agente.prompt_sistema, 'text', true);
      else
        insert into public.ai_agentes
          (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
        values
          (agente.nome, agente.slug, 'gpt-4.1-mini', agente.temperatura,
           agente.modulo, agente.prompt_sistema, 'text', true);
      end if;
    end if;
  end loop;
end $$;

-- =============================================================
-- FIM
-- =============================================================
