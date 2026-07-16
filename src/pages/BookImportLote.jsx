import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { BUCKETS, uploadToBucket } from "../lib/storage.js";

const STATUS_LABELS = {
  pendente: "Aguardando",
  enviando: "Enviando PDF...",
  processando: "IA analisando...",
  cadastrado: "Cadastrado",
  duplicata: "Possível duplicata",
  erro: "Erro",
};

const STATUS_BADGE_CLASSES = {
  pendente: "bg-white/60 text-[rgb(var(--text-secondary))]",
  enviando: "bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--color-accent-dark))]",
  processando: "bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--color-accent-dark))]",
  cadastrado: "bg-emerald-500/15 text-emerald-700",
  duplicata: "bg-amber-500/15 text-amber-700",
  erro: "bg-red-500/15 text-red-700",
};

let proximoId = 1;

function novoItem(file) {
  return {
    id: proximoId++,
    file,
    status: "pendente",
    livro: null,
    camposParaRevisar: [],
    erro: null,
  };
}

export default function BookImportLotePage() {
  const [itens, setItens] = useState([]);
  const [processandoLote, setProcessandoLote] = useState(false);

  function atualizarItem(id, patch) {
    setItens((atual) => atual.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleSelecionarArquivos(event) {
    const arquivos = Array.from(event.target.files || []).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (arquivos.length !== event.target.files.length) {
      toast.error("Alguns arquivos foram ignorados por não serem PDF.");
    }
    setItens((atual) => [...atual, ...arquivos.map(novoItem)]);
    event.target.value = "";
  }

  function handleRemoverItem(id) {
    setItens((atual) => atual.filter((item) => item.id !== id));
  }

  async function processarItem(item) {
    atualizarItem(item.id, { status: "enviando", erro: null });

    try {
      const storagePath = await uploadToBucket(BUCKETS.pdfs, item.file, {
        prefix: "importacao-lote/",
      });

      atualizarItem(item.id, { status: "processando" });

      const response = await fetch("/api/livros/importar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, nomeArquivo: item.file.name }),
      });

      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Falha ao processar o PDF.");
      }

      if (data.duplicata) {
        atualizarItem(item.id, { status: "duplicata", livro: data.livro });
        return;
      }

      atualizarItem(item.id, {
        status: "cadastrado",
        livro: data.livro,
        camposParaRevisar: data.camposParaRevisar || [],
      });
    } catch (err) {
      atualizarItem(item.id, { status: "erro", erro: err.message || "Falha ao processar o PDF." });
    }
  }

  async function handleProcessarTodos() {
    const pendentes = itens.filter((item) => item.status === "pendente" || item.status === "erro");
    if (!pendentes.length) {
      toast.error("Nenhum arquivo pendente para processar.");
      return;
    }

    setProcessandoLote(true);
    for (const item of pendentes) {
      await processarItem(item);
    }
    setProcessandoLote(false);
    toast.success("Lote processado.");
  }

  const temPendentes = itens.some((item) => item.status === "pendente" || item.status === "erro");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.7)]">
            Biblioteca
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[rgb(var(--text-primary))]">
            Cadastro em lote via PDF
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text-secondary))]">
            Suba um ou mais PDFs (idealmente nomeados como "Título de Autor.pdf") e a IA identifica
            título, autor, gênero e sinopse a partir do nome do arquivo e do conteúdo do PDF,
            cadastrando o livro automaticamente. Campos incertos ficam sinalizados abaixo para
            você revisar depois em "Editar".
          </p>
        </div>
        <Link
          to="/biblioteca/novo"
          className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(var(--surface-card),0.7)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] shadow-sm transition hover:border-[rgba(var(--color-accent-primary),0.4)]"
        >
          Cadastrar um título manualmente
        </Link>
      </div>

      <div className="space-y-6 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.92)] p-6 shadow-[0_35px_80px_-60px_rgba(15,10,35,0.8)]">
        <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
          Selecionar PDFs
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={handleSelecionarArquivos}
            className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--color-accent-dark))] hover:file:bg-[rgba(var(--color-accent-primary),0.25)]"
          />
        </label>

        {itens.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(0,0,0,0.08)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/60 text-xs uppercase tracking-wide text-[rgb(var(--text-secondary))]">
                <tr>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-[220px] truncate px-4 py-3 text-[rgb(var(--text-primary))]" title={item.file.name}>
                      {item.file.name}
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))]">
                      {item.livro?.titulo || "—"}
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))]">
                      {item.livro?.autor_id ? "identificado" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                      {item.status === "cadastrado" && item.camposParaRevisar.length > 0 && (
                        <div className="mt-1 text-xs text-amber-700">
                          revisar: {item.camposParaRevisar.join(", ")}
                        </div>
                      )}
                      {item.status === "erro" && (
                        <div className="mt-1 text-xs text-red-600">{item.erro}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(item.status === "cadastrado" || item.status === "duplicata") && item.livro?.id && (
                          <Link
                            to={`/biblioteca/${item.livro.id}/editar`}
                            className="rounded-xl bg-[rgb(var(--color-accent-primary))] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))]"
                          >
                            {item.status === "duplicata" ? "Ver livro existente" : "Revisar"}
                          </Link>
                        )}
                        {item.status === "erro" && (
                          <button
                            type="button"
                            onClick={() => processarItem(item)}
                            className="rounded-xl border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-primary))] transition hover:border-[rgba(var(--color-accent-primary),0.4)]"
                          >
                            Tentar novamente
                          </button>
                        )}
                        {(item.status === "pendente" || item.status === "erro") && (
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(item.id)}
                            className="rounded-xl border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-secondary))] transition hover:border-red-400 hover:text-red-600"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={handleProcessarTodos}
          disabled={!temPendentes || processandoLote}
          className="rounded-2xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))] disabled:opacity-50"
        >
          {processandoLote ? "Processando..." : "Processar arquivos pendentes"}
        </button>
      </div>
    </div>
  );
}
