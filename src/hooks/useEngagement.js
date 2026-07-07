import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEngagement, setLike, setSave } from "../services/engagement.js";

/**
 * Gerencia curtidas (contagem + minha) e salvos para um conjunto de
 * livros, com atualização otimista.
 */
export function useEngagement(bookIds) {
  const { user } = useAuth();
  const [likeCounts, setLikeCounts] = useState({});
  const [liked, setLikedSet] = useState(() => new Set());
  const [saved, setSavedSet] = useState(() => new Set());

  const ids = (bookIds || []).filter(Boolean);
  const key = ids.slice().sort().join(",");

  useEffect(() => {
    let active = true;
    if (!ids.length) {
      setLikeCounts({});
      setLikedSet(new Set());
      setSavedSet(new Set());
      return undefined;
    }
    getEngagement(user?.id, ids)
      .then(({ likeCounts: lc, likedByMe, savedByMe }) => {
        if (!active) return;
        setLikeCounts(lc);
        setLikedSet(likedByMe);
        setSavedSet(savedByMe);
      })
      .catch((err) => console.error("[useEngagement]", err));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id]);

  const toggleLike = useCallback(
    async (bookId) => {
      if (!user?.id || !bookId) return;
      const willLike = !liked.has(bookId);
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (willLike) next.add(bookId);
        else next.delete(bookId);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [bookId]: Math.max(0, (prev[bookId] || 0) + (willLike ? 1 : -1)) }));
      try {
        await setLike(user.id, bookId, willLike);
      } catch (err) {
        console.error("[useEngagement] like:", err);
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (willLike) next.delete(bookId);
          else next.add(bookId);
          return next;
        });
        setLikeCounts((prev) => ({ ...prev, [bookId]: Math.max(0, (prev[bookId] || 0) + (willLike ? -1 : 1)) }));
      }
    },
    [user?.id, liked],
  );

  const toggleSave = useCallback(
    async (bookId) => {
      if (!user?.id || !bookId) return;
      const willSave = !saved.has(bookId);
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (willSave) next.add(bookId);
        else next.delete(bookId);
        return next;
      });
      try {
        await setSave(user.id, bookId, willSave);
      } catch (err) {
        console.error("[useEngagement] save:", err);
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (willSave) next.delete(bookId);
          else next.add(bookId);
          return next;
        });
      }
    },
    [user?.id, saved],
  );

  return { likeCounts, liked, saved, toggleLike, toggleSave };
}
