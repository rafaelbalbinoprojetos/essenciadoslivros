export const NAV_LINKS = [
  {
    id: "dashboard",
    to: "/",
    label: "Panorama",
    shortLabel: "Início",
    description: "Resumo do seu universo literário",
  },
  {
    id: "library",
    to: "/biblioteca",
    label: "Biblioteca",
    shortLabel: "Livros",
    description: "Sua estante pessoal e coleções",
  },
  {
    id: "reading",
    to: "/leituras",
    label: "Leituras",
    shortLabel: "Leituras",
    description: "Sessões, progresso e hábitos",
  },
  {
    id: "summaries",
    to: "/resumos",
    label: "Resumos",
    shortLabel: "Resumos",
    description: "Resumos rápidos e detalhados",
  },
  {
    id: "audio",
    to: "/audiobooks",
    label: "Audiobooks",
    shortLabel: "Áudio",
    description: "Escute narrativas e insights",
  },
  {
    id: "discover",
    to: "/descobertas",
    label: "Descobertas",
    shortLabel: "Explorar",
    description: "Sugestões da IA para próximos passos",
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
  "/biblioteca",
  "/leituras",
  "/resumos",
  "/audiobooks",
  "/descobertas",
  "/assistente",
];

export const DEFAULT_MOBILE_NAV_PATHS = [
  "/",
  "/biblioteca",
  "/leituras",
  "/resumos",
  "/audiobooks",
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
