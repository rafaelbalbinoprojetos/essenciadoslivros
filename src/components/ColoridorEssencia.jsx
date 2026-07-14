import { useCallback, useEffect, useRef, useState } from "react";

const TONS_NEUTROS = ["#FFFFFF", "#E5E5E5", "#C4C4C4", "#9B9B9B", "#6B6B6B", "#3A3A3A", "#1A1A1A", "#000000"];

const LIMITE_HISTORICO = 30;
const LIMITE_CORES_RECENTES = 8;
const TOLERANCIA_PADRAO = 30;
const OPACIDADE_PADRAO = 100;
const LIMIAR_CONTORNO = 60;
const LARGURA_MAXIMA = 900;
const ALTURA_MAXIMA = 700;
const ZOOM_MINIMO = 0.5;
const ZOOM_MAXIMO = 3;
const ZOOM_PASSO = 0.1;

function hexParaRgb(hex) {
  const limpo = String(hex || "#ffffff").replace("#", "");
  const normalizado = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo;
  const inteiro = parseInt(normalizado, 16) || 0;
  return [(inteiro >> 16) & 255, (inteiro >> 8) & 255, inteiro & 255];
}

function ehContornoEscuro(r, g, b) {
  return r < LIMIAR_CONTORNO && g < LIMIAR_CONTORNO && b < LIMIAR_CONTORNO;
}

function preencherBalde(imageData, largura, altura, inicioX, inicioY, corHex, tolerancia, opacidade = 100) {
  const data = imageData.data;
  const idxInicial = (inicioY * largura + inicioX) * 4;
  const r0 = data[idxInicial];
  const g0 = data[idxInicial + 1];
  const b0 = data[idxInicial + 2];
  const a0 = data[idxInicial + 3];

  if (ehContornoEscuro(r0, g0, b0)) return false;

  const [fr, fg, fb] = hexParaRgb(corHex);
  const fa = Math.round((Math.min(Math.max(opacidade, 0), 100) / 100) * 255);

  if (Math.abs(r0 - fr) <= 2 && Math.abs(g0 - fg) <= 2 && Math.abs(b0 - fb) <= 2 && Math.abs(a0 - fa) <= 2) {
    return false;
  }

  const visitado = new Uint8Array(largura * altura);
  const pilha = [[inicioX, inicioY]];

  while (pilha.length > 0) {
    const [x, y] = pilha.pop();
    if (x < 0 || x >= largura || y < 0 || y >= altura) continue;

    const pos = y * largura + x;
    if (visitado[pos]) continue;

    const idx = pos * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (ehContornoEscuro(r, g, b)) continue;

    if (
      Math.abs(r - r0) > tolerancia ||
      Math.abs(g - g0) > tolerancia ||
      Math.abs(b - b0) > tolerancia ||
      Math.abs(a - a0) > tolerancia
    ) {
      continue;
    }

    visitado[pos] = 1;
    data[idx] = fr;
    data[idx + 1] = fg;
    data[idx + 2] = fb;
    data[idx + 3] = fa;

    pilha.push([x + 1, y]);
    pilha.push([x - 1, y]);
    pilha.push([x, y + 1]);
    pilha.push([x, y - 1]);
  }

  return true;
}

