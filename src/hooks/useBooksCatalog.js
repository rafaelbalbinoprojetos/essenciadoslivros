import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listBooks } from "../services/books.js";

export function useBooksCatalog({ limit = 24, status = "ativo", search = "" } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data } = await listBooks({ limit, status, search });
      setItems(data);
    } catch (err) {
      console.error("[useBooksCatalog] erro ao carregar livros:", err);
      const message = err?.message ?? "Não foi possível carregar os livros.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [limit, status, search]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return {
    items,
    loading,
    error,
    reload: fetchBooks,
  };
}
