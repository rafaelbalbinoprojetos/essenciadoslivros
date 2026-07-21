/* global process, fetch */

import fs from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CAPAS_BUCKET = "capas";
const ENGINE_REFERENCIAS_BUCKET = "engine-referencias";
const HERITAGE_REFERENCE_PATH = path.join(process.cwd(), "src", "image", "CAPA_REFERENCIA_HERITAGE.png");
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PROMPT_REFERENCIA_HERITAGE = `
You will receive an attached image as the official visual reference for the Engine.

The attached image is NOT the final artwork to be literally edited.
It is the VISUAL BIBLE of the collection, but only at the level of art direction.

Absolute priority:
1. Use the attached image to learn the visual language, not the literal layout.
2. Use the work prompt only to replace the work, title, artifacts, emotional tone, palette and curatorial data.
3. Never literally copy the objects from the reference.
4. Never copy the reference title placement, object placement, panel grid, color balance, exact borders or exact composition.
5. Never reduce the composition to a few isolated objects.

Extract from the reference only:
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

Do not preserve from the reference:
- exact beige background;
- exact title hierarchy;
- exact object scale;
- exact framing;
- exact lower-card layout;
- any inventory-grid feeling;
- any copied object silhouette.

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

Canonical object fidelity overrides the reference image. If the work prompt names a canonical artifact, preserve its official silhouette, proportions and recognizable design even if that differs from the attached reference.

The final image must look like a premium editorial photograph of a real historical archive table, belonging to the same collection as the attached reference image.
`.trim();

const PROMPT_REFERENCIA_CINEMATICA = `
You will receive an attached image as the official visual reference for the cinematic audio cover.

The attached image is NOT the final artwork to be literally edited.
It is the visual direction reference for cinematic presentation covers.

Absolute priority:
1. Use the attached image to learn visual language, impact, mood, hierarchy, lighting, texture, and editorial finish.
2. Use the work prompt to define the current work, scene, characters, artifacts, emotion, palette, title and curatorial audio details.
3. Never copy the exact depicted work, objects, character pose, title placement, or layout from the reference.
4. Do not create a Heritage museum archive table unless the prompt explicitly asks for one.

The final cover must feel premium, cinematic, emotional and designed for an audio presentation experience.
It should make the viewer want to press play.

Never include a visible emotional palette, color palette panel, color swatches, colored circles, color chips, color legend or written list of colors. Use the work's palette only through the photograph, lighting, atmosphere and physical materials.

Preserve from the reference only the cinematic quality bar: dramatic visual impact, strong composition, atmospheric lighting, depth, texture, readable title hierarchy, and collectible editorial finish.

The work prompt overrides the reference image whenever there is a conflict.
`.trim();

const INSTRUCTIONS_RESPONSES_HERITAGE = `
You are a senior image art director for the Essencia dos Livros Heritage Collection.
Analyze the attached reference image only as style language.
Before using the image_generation tool, internally translate the reference into style traits: archival table, tactile materials, documentary density, real shadows, museum plaque, aged paper, premium editorial photography.
Do not use the reference as a layout template.
Do not reproduce the reference's objects, object positions, title positions, panels, beige background, or exact composition.
The final generated image must prioritize the canonical objects and work-specific artifacts described in the user prompt.
When there is any conflict between visual reference and work prompt, the work prompt wins.
Use the image_generation tool to create the final image.
`.trim();

