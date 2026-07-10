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
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PROMPT_REFERENCIA_HERITAGE = `
You will receive an attached image as the official visual reference for the Engine.

The attached image is NOT the final artwork to be literally edited.
It is the VISUAL BIBLE of the collection.

Absolute priority:
1. Use the attached image to learn the visual language.
2. Use the work prompt only to replace the work, title, artifacts, emotional tone, palette and curatorial data.
3. Never literally copy the objects from the reference.
4. Never reduce the composition to a few isolated objects.

The new cover must preserve from the reference:
- rich documentary density;
- physical archive table;
- overlapping papers;
- crumpled documents;
- tape, clips, stamps, handwritten notes and handling marks;
- central object with real wear;
- leather, paper, metal, wood and dust texture;
- warm, museum-like, lateral lighting;
- physical depth with real shadows;
- lower museum plaque;
- the feeling of an archive found, preserved and photographed.

The new cover must NOT look like:
- minimalist cover;
- clean 3D render;
- promotional poster;
- flat digital artwork;
- catalog with only a few objects;
- empty composition;
- generic image with an oversized central object.

Mandatory visual rule:
The composition must include at least 8 to 12 visible curatorial elements around the main artifact, including documents, notes, maps, studies, photographs or physical fragments related to the work.

The final image must look like a premium editorial photograph of a real historical archive table, belonging to the same collection as the attached reference image.
`.trim();

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

function limparPromptHeritageParaImagem(prompt = "") {
  const linhas = String(prompt)
    .split(/\r?\n/)
    .filter((linha) => {
      const normalizada = linha.trim().toLowerCase();

      if (!normalizada) return true;
      if (normalizada.startsWith("reference image source:")) return false;
      if (normalizada.startsWith("- reference image source:")) return false;
      if (normalizada.includes("reference image source")) return false;
      if (normalizada.includes("use a imagem de referencia localizada em")) return false;
      if (normalizada.includes("use the active reference image located at")) return false;
      if (normalizada.includes("src/image/capa_referencia_heritage")) return false;
      if (normalizada.includes("capa_referencia_heritage")) return false;
      if (normalizada.includes("engine-referencias")) return false;

      return true;
    });

  return linhas.join("\n").trim();
}

function detectarMimeImagem(fileName = "", reportedType = "") {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(reportedType)) return reportedType;

  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
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

    const fileName = referencia.nome || path.basename(referencia.storage_path) || "heritage-reference.png";
    const mimeType = detectarMimeImagem(fileName, data.type);
    const buffer = Buffer.from(await data.arrayBuffer());

    return {
      referencia,
      source: referencia.public_url || referencia.storage_path,
      mimeType,
      buffer,
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      file: await toFile(data, fileName, {
        type: mimeType,
      }),
    };
  }

  if (referencia?.public_url) {
    const response = await fetch(referencia.public_url);

    if (!response.ok) {
      throw new Error(`Erro ao baixar referencia Heritage publica: HTTP ${response.status}`);
    }

    const blob = await response.blob();

    const fileName = referencia.nome || "heritage-reference.png";
    const mimeType = detectarMimeImagem(fileName, blob.type);
    const buffer = Buffer.from(await blob.arrayBuffer());

    return {
      referencia,
      source: referencia.public_url,
      mimeType,
      buffer,
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      file: await toFile(blob, fileName, {
        type: mimeType,
      }),
    };
  }

  if (!fs.existsSync(HERITAGE_REFERENCE_PATH)) {
    throw new Error(`Referencia Heritage local nao encontrada: ${HERITAGE_REFERENCE_PATH}`);
  }

  const buffer = await fs.promises.readFile(HERITAGE_REFERENCE_PATH);

  return {
    referencia: null,
    source: HERITAGE_REFERENCE_PATH,
    mimeType: "image/png",
    buffer,
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    file: await toFile(buffer, "CAPA_REFERENCIA_HERITAGE.png", {
      type: "image/png",
    }),
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

function extrairImagemBase64DaResponses(resposta) {
  const output = Array.isArray(resposta?.output) ? resposta.output : [];
  const imageCall = output.find((item) => item?.type === "image_generation_call" && item?.result);

  return imageCall?.result || null;
}

async function gerarComResponsesImageGeneration({ promptFinal, referencia, obraId }) {
  const modeloResposta = process.env.OPENAI_RESPONSES_MODEL || "gpt-4.1";
  const modeloImagem = process.env.OPENAI_IMAGE_TOOL_MODEL || "gpt-image-1";

  const resposta = await getOpenAIClient().responses.create({
    model: modeloResposta,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: promptFinal,
          },
          {
            type: "input_image",
            image_url: referencia.dataUrl,
            detail: "high",
          },
        ],
      },
    ],
    tools: [
      {
        type: "image_generation",
        model: modeloImagem,
        size: "1024x1536",
        quality: "high",
        output_format: "png",
        moderation: "auto",
      },
    ],
    tool_choice: { type: "image_generation" },
    metadata: {
      obra_id: String(obraId),
      engine_step: "heritage_image",
    },
  });

  return {
    b64: extrairImagemBase64DaResponses(resposta),
    modelo: `${modeloResposta} + ${modeloImagem}`,
    modo: "responses.image_generation",
    respostaBruta: {
      id: resposta.id ?? null,
      status: resposta.status ?? null,
      usage: resposta.usage ?? null,
      output: Array.isArray(resposta.output)
        ? resposta.output.map((item) => ({
          type: item?.type,
          status: item?.status ?? null,
          has_result: Boolean(item?.result),
        }))
        : null,
    },
  };
}

async function gerarComImagesEdit({ promptFinal, referencia }) {
  const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

  const resposta = await getOpenAIClient().images.edit({
    model: modelo,
    image: referencia.file,
    prompt: promptFinal,
    size: "1024x1536",
    quality: "high",
    input_fidelity: "high",
    n: 1,
  });

  return {
    b64: resposta.data?.[0]?.b64_json || null,
    modelo,
    modo: "images.edit",
    respostaBruta: {
      created: resposta.created ?? null,
      usage: resposta.usage ?? null,
    },
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
    engineStep("Imagem Heritage", "->", { modo: "mock", modelo: "mock-engine" });

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

  const promptDaObra = limparPromptHeritageParaImagem(prompt);
  const promptFinal = limitarPromptImagem(`${PROMPT_REFERENCIA_HERITAGE}

DADOS DA OBRA:
${promptDaObra}`);
  const referencia = await carregarReferenciaComoUploadable();
  const inicio = Date.now();

  engineStep("Imagem Heritage", "->", {
    modo_preferencial: "responses.image_generation",
    referencia_visual: referencia.source,
    prompt_tamanho: promptFinal.length,
  });

  let geracao;

  try {
    geracao = await gerarComResponsesImageGeneration({
      promptFinal,
      referencia,
      obraId,
    });
  } catch (error) {
    console.warn("[ImageGeneration] Responses API falhou, tentando images.edit:", error.message);
    geracao = await gerarComImagesEdit({ promptFinal, referencia });
    geracao.fallback_reason = error.message;
  }

  const b64 = geracao.b64;

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

  engineStep("Imagem Heritage", "ok", {
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    tempo_ms: fim - inicio,
    modo: geracao.modo,
  });

  return {
    ok: true,
    mock: false,
    modelo: geracao.modelo,
    provider: "openai",
    modo: geracao.modo,
    tempo_ms: fim - inicio,
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    referencia_visual: referencia.source,
    prompt_tamanho: promptFinal.length,
    fallback_reason: geracao.fallback_reason || null,
    resposta_bruta: geracao.respostaBruta,
  };
}
