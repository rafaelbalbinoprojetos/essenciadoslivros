export const ETAPAS_PIPELINE = [
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
