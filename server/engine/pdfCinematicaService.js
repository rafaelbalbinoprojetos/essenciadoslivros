/* global process, fetch */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const PDFS_BUCKET = "pdfs";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 anos

const PAGE_WIDTH = 396; // 5.5in — formato "digest", confortável para ler no celular
const PAGE_HEIGHT = 612; // 8.5in
const MARGIN_TOP = 92;
const MARGIN_BOTTOM = 70;
const MARGIN_SIDE = 54;

const COR_FUNDO = "#F2E5C8"; // papel envelhecido / areia
const COR_TINTA = "#2B2118"; // quase-preto quente
const COR_ACCENT = "#8A6A34"; // sépia dourado para legendas e direções
const COR_TITULO = "#241A0E";

// ─────────────────────────────────────────────────────────────────────────────
// FONTES
// ─────────────────────────────────────────────────────────────────────────────

let bufferFontesCache = null;

function carregarBufferFontes() {
  if (bufferFontesCache) return bufferFontesCache;

  const dir = path.join(process.cwd(), "server", "engine", "assets", "fonts");

  bufferFontesCache = {
    corpo: fs.readFileSync(path.join(dir, "Lora-Regular.woff")),
    corpoItalico: fs.readFileSync(path.join(dir, "Lora-Italic.woff")),
    corpoSemiBold: fs.readFileSync(path.join(dir, "Lora-SemiBold.woff")),
    titulo: fs.readFileSync(path.join(dir, "PlayfairDisplay-SemiBold.woff")),
    tituloBold: fs.readFileSync(path.join(dir, "PlayfairDisplay-Bold.woff")),
  };

  return bufferFontesCache;
}

