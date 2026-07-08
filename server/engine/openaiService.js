/* global process */

import OpenAI from "openai";
import { ENGINE_CONFIG, isEngineMockEnabled } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

function extrairNomeAutor(contexto) {
  return contexto?.autoria?.autor?.nome || "Autoria não informada";
}

function criarBEUMock({ contexto, agente }) {
  const obra = contexto?.obra || {};
  const classificacao = contexto?.classificacao || {};
  const titulo = obra.titulo || "Obra sem título";
  const tipoObra = obra.tipo_obra || "livro";

  return {
    identificacao: {
      titulo,
      subtitulo: obra.subtitulo || null,
      tipo_obra: tipoObra,
      idioma_base: "pt-BR",
      versao_beu: ENGINE_CONFIG.versaoBEU,
      fonte: "engine_mock",
    },
    classificacao: {
      genero: classificacao.genero?.nome || null,
      colecao: classificacao.colecao?.nome || null,
      universo: classificacao.universo?.nome || null,
      franquia: classificacao.franquia?.nome || null,
    },
    autoria: {
      autor: extrairNomeAutor(contexto),
      papel_autoral: "Autor ou criador principal da obra",
    },
    narrativa: {
      premissa:
        obra.sinopse ||
        `Base editorial mockada para validar a pipeline da obra "${titulo}" sem consumir tokens da OpenAI.`,
      conflito_central:
        "Conflito central gerado em modo mock para validar persistência, execução e rastreabilidade da Engine.",
      temas: [
        "memória",
        "jornada",
        "transformação",
        "legado",
      ],
      personagens_principais: [],
      arco_emocional: [
        "convite",
        "descoberta",
        "conflito",
        "revelação",
        "legado",
      ],
    },
    editorial: {
      tom: "curatorial, objetivo e premium",
      promessa_editorial:
        "Transformar a obra em uma base reutilizável para PDF, narrativa cinematográfica, capas, Suno e metadados.",
      publico_alvo:
        "Leitores e exploradores culturais interessados em experiências editoriais guiadas por IA.",
      usos_previstos: [
        "pdf_editorial",
        "narrativa_cinematografica",
        "capas",
        "suno",
        "metadados",
      ],
    },
    metadados_engine: {
      agente: agente?.slug || "curador-ia",
      modelo: "mock-engine",
      gerado_em: new Date().toISOString(),
      mock: true,
    },
  };
}

function criarEditorMock({ contexto, agente }) {
  const titulo = contexto?.obra?.titulo || "esta obra";

  return {
    emocional: {
      tema_central:
        `A travessia interior de ${titulo}: uma leitura sobre amadurecimento, pertencimento e coragem diante do desconhecido.`,
      curva_emocional: [
        "chamado",
        "hesitação",
        "descoberta",
        "perda de inocência",
        "retorno transformado",
      ],
    },
    essencia: {
      aforismo:
        "Toda jornada verdadeira começa quando o conforto deixa de ser suficiente.",
      narrador:
        "Uma voz curatorial serena, literária e retrospectiva, capaz de observar a aventura como memória e símbolo.",
    },
    metadados_engine: {
      agente: agente?.slug || "editor-ia",
      modelo: "mock-engine",
      gerado_em: new Date().toISOString(),
      mock: true,
    },
  };
}

function criarDiretorCriativoMock({ contexto, agente }) {
  const titulo = contexto?.obra?.titulo || "esta obra";

  return {
    sensorial: {
      sons: [
        "passos sobre terra úmida",
        "vento atravessando paisagens abertas",
        "crepitar distante de fogo",
      ],
      cheiros: [
        "madeira antiga",
        "terra depois da chuva",
        "papel envelhecido",
      ],
    },
    visual: {
      objeto_principal: `Um artefato simbólico ligado à jornada de ${titulo}.`,
      paleta: [
        "dourado envelhecido",
        "verde musgo",
        "marrom couro",
        "cinza pedra",
      ],
    },
    sonoro: {
      paisagem_sonora:
        "Uma ambiência orgânica e contemplativa, com espaços de silêncio, textura de natureza e sensação de jornada antiga.",
      direcao_musical:
        "Cordas discretas, sopros graves e percussão leve, evitando triunfo explícito e privilegiando memória, travessia e descoberta.",
    },
    metadados_engine: {
      agente: agente?.slug || "diretor-criativo",
      modelo: "mock-engine",
      gerado_em: new Date().toISOString(),
      mock: true,
    },
  };
}

