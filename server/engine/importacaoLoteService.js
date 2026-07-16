import pdfParse from "pdf-parse";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { ENGINE_CONFIG } from "./engineConfig.js";
import { getOpenAIClient } from "./openaiService.js";

const PDFS_BUCKET = "pdfs";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 anos, mesmo padrão do pdfCinematicaService
const TAMANHO_AMOSTRA_TEXTO = 6000;

function normalizarTituloParaComparacao(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function nomeArquivoSemExtensao(nomeArquivo) {
  const semExtensao = String(nomeArquivo || "").replace(/\.[^./\\]+$/, "");
  return semExtensao.replace(/[_-]+/g, " ").trim();
}

async function extrairAmostraTexto(buffer) {
  try {
    const resultado = await pdfParse(buffer);
    return String(resultado.text || "").slice(0, TAMANHO_AMOSTRA_TEXTO).trim();
  } catch (err) {
    engineStep("Importação em Lote", "!", { etapa: "extrair_texto_pdf", erro: err.message });
    return "";
  }
}

function montarMensagensExtracao({ nomeArquivo, amostraTexto, generosExistentes }) {
  const promptSistema = `Você é um catalogador bibliotecário. Recebe o nome de um arquivo PDF (que costuma trazer "Título de Autor") e uma amostra do texto extraído das primeiras páginas do PDF (capa, ficha catalográfica, orelha). Sua tarefa é identificar os metadados do livro.

Regras:
- Nunca invente fatos. Se não tiver certeza razoável de um campo, retorne null nesse campo e inclua o nome do campo em "campos_incertos".
- "titulo": só o título da obra, sem o nome do autor.
- "autor": nome completo do autor, formatado normalmente (ex.: "Dorothy Tennov"), nunca "Sobrenome, Nome".
- "genero": prefira reaproveitar um destes gêneros já existentes no catálogo quando fizer sentido: ${generosExistentes.join(", ") || "(nenhum cadastrado ainda)"}. Só proponha um gênero novo (em português, uma palavra ou expressão curta, ex.: "Ficção Científica") se nenhum existente encaixar.
- "sinopse": 2-4 frases, só se a amostra de texto tiver conteúdo suficiente para embasar; nunca invente enredo.
- "ano_lancamento": ano de publicação (string, ex.: "1979") só se aparecer explicitamente na amostra.
- Responda SOMENTE um objeto JSON válido, sem texto fora dele, no formato: {"titulo": string|null, "subtitulo": string|null, "autor": string|null, "genero": string|null, "sinopse": string|null, "ano_lancamento": string|null, "campos_incertos": string[]}`;

  const conteudoUsuario = JSON.stringify(
    {
      nome_arquivo: nomeArquivo,
      amostra_texto_pdf: amostraTexto || "(não foi possível extrair texto deste PDF)",
    },
    null,
    2,
  );

  return [
    { role: "system", content: promptSistema },
    { role: "user", content: conteudoUsuario },
  ];
}

async function extrairMetadadosViaOpenAI({ nomeArquivo, amostraTexto, generosExistentes }) {
  const mensagens = montarMensagensExtracao({ nomeArquivo, amostraTexto, generosExistentes });

  const resposta = await getOpenAIClient().chat.completions.create({
    model: ENGINE_CONFIG.modeloDefault,
    temperature: 0.2,
    messages: mensagens,
    response_format: { type: "json_object" },
  });

  const conteudo = resposta.choices?.[0]?.message?.content;
  if (!conteudo) {
    throw new Error("A OpenAI não retornou conteúdo para a extração de metadados.");
  }

  try {
    return JSON.parse(conteudo);
  } catch {
    throw new Error("Resposta da OpenAI não é um JSON válido.");
  }
}

async function encontrarOuCriarAutor(nomeAutor) {
  if (!nomeAutor) return { autorId: null, criado: false };

  const { data: existente, error: buscaError } = await supabaseAdmin
    .from("autores")
    .select("id, nome")
    .ilike("nome", nomeAutor.trim())
    .maybeSingle();

  if (buscaError) throw new Error(`Falha ao buscar autor: ${buscaError.message}`);
  if (existente) return { autorId: existente.id, criado: false };

  const { data: criado, error: criarError } = await supabaseAdmin
    .from("autores")
    .insert({ nome: nomeAutor.trim() })
    .select("id")
    .single();

  if (criarError) throw new Error(`Falha ao criar autor: ${criarError.message}`);
  return { autorId: criado.id, criado: true };
}

async function encontrarOuCriarGenero(nomeGenero) {
  if (!nomeGenero) return { generoId: null, criado: false };

  const { data: existente, error: buscaError } = await supabaseAdmin
    .from("generos")
    .select("id, nome")
    .ilike("nome", nomeGenero.trim())
    .maybeSingle();

  if (buscaError) throw new Error(`Falha ao buscar gênero: ${buscaError.message}`);
  if (existente) return { generoId: existente.id, criado: false };

  const { data: criado, error: criarError } = await supabaseAdmin
    .from("generos")
    .insert({ nome: nomeGenero.trim() })
    .select("id")
    .single();

  if (criarError) throw new Error(`Falha ao criar gênero: ${criarError.message}`);
  return { generoId: criado.id, criado: true };
}

async function encontrarDuplicata(tituloNormalizado) {
  const { data: candidatas, error } = await supabaseAdmin
    .from("livros")
    .select("id, titulo, tipo_obra, status")
    .eq("tipo_obra", "livro")
    .neq("status", "excluido");

  if (error) throw new Error(`Falha ao checar duplicatas: ${error.message}`);

  return (candidatas || []).find(
    (item) => normalizarTituloParaComparacao(item.titulo) === tituloNormalizado,
  ) || null;
}

export async function processarImportacaoPdf({ storagePath, nomeArquivo }) {
  if (!storagePath) throw new Error("storagePath é obrigatório.");
  if (!nomeArquivo) throw new Error("nomeArquivo é obrigatório.");

  engineStep("Importação em Lote", "->", { nomeArquivo, storagePath });

  const { data: arquivoBaixado, error: downloadError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .download(storagePath);

  if (downloadError) {
    throw new Error(`Falha ao baixar o PDF do Storage: ${downloadError.message}`);
  }

  const buffer = Buffer.from(await arquivoBaixado.arrayBuffer());
  const amostraTexto = await extrairAmostraTexto(buffer);

  const { data: generosCadastrados, error: generosError } = await supabaseAdmin
    .from("generos")
    .select("nome")
    .order("nome", { ascending: true });

  if (generosError) throw new Error(`Falha ao listar gêneros: ${generosError.message}`);

  const metadados = await extrairMetadadosViaOpenAI({
    nomeArquivo,
    amostraTexto,
    generosExistentes: (generosCadastrados || []).map((g) => g.nome),
  });

  const tituloFinal = String(metadados.titulo || "").trim() || nomeArquivoSemExtensao(nomeArquivo);
  const tituloNormalizado = normalizarTituloParaComparacao(tituloFinal);

  const duplicata = await encontrarDuplicata(tituloNormalizado);
  if (duplicata) {
    engineStep("Importação em Lote", "ok", { nomeArquivo, duplicata: true, livroId: duplicata.id });
    return {
      ok: true,
      duplicata: true,
      livro: duplicata,
    };
  }

  const [{ autorId }, { generoId }] = await Promise.all([
    encontrarOuCriarAutor(metadados.autor),
    encontrarOuCriarGenero(metadados.genero),
  ]);

  const { data: assinada, error: signError } = await supabaseAdmin.storage
    .from(PDFS_BUCKET)
    .createSignedUrl(storagePath, PDF_SIGNED_URL_TTL_SECONDS);

  if (signError) throw new Error(`Falha ao gerar URL assinada do PDF: ${signError.message}`);

  const camposParaRevisar = Array.isArray(metadados.campos_incertos) ? metadados.campos_incertos : [];
  if (!metadados.titulo) camposParaRevisar.push("titulo");
  if (!autorId) camposParaRevisar.push("autor");
  if (!generoId) camposParaRevisar.push("genero");

  const { data: livro, error: insertError } = await supabaseAdmin
    .from("livros")
    .insert({
      titulo: tituloFinal,
      subtitulo: metadados.subtitulo || null,
      autor_id: autorId,
      genero_id: generoId,
      sinopse: metadados.sinopse || null,
      tipo_obra: "livro",
      status: "ativo",
      pdf_url: assinada.signedUrl,
      data_lancamento: metadados.ano_lancamento ? `${metadados.ano_lancamento}-01-01` : null,
    })
    .select("id, titulo, subtitulo, autor_id, genero_id, sinopse, status")
    .single();

  if (insertError) throw new Error(`Falha ao cadastrar o livro: ${insertError.message}`);

  engineStep("Importação em Lote", "ok", {
    nomeArquivo,
    livroId: livro.id,
    camposParaRevisar: [...new Set(camposParaRevisar)],
  });

  return {
    ok: true,
    duplicata: false,
    livro,
    camposParaRevisar: [...new Set(camposParaRevisar)],
  };
}
