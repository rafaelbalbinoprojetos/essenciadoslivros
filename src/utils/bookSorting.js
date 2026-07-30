export const BOOK_SORT_OPTIONS = [
  { value: "data_desc", label: "Data adicionada: recentes primeiro" },
  { value: "data_asc", label: "Data adicionada: antigas primeiro" },
  { value: "rating_desc", label: "Nota: maior primeiro" },
  { value: "rating_asc", label: "Nota: menor primeiro" },
  { value: "title_asc", label: "Ordem alfabética: A-Z" },
  { value: "title_desc", label: "Ordem alfabética: Z-A" },
];

export const DEFAULT_BOOK_SORT = BOOK_SORT_OPTIONS[0].value;

export function normalizeBookSort(value) {
  return BOOK_SORT_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_BOOK_SORT;
}

export function getBookRatingAverage(book) {
  if (Number.isFinite(Number(book?.ratingAverage))) return Number(book.ratingAverage);
  const reviews = Array.isArray(book?.avaliacoes) ? book.avaliacoes : [];
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + (Number(review?.nota) || 0), 0);
  return total / reviews.length;
}

export function getBookRatingCount(book) {
  if (Number.isFinite(Number(book?.ratingCount))) return Number(book.ratingCount);
  return Array.isArray(book?.avaliacoes) ? book.avaliacoes.length : 0;
}

export function compareBookTitles(a, b) {
  return String(a?.titulo || a?.title || "").localeCompare(String(b?.titulo || b?.title || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

export function compareBookDates(a, b) {
  return new Date(a?.data_adicao || a?.created_at || 0).getTime() - new Date(b?.data_adicao || b?.created_at || 0).getTime();
}

export function sortBooks(books, sort = DEFAULT_BOOK_SORT) {
  const normalizedSort = normalizeBookSort(sort);
  return [...(books ?? [])].sort((a, b) => {
    if (normalizedSort === "title_asc") return compareBookTitles(a, b) || compareBookDates(b, a);
    if (normalizedSort === "title_desc") return compareBookTitles(b, a) || compareBookDates(b, a);

    if (normalizedSort === "rating_asc" || normalizedSort === "rating_desc") {
      const ratingDiff = getBookRatingAverage(a) - getBookRatingAverage(b);
      const countDiff = getBookRatingCount(a) - getBookRatingCount(b);
      const result = ratingDiff || countDiff || compareBookTitles(a, b);
      return normalizedSort === "rating_asc" ? result : -result;
    }

    const dateDiff = compareBookDates(a, b);
    return normalizedSort === "data_asc" ? dateDiff || compareBookTitles(a, b) : -dateDiff || compareBookTitles(a, b);
  });
}

export function getBookServerOrder(sort = DEFAULT_BOOK_SORT) {
  const normalizedSort = normalizeBookSort(sort);
  if (normalizedSort === "title_asc") return { orderBy: "titulo", ascending: true };
  if (normalizedSort === "title_desc") return { orderBy: "titulo", ascending: false };
  if (normalizedSort === "data_asc") return { orderBy: "data_adicao", ascending: true };
  return { orderBy: "data_adicao", ascending: false };
}
