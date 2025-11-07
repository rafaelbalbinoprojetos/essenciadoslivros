import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteExpense, listExpenses } from "../services/expenses.js";
import RecordActions from "../components/RecordActions.jsx";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../utils/constants.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
);

const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
);

const DEFAULT_EXPENSE_FILTERS = {
  category: "all",
  paymentMethod: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
  minValue: "",
  maxValue: "",
};

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    data: [],
    error: null,
  });
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_EXPENSE_FILTERS }));

  useEffect(() => {
    let ignore = false;

    if (authLoading) {
      return undefined;
    }

    if (!user) {
      setState({ loading: false, data: [], error: null });
      setSelectedExpenseId(null);
      return undefined;
    }

    async function fetchExpenses() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const items = await listExpenses({ userId: user.id });
        if (ignore) return;
        setState({ loading: false, data: items ?? [], error: null });
      } catch (error) {
        console.error(error);
        if (ignore) return;
        setState({ loading: false, data: [], error });
      }
    }

    fetchExpenses();

    return () => {
      ignore = true;
    };
  }, [authLoading, user, user?.id]);

  const expenses = useMemo(
    () =>
      state.data.map((expense) => {
        const amount = Number(expense.value);
        const signedAmount = Number.isFinite(amount) ? -Math.abs(amount) : null;
        return {
          id: expense.id,
          raw: expense,
          numericValue: Number.isFinite(amount) ? amount : null,
          category:
            CATEGORY_LABELS[expense.category] ?? expense.category ?? "Sem categoria",
          description: expense.description?.trim() || "—",
          paymentMethod: expense.payment_method
            ? PAYMENT_METHOD_LABELS[expense.payment_method] ?? expense.payment_method
            : "—",
          date: formatDate(expense.date),
          value: Number.isFinite(signedAmount)
            ? formatCurrency(signedAmount, { sign: "negative" })
            : formatCurrency(expense.value, { sign: "negative" }),
        };
      }),
    [state.data],
  );

  const parseFilterNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : null;
  };

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const toDate = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
    const minValue = parseFilterNumber(filters.minValue);
    const maxValue = parseFilterNumber(filters.maxValue);

    return expenses.filter((expense) => {
      const { raw } = expense;

      if (filters.category !== "all" && raw.category !== filters.category) {
        return false;
      }

      if (filters.paymentMethod !== "all" && raw.payment_method !== filters.paymentMethod) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = `${expense.description} ${expense.category} ${expense.paymentMethod}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        const needle = normalizedSearch
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      if (fromDate || toDate) {
        const expenseDate = raw.date ? new Date(raw.date) : null;
        if (!expenseDate || Number.isNaN(expenseDate.getTime())) {
          return false;
        }
        if (fromDate && expenseDate < fromDate) {
          return false;
        }
        if (toDate && expenseDate > toDate) {
          return false;
        }
      }

      if (minValue !== null && (expense.numericValue ?? 0) < minValue) {
        return false;
      }

      if (maxValue !== null && (expense.numericValue ?? 0) > maxValue) {
        return false;
      }

      return true;
    });
  }, [expenses, filters]);

  const filtersApplied = useMemo(() => {
    return (
      filters.category !== "all" ||
      filters.paymentMethod !== "all" ||
      filters.search.trim() !== "" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.minValue !== "" ||
      filters.maxValue !== ""
    );
  }, [filters]);

  const totals = useMemo(() => {
    if (!filteredExpenses.length) {
      return {
        totalValue: 0,
        averageValue: 0,
        highestValue: 0,
      };
    }
    const totalValue = filteredExpenses.reduce((sum, expense) => sum + (expense.numericValue ?? 0), 0);
    const highestValue = filteredExpenses.reduce(
      (max, expense) => Math.max(max, expense.numericValue ?? 0),
      0,
    );
    const averageValue = totalValue / filteredExpenses.length;
    return { totalValue, averageValue, highestValue };
  }, [filteredExpenses]);

  const selectedExpense = useMemo(
    () => expenses.find((expense) => expense.id === selectedExpenseId) ?? null,
    [expenses, selectedExpenseId],
  );

  const showAuthNotice = !authLoading && !user;
  const isLoading = authLoading || state.loading;

  const handleView = (id) => {
    setSelectedExpenseId((current) => (current === id ? null : id));
  };

  const handleEdit = (record) => {
    navigate("/despesas/nova", { state: { record } });
  };

  const handleDelete = async (record) => {
    if (!record?.id) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir esta despesa?");
    if (!confirmed) return;

    setDeletingId(record.id);
    try {
      await deleteExpense(record.id);
      setState((prev) => ({
        ...prev,
        data: prev.data.filter((item) => item.id !== record.id),
      }));
      setSelectedExpenseId((current) => (current === record.id ? null : current));
      toast.success("Despesa excluida com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel excluir a despesa.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterInputChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_EXPENSE_FILTERS });
  };

  const { uniqueCategories, lastExpense } = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { uniqueCategories: 0, lastExpense: null };
    }
    const categorySet = new Set(
      filteredExpenses.map((expense) => expense.raw?.category ?? expense.category ?? ""),
    );
    categorySet.delete("");

    const lastDated = filteredExpenses
      .map((expense) => {
        const rawDate = expense.raw?.date ? new Date(expense.raw.date) : null;
        return { expense, rawDate };
      })
      .filter(({ rawDate }) => rawDate && !Number.isNaN(rawDate.getTime()))
      .sort((a, b) => b.rawDate - a.rawDate);

    return {
      uniqueCategories: categorySet.size,
      lastExpense: lastDated[0]?.expense ?? null,
    };
  }, [filteredExpenses]);

  const summaryInfo = useMemo(() => {
    const hasItems = filteredExpenses.length > 0;
    const totalValue = hasItems ? totals.totalValue : 0;
    const averageValue = hasItems ? totals.averageValue : 0;

    return {
      hasItems,
      totalDisplay: formatCurrency(totalValue * -1, { sign: "negative" }),
      averageDisplay: formatCurrency(averageValue * -1, { sign: "negative" }),
      categoriesCount: hasItems ? uniqueCategories : 0,
      lastExpenseInfo:
        hasItems && lastExpense
          ? {
              date: lastExpense.date,
              description: lastExpense.description,
              value: lastExpense.value,
            }
          : null,
    };
  }, [filteredExpenses.length, totals.totalValue, totals.averageValue, uniqueCategories, lastExpense]);

  const summaryCards = useMemo(() => {
    if (isLoading || showAuthNotice || state.error) {
      return [];
    }

    if (!summaryInfo.hasItems) {
      return [
        {
          title: "Sem despesas",
          value: "-",
          helper: "Ajuste os filtros ou cadastre uma despesa para ver o resumo.",
        },
      ];
    }

    const highestDisplay = formatCurrency(totals.highestValue * -1, { sign: "negative" });
    const recordsHelper =
      filteredExpenses.length === 1
        ? "1 despesa filtrada."
        : `${filteredExpenses.length} despesas filtradas.`;

    return [
      {
        title: "Despesas filtradas",
        value: summaryInfo.totalDisplay,
        helper: recordsHelper,
      },
      {
        title: "Ticket medio",
        value: summaryInfo.averageDisplay,
        helper: "Media das despesas visiveis nos filtros.",
      },
      {
        title: "Maior despesa",
        value: highestDisplay,
        helper: "Valor mais alto encontrado na lista atual.",
      },
    ];
  }, [
    filteredExpenses.length,
    isLoading,
    showAuthNotice,
    state.error,
    summaryInfo.averageDisplay,
    summaryInfo.hasItems,
    summaryInfo.totalDisplay,
    totals.highestValue,
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Despesas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Controle de gastos fixos e variaveis. Conecte esta tela ao Supabase para carregar dados reais.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumo do mes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Atualize os filtros para refinar a visualizacao.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald"
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "Fechar filtros" : "Filtros"}
              {filtersApplied && !filtersOpen && (
                <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-temaSky dark:bg-temaEmerald" aria-hidden="true" />
              )}
            </button>
            {filtersApplied && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald"
              >
                Limpar
              </button>
            )}
            <Link
              to="/despesas/nova"
              className="inline-flex items-center rounded-md border border-transparent bg-temaSky px-4 py-2 text-sm font-medium text-white transition hover:bg-temaSky-dark dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
            >
              Nova despesa
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo rapido</h3>

          {isLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Carregando resumo...</p>
          )}

          {showAuthNotice && !isLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Entre na sua conta para visualizar o consolidado.
            </p>
          )}

          {!isLoading && !showAuthNotice && state.error && (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              Nao foi possivel carregar o resumo agora.
            </p>
          )}

          {!isLoading && !showAuthNotice && !state.error && !summaryInfo.hasItems && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nenhuma despesa encontrada com os filtros atuais.
            </p>
          )}

          {!isLoading && !showAuthNotice && !state.error && summaryInfo.hasItems && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Total gasto</dt>
                <dd className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {summaryInfo.totalDisplay}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Ticket medio</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {summaryInfo.averageDisplay}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Categorias</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {summaryInfo.categoriesCount}
                </dd>
              </div>
              {summaryInfo.lastExpenseInfo && (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Ultima despesa</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {summaryInfo.lastExpenseInfo.date}
                  </dd>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">
                    {summaryInfo.lastExpenseInfo.description}
                  </dd>
                  <dd className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {summaryInfo.lastExpenseInfo.value}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {filtersOpen && (
          <form
            className="grid gap-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/60"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Categoria
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                >
                  <option value="all">Todas</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Forma de pagamento
                <select
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                >
                  <option value="all">Todas</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 md:col-span-2">
                Buscar
                <input
                  type="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterInputChange}
                  placeholder="Procure por descricao, categoria ou forma de pagamento"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Data inicial
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Data final
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Valor minimo (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="minValue"
                  value={filters.minValue}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Valor maximo (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="maxValue"
                  value={filters.maxValue}
                  onChange={handleFilterInputChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ajuste os campos para refinar as despesas exibidas.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald"
                >
                  Limpar filtros
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-md bg-temaSky px-3 py-2 text-xs font-semibold text-white transition hover:bg-temaSky-dark dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {card.title}
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.helper}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Descricao</th>
                <th className="px-4 py-3 font-medium">Forma de pagamento</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Carregando despesas...
                  </td>
                </tr>
              )}

              {showAuthNotice && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Entre na sua conta para visualizar as despesas.
                  </td>
                </tr>
              )}

              {!isLoading && !showAuthNotice && state.error && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-rose-500 dark:text-rose-400">
                    Nao foi possivel carregar as despesas. Tente novamente em instantes.
                  </td>
                </tr>
              )}

              {!isLoading && !showAuthNotice && !state.error && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {filtersApplied
                      ? "Nenhuma despesa corresponde aos filtros atuais."
                      : "Nenhuma despesa encontrada."}
                  </td>
                </tr>
              )}

              {!isLoading && !showAuthNotice && !state.error && filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{expense.category}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{expense.description}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{expense.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{expense.date}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{expense.value}</td>
                  <td className="px-4 py-3">
                    <RecordActions
                      onView={() => handleView(expense.id)}
                      onEdit={() => handleEdit(expense.raw)}
                      onDelete={() => handleDelete(expense.raw)}
                      disabled={deletingId === expense.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedExpense && (
          <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Detalhes da despesa selecionada
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Visualize as informacoes completas e acesse as acoes acima.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpenseId(null)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
              >
                Fechar
              </button>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Categoria</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedExpense.category}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Valor</dt>
                <dd className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {selectedExpense.value}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Data</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selectedExpense.date}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Pagamento</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {selectedExpense.paymentMethod}
                </dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Descricao</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {selectedExpense.raw.description?.trim() || "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
