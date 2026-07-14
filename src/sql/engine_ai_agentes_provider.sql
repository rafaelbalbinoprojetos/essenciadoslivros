-- =============================================================
-- AI_AGENTES: coluna PROVIDER
-- Permite escolher, por agente, qual provider de IA executa a
-- chamada (openai ou anthropic). O roteador em pipelineExecutor.js
-- (executarAgente) le este campo para decidir entre
-- executarAgenteOpenAI e executarAgenteAnthropic, permitindo
-- migracao gradual agente por agente sem alterar o resto do
-- pipeline.
--
-- Rode este arquivo no SQL Editor do Supabase.
-- =============================================================

alter table public.ai_agentes add column if not exists provider text default 'openai';
