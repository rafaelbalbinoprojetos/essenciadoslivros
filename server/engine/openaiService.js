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

  return `O CONVITE

Narração seca
Esta não é a história inteira.
É apenas aquilo que ainda retorna quando tudo fica em silêncio.
Talvez seja pouco.
Talvez seja exatamente o que restou.

Aforismo
Há mundos que não terminam quando viramos a última página.
Eles apenas aprendem a viver dentro da memória.

[music drops away completely]

[silence]

[lower voice]

Se possível...

utilize fones de ouvido.

[music drops away completely]

[silence]

O mundo fala através de uma porta entreaberta.

ESSÊNCIA DOS LIVROS APRESENTA...

${tituloApresentacao}

[music drops away completely]

[long silence]


[CENA 01 — EMOÇÃO: CONTEMPLAÇÃO / SAUDADE]
ESTILO SUNO: Melancholic Warm Ambient Score, Nostalgic Soft Atmosphere, Aching Beauty, Slow Fading Warmth, No Ticking Rhythms, No Drums, No Constant Pulse
Intenção dramática: iniciar a experiência como uma lembrança que ainda não sabe se quer ser contada
Símbolo central: a porta

Houve um tempo em que esta história ainda não tinha se tornado memória.

Acho que era só uma mudança no ar.

Nada acontecia por alguns instantes.

Só havia luz parada, madeira antiga e um silêncio que parecia esperar por alguém.

Talvez seja assim que as grandes histórias começam.

Não com grandeza.

Com uma pequena abertura.

[long silence]


[CENA 02 — EMOÇÃO: ESPERANÇA CAUTELOSA]
ESTILO SUNO: Fragile Rising Warmth, Tentative Light Atmosphere, Small Brave Glow, Hope as Whisper Not Shout, No Ticking Rhythms, No Drums, No Constant Pulse
Intenção dramática: revelar que toda jornada começa antes da coragem parecer possível
Símbolo central: o primeiro passo

Anos depois, o que permanece não é a sequência exata dos acontecimentos.

Permanece a sensação.

O instante em que o mundo pareceu maior do que antes.

Se não me falha a memória, havia algo simples ali.

Um som baixo.

Um cheiro de caminho.

Uma espécie de esperança cautelosa, como quem ainda não sabe se merece atravessar a própria porta.

[silence]

E talvez ninguém saiba.`;
}

function criarHeritagePromptMock({ contexto }) {
  const titulo = contexto?.obra?.titulo || "Obra sem título";

  return `Vertical premium museum editorial composition for “${titulo}”, Heritage Collection aesthetic, a central symbolic artifact presented as a preserved historical object, surrounded by restrained archival evidence, aged paper, dark wood, oxidized metal, subtle handwritten notes, catalog labels and an elegant museum plaque at the bottom, warm directional gallery lighting, natural shadows, tactile microtextures, balanced visual hierarchy, sophisticated serif typography, historically respectful atmosphere, photorealistic materials, high detail, frontal composition, no copied cover art, no protected logos, no celebrity likeness, no invented factual text, no digital interface, no amateur collage, no illegible typography.`;
}

function criarCapaCinematicaPromptMock({ contexto }) {
  const titulo = contexto?.obra?.titulo || "Obra sem título";

  return `Vertical cinematic memory cover for “${titulo}”, one emotionally dominant scene, a single symbolic object as the focal point, restrained human presence, atmospheric depth, subtle volumetric light, tactile environment, visual silence, melancholic warmth, carefully controlled palette, premium cinematic photography, strong readability at thumbnail size, memory rather than plot summary, no montage, no copied poster art, no official logos, no actor likeness, no generic streaming aesthetic, no excessive text, no unrelated fantasy elements.`;
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
    heritage_prompt: () => criarHeritagePromptMock({ contexto }),
    capa_cinematica_prompt: () => criarCapaCinematicaPromptMock({ contexto }),
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
