export const NAV_LINKS = [
  {
    id: "dashboard",
    to: "/",
    label: "Panorama",
    shortLabel: "Início",
    description: "Resumo do seu universo literário",
  },
  {
    id: "journeys",
    to: "/jornadas",
    label: "Jornadas",
    shortLabel: "Jornadas",
    description: "Aprenda por objetivo, passo a passo",
  },
  {
    id: "library",
    to: "/biblioteca",
    label: "Biblioteca",
    shortLabel: "Livros",
    description: "Sua estante pessoal e coleções",
  },
  {
    id: "cinematic-memories",
    to: "/memorias-cinematicas",
    label: "Memórias Cinematográficas",
    shortLabel: "Memórias",
    description: "Jornadas sonoras narradas como lembrança",
  },
  {
    id: "mural",
    to: "/mural",
    label: "Mural",
    shortLabel: "Mural",
    description: "Todo o acervo com busca e filtro",
  },
  {
    id: "unexpected-encounter",
    to: "/encontro-inesperado",
    label: "Encontro",
    shortLabel: "Encontro",
    description: "Deixe o acervo escolher você",
  },
  {
    id: "catalog",
    to: "/biblioteca/novo",
    label: "Cadastro de Títulos",
    shortLabel: "Cadastro",
    description: "Inclua rapidamente novos livros, autores e coleções",
  },
  {
    id: "engine",
    to: "/engine",
    label: "Solicitar obra",
    shortLabel: "Solicitar",
    description: "Crie obras com a Essência Engine",
  },
  {
    id: "assistant",
    to: "/assistente",
    label: "Assistente IA",
    shortLabel: "Assistente",
    description: "Converse com a curadoria inteligente",
  },
  {
    id: "settings",
    to: "/configuracoes",
    label: "Configurações",
    shortLabel: "Config",
    description: "Preferências, plano e segurança",
  },
];

export const MOBILE_NAV_ALLOWED_PATHS = [
  "/",
  "/jornadas",
  "/biblioteca",
  "/memorias-cinematicas",
  "/encontro-inesperado",
  "/biblioteca/novo",
  "/engine",
  "/assistente",
];

export const DEFAULT_MOBILE_NAV_PATHS = [
  "/",
  "/jornadas",
  "/biblioteca",
  "/assistente",
];

export const MOBILE_NAV_LINKS = NAV_LINKS.filter((link) => MOBILE_NAV_ALLOWED_PATHS.includes(link.to));

export function sanitizeMobileNavSelection(selection) {
  if (!Array.isArray(selection)) {
    return [];
  }
  const allowedSet = new Set(MOBILE_NAV_ALLOWED_PATHS);
  return MOBILE_NAV_ALLOWED_PATHS.filter((path) => allowedSet.has(path) && selection.includes(path));
}

export function normalizeMobileNavSelection(selection) {
  const sanitized = sanitizeMobileNavSelection(selection);
  if (sanitized.length > 0) {
    return sanitized;
  }
  return DEFAULT_MOBILE_NAV_PATHS;
}
