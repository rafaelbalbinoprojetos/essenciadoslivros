import { ENGINE_CONFIG } from "./engineConfig.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CACHE_TTL_MS = 10_000;

let cache = null;
let cacheExpiraEm = 0;

function configPadrao() {
  return { testes: ENGINE_CONFIG.narrativaTeste };
}

async function carregarConfigDinamica() {
  const agora = Date.now();
  if (cache && agora < cacheExpiraEm) {
    return cache;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("engine_config")
      .select("testes")
      .eq("id", true)
      .maybeSingle();

    cache = error || !data ? configPadrao() : { testes: data.testes === true };
  } catch {
    cache = configPadrao();
  }

  cacheExpiraEm = agora + CACHE_TTL_MS;
  return cache;
}

export async function obterEngineConfigDinamica() {
  return carregarConfigDinamica();
}

export async function isEngineTestesAtivo() {
  const config = await carregarConfigDinamica();
  return config.testes === true;
}

export async function definirEngineTestes(testes) {
  const { error } = await supabaseAdmin
    .from("engine_config")
    .update({ testes: testes === true })
    .eq("id", true);

  if (error) {
    throw new Error(`Erro ao atualizar engine_config: ${error.message}`);
  }

  cache = { testes: testes === true };
  cacheExpiraEm = Date.now() + CACHE_TTL_MS;

  return cache;
}
