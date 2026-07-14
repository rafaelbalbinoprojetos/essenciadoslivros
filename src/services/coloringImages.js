import { supabase } from "../lib/supabase.js";
import { BUCKETS } from "../lib/storage.js";

const EXTENSOES_IMAGEM = new Set(["png", "jpg", "jpeg", "webp"]);

function extensao(nome = "") {
  const ponto = nome.lastIndexOf(".");
  return ponto >= 0 ? nome.slice(ponto + 1).toLowerCase() : "";
}

function tituloAPartirDoNome(nome = "") {
  return nome
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

async function listarEntradas(caminho) {
  const { data, error } = await supabase.storage.from(BUCKETS.imagensColorir).list(caminho, {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  return data || [];
}

// O bucket "imagems_colorir" pode ter imagens soltas na raiz ou organizadas em
// subpastas por categoria (ex.: "Fantasia/dragao.png") — o Storage devolve
// pastas como entradas sem "id"/"metadata" num list() raso, então usamos isso
// pra decidir se descemos mais um nível ou tratamos como arquivo direto.
export async function listarImagensParaColorir() {
  const entradasRaiz = await listarEntradas("");
  const imagens = [];

  for (const entrada of entradasRaiz) {
    const ehPasta = !entrada.id;

    if (ehPasta) {
      const arquivosDaPasta = await listarEntradas(entrada.name);
      for (const arquivo of arquivosDaPasta) {
        if (!EXTENSOES_IMAGEM.has(extensao(arquivo.name))) continue;
        const caminho = `${entrada.name}/${arquivo.name}`;
        const { data } = supabase.storage.from(BUCKETS.imagensColorir).getPublicUrl(caminho);
        imagens.push({
          id: caminho,
          title: tituloAPartirDoNome(arquivo.name),
          category: tituloAPartirDoNome(entrada.name),
          url: data?.publicUrl ?? null,
        });
      }
      continue;
    }

    if (!EXTENSOES_IMAGEM.has(extensao(entrada.name))) continue;
    const { data } = supabase.storage.from(BUCKETS.imagensColorir).getPublicUrl(entrada.name);
    imagens.push({
      id: entrada.name,
      title: tituloAPartirDoNome(entrada.name),
      category: "Geral",
      url: data?.publicUrl ?? null,
    });
  }

  return imagens.filter((imagem) => imagem.url);
}
