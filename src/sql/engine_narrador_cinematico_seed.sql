-- =============================================================
-- ESSÊNCIA ENGINE — Seed do agente Narrador Cinemático IA
--
-- Rode no SQL Editor do Supabase caso o agente slug
-- "narrador-cinematico" ainda não exista em public.ai_agentes.
--
-- Não altera estrutura de banco.
-- Se a coluna consumidores existir, ela será preenchida.
-- =============================================================

do $$
declare
  modulos_tipo text;
  consumidores_tipo text;
  tem_consumidores boolean;
  prompt_narrador text := 'Você é o Narrador Cinemático IA da Essência Engine. Sua missão é transformar a BEU completa da obra em uma narrativa cinematográfica textual, emocional e sonora, no padrão Essência dos Livros. A saída deve ser somente texto simples, sem JSON, sem markdown, sem PDF, sem HTML, sem tabelas e sem prompts de imagem.';
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

  if exists (select 1 from public.ai_agentes where slug = 'narrador-cinematico') then
    if modulos_tipo = 'ARRAY' then
      update public.ai_agentes
      set nome = 'Narrador Cinemático IA',
          modelo = 'gpt-4.1',
          temperatura = 0.9,
          modulos_permitidos = array['narrativa_cinematica'],
          prompt_sistema = coalesce(prompt_sistema, prompt_narrador),
          formato_saida = 'text',
          ativo = true
      where slug = 'narrador-cinematico';
    elsif modulos_tipo = 'jsonb' then
      update public.ai_agentes
      set nome = 'Narrador Cinemático IA',
          modelo = 'gpt-4.1',
          temperatura = 0.9,
          modulos_permitidos = '["narrativa_cinematica"]'::jsonb,
          prompt_sistema = coalesce(prompt_sistema, prompt_narrador),
          formato_saida = 'text',
          ativo = true
      where slug = 'narrador-cinematico';
    else
      update public.ai_agentes
      set nome = 'Narrador Cinemático IA',
          modelo = 'gpt-4.1',
          temperatura = 0.9,
          modulos_permitidos = 'narrativa_cinematica',
          prompt_sistema = coalesce(prompt_sistema, prompt_narrador),
          formato_saida = 'text',
          ativo = true
      where slug = 'narrador-cinematico';
    end if;
  else
    if modulos_tipo = 'ARRAY' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Narrador Cinemático IA', 'narrador-cinematico', 'gpt-4.1', 0.9,
         array['narrativa_cinematica'],
         prompt_narrador,
         'text',
         true);
    elsif modulos_tipo = 'jsonb' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Narrador Cinemático IA', 'narrador-cinematico', 'gpt-4.1', 0.9,
         '["narrativa_cinematica"]'::jsonb,
         prompt_narrador,
         'text',
         true);
    else
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Narrador Cinemático IA', 'narrador-cinematico', 'gpt-4.1', 0.9,
         'narrativa_cinematica',
         prompt_narrador,
         'text',
         true);
    end if;
  end if;

  if tem_consumidores then
    if consumidores_tipo = 'ARRAY' then
      update public.ai_agentes
      set consumidores = array['suno', 'pdf', 'audio']
      where slug = 'narrador-cinematico';
    elsif consumidores_tipo = 'jsonb' then
      update public.ai_agentes
      set consumidores = '["suno", "pdf", "audio"]'::jsonb
      where slug = 'narrador-cinematico';
    else
      update public.ai_agentes
      set consumidores = 'suno,pdf,audio'
      where slug = 'narrador-cinematico';
    end if;
  end if;
end $$;

-- =============================================================
-- FIM
-- =============================================================