const INSTRUCTIONS_RESPONSES_PLAYER_HERO = `
You are a senior cinematic interface art director. The attached image is the exact Cinematic Cover that must remain physically present and recognizable inside the new scene. Treat it as the artistic foundation, preserve its artwork, title, palette and visual identity, and expand its universe around it. Create a new vertical Player Hero artwork according to the user prompt. Do not draw any interface elements. Use the image_generation tool to create the final image.
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

// Remove a linha de declaração "LOCKED SCENE: ..." gerada pelo agente diretor de arte.
// Essa linha é útil para debug/log mas não deve ir para o modelo de imagem.
function limparPromptCinematicaParaImagem(prompt = "") {
  return String(prompt)
    .split(/\r?\n/)
    .filter((linha) => !linha.trim().toUpperCase().startsWith("LOCKED SCENE:"))
    .join("\n")
    .trim();
}

function detectarMimeImagem(fileName = "", reportedType = "") {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(reportedType)) return reportedType;

  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function buscarReferenciaAtiva(tipo = "heritage") {
  const { data, error } = await supabaseAdmin
    .from("engine_referencias_imagem")
    .select("tipo,nome,bucket,storage_path,public_url,usar_como_referencia,ativo")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .eq("usar_como_referencia", true)
    .maybeSingle();

  if (error) {
    console.warn(`[ImageGeneration] referencia ${tipo} ativa indisponivel:`, error.message);
    return null;
  }

  return data || null;
}

async function carregarReferenciaComoUploadable({
  tipo = "heritage",
  fallbackPath = HERITAGE_REFERENCE_PATH,
  fallbackName = "CAPA_REFERENCIA_HERITAGE.png",
} = {}) {
  const referencia = await buscarReferenciaAtiva(tipo);

  if (referencia?.storage_path) {
    const bucket = referencia.bucket || ENGINE_REFERENCIAS_BUCKET;
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(referencia.storage_path);

    if (error) {
      throw new Error(`Erro ao baixar referencia Heritage do Storage: ${error.message}`);
    }

    const fileName = referencia.nome || path.basename(referencia.storage_path) || `${tipo}-reference.png`;
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

    const fileName = referencia.nome || `${tipo}-reference.png`;
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

  if (!fallbackPath || !fs.existsSync(fallbackPath)) {
    throw new Error(`Referencia ${tipo} nao encontrada. Cadastre uma imagem de referencia ativa na pagina Engine.`);
  }

  const buffer = await fs.promises.readFile(fallbackPath);

  return {
    referencia: null,
    source: fallbackPath,
    mimeType: "image/png",
    buffer,
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    file: await toFile(buffer, fallbackName, {
      type: "image/png",
    }),
  };
}

async function carregarReferenciaDiretaComoUploadable(url, fileName = "cinematic-cover.png") {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ao baixar a capa cinematica usada no Player Hero: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType = detectarMimeImagem(fileName, blob.type);
  const buffer = Buffer.from(await blob.arrayBuffer());

  return {
    referencia: null,
    source: url,
    mimeType,
    buffer,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    file: await toFile(blob, fileName, { type: mimeType }),
  };
}

async function salvarImagemNoStorage({
  obraId,
  titulo,
  imageBuffer,
  tipoImagem = "heritage",
  colunaCapa = "capa_url",
  label = "Heritage",
}) {
  const fileName = `${Date.now()}-${slugify(titulo)}-${tipoImagem}.png`;
  const storagePath = `engine/${tipoImagem}/${obraId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(CAPAS_BUCKET)
    .upload(storagePath, imageBuffer, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao salvar imagem ${label} no Storage: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from(CAPAS_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error(`Storage nao retornou URL publica da imagem ${label}.`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("livros")
    .update({
      [colunaCapa]: publicUrl,
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

function normalizarParaComparacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function ehRecusaPorModeracao(error) {
  const codigo = normalizarParaComparacao(error?.code || error?.error?.code);
  const tipo = normalizarParaComparacao(error?.type || error?.error?.type);
  const mensagem = normalizarParaComparacao(error?.message);
  const status = error?.status ?? error?.response?.status ?? null;

  const marcadores = [
    // inglês
    "content_policy_violation",
    "moderation_blocked",
    "content policy",
    "content policies",
    "safety system",
    "our safety",
    "content filter",
    "moderation",
    "rejected as a result of",
    "not allowed to generate",
    "cannot generate",
    "unable to generate",
    "may violate our content polic",
    "might violate our content polic",
    "may violate our usage polic",
    "try again or edit your prompt",
    // português (mensagem real observada: "Infelizmente, a imagem que criamos
    // pode violar nossas políticas de conteúdo. Se você considera que foi um
    // engano, tente novamente ou edite o prompt.")
    "pode violar nossas politicas",
    "viola nossas politicas",
    "politicas de conteudo",
    "tente novamente ou edite",
    "edite o prompt",
  ];

  const alvo = `${codigo} ${tipo} ${mensagem}`;

  if (marcadores.some((marcador) => alvo.includes(marcador))) return true;
  if (status === 400 && /polic|moderat|safety|violat/.test(mensagem)) return true;

  return false;
}

async function ajustarPromptAposRecusa({ promptOriginal, motivoRecusa }) {
  const modelo = process.env.OPENAI_MODERACAO_AJUSTE_MODEL || "gpt-4.1-mini";

  const resposta = await getOpenAIClient().chat.completions.create({
    model: modelo,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "Você é um editor de prompts de geração de imagem. Reescreva prompts recusados pelo sistema de moderação da OpenAI, removendo elementos que possam violar políticas de conteúdo: violência gráfica explícita, sangue, nudez, ódio, autolesão, conteúdo perturbador, armas descritas de forma agressiva ou em detalhe realista excessivo, e retratos foto-realistas extremos de personagens (reais ou fictícios/protegidos por direitos autorais) que possam ser confundidos com o retrato de uma pessoa real. Quando o prompt descrever um personagem fictício conhecido, mantenha silhueta, vestuário, objetos icônicos e pose reconhecíveis, mas reduza a especificidade fotorrealista do rosto/expressão e suavize verbos de ação agressivos (ex.: 'gripping tightly', 'blazing eyes') por descrições mais neutras. Preserve ao máximo a composição, atmosfera, estilo cinematográfico, artefatos simbólicos e fidelidade emocional à obra original. Responda apenas com o prompt reescrito em inglês, sem explicações, sem aspas, sem markdown.",
      },
      {
        role: "user",
        content: `O prompt abaixo foi recusado pela moderação da OpenAI.\n\nMotivo reportado: ${motivoRecusa || "não especificado"}\n\nPrompt original:\n${promptOriginal}\n\nReescreva mantendo a essência, apenas suavizando o que for necessário para passar pela moderação.`,
      },
    ],
  });

  const textoAjustado = resposta.choices?.[0]?.message?.content?.trim();

  if (!textoAjustado) {
    throw new Error("Não foi possível ajustar o prompt após recusa de moderação.");
  }

  return textoAjustado;
}

function extrairImagemBase64DaResponses(resposta) {
  const output = Array.isArray(resposta?.output) ? resposta.output : [];
  const imageCall = output.find((item) => item?.type === "image_generation_call" && item?.result);

  return imageCall?.result || null;
}

async function gerarComResponsesImageGeneration({
  promptFinal,
  referencia,
  obraId,
  tipoEtapa = "heritage_image",
  instructions = INSTRUCTIONS_RESPONSES_HERITAGE,
}) {
  const modeloResposta = process.env.OPENAI_RESPONSES_MODEL || "gpt-4.1";
  const modeloImagem = process.env.OPENAI_IMAGE_TOOL_MODEL || "gpt-image-1";

  const resposta = await getOpenAIClient().responses.create({
    model: modeloResposta,
    instructions,
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
        output_format: "jpeg",
        moderation: "auto",
      },
    ],
    metadata: {
      obra_id: String(obraId),
      engine_step: tipoEtapa,
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
  const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

  const parametros = {
    model: modelo,
    image: referencia.file,
    prompt: promptFinal,
    size: "1024x1536",
    quality: "high",
    n: 1,
  };

  if (modelo !== "gpt-image-2") {
    parametros.input_fidelity = "high";
  }

  const resposta = await getOpenAIClient().images.edit(parametros);

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

async function gerarImagemComReferencia({
  obraId,
  titulo,
  prompt,
  tipoReferencia = "heritage",
  tipoImagem = "heritage",
  tipoEtapa = "heritage_image",
  promptReferencia = PROMPT_REFERENCIA_HERITAGE,
  colunaCapa = "capa_url",
  label = "Heritage",
  fallbackPath = HERITAGE_REFERENCE_PATH,
  fallbackName = "CAPA_REFERENCIA_HERITAGE.png",
  referenciaDiretaUrl = null,
}) {
  if (!obraId) throw new Error(`obraId e obrigatorio para gerar imagem ${label}.`);
  if (!prompt) throw new Error(`Prompt ${label} nao encontrado para gerar imagem.`);

  const limpador = tipoImagem === "cinematica"
    ? limparPromptCinematicaParaImagem
    : tipoImagem === "player_hero"
      ? (valor) => String(valor || "").trim()
      : limparPromptHeritageParaImagem;
  const instructionsResponses = tipoImagem === "player_hero"
    ? INSTRUCTIONS_RESPONSES_PLAYER_HERO
    : INSTRUCTIONS_RESPONSES_HERITAGE;

  const promptDaObra = limpador(prompt);
  const promptFinal = limitarPromptImagem(`${promptReferencia}

DADOS DA OBRA:
${promptDaObra}`);
  const referencia = referenciaDiretaUrl
    ? await carregarReferenciaDiretaComoUploadable(referenciaDiretaUrl)
    : await carregarReferenciaComoUploadable({
      tipo: tipoReferencia,
      fallbackPath,
      fallbackName,
    });
  const inicio = Date.now();

  engineStep(`Imagem ${label}`, "->", {
    modo_preferencial: "responses.image_generation",
    referencia_visual: referencia.source,
    prompt_tamanho: promptFinal.length,
  });

  async function tentarGerarImagem(promptParaGerar) {
    try {
      return await gerarComResponsesImageGeneration({
        promptFinal: promptParaGerar,
        referencia,
        obraId,
        tipoEtapa,
        instructions: instructionsResponses,
      });
    } catch (error) {
      console.warn("[ImageGeneration] Responses API falhou, tentando images.edit:", error.message);
      const geracaoFallback = await gerarComImagesEdit({ promptFinal: promptParaGerar, referencia });
      geracaoFallback.fallback_reason = error.message;
      return geracaoFallback;
    }
  }

  async function tentarGerarOuBloquear(promptParaGerar) {
    try {
      const geracao = await tentarGerarImagem(promptParaGerar);

      if (!geracao.b64) {
        return { bloqueado: true, motivo: "A OpenAI não retornou imagem em base64 (possível recusa silenciosa)." };
      }

      return { bloqueado: false, geracao };
    } catch (error) {
      if (!ehRecusaPorModeracao(error)) throw error;
      return { bloqueado: true, motivo: error.message };
    }
  }

  let promptUsado = promptFinal;
  let tentativa = await tentarGerarOuBloquear(promptUsado);

  if (tentativa.bloqueado) {
    engineStep(`Imagem ${label}`, "!", {
      aviso: "Prompt recusado pela moderação da OpenAI. Ajustando e tentando novamente.",
      motivo: tentativa.motivo,
    });

    try {
      promptUsado = await ajustarPromptAposRecusa({ promptOriginal: promptFinal, motivoRecusa: tentativa.motivo });
      tentativa = await tentarGerarOuBloquear(promptUsado);
    } catch (erroAjuste) {
      tentativa = { bloqueado: true, motivo: erroAjuste.message };
    }
  }

  if (tentativa.bloqueado) {
    engineStep(`Imagem ${label}`, "✕", {
      aviso: "Geração bloqueada pela moderação da OpenAI mesmo após ajuste do prompt. Seguindo sem imagem.",
      motivo: tentativa.motivo,
    });

    return {
      ok: false,
      mock: false,
      bloqueado_por_moderacao: true,
      modelo: null,
      provider: "openai",
      modo: null,
      imagem_url: null,
      storage_path: null,
      referencia_visual: referencia.source,
      prompt_tamanho: promptUsado.length,
      motivo: tentativa.motivo,
      resposta_bruta: null,
    };
  }

  const { geracao } = tentativa;
  const imageBuffer = Buffer.from(geracao.b64, "base64");
  const storage = await salvarImagemNoStorage({
    obraId,
    titulo,
    imageBuffer,
    tipoImagem,
    colunaCapa,
    label,
  });

  const fim = Date.now();

  engineStep(`Imagem ${label}`, "ok", {
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    tempo_ms: fim - inicio,
    modo: geracao.modo,
  });

  return {
    ok: true,
    mock: false,
    bloqueado_por_moderacao: false,
    modelo: geracao.modelo,
    provider: "openai",
    modo: geracao.modo,
    tempo_ms: fim - inicio,
    imagem_url: storage.publicUrl,
    storage_path: storage.storagePath,
    referencia_visual: referencia.source,
    prompt_tamanho: promptUsado.length,
    fallback_reason: geracao.fallback_reason || null,
    resposta_bruta: geracao.respostaBruta,
  };
}

export async function gerarImagemHeritageComReferencia({ obraId, titulo, prompt }) {
  return gerarImagemComReferencia({
    obraId,
    titulo,
    prompt,
    tipoReferencia: "heritage",
    tipoImagem: "heritage",
    tipoEtapa: "heritage_image",
    promptReferencia: PROMPT_REFERENCIA_HERITAGE,
    colunaCapa: "capa_url",
    label: "Heritage",
    fallbackPath: HERITAGE_REFERENCE_PATH,
    fallbackName: "CAPA_REFERENCIA_HERITAGE.png",
  });
}

export async function gerarImagemCinematicaComReferencia({ obraId, titulo, prompt }) {
  return gerarImagemComReferencia({
    obraId,
    titulo,
    prompt,
    tipoReferencia: "cinematica",
    tipoImagem: "cinematica",
    tipoEtapa: "capa_cinematica_image",
    promptReferencia: PROMPT_REFERENCIA_CINEMATICA,
    colunaCapa: "capa_cinematica_url",
    label: "Cinematica",
    fallbackPath: null,
    fallbackName: "CAPA_REFERENCIA_CINEMATICA.png",
  });
}

export async function gerarPlayerHeroComCapaCinematica({ obraId, titulo, capaCinematicaUrl, prompt }) {
  if (!capaCinematicaUrl) {
    throw new Error("A capa cinematica e obrigatoria para gerar o Player Hero.");
  }
  if (!prompt) {
    throw new Error("O prompt do Player Hero e obrigatorio para gerar a imagem.");
  }

  return gerarImagemComReferencia({
    obraId,
    titulo,
    prompt,
    tipoReferencia: "cinematica",
    tipoImagem: "player_hero",
    tipoEtapa: "player_hero_image",
    promptReferencia: "",
    colunaCapa: "player_hero_url",
    label: "Player Hero",
    fallbackPath: null,
    fallbackName: "CAPA_CINEMATICA.png",
    referenciaDiretaUrl: capaCinematicaUrl,
  });
}
