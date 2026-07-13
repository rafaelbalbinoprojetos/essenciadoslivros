/* global process */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const PDFS_BUCKET = "pdfs";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 anos

const PARTES_ENCICLOPEDIA_ORDEM = [
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
];

const PAGE_WIDTH = 396; // 5.5in — mesmo formato "digest" do PDF cinemático
const PAGE_HEIGHT = 612; // 8.5in
const MARGIN_TOP = 92;
const MARGIN_BOTTOM = 70;
const MARGIN_SIDE = 54;

const COR_FUNDO = "#FBF7EE"; // papel claro, tom de acervo/biblioteca
const COR_TINTA = "#231F1A";
const COR_ACCENT = "#7A5C2E";
const COR_TITULO = "#1E1A14";
const COR_SPOILER_FUNDO = "#F1E1DC";
const COR_SPOILER_BORDA = "#A85C46";
const COR_EDITORIAL = "#5B3A8E";

// ─────────────────────────────────────────────────────────────────────────────
// FONTES (mesmos arquivos usados pelo PDF cinemático)
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
// PARSER DO DOCUMENTO ENCICLOPÉDICO (texto bruto → capítulos estruturados)
// ─────────────────────────────────────────────────────────────────────────────

const REGEX_BLOCO = /\[SECAO_H1\]([\s\S]*?)\[\/SECAO_H1\]|\[SECAO_H2\]([\s\S]*?)\[\/SECAO_H2\]|\[SECAO_H3\]([\s\S]*?)\[\/SECAO_H3\]|\[PARAGRAFO\]([\s\S]*?)\[\/PARAGRAFO\]|\[CITACAO\]([\s\S]*?)\[\/CITACAO\]|\[AVISO_SPOILER\]([\s\S]*?)\[\/AVISO_SPOILER\]|\[EDITORIAL\]([\s\S]*?)\[\/EDITORIAL\]|\[TABELA_INICIO\]([\s\S]*?)\[TABELA_FIM\]|\[LISTA_INICIO\]([\s\S]*?)\[LISTA_FIM\]/g;

function limparTexto(texto) {
  return String(texto || "").replace(/\s+/g, " ").trim();
}