export default function ColoridorEssencia({ images = [], palette = [], onSave = () => {} }) {
  const canvasRef = useRef(null);
  const arquivoInputRef = useRef(null);
  const historicoRef = useRef([]);
  const refazerRef = useRef([]);
  const desenhandoRef = useRef(false);
  const ultimoPontoRef = useRef(null);

  const [imagemAtual, setImagemAtual] = useState(null);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [ferramenta, setFerramenta] = useState("balde");
  const [tamanhoPincel, setTamanhoPincel] = useState(18);
  const [tolerancia, setTolerancia] = useState(TOLERANCIA_PADRAO);
  const [opacidade, setOpacidade] = useState(OPACIDADE_PADRAO);
  const [cor, setCor] = useState(palette[0] || "#c9a84c");
  const [coresRecentes, setCoresRecentes] = useState([]);
  const [podeDesfazer, setPodeDesfazer] = useState(false);
  const [podeRefazer, setPodeRefazer] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dimensaoCanvas, setDimensaoCanvas] = useState({ width: 0, height: 0 });

  const registrarCorRecente = useCallback((novaCor) => {
    setCoresRecentes((atual) => {
      const semDuplicata = atual.filter((c) => c.toLowerCase() !== novaCor.toLowerCase());
      return [novaCor, ...semDuplicata].slice(0, LIMITE_CORES_RECENTES);
    });
  }, []);

  const selecionarCor = useCallback((novaCor) => {
    setCor(novaCor);
    registrarCorRecente(novaCor);
  }, [registrarCorRecente]);

  const salvarHistorico = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    historicoRef.current.push(snapshot);
    if (historicoRef.current.length > LIMITE_HISTORICO) {
      historicoRef.current.shift();
    }
    refazerRef.current = [];
    setPodeDesfazer(true);
    setPodeRefazer(false);
  }, []);

  const desfazer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historicoRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");

    const atual = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const anterior = historicoRef.current.pop();

    refazerRef.current.push(atual);
    ctx.putImageData(anterior, 0, 0);

    setPodeDesfazer(historicoRef.current.length > 0);
    setPodeRefazer(true);
  }, []);

  const refazer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || refazerRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");

    const atual = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const proximo = refazerRef.current.pop();

    historicoRef.current.push(atual);
    if (historicoRef.current.length > LIMITE_HISTORICO) {
      historicoRef.current.shift();
    }
    ctx.putImageData(proximo, 0, 0);

    setPodeDesfazer(true);
    setPodeRefazer(refazerRef.current.length > 0);
  }, []);

  const desenharImagemNoCanvas = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const proporcao = Math.min(LARGURA_MAXIMA / img.width, ALTURA_MAXIMA / img.height, 1);
    const largura = Math.max(1, Math.round(img.width * proporcao));
    const altura = Math.max(1, Math.round(img.height * proporcao));

    canvas.width = largura;
    canvas.height = altura;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(img, 0, 0, largura, altura);

    historicoRef.current = [];
    refazerRef.current = [];
    setPodeDesfazer(false);
    setPodeRefazer(false);
    setCarregando(false);
    setDimensaoCanvas({ width: largura, height: altura });
    setZoom(1);
  }, []);

  const aplicarZoom = useCallback((delta) => {
    setZoom((atual) => Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Number((atual + delta).toFixed(2)))));
  }, []);

  const aumentarZoom = useCallback(() => aplicarZoom(ZOOM_PASSO), [aplicarZoom]);
  const diminuirZoom = useCallback(() => aplicarZoom(-ZOOM_PASSO), [aplicarZoom]);
  const resetarZoom = useCallback(() => setZoom(1), []);

  // Ctrl/Cmd + scroll ajusta o zoom; scroll sozinho continua rolando a área
  // (útil pra navegar pela imagem quando ela está maior que o contêiner).
  const aoRolarNoCanvas = useCallback((event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    aplicarZoom(event.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO);
  }, [aplicarZoom]);

  const carregarImagem = useCallback((src, origemExterna) => {
    setCarregando(true);
    const img = new Image();
    if (origemExterna) img.crossOrigin = "anonymous";
    img.onload = () => desenharImagemNoCanvas(img);
    img.onerror = () => {
      setCarregando(false);
      window.alert("Não foi possível carregar essa imagem. Verifique a URL ou as permissões de CORS do armazenamento.");
    };
    img.src = src;
  }, [desenharImagemNoCanvas]);

  const abrirImagemDaGaleria = useCallback((imagem) => {
    setImagemAtual(imagem);
    setGaleriaAberta(false);
    carregarImagem(imagem.url, true);
  }, [carregarImagem]);

  const abrirSeletorDeArquivo = useCallback(() => {
    arquivoInputRef.current?.click();
  }, []);

  const aoSelecionarArquivo = useCallback((event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      setImagemAtual({ id: `upload-${Date.now()}`, title: arquivo.name, category: "Upload", url: leitor.result });
      carregarImagem(leitor.result, false);
    };
    leitor.readAsDataURL(arquivo);
    event.target.value = "";
  }, [carregarImagem]);

  const obterPosicaoNoCanvas = useCallback((event) => {
    const canvas = canvasRef.current;
    const retangulo = canvas.getBoundingClientRect();
    const escalaX = canvas.width / retangulo.width;
    const escalaY = canvas.height / retangulo.height;

    const ponteiro = event.touches ? event.touches[0] : event;
    const x = Math.floor((ponteiro.clientX - retangulo.left) * escalaX);
    const y = Math.floor((ponteiro.clientY - retangulo.top) * escalaY);

    return {
      x: Math.min(Math.max(x, 0), canvas.width - 1),
      y: Math.min(Math.max(y, 0), canvas.height - 1),
    };
  }, []);

  const desenharTraco = useCallback((de, para, corAtual, aplicarOpacidade) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tamanhoPincel;
    ctx.strokeStyle = corAtual;
    ctx.globalAlpha = aplicarOpacidade ? opacidade / 100 : 1;

    ctx.beginPath();
    ctx.moveTo(de.x, de.y);
    ctx.lineTo(para.x, para.y);
    ctx.stroke();

    if (de.x === para.x && de.y === para.y) {
      ctx.beginPath();
      ctx.arc(para.x, para.y, tamanhoPincel / 2, 0, Math.PI * 2);
      ctx.fillStyle = corAtual;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [tamanhoPincel, opacidade]);

  const aoClicarNoCanvas = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas || !imagemAtual && !canvas.width) return;

    const posicao = obterPosicaoNoCanvas(event);

    if (ferramenta === "balde") {
      const ctx = canvas.getContext("2d");
      salvarHistorico();
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const mudou = preencherBalde(imageData, canvas.width, canvas.height, posicao.x, posicao.y, cor, tolerancia, opacidade);
      if (mudou) {
        ctx.putImageData(imageData, 0, 0);
      } else {
        historicoRef.current.pop();
        setPodeDesfazer(historicoRef.current.length > 0);
      }
      return;
    }

    salvarHistorico();
    desenhandoRef.current = true;
    ultimoPontoRef.current = posicao;
    desenharTraco(posicao, posicao, ferramenta === "borracha" ? "#ffffff" : cor, ferramenta !== "borracha");
  }, [ferramenta, cor, tolerancia, opacidade, imagemAtual, obterPosicaoNoCanvas, salvarHistorico, desenharTraco]);

  const aoMoverNoCanvas = useCallback((event) => {
    if (!desenhandoRef.current || ferramenta === "balde") return;
    event.preventDefault();

    const posicao = obterPosicaoNoCanvas(event);
    const anterior = ultimoPontoRef.current || posicao;

    desenharTraco(anterior, posicao, ferramenta === "borracha" ? "#ffffff" : cor, ferramenta !== "borracha");
    ultimoPontoRef.current = posicao;
  }, [ferramenta, cor, obterPosicaoNoCanvas, desenharTraco]);

  const aoSoltarNoCanvas = useCallback(() => {
    desenhandoRef.current = false;
    ultimoPontoRef.current = null;
  }, []);

  useEffect(() => {
    const finalizar = () => {
      desenhandoRef.current = false;
      ultimoPontoRef.current = null;
    };
    window.addEventListener("mouseup", finalizar);
    window.addEventListener("touchend", finalizar);
    return () => {
      window.removeEventListener("mouseup", finalizar);
      window.removeEventListener("touchend", finalizar);
    };
  }, []);

  // Ctrl+Z / Cmd+Z desfaz; Ctrl+Shift+Z, Cmd+Shift+Z ou Ctrl+Y refaz.
  useEffect(() => {
    const aoTeclar = (event) => {
      const modificador = event.ctrlKey || event.metaKey;
      if (!modificador) return;

      const tecla = event.key.toLowerCase();
      if (tecla === "z" && event.shiftKey) {
        event.preventDefault();
        refazer();
      } else if (tecla === "z") {
        event.preventDefault();
        desfazer();
      } else if (tecla === "y") {
        event.preventDefault();
        refazer();
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [desfazer, refazer]);

  const limparParaOriginal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagemAtual) return;

    salvarHistorico();
    const img = new Image();
    if (typeof imagemAtual.url === "string" && imagemAtual.url.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => desenharImagemNoCanvas(img);
    img.src = imagemAtual.url;
  }, [imagemAtual, salvarHistorico, desenharImagemNoCanvas]);

  const exportarPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${imagemAtual?.title || "colorido-essencia"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onSave(dataUrl, imagemAtual?.id ?? null);
  }, [imagemAtual, onSave]);

  const dicaFerramenta = {
    balde: "Balde: clique numa área fechada pra preencher com a cor selecionada. Contornos escuros seguram a tinta.",
    pincel: "Pincel: clique e arraste pra pintar livremente. Ajuste o tamanho no controle deslizante.",
    borracha: "Borracha: clique e arraste pra apagar de volta ao branco.",
  }[ferramenta] + " · Ctrl/Cmd + scroll ou os botões de zoom aproximam a imagem.";

  const cursorDoCanvas = ferramenta === "balde" ? "pointer" : "crosshair";

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f] text-[#e8e2d0]">
      <input
        ref={arquivoInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={aoSelecionarArquivo}
        className="hidden"
      />

      <header className="flex items-center justify-between border-b border-[#c9a84c]/25 bg-black/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-[0.2em] text-[#c9a84c]">ESSÊNCIA DOS LIVROS</span>
          <span className="hidden text-sm text-[#e8e2d0]/50 sm:inline">Essência em Cores</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGaleriaAberta(true)}
            className="rounded-lg border border-[#c9a84c]/40 px-4 py-2 text-sm font-medium text-[#c9a84c] transition hover:bg-[#c9a84c]/10"
          >
            Galeria
          </button>
          <button
            type="button"
            onClick={abrirSeletorDeArquivo}
            className="rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:brightness-110"
          >
            Upload
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <aside className="flex flex-row flex-wrap gap-4 rounded-2xl border border-[#c9a84c]/15 bg-black/30 p-4 lg:w-56 lg:flex-col">
          <div className="flex gap-2 lg:flex-col">
            {[
              { id: "balde", label: "Balde" },
              { id: "pincel", label: "Pincel" },
              { id: "borracha", label: "Borracha" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFerramenta(item.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  ferramenta === item.id
                    ? "border-[#c9a84c] bg-[#c9a84c]/15 text-[#c9a84c]"
                    : "border-[#c9a84c]/20 text-[#e8e2d0]/70 hover:border-[#c9a84c]/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {ferramenta !== "balde" && (
            <div className="min-w-[140px] flex-1 lg:flex-none">
              <label className="mb-1 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">
                Tamanho: {tamanhoPincel}px
              </label>
              <input
                type="range"
                min={2}
                max={60}
                value={tamanhoPincel}
                onChange={(event) => setTamanhoPincel(Number(event.target.value))}
                className="w-full accent-[#c9a84c]"
              />
            </div>
          )}

          {ferramenta === "balde" && (
            <div className="min-w-[140px] flex-1 lg:flex-none">
              <label className="mb-1 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">
                Tolerância: {tolerancia}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={tolerancia}
                onChange={(event) => setTolerancia(Number(event.target.value))}
                className="w-full accent-[#c9a84c]"
              />
            </div>
          )}

          {ferramenta !== "borracha" && (
            <div className="min-w-[140px] flex-1 lg:flex-none">
              <label className="mb-1 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">
                Opacidade: {opacidade}%
              </label>
              <input
                type="range"
                min={5}
                max={100}
                value={opacidade}
                onChange={(event) => setOpacidade(Number(event.target.value))}
                className="w-full accent-[#c9a84c]"
              />
            </div>
          )}

          <div className="min-w-[140px] flex-1 lg:flex-none">
            <label className="mb-1 flex items-center gap-1 text-xs uppercase tracking-widest text-[#e8e2d0]/50">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={diminuirZoom}
                disabled={zoom <= ZOOM_MINIMO}
                className="flex-1 rounded-lg border border-[#c9a84c]/20 py-1 text-sm text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40 disabled:opacity-30"
              >
                −
              </button>
              <button
                type="button"
                onClick={resetarZoom}
                className="flex-1 rounded-lg border border-[#c9a84c]/20 py-1 text-xs text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40"
              >
                100%
              </button>
              <button
                type="button"
                onClick={aumentarZoom}
                disabled={zoom >= ZOOM_MAXIMO}
                className="flex-1 rounded-lg border border-[#c9a84c]/20 py-1 text-sm text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-2 lg:flex-col">
            <button
              type="button"
              onClick={desfazer}
              disabled={!podeDesfazer}
              className="rounded-lg border border-[#c9a84c]/20 px-3 py-2 text-sm text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40 disabled:opacity-30"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={refazer}
              disabled={!podeRefazer}
              className="rounded-lg border border-[#c9a84c]/20 px-3 py-2 text-sm text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40 disabled:opacity-30"
            >
              Refazer
            </button>
            <button
              type="button"
              onClick={limparParaOriginal}
              disabled={!imagemAtual}
              className="rounded-lg border border-[#c9a84c]/20 px-3 py-2 text-sm text-[#e8e2d0]/80 transition hover:border-[#c9a84c]/40 disabled:opacity-30"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={exportarPng}
              disabled={!imagemAtual}
              className="rounded-lg bg-[#c9a84c] px-3 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:brightness-110 disabled:opacity-30"
            >
              Exportar PNG
            </button>
          </div>
        </aside>

        <main
          onWheel={aoRolarNoCanvas}
          className="relative flex flex-1 items-center justify-center overflow-auto rounded-2xl border border-[#c9a84c]/15 bg-black/20 p-6"
        >
          {!imagemAtual && !carregando && (
            <div className="text-center text-[#e8e2d0]/50">
              <p className="text-lg">Escolha uma obra na galeria ou envie uma imagem pra começar</p>
            </div>
          )}
          {carregando && <p className="text-[#c9a84c]">Carregando imagem…</p>}
          <canvas
            ref={canvasRef}
            onMouseDown={aoClicarNoCanvas}
            onMouseMove={aoMoverNoCanvas}
            onMouseUp={aoSoltarNoCanvas}
            onTouchStart={aoClicarNoCanvas}
            onTouchMove={aoMoverNoCanvas}
            onTouchEnd={aoSoltarNoCanvas}
            style={{
              cursor: cursorDoCanvas,
              display: imagemAtual || carregando ? "block" : "none",
              width: dimensaoCanvas.width ? dimensaoCanvas.width * zoom : undefined,
              height: dimensaoCanvas.height ? dimensaoCanvas.height * zoom : undefined,
              flexShrink: 0,
            }}
            className="rounded-xl border-2 border-[#c9a84c]/40 bg-white shadow-[0_0_40px_rgba(201,168,76,0.15)]"
          />
        </main>

        <aside className="flex flex-col gap-4 rounded-2xl border border-[#c9a84c]/15 bg-black/30 p-4 lg:w-56">
          <div>
            <span className="mb-2 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">Cor atual</span>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border-2 border-[#c9a84c]/40"
                style={{ backgroundColor: cor }}
              />
              <input
                type="color"
                value={cor}
                onChange={(event) => selecionarCor(event.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-[#c9a84c]/30 bg-transparent"
              />
            </div>
          </div>

          {palette.length > 0 && (
            <div>
              <span className="mb-2 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">Paleta temática</span>
              <div className="grid grid-cols-5 gap-2">
                {palette.map((corItem) => (
                  <button
                    key={corItem}
                    type="button"
                    onClick={() => selecionarCor(corItem)}
                    title={corItem}
                    style={{ backgroundColor: corItem }}
                    className={`h-8 w-8 rounded-md border-2 transition ${
                      cor.toLowerCase() === corItem.toLowerCase() ? "border-[#c9a84c] scale-110" : "border-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="mb-2 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">Tons neutros</span>
            <div className="grid grid-cols-5 gap-2">
              {TONS_NEUTROS.map((corItem) => (
                <button
                  key={corItem}
                  type="button"
                  onClick={() => selecionarCor(corItem)}
                  title={corItem}
                  style={{ backgroundColor: corItem }}
                  className={`h-8 w-8 rounded-md border-2 transition ${
                    cor.toLowerCase() === corItem.toLowerCase() ? "border-[#c9a84c] scale-110" : "border-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {coresRecentes.length > 0 && (
            <div>
              <span className="mb-2 block text-xs uppercase tracking-widest text-[#e8e2d0]/50">Recentes</span>
              <div className="grid grid-cols-5 gap-2">
                {coresRecentes.map((corItem, indice) => (
                  <button
                    key={`${corItem}-${indice}`}
                    type="button"
                    onClick={() => selecionarCor(corItem)}
                    title={corItem}
                    style={{ backgroundColor: corItem }}
                    className={`h-8 w-8 rounded-md border-2 transition ${
                      cor.toLowerCase() === corItem.toLowerCase() ? "border-[#c9a84c] scale-110" : "border-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="border-t border-[#c9a84c]/15 bg-black/40 px-6 py-3 text-center text-sm text-[#e8e2d0]/60">
        {dicaFerramenta}
      </footer>

      {galeriaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#c9a84c]/30 bg-[#0a0a0f] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#c9a84c]">Galeria de obras</h2>
              <button
                type="button"
                onClick={() => setGaleriaAberta(false)}
                className="rounded-lg border border-[#c9a84c]/30 px-3 py-1 text-sm text-[#e8e2d0]/70 hover:bg-[#c9a84c]/10"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((imagem) => (
                <button
                  key={imagem.id}
                  type="button"
                  onClick={() => abrirImagemDaGaleria(imagem)}
                  className="group overflow-hidden rounded-xl border border-[#c9a84c]/20 bg-black/30 text-left transition hover:border-[#c9a84c]/50"
                >
                  <div className="aspect-square w-full overflow-hidden bg-white">
                    <img
                      src={imagem.url}
                      alt={imagem.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-[#e8e2d0]">{imagem.title}</p>
                    <p className="truncate text-xs text-[#e8e2d0]/50">{imagem.category}</p>
                  </div>
                </button>
              ))}
              {images.length === 0 && (
                <p className="col-span-full py-8 text-center text-[#e8e2d0]/50">Nenhuma imagem disponível na galeria.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
