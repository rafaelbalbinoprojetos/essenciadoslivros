-- =============================================================
-- ESSÊNCIA ENGINE — Guia Editorial Essência (trilha de obras
-- conceituais/técnicas, tipo_obra = 'tecnico')
--
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- 1) Nova coluna em livros para a URL do PDF do Guia Editorial
--    (mesmo padrão de pdf_cinematica_url / pdf_enciclopedico_url).
-- 2) Seed do agente "Guia Editorial Essência IA" (slug
--    guia-editorial-ia), reaproveitado pelas 3 partes
--    (guia_editorial_parte1..3) — o que muda entre chamadas é o
--    prompt montado em promptBuilder.js
--    (montarPromptGuiaEditorialParte), não o agente em si.
-- =============================================================

alter table public.livros add column if not exists pdf_guia_editorial_url text;

do $$
declare
  modulos_tipo text;
  consumidores_tipo text;
  tem_consumidores boolean;
  prompt_guia_editorial text := 'Você é o Editor-Chefe da Editora Essência. Sua missão é produzir o Guia Editorial Essência — uma publicação totalmente original, editorialmente independente, que usa a obra apenas como ponto de partida para uma experiência editorial rica, organizada, prática e intelectualmente própria. Nunca um resumo, nunca uma apostila, nunca um artigo. A saída deve ser somente texto simples com a marcação definida no prompt, sem JSON, sem markdown, sem HTML.';
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

  if exists (select 1 from public.ai_agentes where slug = 'guia-editorial-ia') then
    if modulos_tipo = 'ARRAY' then
      update public.ai_agentes
      set nome = 'Guia Editorial Essência IA',
          modelo = 'gpt-4.1',
          temperatura = 0.75,
          modulos_permitidos = array['guia_editorial_parte1', 'guia_editorial_parte2', 'guia_editorial_parte3'],
          prompt_sistema = coalesce(prompt_sistema, prompt_guia_editorial),
          formato_saida = 'text',
          ativo = true
      where slug = 'guia-editorial-ia';
    elsif modulos_tipo = 'jsonb' then
      update public.ai_agentes
      set nome = 'Guia Editorial Essência IA',
          modelo = 'gpt-4.1',
          temperatura = 0.75,
          modulos_permitidos = '["guia_editorial_parte1", "guia_editorial_parte2", "guia_editorial_parte3"]'::jsonb,
          prompt_sistema = coalesce(prompt_sistema, prompt_guia_editorial),
          formato_saida = 'text',
          ativo = true
      where slug = 'guia-editorial-ia';
    else
      update public.ai_agentes
      set nome = 'Guia Editorial Essência IA',
          modelo = 'gpt-4.1',
          temperatura = 0.75,
          modulos_permitidos = 'guia_editorial_parte1,guia_editorial_parte2,guia_editorial_parte3',
          prompt_sistema = coalesce(prompt_sistema, prompt_guia_editorial),
          formato_saida = 'text',
          ativo = true
      where slug = 'guia-editorial-ia';
    end if;
  else
    if modulos_tipo = 'ARRAY' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Guia Editorial Essência IA', 'guia-editorial-ia', 'gpt-4.1', 0.75,
         array['guia_editorial_parte1', 'guia_editorial_parte2', 'guia_editorial_parte3'],
         prompt_guia_editorial,
         'text',
         true);
    elsif modulos_tipo = 'jsonb' then
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Guia Editorial Essência IA', 'guia-editorial-ia', 'gpt-4.1', 0.75,
         '["guia_editorial_parte1", "guia_editorial_parte2", "guia_editorial_parte3"]'::jsonb,
         prompt_guia_editorial,
         'text',
         true);
    else
      insert into public.ai_agentes
        (nome, slug, modelo, temperatura, modulos_permitidos, prompt_sistema, formato_saida, ativo)
      values
        ('Guia Editorial Essência IA', 'guia-editorial-ia', 'gpt-4.1', 0.75,
         'guia_editorial_parte1,guia_editorial_parte2,guia_editorial_parte3',
         prompt_guia_editorial,
         'text',
         true);
    end if;
  end if;

  if tem_consumidores then
    if consumidores_tipo = 'ARRAY' then
      update public.ai_agentes
      set consumidores = array['pdf']
      where slug = 'guia-editorial-ia';
    elsif consumidores_tipo = 'jsonb' then
      update public.ai_agentes
      set consumidores = '["pdf"]'::jsonb
      where slug = 'guia-editorial-ia';
    else
      update public.ai_agentes
      set consumidores = 'pdf'
      where slug = 'guia-editorial-ia';
    end if;
  end if;
end $$;

-- =============================================================
-- FIM
-- =============================================================
