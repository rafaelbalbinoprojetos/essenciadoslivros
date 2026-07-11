import { ENGINE_CONFIG } from "./engineConfig.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CACHE_TTL_MS = 10_000;

let cache = null;
let cacheExpiraEm = 0;

function configPadrao() {
  return { mock: ENGINE_CONFIG.mock, narrativaTeste: ENGINE_CONFIG.narrativaTeste };
}

async function carregarConfigDinamica() {
  const agora = Date.now();
  if (cache && agora < cacheExpiraEm) {
    return cache;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("engine_config")
      .select("mock, narrativa_teste")
      .eq("id", true)
      .maybeSingle();

    cache = error || !data
      ? configPadrao()
      : { mock: data.mock === true, narrativaTeste: data.narrativa_teste === true };
  } catch {
    cache = configPadrao();
  }

  cacheExpiraEm = agora + CACHE_TTL_MS;
  return cache;
}

export async function obterEngineConfigDinamica() {
  return carregarConfigDinamica();
}

export async function isEngineMockEnabled() {
  const config = await carregarConfigDinamica();
  return config.mock === true;
}

export async function isNarrativaTesteEnabled() {
  const config = await carregarConfigDinamica();
  return config.narrativaTeste === true;
}
