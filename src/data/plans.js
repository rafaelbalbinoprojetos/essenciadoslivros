export const DEFAULT_PLAN_ID = "premium";

export const PLAN_DETAILS = {
  basic: {
    id: "basic",
    name: "Coleção Essencial",
    shortName: "Essencial",
    description: "Ideal para criar sua biblioteca pessoal, guardar notas e acompanhar resumos selecionados.",
    price: 7.9,
    currency: "BRL",
    highlight: false,
    reason: "Assinatura Essência dos Livros Essencial",
    trialDays: 7,
    features: [
      "Biblioteca pessoal ilimitada com categorias, filtros e coleções",
      "Resumos rápidos da curadoria Essência atualizados semanalmente",
      "Notas, destaques e progresso sincronizados em todos os dispositivos",
      "Download de resumos em PDF para leitura offline",
    ],
  },
  premium: {
    id: "premium",
    name: "Coleção Prisma",
    shortName: "Prisma",
    description: "Experiência completa com IA literária, audiobooks premium e recomendações personalizadas.",
    price: 13.9,
    currency: "BRL",
    highlight: true,
    reason: "Assinatura Essência dos Livros Prisma",
    trialDays: 7,
    features: [
      "Resumos inteligentes em múltiplos formatos (rápidos, detalhados, insights e quizzes IA)",
      "Audiobooks premium com sincronização de tempo de escuta e download temporário",
      "Assistente literário ilimitado com recomendações de leitura e roteiros personalizados",
      "Coleções colaborativas, atualizações exclusivas e acesso antecipado a novos títulos",
      "Prioridade em suporte e roadmap, além de integrações com ferramentas de produtividade",
    ],
  },
};

export const PLAN_LIST = Object.values(PLAN_DETAILS);
