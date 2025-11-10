import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listBooks } from "../services/books.js";

export function useBooksCatalog({ limit = 24, status = "ativo", search = "", offset = 0 } = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data, count } = await listBooks({ limit, status, search, offset });
      setItems(data);
      setTotal(typeof count === "number" ? count : (data ?? []).length);
    } catch (err) {
      console.error("[useBooksCatalog] erro ao carregar livros:", err);
      const message = err?.message ?? "Não foi possível carregar os livros.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, status, search]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return {
    items,
    total,
    loading,
    error,
    reload: fetchBooks,
  };
}
