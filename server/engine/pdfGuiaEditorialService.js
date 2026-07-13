import { engineStep } from "./engineLogger.js";
import { criarDocumentoEnciclopedico, parseEnciclopedia } from "./pdfEnciclopediaService.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const PDFS_BUCKET = "pdfs";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 anos

const PARTES_GUIA_EDITORIAL_ORDEM = [
  "guia_editorial_parte1",
  "guia_editorial_parte2",
  "guia_editorial_parte3",
];

const MARCA_GUIA_EDITORIAL = {
  rotuloCabecalho: "GUIA EDITORIAL ESSÊNCIA",
  subtituloCapa: "Guia Editorial Essência",
  descricaoCapa: "Uma publicação editorial original que expande, contextualiza e conecta as grandes ideias desta obra — para enriquecer a leitura, nunca substituí-la.",
};

function slugify(value = "obra") {
  return String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "obra";
}

async function buscarParteGuiaEditorial(obraId, tipoEtapa) {
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

export async function buscarPartesGuiaEditorial(obraId) {
  const partes = await Promise.all(
    PARTES_GUIA_EDITORIAL_ORDEM.map((tipoEtapa) => buscarParteGuiaEditorial(obraId, tipoEtapa)),
  );

  return PARTES_GUIA_EDITORIAL_ORDEM.map((tipoEtapa, indice) => ({ tipoEtapa, texto: partes[indice] }));
}

async function salvarPdfNoStorage({ obraId, tituloArquivo, pdfBuffer }) {
  const nomeArquivo = `${Date.now()}-${slugify(tituloArquivo)}-guia-editorial.pdf`;
  const storagePath = `engine/pdf_guia_editorial/${obraId}/${nomeArquivo}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao salvar PDF do Guia Editorial no Storage: ${uploadError.message}`);
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
      pdf_guia_editorial_url: assinada.signedUrl,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", obraId);

  if (updateError) {
    throw new Error(`Erro ao atualizar pdf_guia_editorial_url da obra: ${updateError.message}`);
  }

  return { storagePath, signedUrl: assinada.signedUrl };
}

export async function gerarPdfGuiaEditorial({ obraId, contexto, beuAtual }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório para gerar o PDF do Guia Editorial.");
  }

  const partes = await buscarPartesGuiaEditorial(obraId);
  const faltantes = partes.filter((parte) => !parte.texto);

  if (faltantes.length > 0) {
    const lista = faltantes.map((parte) => parte.tipoEtapa).join(", ");
    throw new Error(`Faltam partes do Guia Editorial para montar o PDF: ${lista}. Gere-as antes de montar o PDF.`);
  }

  const textoCompleto = partes.map((parte) => parte.texto).join("\n\n");
  const capitulos = parseEnciclopedia(textoCompleto);

  if (capitulos.length === 0) {
    throw new Error("Não foi possível localizar nenhum capítulo válido no Guia Editorial gerado.");
  }

  const titulo = contexto?.obra?.titulo || beuAtual?.identificacao?.titulo || "Obra";
  const autor = contexto?.autoria?.autor?.nome || beuAtual?.autoria?.autor_principal || null;
  const ano = contexto?.obra?.data_lancamento
    ? String(contexto.obra.data_lancamento).slice(0, 4)
    : beuAtual?.identificacao?.ano || null;
  const tipoObra = contexto?.obra?.tipo_obra || null;

  const inicio = Date.now();

  engineStep("PDF Guia Editorial", "->", { obraId, capitulos: capitulos.length });

  const pdfBuffer = await criarDocumentoEnciclopedico({
    tituloObra: titulo,
    autor,
    ano,
    tipoObra,
    capitulos,
    marca: MARCA_GUIA_EDITORIAL,
  });

  const { storagePath, signedUrl } = await salvarPdfNoStorage({
    obraId,
    tituloArquivo: titulo,
    pdfBuffer,
  });

  const fim = Date.now();

  engineStep("PDF Guia Editorial", "ok", {
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
