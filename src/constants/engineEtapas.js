// Trilha narrativa: obras de ficção/história (livro, filme, jogo, anime,
// série, dorama, biografia) — passam pela narrativa cinematográfica, capas
// Heritage/cinemática e o PDF cinemático.
export const ETAPAS_PIPELINE_NARRATIVA = [
  "curador_beu",
  "editor_beu",
  "diretor_criativo",
  "narrativa_cinematica",
  "heritage_prompt",
  "heritage_image",
  "capa_cinematica_prompt",
  "capa_cinematica_image",
  "pdf_cinematica",
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
  "enciclopedia_pdf",
];

// Trilha conceitual/técnica: obras de não-ficção (tipo_obra = "tecnico") —
// em vez da narrativa cinematográfica, produz o Guia Editorial Essência
// (análise conceitual + resumo autoral), em 3 partes + PDF.
export const ETAPAS_PIPELINE_TECNICO = [
  "curador_beu",
  "editor_beu",
  "diretor_criativo",
  "guia_editorial_parte1",
  "guia_editorial_parte2",
  "guia_editorial_parte3",
  "guia_editorial_pdf",
  "enciclopedia_parte1",
  "enciclopedia_parte2",
  "enciclopedia_parte3",
  "enciclopedia_parte4",
  "enciclopedia_parte5",
  "enciclopedia_pdf",
];

export function etapasPipelinePorTipo(tipoObra) {
  return tipoObra === "tecnico" ? ETAPAS_PIPELINE_TECNICO : ETAPAS_PIPELINE_NARRATIVA;
}

// União das duas trilhas — usada por telas que listam obras de tipos
// diferentes lado a lado (ex.: tabela do processamento em lote). Cada obra
// só preenche a fatia relevante ao seu próprio tipo_obra; o resto fica "—".
export const ETAPAS_PIPELINE = [...new Set([...ETAPAS_PIPELINE_NARRATIVA, ...ETAPAS_PIPELINE_TECNICO])];

export const ETAPA_LABELS = {
  curador_beu: "Curador",
  editor_beu: "Editor",
  diretor_criativo: "Diretor Criativo",
  narrativa_cinematica: "Narrativa Cinematográfica",
  narrativa_cinematica_icn: "Narrativa — Índice de Complexidade (ICN)",
  narrativa_cinematica_blueprint: "Narrativa — Blueprint",
  narrativa_cinematica_consolidacao: "Narrativa — Consolidação",
  heritage_prompt: "Prompt Heritage",
  heritage_image: "Imagem Heritage",
  capa_cinematica_prompt: "Prompt Capa Cinemática",
  capa_cinematica_image: "Imagem Cinemática",
  pdf_cinematica: "PDF Cinemático",
  guia_editorial_parte1: "Guia Editorial — Parte 1 (Apresentação, Panorama Histórico, Grande Questão, Grandes Princípios)",
  guia_editorial_parte2: "Guia Editorial — Parte 2 (Conexões, Além da Obra, Aplicações, Estudos de Caso)",
  guia_editorial_parte3: "Guia Editorial — Parte 3 (Laboratório Essência, Comparando Ideias, Leituras Cruzadas, Modelo Mental, Conclusão)",
  guia_editorial_pdf: "Guia Editorial — Montar PDF Final",
  enciclopedia_parte1: "Enciclopédia — Parte 1 (Ficha Técnica, Apresentação, Visão Geral)",
  enciclopedia_parte2: "Enciclopédia — Parte 2 (Narrativa Completa, Personagens, Universo)",
  enciclopedia_parte3: "Enciclopédia — Parte 3 (Criação da Obra, Equipe, Direção Artística, Trilha Sonora, Módulo Específico)",
  enciclopedia_parte4: "Enciclopédia — Parte 4 (Curiosidades, Easter Eggs, Impacto Cultural, Recepção, Premiações, Dados Comerciais)",
  enciclopedia_parte5: "Enciclopédia — Parte 5 (Por que Entrou para a História, Essência da Obra, Fontes)",
  enciclopedia_pdf: "Enciclopédia — Montar PDF Final",
  atualizar_dados: "Salvar/Atualizar dados da obra",
};

export const ETAPA_LABELS_CURTOS = {
  curador_beu: "Curador",
  editor_beu: "Editor",
  diretor_criativo: "Diretor",
  narrativa_cinematica: "Narrativa",
  heritage_prompt: "H. Prompt",
  heritage_image: "H. Imagem",
  capa_cinematica_prompt: "C. Prompt",
  capa_cinematica_image: "C. Imagem",
  pdf_cinematica: "PDF",
  guia_editorial_parte1: "Guia 1",
  guia_editorial_parte2: "Guia 2",
  guia_editorial_parte3: "Guia 3",
  guia_editorial_pdf: "Guia PDF",
  enciclopedia_parte1: "Encicl. 1",
  enciclopedia_parte2: "Encicl. 2",
  enciclopedia_parte3: "Encicl. 3",
  enciclopedia_parte4: "Encicl. 4",
  enciclopedia_parte5: "Encicl. 5",
  enciclopedia_pdf: "Encicl. PDF",
};

export function labelEtapa(tipoEtapa) {
  return ETAPA_LABELS[tipoEtapa] || tipoEtapa;
}

// narrativa_cinematica é gerada em várias chamadas HTTP sequenciais (ICN,
// Blueprint, um bloco de prosa por vez) para nunca estourar o timeout do
// serverless function. Esta função descreve, para o usuário, em qual fase
// dessa sequência a geração está agora.
export function descreverFaseNarrativa(progresso) {
  if (!progresso) return null;
  if (progresso.fase === "icn") return "analisando complexidade (ICN)...";
  if (progresso.fase === "blueprint") return "planejando cenas (Blueprint)...";
  if (progresso.fase === "bloco" && progresso.progresso) {
    return `gerando bloco ${progresso.progresso.blocoAtual}/${progresso.progresso.totalBlocos}...`;
  }
  return "em andamento...";
}
