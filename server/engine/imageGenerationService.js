/* global process, fetch */

import fs from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { ENGINE_CONFIG, isEngineMockEnabled } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CAPAS_BUCKET = "capas";
const ENGINE_REFERENCIAS_BUCKET = "engine-referencias";
const HERITAGE_REFERENCE_PATH = path.join(process.cwd(), "src", "image", "CAPA_REFERENCIA_HERITAGE.png");

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

function slugify(value = "obra") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "obra";
}

function limitarPromptImagem(prompt) {
  const texto = String(prompt || "").trim();
  const limite = 31500;

  if (texto.length <= limite) return texto;

  return `${texto.slice(0, limite)}

Preserve all previous Heritage Collection instructions. Prioritize the visual reference image, physical museum archive realism, premium vertical composition, tactile materials, legible editorial typography and the current work data.`;
}

async function buscarReferenciaHeritageAtiva() {
  const { data, error } = await supabaseAdmin
    .from("engine_referencias_imagem")
    .select("tipo,nome,bucket,storage_path,public_url,usar_como_referencia,ativo")
    .eq("tipo", "heritage")
    .eq("ativo", true)
    .eq("usar_como_referencia", true)
    .maybeSingle();

  if (error) {
    console.warn("[ImageGeneration] referencia heritage ativa indisponivel:", error.message);
    return null;
  }

  return data || null;
}

async function carregarReferenciaComoUploadable() {
  const referencia = await buscarReferenciaHeritageAtiva();

  if (referencia?.storage_path) {
    const bucket = referencia.bucket || ENGINE_REFERENCIAS_BUCKET;
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(referencia.storage_path);

    if (error) {
      throw new Error(`Erro ao baixar referencia Heritage do Storage: ${error.message}`);
    }

    return {
      referencia,
      source: referencia.public_url || referencia.storage_path,
      file: await toFile(data, referencia.nome || "heritage-reference.png", {
        type: data.type || "image/png",
      }),
    };
  }

  if (referencia?.public_url) {
    const response = await fetch(referencia.public_url);

    if (!response.ok) {
      throw new Error(`Erro ao baixar referencia Heritage publica: HTTP ${response.status}`);
    }

    const blob = await response.blob();

    return {
      referencia,
      source: referencia.public_url,
      file: await toFile(blob, referencia.nome || "heritage-reference.png", {
        type: blob.type || "image/png",
      }),
    };
  }

  if (!fs.existsSync(HERITAGE_REFERENCE_PATH)) {
    throw new Error(`Referencia Heritage local nao encontrada: ${HERITAGE_REFERENCE_PATH}`);
  }

  return {
    referencia: null,
    source: HERITAGE_REFERENCE_PATH,
    file: fs.createReadStream(HERITAGE_REFERENCE_PATH),
  };
}

async function salvarImagemNoStorage({ obraId, titulo, imageBuffer }) {
  const fileName = `${Date.now()}-${slugify(titulo)}-heritage.png`;
  const storagePath = `engine/heritage/${obraId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(CAPAS_BUCKET)
    .upload(storagePath, imageBuffer, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao salvar imagem Heritage no Storage: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from(CAPAS_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error("Storage nao retornou URL publica da imagem Heritage.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("livros")
    .update({
      capa_url: publicUrl,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", obraId);

  if (updateError) {
    throw new Error(`Erro ao atualizar capa_url da obra: ${updateError.message}`);
  }

  return {
    storagePath,
    publicUrl,
  };
}

export async function gerarImagemHeritageComReferencia({
  obraId,
  titulo,
  prompt,
}) {
  if (!obraId) throw new Error("obraId e obrigatorio para gerar imagem Heritage.");
  if (!prompt) throw new Error("Prompt Heritage nao encontrado para gerar imagem.");

  if (isEngineMockEnabled()) {
    engineStep("Imagem Heritage", "→", { modo: "mock", modelo: "mock-engine" });

    return {
      ok: true,
      mock: true,
      modelo: "mock-engine",
      provider: "mock",
      modo: "mock",
      imagem_url: null,
      storage_path: null,
      referencia_visual: null,
      resposta_bruta: null,
    };
  }

  const promptFinal = limitarPromptImagem(prompt);
  const referencia = await carregarReferenciaComoUploadable();
  const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const inicio = Date.now();

  engineStep("Imagem Heritage", "→", {
    modelo,
    referencia_visual: referencia.source,
    prompt_tamanho: promptFinal.length,
  });

  const resposta = await getOpenAIClient().images.edit({
    model: modelo,
    image: referencia.file,
    prompt: promptFinal,
    size: "1024x1536",
    quality: "high",
    n: 1,
  });

  const b64 = resposta.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("A OpenAI nao retornou imagem em base64.");
  }

  const imageBuffer = Buffer.from(b64, "base64");
  const storage = await salvarImagemNoStorage({
    obraId,
    titulo,
    imageBuffer,
  });

  const fim = Date.now();

  engineStep("Imagem Heritage", "✓", {
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    tempo_ms: fim - inicio,
  });

  return {
    ok: true,
    mock: false,
    modelo,
    provider: "openai",
    modo: "images.edit",
    tempo_ms: fim - inicio,
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    referencia_visual: referencia.source,
    prompt_tamanho: promptFinal.length,
    resposta_bruta: {
      created: resposta.created ?? null,
      usage: resposta.usage ?? null,
    },
  };
}