function parseTabela(corpo) {
  const linhas = String(corpo || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  return linhas.map((linha) => {
    const [campo, ...resto] = linha.split("|");
    return {
      campo: limparTexto(campo),
      valor: limparTexto(resto.join("|")),
    };
  }).filter((linha) => linha.campo);
}

function parseLista(corpo) {
  const linhas = String(corpo || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  return linhas.map((linha) => limparTexto(linha.replace(/^[-•]\s*/, "")));
}

function extrairNos(corpo) {
  const nos = [];
  let ultimoIndice = 0;

  const registrarTextoSolto = (trecho) => {
    const limpo = limparTexto(trecho);
    if (limpo) nos.push({ tipo: "paragrafo", texto: limpo });
  };

  for (const match of String(corpo || "").matchAll(REGEX_BLOCO)) {
    registrarTextoSolto(corpo.slice(ultimoIndice, match.index));

    const [, h1, h2, h3, paragrafo, citacao, aviso, editorial, tabela, lista] = match;

    if (h1 !== undefined) nos.push({ tipo: "h1", texto: limparTexto(h1) });
    else if (h2 !== undefined) nos.push({ tipo: "h2", texto: limparTexto(h2) });
    else if (h3 !== undefined) nos.push({ tipo: "h3", texto: limparTexto(h3) });
    else if (paragrafo !== undefined) nos.push({ tipo: "paragrafo", texto: limparTexto(paragrafo) });
    else if (citacao !== undefined) nos.push({ tipo: "citacao", texto: limparTexto(citacao) });
    else if (aviso !== undefined) nos.push({ tipo: "aviso_spoiler", texto: limparTexto(aviso) });
    else if (editorial !== undefined) nos.push({ tipo: "editorial", texto: limparTexto(editorial) });
    else if (tabela !== undefined) nos.push({ tipo: "tabela", linhas: parseTabela(tabela) });
    else if (lista !== undefined) nos.push({ tipo: "lista", itens: parseLista(lista) });

    ultimoIndice = match.index + match[0].length;
  }

  registrarTextoSolto(String(corpo || "").slice(ultimoIndice));

  return nos.filter((no) => {
    if (no.tipo === "tabela") return no.linhas.length > 0;
    if (no.tipo === "lista") return no.itens.length > 0;
    return Boolean(no.texto);
  });
}

export function parseEnciclopedia(textoBruto) {
  const texto = String(textoBruto || "");
  const capitulos = [];

  const regexCapitulo = /\[CAPITULO_INICIO\]\s*([\s\S]*?)\[CAPITULO_FIM\]/g;

  for (const match of texto.matchAll(regexCapitulo)) {
    const bruto = match[1];
    const quebra = bruto.indexOf("\n");
    const cabecalho = (quebra === -1 ? bruto : bruto.slice(0, quebra)).trim();
    const corpo = quebra === -1 ? "" : bruto.slice(quebra + 1);

    const matchCabecalho = cabecalho.match(/^0*(\d+)\s*[-–—.:]?\s*(.*)$/);
    const numero = matchCabecalho ? matchCabecalho[1].padStart(2, "0") : String(capitulos.length + 1).padStart(2, "0");
    const titulo = matchCabecalho ? limparTexto(matchCabecalho[2]) : limparTexto(cabecalho);

    capitulos.push({
      numero,
      titulo: titulo || `Capítulo ${numero}`,
      nos: extrairNos(corpo),
    });
  }

  return capitulos;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESENHO — elementos recorrentes de página
// ─────────────────────────────────────────────────────────────────────────────

function desenharFundo(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COR_FUNDO);
  doc.restore();
}

function desenharCabecalhoCorrente(doc, tituloObra, rotuloCabecalho = "DOCUMENTO ENCICLOPÉDICO") {
  doc.save();
  doc.font("corpo").fontSize(8).fillColor(COR_ACCENT);
  doc.text(`ESSÊNCIA DOS LIVROS · ${rotuloCabecalho}`, MARGIN_SIDE, 36, {
    width: doc.page.width - MARGIN_SIDE * 2,
    align: "center",
    characterSpacing: 1.2,
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
  // Escrever abaixo de maxY() dispararia a paginação automática do PDFKit
  // (ele acha que o conteúdo não coube e cria uma página em branco). Como
  // isso é só o rodapé, zeramos a margem inferior por um instante.
  const margemInferiorOriginal = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.font("corpoItalico").fontSize(8).fillColor(COR_ACCENT);
  doc.text(`— ${numero} —`, MARGIN_SIDE, doc.page.height - 46, {
    width: doc.page.width - MARGIN_SIDE * 2,
    align: "center",
    lineBreak: false,
  });
  doc.page.margins.bottom = margemInferiorOriginal;
  doc.restore();
}

function desenharFolhaDeRosto(doc, {
  tituloObra,
  autor,
  ano,
  tipoObra,
  subtituloCapa = "Documento Enciclopédico",
  descricaoCapa = "A referência mais completa desta obra — ficha técnica, bastidores, personagens, universo, recepção e a análise editorial sobre por que ela permanece relevante.",
}) {
  const largura = doc.page.width - MARGIN_SIDE * 2;

  doc.y = Math.round(doc.page.height * 0.3);

  doc.font("corpo").fontSize(9).fillColor(COR_ACCENT);
  doc.text("ESSÊNCIA DOS LIVROS", MARGIN_SIDE, doc.y, { width: largura, align: "center", characterSpacing: 3 });
  doc.moveDown(1.4);

  doc.font("tituloBold").fontSize(23).fillColor(COR_TITULO);
  doc.text(String(tituloObra || "").toUpperCase(), { width: largura, align: "center" });
  doc.moveDown(0.6);

  doc.font("corpoItalico").fontSize(10.5).fillColor(COR_ACCENT);
  doc.text(subtituloCapa, { width: largura, align: "center" });
  doc.moveDown(1.8);

  doc.font("corpo").fontSize(9.5).fillColor(COR_TINTA);
  doc.text(
    descricaoCapa,
    { width: largura * 0.85, align: "center", indent: 0 },
  );

  const rodapeInfo = [autor, ano, tipoObra].filter(Boolean).join("  ·  ");
  if (rodapeInfo) {
    doc.moveDown(1.8);
    doc.font("corpo").fontSize(9).fillColor(COR_ACCENT);
    doc.text(rodapeInfo, { width: largura, align: "center" });
  }
}

function desenharIndice(doc, capitulos) {
  doc.font("titulo").fontSize(15).fillColor(COR_TITULO);
  doc.text("Índice", { align: "left" });
  doc.moveDown(0.6);
  doc
    .moveTo(MARGIN_SIDE, doc.y)
    .lineTo(doc.page.width - MARGIN_SIDE, doc.y)
    .lineWidth(0.75)
    .strokeColor(COR_ACCENT)
    .stroke();
  doc.moveDown(0.8);

  capitulos.forEach((capitulo) => {
    doc.font("corpoSemiBold").fontSize(10).fillColor(COR_TINTA);
    doc.text(`${capitulo.numero} — ${capitulo.titulo}`, { align: "left" });
    doc.moveDown(0.45);
  });
}

function desenharParagrafo(doc, texto) {
  doc.font("corpo").fontSize(10.3).fillColor(COR_TINTA);
  doc.text(texto, { align: "justify", lineGap: 1.5 });
  doc.moveDown(0.6);
}

function desenharTitulo(doc, texto, nivel) {
  const estilos = {
    h1: { fonte: "tituloBold", tamanho: 13.5, cor: COR_TITULO, antes: 0.5, depois: 0.4 },
    h2: { fonte: "corpoSemiBold", tamanho: 11.5, cor: COR_TITULO, antes: 0.4, depois: 0.3 },
    h3: { fonte: "corpoSemiBold", tamanho: 10.3, cor: COR_ACCENT, antes: 0.3, depois: 0.25 },
  };
  const estilo = estilos[nivel];

  doc.moveDown(estilo.antes);
  doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor(estilo.cor);
  doc.text(texto, { align: "left" });
  doc.moveDown(estilo.depois);
}

function desenharTabela(doc, linhas) {
  const largura = doc.page.width - MARGIN_SIDE * 2;
  const larguraCampo = largura * 0.34;
  const larguraValor = largura - larguraCampo - 12;

  doc.moveDown(0.2);

  linhas.forEach(({ campo, valor }) => {
    const y = doc.y;
    doc.font("corpoSemiBold").fontSize(9.5).fillColor(COR_ACCENT);
    doc.text(campo, MARGIN_SIDE, y, { width: larguraCampo });
    const yFinalCampo = doc.y;

    doc.font("corpo").fontSize(9.5).fillColor(COR_TINTA);
    doc.text(valor || "—", MARGIN_SIDE + larguraCampo + 12, y, { width: larguraValor });
    const yFinalValor = doc.y;

    doc.y = Math.max(yFinalCampo, yFinalValor);
    doc.moveDown(0.3);
  });

  doc.moveDown(0.4);
}

function desenharLista(doc, itens) {
  const largura = doc.page.width - MARGIN_SIDE * 2 - 14;

  itens.forEach((item) => {
    const y = doc.y;
    doc.font("corpoSemiBold").fontSize(10).fillColor(COR_ACCENT);
    doc.text("•", MARGIN_SIDE, y, { width: 14 });

    doc.font("corpo").fontSize(10.3).fillColor(COR_TINTA);
    doc.text(item, MARGIN_SIDE + 14, y, { width: largura, align: "justify" });
    doc.moveDown(0.35);
  });

  doc.moveDown(0.35);
}

function desenharCitacao(doc, texto) {
  const largura = doc.page.width - MARGIN_SIDE * 2 - 18;
  const yInicio = doc.y;

  doc.font("corpoItalico").fontSize(10.3).fillColor(COR_TINTA);
  doc.text(`“${texto}”`, MARGIN_SIDE + 18, yInicio, { width: largura, align: "left", lineGap: 1.5 });
  const yFim = doc.y;

  doc.save();
  doc.lineWidth(2).strokeColor(COR_ACCENT);
  doc.moveTo(MARGIN_SIDE + 4, yInicio - 2).lineTo(MARGIN_SIDE + 4, yFim + 2).stroke();
  doc.restore();

  doc.moveDown(0.6);
}

function desenharAvisoSpoiler(doc, texto) {
  const largura = doc.page.width - MARGIN_SIDE * 2;
  const padding = 10;

  doc.font("corpoSemiBold").fontSize(9.5);
  const altura = doc.heightOfString(texto, { width: largura - padding * 2 }) + padding * 2;
  const yInicio = doc.y;

  doc.save();
  doc.roundedRect(MARGIN_SIDE, yInicio, largura, altura, 4).fill(COR_SPOILER_FUNDO);
  doc.roundedRect(MARGIN_SIDE, yInicio, largura, altura, 4).lineWidth(1).strokeColor(COR_SPOILER_BORDA).stroke();
  doc.restore();

  doc.font("corpoSemiBold").fontSize(9.5).fillColor(COR_SPOILER_BORDA);
  doc.text(texto, MARGIN_SIDE + padding, yInicio + padding, { width: largura - padding * 2 });

  doc.y = yInicio + altura;
  doc.moveDown(0.6);
}

function desenharEditorial(doc, texto) {
  doc.moveDown(0.3);
  doc.font("corpoSemiBold").fontSize(8.5).fillColor(COR_EDITORIAL);
  doc.text("ESSÊNCIA DOS LIVROS · EDITORIAL", { align: "left", characterSpacing: 1 });
  doc.moveDown(0.25);

  doc.font("corpoItalico").fontSize(10.5).fillColor(COR_EDITORIAL);
  doc.text(texto, { align: "justify", lineGap: 2 });
  doc.moveDown(0.6);
}

function renderizarNo(doc, no) {
  switch (no.tipo) {
    case "h1":
      return desenharTitulo(doc, no.texto, "h1");
    case "h2":
      return desenharTitulo(doc, no.texto, "h2");
    case "h3":
      return desenharTitulo(doc, no.texto, "h3");
    case "tabela":
      return desenharTabela(doc, no.linhas);
    case "lista":
      return desenharLista(doc, no.itens);
    case "citacao":
      return desenharCitacao(doc, no.texto);
    case "aviso_spoiler":
      return desenharAvisoSpoiler(doc, no.texto);
    case "editorial":
      return desenharEditorial(doc, no.texto);
    default:
      return desenharParagrafo(doc, no.texto);
  }
}

function renderizarCapitulo(doc, capitulo) {
  doc.addPage();

  doc.font("corpo").fontSize(8.5).fillColor(COR_ACCENT);
  doc.text(`CAPÍTULO ${capitulo.numero}`, { align: "left", characterSpacing: 1.5 });
  doc.moveDown(0.15);

  doc.font("titulo").fontSize(16).fillColor(COR_TITULO);
  doc.text(capitulo.titulo, { align: "left" });
  doc.moveDown(0.35);

  doc
    .moveTo(MARGIN_SIDE, doc.y)
    .lineTo(doc.page.width - MARGIN_SIDE, doc.y)
    .lineWidth(0.75)
    .strokeColor(COR_ACCENT)
    .stroke();
  doc.moveDown(0.7);

  capitulo.nos.forEach((no) => renderizarNo(doc, no));
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTAGEM DO DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────

export async function criarDocumentoEnciclopedico({ tituloObra, autor, ano, tipoObra, capitulos, marca = {} }) {
  const {
    rotuloCabecalho = "DOCUMENTO ENCICLOPÉDICO",
    subtituloCapa = "Documento Enciclopédico",
    descricaoCapa = "A referência mais completa desta obra — ficha técnica, bastidores, personagens, universo, recepção e a análise editorial sobre por que ela permanece relevante.",
  } = marca;

  const doc = new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_SIDE, right: MARGIN_SIDE },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${tituloObra || "Obra"} — ${subtituloCapa}`,
      Author: "Essência dos Livros",
      Subject: subtituloCapa,
      Creator: "Essence Engine",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finalizado = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  registrarFontes(doc);

  desenharFundo(doc);
  desenharFolhaDeRosto(doc, { tituloObra, autor, ano, tipoObra, subtituloCapa, descricaoCapa });

  doc.on("pageAdded", () => {
    desenharFundo(doc);
    desenharCabecalhoCorrente(doc, tituloObra, rotuloCabecalho);
  });

  doc.addPage();
  desenharIndice(doc, capitulos);

  capitulos.forEach((capitulo) => renderizarCapitulo(doc, capitulo));

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
// ORQUESTRAÇÃO — busca as 5 partes, monta o PDF, sobe pro Storage, atualiza a obra
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

async function buscarParteEnciclopedia(obraId, tipoEtapa) {
  const { data, error } = await supabaseAdmin
    .from("ai_pipeline_etapas")
    .select("saida")
    .eq("obra_id", obraId)
    .eq("tipo_etapa", tipoEtapa)
    .eq("status", "concluido")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar ${tipoEtapa}: ${error.message}`);
  }

  return typeof data?.saida === "string" ? data.saida : null;
}

export async function buscarPartesEnciclopedia(obraId) {
  const partes = await Promise.all(
    PARTES_ENCICLOPEDIA_ORDEM.map((tipoEtapa) => buscarParteEnciclopedia(obraId, tipoEtapa)),
  );

  return PARTES_ENCICLOPEDIA_ORDEM.map((tipoEtapa, indice) => ({ tipoEtapa, texto: partes[indice] }));
}

async function salvarPdfNoStorage({ obraId, tituloArquivo, pdfBuffer }) {
  const nomeArquivo = `${Date.now()}-${slugify(tituloArquivo)}-enciclopedia.pdf`;
  const storagePath = `engine/pdf_enciclopedia/${obraId}/${nomeArquivo}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao salvar PDF enciclopédico no Storage: ${uploadError.message}`);
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
      pdf_enciclopedico_url: assinada.signedUrl,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", obraId);

  if (updateError) {
    throw new Error(`Erro ao atualizar pdf_enciclopedico_url da obra: ${updateError.message}`);
  }

  return { storagePath, signedUrl: assinada.signedUrl };
}

export async function gerarPdfEnciclopedico({ obraId, contexto, beuAtual }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório para gerar o PDF enciclopédico.");
  }

  const partes = await buscarPartesEnciclopedia(obraId);
  const faltantes = partes.filter((parte) => !parte.texto);

  if (faltantes.length > 0) {
    const lista = faltantes.map((parte) => parte.tipoEtapa).join(", ");
    throw new Error(`Faltam partes do documento enciclopédico para montar o PDF: ${lista}. Gere-as antes de montar o PDF.`);
  }

  const textoCompleto = partes.map((parte) => parte.texto).join("\n\n");
  const capitulos = parseEnciclopedia(textoCompleto);

  if (capitulos.length === 0) {
    throw new Error("Não foi possível localizar nenhum capítulo válido no documento enciclopédico gerado.");
  }

  const titulo = contexto?.obra?.titulo || beuAtual?.identificacao?.titulo || "Obra";
  const autor = contexto?.autoria?.autor?.nome || beuAtual?.autoria?.autor_principal || null;
  const ano = contexto?.obra?.data_lancamento
    ? String(contexto.obra.data_lancamento).slice(0, 4)
    : beuAtual?.identificacao?.ano || null;
  const tipoObra = contexto?.obra?.tipo_obra || null;

  const inicio = Date.now();

  engineStep("PDF Enciclopédico", "->", { obraId, capitulos: capitulos.length });

  const pdfBuffer = await criarDocumentoEnciclopedico({
    tituloObra: titulo,
    autor,
    ano,
    tipoObra,
    capitulos,
  });

  const { storagePath, signedUrl } = await salvarPdfNoStorage({
    obraId,
    tituloArquivo: titulo,
    pdfBuffer,
  });

  const fim = Date.now();

  engineStep("PDF Enciclopédico", "ok", {
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
    capitulos: capitulos.length,
  };
}
