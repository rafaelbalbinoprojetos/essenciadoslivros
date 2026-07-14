/* global process */

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "sim", "yes", "on"].includes(String(value).toLowerCase());
}

export const ENGINE_CONFIG = {
  // Mock ligado por padrão nesta sprint para validar a infraestrutura sem consumir tokens.
  mock: parseBoolean(process.env.ENGINE_MOCK, true),
  debug: parseBoolean(process.env.ENGINE_DEBUG, true),
  saveLogs: parseBoolean(process.env.ENGINE_SAVE_LOGS, false),
  narrativaTeste: parseBoolean(process.env.ENGINE_NARRATIVA_TESTE, false),
  modeloDefault: process.env.ENGINE_MODELO_DEFAULT || "gpt-4.1-mini",
  modeloAnthropicDefault: process.env.ENGINE_MODELO_ANTHROPIC_DEFAULT || "claude-sonnet-4-6",
  versaoBEU: process.env.ENGINE_VERSAO_BEU || "1.0",
  logsDir: process.env.ENGINE_LOGS_DIR || "logs",
  ambienteVercel: parseBoolean(process.env.VERCEL, false),
};

export function isEngineDebugEnabled() {
  return ENGINE_CONFIG.debug === true;
}

export function shouldSaveEngineLogs() {
  return ENGINE_CONFIG.saveLogs === true;
}
