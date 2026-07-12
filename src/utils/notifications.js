const TIPO_OBRA_LABELS = {
  livro: "Livro",
  filme: "Filme",
  jogo: "Jogo",
  anime: "Anime",
  serie: "Série",
  dorama: "Dorama",
  biografia: "Biografia",
  tecnico: "Livro técnico",
};

export function formatTipoObra(tipo) {
  if (!tipo) return "Obra";
  const chave = String(tipo).toLowerCase();
  return TIPO_OBRA_LABELS[chave] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

export function formatAddedAgo(dateString) {
  const added = new Date(dateString);
  if (Number.isNaN(added.getTime())) return "";

  const diffDias = Math.floor((Date.now() - added.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias <= 0) return "Adicionada hoje";
  if (diffDias === 1) return "Adicionada ontem";
  return `Adicionada há ${diffDias} dias`;
}
