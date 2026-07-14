import { useEffect, useState } from "react";
import ColoridorEssencia from "../components/ColoridorEssencia.jsx";
import { listarImagensParaColorir } from "../services/coloringImages.js";

const PALETA_ESSENCIA = ["#c9a84c", "#8B2FC9", "#4A90D9", "#2ECC71", "#E74C3C", "#E8C547"];

export default function EssenciaEmCoresPage() {
  const [imagens, setImagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const lista = await listarImagensParaColorir();
        if (ativo) setImagens(lista);
      } catch (erroCarregamento) {
        if (ativo) setErro(erroCarregamento.message || "Erro ao carregar as imagens do Essência em Cores.");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-[#c9a84c]">
        Carregando Essência em Cores…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center text-red-300">
        {erro}
      </div>
    );
  }

  return (
    <ColoridorEssencia
      images={imagens}
      palette={PALETA_ESSENCIA}
      onSave={(dataUrl, imageId) => {
        console.log("[Essência em Cores] desenho exportado", { imageId, tamanhoBase64: dataUrl.length });
      }}
    />
  );
}
