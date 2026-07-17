import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { getMyReview, upsertReview } from "../services/reviews.js";

/** Avaliação por estrelas do usuário para a obra tocando no player. */
export function useTrackRating(bookId) {
  const { user } = useAuth();
  const [myNota, setMyNota] = useState(0);

  const displayName =
    user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email || "").split("@")[0];

  useEffect(() => {
    let active = true;
    setMyNota(0);
    if (!bookId || !user?.id) return undefined;
    getMyReview(user.id, bookId)
      .then((r) => {
        if (active) setMyNota(Number(r?.nota) || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [bookId, user?.id]);

  const rate = async (n) => {
    if (!bookId || !user?.id) return;
    setMyNota(n);
    try {
      await upsertReview(user.id, bookId, { nota: n, usuarioNome: displayName });
      toast.success("Avaliação salva!");
    } catch (err) {
      console.error("[useTrackRating] avaliar:", err);
      toast.error("Não foi possível salvar a nota.");
    }
  };

  return { myNota, rate };
}
