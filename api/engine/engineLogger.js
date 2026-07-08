/* global process */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ENGINE_CONFIG,
  isEngineDebugEnabled,
  shouldSaveEngineLogs,
} from "./engineConfig.js";

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

export function engineLog(label, details = null) {
  if (!isEngineDebugEnabled()) return;

  const prefix = "[Essência Engine]";
  if (details === null || details === undefined) {
    console.log(`${prefix} ${label}`);
    return;
  }

  console.log(`${prefix} ${label}`, details);
}

export function engineStep(label, status = "→", details = null) {
  engineLog(`${status} ${label}`, details);
}

export async function saveEngineJsonLog({ runId, name, data }) {
  if (!shouldSaveEngineLogs()) return;

  const fileName = `${name}.json`;

  if (ENGINE_CONFIG.ambienteVercel) {
    engineLog(`Log JSON ${fileName} não gravado em disco no Vercel`, data);
    return;
  }

  try {
    const dir = path.join(process.cwd(), ENGINE_CONFIG.logsDir, runId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), safeJson(data), "utf8");
  } catch (error) {
    engineLog(`Falha não bloqueante ao salvar log JSON ${fileName}`, {
      erro: error.message,
      data,
    });
  }
}
