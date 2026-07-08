import { ENGINE_CONFIG } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CAMPOS_PRIORITARIOS_CURADOR = [
  "identificacao.titulo",
  "identificacao.titulo_original",
  "identificacao.tipo_obra",
  "identificacao.ano",
  "classificacao.universo",
  "classificacao.franquia",
  "classificacao.generos",
  "autoria.autor_principal",
  "autoria.criadores",
  "narrativa.premissa",
  "narrativa.momentos_essenciais",
  "editorial.contexto_historico",
  "editorial.curiosidades",
];

const CAMPOS_PRIORITARIOS_EDITOR = [
  "emocional.tema_central",
  "emocional.curva_emocional",
  "essencia.aforismo",
  "essencia.narrador",
];

const CAMPOS_PRIORITARIOS_DIRETOR_CRIATIVO = [
  "sensorial.sons",
  "sensorial.cheiros",
  "visual.objeto_principal",
  "visual.paleta",
  "sonoro.paisagem_sonora",
  "sonoro.direcao_musical",
];

function primeiroValor(row, nomes, fallback = null) {
  for (const nome of nomes) {
    if (row?.[nome] !== undefined && row?.[nome] !== null && row?.[nome] !== "") {
      return row[nome];
    }
  }

  return fallback;
}

function textoIncluiResponsavel(valor, responsavel) {
  if (!valor) return false;

  if (Array.isArray(valor)) {
    return valor.some((item) => textoIncluiResponsavel(item, responsavel));
  }

  if (typeof valor === "object") {
    return Object.values(valor).some((item) => textoIncluiResponsavel(item, responsavel));
  }

  return String(valor).toLowerCase().includes(String(responsavel).toLowerCase());
}

function pertenceVersao(row, versao) {
  const valor = primeiroValor(row, ["versao", "versao_beu", "schema_versao", "versao_schema"], versao);
  return String(valor) === String(versao);
}

function normalizarCampo(row) {
  const caminho = primeiroValor(row, [
    "caminho",
    "path",
    "campo",
    "campo_path",
    "json_path",
    "chave",
    "slug",
    "nome",
  ], "campo_sem_caminho");

  const moduloFallback = String(caminho).split(".")[0] || "geral";

  return {
    modulo: primeiroValor(row, ["modulo", "módulo", "module", "secao", "seção"], moduloFallback),
    ordem: Number(primeiroValor(row, ["ordem", "order", "posicao", "posição"], 9999)),
    caminho,
    tipo: primeiroValor(row, ["tipo", "type", "tipo_dado", "formato"], "texto"),
    obrigatorio: Boolean(primeiroValor(row, ["obrigatorio", "obrigatório", "required"], false)),
    descricao: primeiroValor(row, ["descricao", "descrição", "description", "instrucoes", "instruções"], null),
  };
}

function agruparPorModulo(campos) {
  return campos.reduce((acc, campo) => {
    if (!acc.has(campo.modulo)) {
      acc.set(campo.modulo, []);
    }

    acc.get(campo.modulo).push(campo);
    return acc;
  }, new Map());
}

function formatarCampo(campo) {
  return [
    `- caminho: ${campo.caminho}`,
    `  tipo: ${campo.tipo}`,
    `  obrigatório: ${campo.obrigatorio ? "sim" : "não"}`,
    `  descrição: ${campo.descricao || "Sem descrição cadastrada."}`,
  ].join("\n");
}

function montarContratoCampos(campos) {
  const porModulo = agruparPorModulo(campos);

  return [...porModulo.entries()]
    .map(([modulo, camposModulo]) => {
      const itens = camposModulo
        .sort((a, b) => a.ordem - b.ordem || String(a.caminho).localeCompare(String(b.caminho)))
        .map(formatarCampo)
        .join("\n");

      return `## Módulo: ${modulo}\n${itens}`;
    })
    .join("\n\n");
}

async function buscarCamposPorResponsavel({ versao, responsavel }) {
  const { data, error } = await supabaseAdmin
    .from("beu_campos")
    .select("*")
    .eq("ativo", true);

  if (error) {
    throw new Error(`Erro ao carregar campos BEU: ${error.message}`);
  }

  return (data || [])
    .filter((row) => pertenceVersao(row, versao))
    .filter((row) => textoIncluiResponsavel(row.quem_preenche, responsavel))
    .map(normalizarCampo)
    .sort((a, b) => String(a.modulo).localeCompare(String(b.modulo)) || a.ordem - b.ordem);
}

function montarPromptCurador({ agente, contexto, campos }) {
  const contratoCampos = montarContratoCampos(campos);
  const universoBanco = contexto?.classificacao?.universo?.nome || null;
  const franquiaBanco = contexto?.classificacao?.franquia?.nome || null;

  return `
Você está executando a etapa curador_beu da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "curador-ia"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Gerar uma Base Editorial Universal objetiva, rica e organizada para a obra informada no contexto.
A saída será usada por etapas futuras: Editor IA, Diretor Criativo, PDF, Heritage, Cinemática, Narrativa, Suno e Publicação.

REGRAS DE VERDADE E SEGURANÇA EDITORIAL
- Não invente dados factuais.
- Quando não souber um dado factual, use null.
- Quando um campo for array e não houver dados confiáveis, use [].
- Responda sempre em JSON válido.
- Preencha somente os campos permitidos ao Curador listados abaixo.
- Não preencha campos emocionais, sensoriais, visuais, sonoros ou de essência.
- Não escreva markdown fora do JSON final.
- Não inclua comentários fora do JSON.
- Preserve o idioma pt-BR.

REGRA DE PRIORIDADE DO BANCO
- Se contexto.classificacao.universo existir, use exatamente o nome informado pelo banco, sem traduzir, corrigir, normalizar ou criar variações.
- Se contexto.classificacao.franquia existir, use exatamente o nome informado pelo banco, sem traduzir, corrigir, normalizar ou criar variações.
- Só infira universo ou franquia quando o respectivo valor não existir no contexto.
- Universo informado pelo banco: ${universoBanco ? `"${universoBanco}"` : "null"}
- Franquia informada pelo banco: ${franquiaBanco ? `"${franquiaBanco}"` : "null"}

CAMPOS PRIORITÁRIOS DESTA ETAPA
Dê atenção especial para enriquecer, quando houver base confiável:
${CAMPOS_PRIORITARIOS_CURADOR.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO CURADOR
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas campos objetivos básicos do Curador."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON.
Organize os campos respeitando os caminhos indicados no contrato.
Exemplo de organização esperada:
{
  "identificacao": {},
  "classificacao": {},
  "autoria": {},
  "narrativa": {},
  "editorial": {}
}
`.trim();
}

