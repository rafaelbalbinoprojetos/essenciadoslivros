import { supabaseAdmin } from "./supabaseAdmin.js";

function isEmptyValue(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function normalizarTexto(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function primeiroValor(...values) {
  return values.find((value) => !isEmptyValue(value)) ?? null;
}

function valorNome(value) {
  if (isEmptyValue(value)) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return primeiroValor(value.nome, value.name, value.titulo, value.title);
  }
  return null;
}

function primeiroNomeLista(value) {
  if (!Array.isArray(value)) return valorNome(value);

  for (const item of value) {
    const nome = valorNome(item);
    if (nome) return nome;
  }

  return null;
}

function extrairAno(value) {
  const match = String(value || "").match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sem-nome";
}

// universos e franquias têm coluna slug obrigatória (not null); autores e
// generos não. Passe comSlug: true só para as tabelas que exigem.
async function buscarOuCriarPorNome({ tabela, nome, comSlug = false }) {
  const nomeLimpo = nome?.trim();
  if (!nomeLimpo) return null;

  const { data: existentes, error: selectError } = await supabaseAdmin
    .from(tabela)
    .select("id, nome");

  if (selectError) {
    throw new Error(`Erro ao buscar ${tabela}: ${selectError.message}`);
  }

  const normalizado = normalizarTexto(nomeLimpo);
  const existente = (existentes || []).find((item) => normalizarTexto(item.nome) === normalizado);

  if (existente?.id) {
    return existente.id;
  }

  const novoRegistro = comSlug
    ? { nome: nomeLimpo, slug: slugify(nomeLimpo) }
    : { nome: nomeLimpo };

  const { data, error } = await supabaseAdmin
    .from(tabela)
    .insert(novoRegistro)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao criar ${tabela}: ${error.message}`);
  }

  return data.id;
}

function adicionarCampoSeVazio({ livro, payload, atualizados, campo, valor }) {
  if (!(campo in livro)) return;
  if (!isEmptyValue(livro[campo])) return;
  if (isEmptyValue(valor)) return;

  payload[campo] = valor;
  atualizados.push(campo);
}

export async function atualizarDadosAusentesDaObra({ obraId, beu }) {
  if (!obraId) {
    throw new Error("obraId é obrigatório.");
  }

  if (!beu) {
    throw new Error("BEU é obrigatória para atualizar dados ausentes.");
  }

  const { data: livro, error } = await supabaseAdmin
    .from("livros")
    .select("*")
    .eq("id", obraId)
    .single();

  if (error || !livro) {
    throw new Error(`Obra não encontrada: ${error?.message || obraId}`);
  }

  const payload = {};
  const atualizados = [];

  adicionarCampoSeVazio({
    livro,
    payload,
    atualizados,
    campo: "subtitulo",
    valor: beu.identificacao?.subtitulo,
  });

  adicionarCampoSeVazio({
    livro,
    payload,
    atualizados,
    campo: "sinopse",
    valor: primeiroValor(
      beu.narrativa?.premissa,
      beu.editorial?.resumo_editorial,
      beu.editorial?.contexto_historico,
    ),
  });

  const ano = primeiroValor(beu.identificacao?.ano, beu.identificacao?.data_lancamento);
  const anoExtraido = extrairAno(ano);
  adicionarCampoSeVazio({
    livro,
    payload,
    atualizados,
    campo: "data_lancamento",
    valor: anoExtraido ? `${anoExtraido}-01-01` : null,
  });

  if ("autor_id" in livro && isEmptyValue(livro.autor_id)) {
    const nomeAutor = primeiroValor(
      valorNome(beu.autoria?.autor_principal),
      valorNome(beu.autoria?.autor),
      primeiroNomeLista(beu.autoria?.criadores),
    );
    const autorId = nomeAutor ? await buscarOuCriarPorNome({ tabela: "autores", nome: nomeAutor }) : null;
    adicionarCampoSeVazio({ livro, payload, atualizados, campo: "autor_id", valor: autorId });
  }

  if ("genero_id" in livro && isEmptyValue(livro.genero_id)) {
    const nomeGenero = primeiroValor(
      primeiroNomeLista(beu.classificacao?.generos),
      valorNome(beu.classificacao?.genero),
    );
    const generoId = nomeGenero ? await buscarOuCriarPorNome({ tabela: "generos", nome: nomeGenero }) : null;
    adicionarCampoSeVazio({ livro, payload, atualizados, campo: "genero_id", valor: generoId });
  }

  if ("universo_id" in livro && isEmptyValue(livro.universo_id)) {
    const nomeUniverso = valorNome(beu.classificacao?.universo);
    const universoId = nomeUniverso ? await buscarOuCriarPorNome({ tabela: "universos", nome: nomeUniverso, comSlug: true }) : null;
    adicionarCampoSeVazio({ livro, payload, atualizados, campo: "universo_id", valor: universoId });
  }

  if ("franquia_id" in livro && isEmptyValue(livro.franquia_id)) {
    const nomeFranquia = valorNome(beu.classificacao?.franquia);
    const franquiaId = nomeFranquia ? await buscarOuCriarPorNome({ tabela: "franquias", nome: nomeFranquia, comSlug: true }) : null;
    adicionarCampoSeVazio({ livro, payload, atualizados, campo: "franquia_id", valor: franquiaId });
  }

  adicionarCampoSeVazio({
    livro,
    payload,
    atualizados,
    campo: "descricao_cinematica",
    valor: beu.capa_cinematica?.frase_curatorial,
  });

  // Uma obra processada pela Engine deixa de ser rascunho e passa a aparecer
  // na coleção. Só promove rascunho/vazio para ativo — nunca sobrescreve um
  // status definido manualmente (ex: arquivado, excluido).
  if ("status" in livro && (isEmptyValue(livro.status) || livro.status === "rascunho")) {
    payload.status = "ativo";
    atualizados.push("status");
  }

  if (atualizados.length === 0) {
    return {
      atualizado: false,
      campos_atualizados: [],
      livro,
      mensagem: "Nenhum campo vazio elegível foi encontrado para atualização.",
    };
  }

  const { data: livroAtualizado, error: updateError } = await supabaseAdmin
    .from("livros")
    .update(payload)
    .eq("id", obraId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`Erro ao atualizar obra: ${updateError.message}`);
  }

  return {
    atualizado: true,
    campos_atualizados: atualizados,
    payload_aplicado: payload,
    livro: livroAtualizado,
    mensagem: "Dados ausentes atualizados sem sobrescrever campos preenchidos.",
  };
}