function registrarFontes(doc) {
  const fontes = carregarBufferFontes();
  doc.registerFont("corpo", fontes.corpo);
  doc.registerFont("corpoItalico", fontes.corpoItalico);
  doc.registerFont("corpoSemiBold", fontes.corpoSemiBold);
  doc.registerFont("titulo", fontes.titulo);
  doc.registerFont("tituloBold", fontes.tituloBold);
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER DA NARRATIVA CINEMATOGRÁFICA (texto bruto → blocos estruturados)
// ─────────────────────────────────────────────────────────────────────────────

function normalizarComparacao(texto) {
  return String(texto || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function ehCabecalhoCena(linha) {
  return /^\[\s*cena\s+\d+/i.test(normalizarComparacao(linha));
}

function ehLinhaApresentacao(linha) {
  return /^ess[êe]ncia dos livros apresenta/i.test(normalizarComparacao(linha));
}

function linhaEhSomenteTag(linha) {
  return /^\[[^\]]+\]$/.test(linha.trim());
}

// A seção do prelúdio já ganha o título "O CONVITE" desenhado manualmente
// (ver criarDocumentoPdf). Se o próprio roteiro também abrir com essa palavra
// como linha isolada, removemos para não duplicar o título na página.
function removerTituloConviteDuplicado(linhas) {
  const resultado = [...linhas];
  let indice = 0;

  while (indice < resultado.length && resultado[indice].trim() === "") {
    indice += 1;
  }

  if (indice < resultado.length && /^(o\s+)?convite$/i.test(normalizarComparacao(resultado[indice]))) {
    resultado.splice(indice, 1);
  }

  return resultado;
}

export function parseNarrativa(textoBruto) {
  const linhas = String(textoBruto || "").replace(/\r\n/g, "\n").split("\n");
  const cenas = [];
  const preludio = [];
  let cenaAtual = null;

  const finalizarCena = () => {
    if (cenaAtual) cenas.push(cenaAtual);
    cenaAtual = null;
  };

  linhas.forEach((linhaOriginal) => {
    const linha = linhaOriginal.trim();

    if (ehCabecalhoCena(linha)) {
      finalizarCena();
      cenaAtual = {
        cabecalho: linha,
        estiloSuno: null,
        intencao: null,
        simbolo: null,
        paragrafos: [],
      };
      return;
    }

    const normalizada = normalizarComparacao(linha);

    if (cenaAtual && normalizada.startsWith("estilo suno")) {
      cenaAtual.estiloSuno = linha.replace(/^estilo suno\s*:?/i, "").trim();
      return;
    }

    if (cenaAtual && normalizada.startsWith("intencao dramatica")) {
      cenaAtual.intencao = linha.replace(/^inten[cç][ãa]o dram[áa]tica\s*:?/i, "").trim();
      return;
    }

    if (cenaAtual && normalizada.startsWith("simbolo central")) {
      cenaAtual.simbolo = linha.replace(/^s[íi]mbolo central\s*:?/i, "").trim();
      return;
    }

    (cenaAtual ? cenaAtual.paragrafos : preludio).push(linha);
  });

  finalizarCena();

  return { preludio, cenas };
}

// ─────────────────────────────────────────────────────────────────────────────
// DESENHO — elementos recorrentes de página
// ─────────────────────────────────────────────────────────────────────────────

function desenharFundo(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COR_FUNDO);
  doc.restore();
}

function desenharCabecalhoCorrente(doc, tituloObra) {
  doc.save();
  doc.font("corpo").fontSize(8).fillColor(COR_ACCENT);
  doc.text("ESSÊNCIA DOS LIVROS", MARGIN_SIDE, 36, {
    width: doc.page.width - MARGIN_SIDE * 2,
    align: "center",
    characterSpacing: 2,
  });

  if (tituloObra) {
    doc.font("corpoItalico").fontSize(7.5).fillColor(COR_ACCENT);
    doc.text(String(tituloObra).toUpperCase(), MARGIN_SIDE, 50, {
      width: doc.page.width - MARGIN_SIDE * 2,
      align: "center",
      characterSpacing: 1,
    });
  }

  doc.restore();
}

function desenharRodape(doc, numero) {
  doc.save();
  doc.font("corpoItalico").fontSize(8).fillColor(COR_ACCENT);
  doc.text(`— ${numero} —`, MARGIN_SIDE, doc.page.height - 46, {
    width: doc.page.width - MARGIN_SIDE * 2,
    align: "center",
  });
  doc.restore();
}

function desenharLinhaComTags(doc, linha, opts) {
  const partes = linha.split(/(\[[^\]]+\])/g).filter((parte) => parte !== "");
  if (partes.length === 0) return;

  partes.forEach((parte, indice) => {
    const ehTag = parte.startsWith("[") && parte.endsWith("]");
    doc
      .font(ehTag ? opts.fonteTag : opts.fonte)
      .fontSize(ehTag ? opts.tamanhoTag : opts.tamanho)
      .fillColor(ehTag ? opts.corTag : opts.cor);
    doc.text(parte, { continued: indice < partes.length - 1 });
  });
}

function renderizarBlocoNarrativo(doc, linhas, opts) {
  let ultimaFoiTexto = false;

  linhas.forEach((linhaOriginal) => {
    const linha = linhaOriginal.trim();

    if (linha === "") {
      if (ultimaFoiTexto) doc.moveDown(0.55);
      ultimaFoiTexto = false;
      return;
    }

    if (ehLinhaApresentacao(linha)) {
      if (ultimaFoiTexto) doc.moveDown(0.5);
      doc.font("tituloBold").fontSize(14).fillColor(COR_TITULO);
      doc.text(linha.toUpperCase(), { align: "center", characterSpacing: 1 });
      doc.moveDown(0.7);
      ultimaFoiTexto = false;
      return;
    }

    if (linhaEhSomenteTag(linha)) {
      if (ultimaFoiTexto) doc.moveDown(0.35);
      doc.font(opts.fonteTag).fontSize(opts.tamanhoTag).fillColor(opts.corTag);
      doc.text(linha, { align: "center" });
      doc.moveDown(0.5);
      ultimaFoiTexto = false;
      return;
    }

    desenharLinhaComTags(doc, linha, opts);
    doc.moveDown(0.12);
    ultimaFoiTexto = true;
  });
}

function desenharFolhaDeRosto(doc, { tituloObra, tituloCinematico, autor, ano, tipoObra, fraseCuratorial }) {
  const largura = doc.page.width - MARGIN_SIDE * 2;

  doc.y = Math.round(doc.page.height * 0.32);

  doc.font("corpo").fontSize(9).fillColor(COR_ACCENT);
  doc.text("ESSÊNCIA DOS LIVROS", MARGIN_SIDE, doc.y, { width: largura, align: "center", characterSpacing: 3 });
  doc.moveDown(1.4);

  doc.font("tituloBold").fontSize(25).fillColor(COR_TITULO);
  doc.text(String(tituloCinematico || tituloObra || "").toUpperCase(), { width: largura, align: "center" });
  doc.moveDown(0.6);

  doc.font("corpoItalico").fontSize(10.5).fillColor(COR_ACCENT);
  doc.text("Narrativa Cinematográfica", { width: largura, align: "center" });
  doc.moveDown(1.6);

  if (fraseCuratorial) {
    doc.font("corpoItalico").fontSize(11).fillColor(COR_TINTA);
    doc.text(`"${fraseCuratorial}"`, { width: largura, align: "center" });
    doc.moveDown(1.6);
  }

  const rodapeInfo = [tituloObra, autor, ano, tipoObra].filter(Boolean).join("  ·  ");
  doc.font("corpo").fontSize(9).fillColor(COR_ACCENT);
  doc.text(rodapeInfo, { width: largura, align: "center" });
}

function renderizarCena(doc, cena) {
  doc.addPage();

  doc.font("titulo").fontSize(15).fillColor(COR_TITULO);
  doc.text(cena.cabecalho, { align: "left" });
  doc.moveDown(0.4);
  doc
    .moveTo(MARGIN_SIDE, doc.y)
    .lineTo(doc.page.width - MARGIN_SIDE, doc.y)
    .lineWidth(0.75)
    .strokeColor(COR_ACCENT)
    .stroke();
  doc.moveDown(0.8);

  if (cena.estiloSuno || cena.intencao || cena.simbolo) {
    doc.font("corpoItalico").fontSize(8.5).fillColor(COR_ACCENT);
    if (cena.estiloSuno) {
      doc.text(`Ambientação: ${cena.estiloSuno}`);
      doc.moveDown(0.25);
    }
    if (cena.intencao) {
      doc.text(`Intenção dramática: ${cena.intencao}`);
      doc.moveDown(0.25);
    }
    if (cena.simbolo) {
      doc.text(`Símbolo central: ${cena.simbolo}`);
    }
    doc.moveDown(1);
  }

  renderizarBlocoNarrativo(doc, cena.paragrafos, {
    fonte: "corpo",
    tamanho: 12,
    cor: COR_TINTA,
    fonteTag: "corpoItalico",
    tamanhoTag: 9.5,
    corTag: COR_ACCENT,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTAGEM DO DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────

export async function criarDocumentoPdf({
  tituloObra,
  tituloCinematico,
  autor,
  ano,
  tipoObra,
  fraseCuratorial,
  capaBuffer,
  preludio,
  cenas,
}) {
  const doc = new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_SIDE, right: MARGIN_SIDE },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: tituloCinematico || tituloObra || "Narrativa Cinematográfica",
      Author: "Essência dos Livros",
      Subject: "Narrativa Cinematográfica",
      Creator: "Essência Engine",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finalizado = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  registrarFontes(doc);

  // Página 1 — capa cinemática, sangria total (esta página fica de fora da numeração e do cabeçalho corrente)
  if (capaBuffer) {
    doc.image(capaBuffer, 0, 0, {
      cover: [PAGE_WIDTH, PAGE_HEIGHT],
      align: "center",
      valign: "center",
    });
  } else {
    desenharFundo(doc);
  }

  // A partir daqui, toda página nova (manual ou por quebra automática de texto) recebe fundo + cabeçalho corrente
  doc.on("pageAdded", () => {
    desenharFundo(doc);
    desenharCabecalhoCorrente(doc, tituloCinematico || tituloObra);
  });

  doc.addPage();
  desenharFolhaDeRosto(doc, { tituloObra, tituloCinematico, autor, ano, tipoObra, fraseCuratorial });

  const preludioSemTituloDuplicado = removerTituloConviteDuplicado(preludio);

  if (preludioSemTituloDuplicado.some((linha) => linha.trim() !== "")) {
    doc.addPage();
    doc.font("titulo").fontSize(13).fillColor(COR_TITULO).text("O CONVITE", { align: "left" });
    doc.moveDown(0.8);
    renderizarBlocoNarrativo(doc, preludioSemTituloDuplicado, {
      fonte: "corpo",
      tamanho: 12,
      cor: COR_TINTA,
      fonteTag: "corpoItalico",
      tamanhoTag: 9.5,
      corTag: COR_ACCENT,
    });
  }

  cenas.forEach((cena) => renderizarCena(doc, cena));

  // Numeração final — pula a capa (página 0 do intervalo)
  const intervalo = doc.bufferedPageRange();
  for (let i = intervalo.start + 1; i < intervalo.start + intervalo.count; i += 1) {
    doc.switchToPage(i);
    desenharRodape(doc, i - intervalo.start);
  }

  doc.end();
  return finalizado;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORQUESTRAÇÃO — busca dados, gera o PDF, sobe pro Storage, atualiza a obra
// ─────────────────────────────────────────────────────────────────────────────

function slugify(value = "obra") {
  return String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "obra";
}

async function baixarImagem(url) {
  if (!url) return null;

  const resposta = await fetch(url);
  if (!resposta.ok) return null;

  return Buffer.from(await resposta.arrayBuffer());
}

async function buscarNarrativaCinematica(obraId) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("saida")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", "narrativa_cinematica")
    .eq("status", "concluido")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar narrativa cinematográfica: ${error.message}`);
  }

  return typeof data?.saida === "string" ? data.saida : null;
}

async function salvarPdfNoStorage({ obraId, tituloArquivo, pdfBuffer }) {
  const nomeArquivo = `${Date.now()}-${slugify(tituloArquivo)}-cinematica.pdf`;
  const storagePath = `engine/pdf_cinematica/${obraId}/${nomeArquivo}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao salvar PDF cinemático no Storage: ${uploadError.message}`);
  }

  const { data: assinada, error: signError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .createSignedUrl(storagePath, PDF_SIGNED_URL_TTL_SECONDS);

  if (signError || !assinada?.signedUrl) {
    throw new Error(`Erro ao gerar URL assinada do PDF: ${signError?.message || "URL não retornada."}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("livros")
    .update({
      pdf_cinematica_url: assinada.signedUrl,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", obraId);

  if (updateError) {
    throw new Error(`Erro ao atualizar pdf_cinematica_url da obra: ${updateError.message}`);
  }

  return { storagePath, signedUrl: assinada.signedUrl };
}

export async function gerarPdfCinematico({ obraId, contexto, beuAtual }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório para gerar o PDF cinemático.");
  }

  const narrativa = await buscarNarrativaCinematica(obraId);

  if (!narrativa) {
    throw new Error("Nenhuma narrativa cinematográfica concluída foi encontrada. Gere a narrativa antes do PDF.");
  }

  const capaUrl = contexto?.arquivos_existentes?.capa_cinematica_url || null;

  if (!capaUrl) {
    engineStep("PDF Cinemático", "!", {
      obraId,
      aviso: "Nenhuma capa cinemática encontrada para esta obra. Gerando PDF sem capa.",
    });
  }

  const titulo = contexto?.obra?.titulo || beuAtual?.identificacao?.titulo || "Obra";
  const tituloCinematico = contexto?.obra?.titulo_cinematico || null;
  const autor = contexto?.autoria?.autor?.nome || beuAtual?.autoria?.autor_principal || null;
  const ano = contexto?.obra?.data_lancamento
    ? String(contexto.obra.data_lancamento).slice(0, 4)
    : beuAtual?.identificacao?.ano || null;
  const tipoObra = contexto?.obra?.tipo_obra || null;
  const fraseCuratorial = beuAtual?.capa_cinematica?.frase_curatorial || null;

  const inicio = Date.now();
  const capaBuffer = await baixarImagem(capaUrl);
  const { preludio, cenas } = parseNarrativa(narrativa);

  engineStep("PDF Cinemático", "->", { obraId, cenas: cenas.length, tem_capa: Boolean(capaBuffer) });

  const pdfBuffer = await criarDocumentoPdf({
    tituloObra: titulo,
    tituloCinematico,
    autor,
    ano,
    tipoObra,
    fraseCuratorial,
    capaBuffer,
    preludio,
    cenas,
  });

  const { storagePath, signedUrl } = await salvarPdfNoStorage({
    obraId,
    tituloArquivo: titulo,
    pdfBuffer,
  });

  const fim = Date.now();

  engineStep("PDF Cinemático", "ok", {
    storagePath,
    tempo_ms: fim - inicio,
    tamanho_bytes: pdfBuffer.length,
  });

  return {
    ok: true,
    mock: false,
    provider: "pdfkit",
    modo: "pdfkit.local",
    tempo_ms: fim - inicio,
    pdf_url: signedUrl,
    storage_path: storagePath,
    tamanho_bytes: pdfBuffer.length,
    cenas: cenas.length,
  };
}