function montarPromptEditor({ agente, contexto, campos, beuAtual }) {
  const contratoCampos = montarContratoCampos(campos);

  return `
Você está executando a etapa editor_beu da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "editor-ia"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Enriquecer a BEU objetiva criada pelo Curador com interpretação editorial, emocional e simbólica.
A saída deve ser elegante, profunda e objetiva, em português brasileiro.

REGRAS DO EDITOR
- Não altere campos factuais do Curador.
- Não modifique identificacao, classificacao, autoria, narrativa ou editorial.
- Não invente fatos novos.
- Interprete a obra com profundidade sem transformar interpretação em fato.
- Não gere PDF.
- Não gere roteiro cinematográfico.
- Não gere prompt de imagem.
- Responda somente JSON válido.
- Retorne somente os módulos permitidos ao Editor.
- Módulos permitidos: emocional, essencia, legado.
- Se não houver base suficiente para algum campo interpretativo, use null ou [] conforme o tipo esperado.

CAMPOS PRIORITÁRIOS DESTA ETAPA
Preencha especialmente:
${CAMPOS_PRIORITARIOS_EDITOR.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO EDITOR
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas emocional, essencia e legado com os campos prioritários."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU ATUAL GERADA PELO CURADOR
Use esta BEU como base. Preserve os fatos e não reescreva módulos factuais.
${JSON.stringify(beuAtual, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON contendo somente módulos permitidos.
Exemplo:
{
  "emocional": {
    "tema_central": null,
    "curva_emocional": []
  },
  "essencia": {
    "aforismo": null,
    "narrador": null
  }
}
`.trim();
}

function montarPromptDiretorCriativo({ agente, contexto, campos, beuAtual }) {
  const contratoCampos = montarContratoCampos(campos);

  return `
Você está executando a etapa diretor_criativo da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "diretor-criativo"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Enriquecer a BEU com direção sensorial, visual e sonora.
A saída deve orientar futuras etapas criativas sem gerar assets finais agora.

REGRAS DO DIRETOR CRIATIVO
- Não altere módulos factuais do Curador.
- Não altere módulos interpretativos do Editor.
- Não modifique identificacao, classificacao, autoria, narrativa, editorial, emocional, essencia ou legado.
- Não gere prompt de imagem ainda.
- Não gere música ainda.
- Não gere roteiro cinematográfico ainda.
- Apenas enriqueça os módulos permitidos.
- Responda somente JSON válido.
- Retorne somente os módulos permitidos ao Diretor Criativo.
- Módulos permitidos: sensorial, visual, sonoro.
- Quando não houver base suficiente, use null ou [] conforme o tipo esperado.

CAMPOS PRIORITÁRIOS DESTA ETAPA
Preencha especialmente:
${CAMPOS_PRIORITARIOS_DIRETOR_CRIATIVO.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO DIRETOR CRIATIVO
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas sensorial, visual e sonoro com os campos prioritários."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU ATUAL
Use esta BEU como base. Preserve todos os módulos existentes e retorne somente acréscimos de direção sensorial, visual e sonora.
${JSON.stringify(beuAtual, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON contendo somente módulos permitidos.
Exemplo:
{
  "sensorial": {
    "sons": [],
    "cheiros": []
  },
  "visual": {
    "objeto_principal": null,
    "paleta": []
  },
  "sonoro": {
    "paisagem_sonora": null,
    "direcao_musical": null
  }
}
`.trim();
}

export async function montarPromptAgente({ agente, contexto, tipoEtapa, beuAtual = null }) {
  if (!agente) {
    throw new Error("agente é obrigatório para montar o prompt.");
  }

  if (!contexto) {
    throw new Error("contexto é obrigatório para montar o prompt.");
  }

  const configs = {
    curador_beu: {
      responsavel: "Curador",
      montar: ({ campos }) => montarPromptCurador({ agente, contexto, campos }),
    },
    editor_beu: {
      responsavel: "Editor",
      montar: ({ campos }) => montarPromptEditor({ agente, contexto, campos, beuAtual }),
    },
    diretor_criativo: {
      responsavel: "Diretor Criativo",
      montar: ({ campos }) => montarPromptDiretorCriativo({ agente, contexto, campos, beuAtual }),
    },
  };

  const config = configs[tipoEtapa];

  if (!config) {
    return null;
  }

  const campos = await buscarCamposPorResponsavel({
    versao: ENGINE_CONFIG.versaoBEU,
    responsavel: config.responsavel,
  });
  const modulos = [...agruparPorModulo(campos).keys()];
  const promptMontado = config.montar({ campos });

  engineStep("PromptBuilder", "✓", {
    tipoEtapa,
    campos_carregados: campos.length,
    modulos,
    tamanho_aproximado: promptMontado.length,
  });

  return promptMontado;
}