function criarNarrativaCinematicaMock({ contexto }) {
  const titulo = contexto?.obra?.titulo || "A Obra";
  const tituloApresentacao = String(titulo).toUpperCase();

  return `[CENA 01 — EMOÇÃO: CONTEMPLAÇÃO / SAUDADE]

ESTILO SUNO
[Brazilian Portuguese, reflective cinematic narration, slow strings, distant piano, nostalgic ambience, silence]

[Intenção dramática: abrir a experiência como uma lembrança que retorna devagar]
[Símbolo central: a porta]

Houve um tempo em que esta história ainda não tinha se tornado memória.

Ela era apenas um chamado discreto... uma mudança no ar... a sensação de que algo antigo estava prestes a atravessar a vida de alguém.

[long silence]

ESSÊNCIA DOS LIVROS APRESENTA... ${tituloApresentacao}


[CENA 02 — EMOÇÃO: ESPERANÇA CAUTELOSA]

ESTILO SUNO
[Brazilian Portuguese, restrained hopeful narration, soft warm background enters, gentle piano, quiet strings, lower voice]

[Intenção dramática: revelar que toda jornada começa antes da coragem parecer possível]
[Símbolo central: o primeiro passo]

Anos depois, o que permanece não é a sequência exata dos acontecimentos.

Permanece a sensação.

O instante em que o mundo pareceu maior do que antes... e alguém, sem saber se estava pronto, começou a caminhar.`;
}

function criarConteudoUsuario({ contexto, schema, promptMontado }) {
  if (promptMontado) return promptMontado;

  return JSON.stringify(
    {
      contexto,
      schema,
      instrucoes: {
        idioma: "pt-BR",
        formato: "JSON válido",
        nao_inventar_fatos: true,
      },
    },
    null,
    2,
  );
}

function criarMensagens({ agente, contexto, schema, promptMontado }) {
  return [
    {
      role: "system",
      content: agente.prompt_sistema,
    },
    {
      role: "user",
      content: criarConteudoUsuario({ contexto, schema, promptMontado }),
    },
  ];
}

async function executarChatCompletions({ agente, contexto, schema, promptMontado }) {
  const modelo = agente.modelo || ENGINE_CONFIG.modeloDefault;
  const temperatura = Number(agente.temperatura ?? 0.3);
  const mensagens = criarMensagens({ agente, contexto, schema, promptMontado });
  const saidaTextual = agente.formato_saida === "text";
  const inicio = Date.now();

  const resposta = await getOpenAIClient().chat.completions.create({
    model: modelo,
    temperature: temperatura,
    messages: mensagens,
    ...(saidaTextual ? {} : { response_format: { type: "json_object" } }),
  });

  const fim = Date.now();
  const conteudo = resposta.choices?.[0]?.message?.content;

  if (!conteudo) {
    throw new Error("A OpenAI não retornou conteúdo.");
  }

  if (saidaTextual) {
    return {
      saida: conteudo,
      modelo,
      provider: "openai",
      modo: "chat_completions",
      tempo_ms: fim - inicio,
      tokens_input: resposta.usage?.prompt_tokens ?? null,
      tokens_output: resposta.usage?.completion_tokens ?? null,
      tokens_total: resposta.usage?.total_tokens ?? null,
      resposta_bruta: conteudo,
    };
  }

  let json;

  try {
    json = JSON.parse(conteudo);
  } catch {
    throw new Error("Resposta da OpenAI não é um JSON válido.");
  }

  return {
    saida: json,
    modelo,
    provider: "openai",
    modo: "chat_completions",
    tempo_ms: fim - inicio,
    tokens_input: resposta.usage?.prompt_tokens ?? null,
    tokens_output: resposta.usage?.completion_tokens ?? null,
    tokens_total: resposta.usage?.total_tokens ?? null,
    resposta_bruta: conteudo,
  };
}

async function executarMock({ agente, contexto, tipoEtapa }) {
  engineStep(agente?.nome || agente?.slug || "Agente IA", "→", { modo: "mock", tipoEtapa });
  engineStep("Mock", "✓", "OpenAI não será chamada nesta execução.");

  const saida = {
    editor_beu: () => criarEditorMock({ contexto, agente }),
    diretor_criativo: () => criarDiretorCriativoMock({ contexto, agente }),
    narrativa_cinematica: () => criarNarrativaCinematicaMock({ contexto, agente }),
  }[tipoEtapa]?.() ?? criarBEUMock({ contexto, agente });

  return {
    saida,
    modelo: "mock-engine",
    provider: "mock",
    modo: "mock",
    tempo_ms: 0,
    tokens_input: 0,
    tokens_output: 0,
    tokens_total: 0,
    resposta_bruta: typeof saida === "string" ? saida : JSON.stringify(saida),
  };
}

export async function executarAgenteOpenAI({
  agente,
  contexto,
  schema = null,
  modo = "chat_completions",
  promptMontado = null,
  tipoEtapa = null,
}) {
  if (!agente) {
    throw new Error("Agente é obrigatório.");
  }

  if (!contexto) {
    throw new Error("Contexto é obrigatório.");
  }

  if (isEngineMockEnabled()) {
    return executarMock({ agente, contexto, tipoEtapa });
  }

  if (modo !== "chat_completions") {
    throw new Error(`Modo OpenAI ainda não implementado: ${modo}`);
  }

  engineStep(agente?.nome || agente?.slug || "Agente IA", "→", {
    modo,
    modelo: agente.modelo || ENGINE_CONFIG.modeloDefault,
    prompt_montado: Boolean(promptMontado),
  });

  return executarChatCompletions({ agente, contexto, schema, promptMontado });
}
