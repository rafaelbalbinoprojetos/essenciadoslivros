import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getBookReviews, getMyReview, upsertReview, deleteReview } from "../services/reviews.js";

function StarsInput({ value, onChange, size = "h-8 w-8" }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            className="text-[rgb(var(--color-accent-primary))] transition hover:scale-110"
          >
            <Star className={size} fill={filled ? "currentColor" : "none"} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}

function StarsDisplay({ value, size = "h-4 w-4" }) {
  return (
    <div className="flex gap-0.5 text-[rgb(var(--color-accent-primary))]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={size} fill={Math.round(value) >= n ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function BookReviews({ bookId }) {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [hasMine, setHasMine] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email || "").split("@")[0];

  const load = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const [agg, mine] = await Promise.all([getBookReviews(bookId), getMyReview(user?.id, bookId)]);
      setData(agg);
      if (mine) {
        setNota(Number(mine.nota) || 0);
        setComentario(mine.comentario || "");
        setHasMine(true);
      } else {
        setHasMine(false);
      }
    } catch (err) {
      console.error("[BookReviews] erro:", err);
    } finally {
      setLoading(false);
    }
  }, [bookId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!nota) {
      toast.error("Escolha de 1 a 5 estrelas.");
      return;
    }
    setBusy(true);
    try {
      await upsertReview(user?.id, bookId, { nota, comentario, usuarioNome: displayName });
      toast.success(hasMine ? "Avaliação atualizada!" : "Obrigado pela sua avaliação!");
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Não foi possível salvar a avaliação.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await deleteReview(user?.id, bookId);
      setNota(0);
      setComentario("");
      toast.success("Avaliação removida.");
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  };

  const others = data.reviews.filter((r) => r.usuario_id !== user?.id);

  return (
    <section className="space-y-5 rounded-[28px] border border-[rgba(var(--color-accent-primary),0.16)] bg-[rgba(var(--surface-card),0.85)] p-6 backdrop-blur">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[rgb(var(--text-primary))]">Avaliações</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">O que a comunidade achou desta obra.</p>
        </div>
        {data.count > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-semibold text-[rgb(var(--text-primary))]">{data.average.toFixed(1)}</span>
            <div>
              <StarsDisplay value={data.average} />
              <p className="text-xs text-[rgb(var(--text-subtle))]">{data.count} avaliaç{data.count === 1 ? "ão" : "ões"}</p>
            </div>
          </div>
        )}
      </header>

      {/* Sua avaliação */}
      <div className="rounded-2xl border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgba(var(--surface-base),0.5)] p-5">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{hasMine ? "Sua avaliação" : "Avalie esta obra"}</p>
        <div className="mt-3">
          <StarsInput value={nota} onChange={setNota} />
        </div>
        <textarea
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Escreva um comentário (opcional)…"
          className="mt-3 w-full resize-none rounded-2xl border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgba(var(--surface-card),0.8)] px-4 py-2.5 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-subtle))] focus:border-[rgba(var(--color-accent-primary),0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.2)]"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))] disabled:opacity-60"
          >
            {busy ? "Salvando…" : hasMine ? "Atualizar avaliação" : "Enviar avaliação"}
          </button>
          {hasMine && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="text-sm font-semibold text-[rgb(var(--text-subtle))] transition hover:text-rose-500 disabled:opacity-60"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {/* Lista da comunidade */}
      {loading ? (
        <p className="text-sm text-[rgb(var(--text-secondary))]">Carregando avaliações…</p>
      ) : others.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-subtle))]">
          {data.count === 0 ? "Seja o primeiro a avaliar esta obra." : "Nenhum outro comentário ainda."}
        </p>
      ) : (
        <div className="space-y-3">
          {others.map((r) => (
            <div key={r.id} className="flex gap-3 rounded-2xl border border-[rgba(var(--color-accent-primary),0.1)] p-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[rgb(var(--color-accent-primary))] text-sm font-semibold text-white">
                {initials(r.usuario_nome)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{r.usuario_nome || "Leitor Essência"}</p>
                  <span className="text-xs text-[rgb(var(--text-subtle))]">{formatDate(r.criado_em)}</span>
                </div>
                <StarsDisplay value={Number(r.nota) || 0} />
                {r.comentario && <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))]">{r.comentario}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
