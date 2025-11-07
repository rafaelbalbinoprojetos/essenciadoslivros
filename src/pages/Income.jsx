import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteRevenue, listRevenues } from "../services/revenues.js";
import RecordActions from "../components/RecordActions.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { REVENUE_CATEGORIES } from "../utils/constants.js";
import { parseRevenueDescription } from "../utils/revenues.js";

const CATEGORY_LABELS = Object.fromEntries(
  REVENUE_CATEGORIES.map((category) => [category.value, category.label]),
);

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(str) ? `${str}T00:00:00Z` : str;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function IncomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    data: [],
    error: null,
  });
  const [selectedRevenueId, setSelectedRevenueId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let ignore = false;

    if (authLoading) {
      return undefined;
    }

    if (!user) {
      setState({ loading: false, data: [], error: null });
      setSelectedRevenueId(null);
      return undefined;
    }

    async function fetchRevenues() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const items = await listRevenues({ userId: user.id });
        if (ignore) return;
        setState({ loading: false, data: items ?? [], error: null });
      } catch (error) {
        console.error(error);
        if (ignore) return;
        setState({ loading: false, data: [], error });
      }
    }

    fetchRevenues();

    return () => {
      ignore = true;
    };
  }, [authLoading, user, user?.id]);

  const { revenues, totalValue, uniqueCategories, lastIncome } = useMemo(() => {
    const items = state.data
      .map((revenue) => {
        const numericValue = Number(revenue.value);
        const parsedValue = Number.isFinite(numericValue) ? numericValue : 0;
        const { origin, notes } = parseRevenueDescription(revenue.description || "");
        const parsedDate = parseDateValue(revenue.date);

        return {
          id: revenue.id,
          raw: revenue,
          category: CATEGORY_LABELS[revenue.category] ?? revenue.category ?? "Sem categoria",
          origin: origin || revenue.description?.trim() || "Origem nao informada",
          notes: notes,
          formattedDate: formatDate(revenue.date),
          rawDate: parsedDate,
          formattedValue: formatCurrency(parsedValue),
          numericValue: parsedValue,
        };
      })
      .sort((a, b) => {
        if (!a.rawDate && !b.rawDate) return 0;
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return b.rawDate.getTime() - a.rawDate.getTime();
      });

    const total = items.reduce((sum, item) => sum + (Number.isFinite(item.numericValue) ? item.numericValue : 0), 0);
    const categories = new Set(items.map((item) => item.category));
    const last = items.find((item) => item.rawDate) ?? items[0] ?? null;

    return {
      revenues: items,
      totalValue: total,
      uniqueCategories: categories.size,
      lastIncome: last,
    };
  }, [state.data]);

  const showAuthNotice = !authLoading && !user;
  const isLoading = authLoading || state.loading;
  const averageValue =
    revenues.length > 0
      ? formatCurrency(totalValue / revenues.length)
      : formatCurrency(0);

  const selectedRevenue = useMemo(
    () => revenues.find((item) => item.id === selectedRevenueId) ?? null,
    [revenues, selectedRevenueId],
  );

  const handleView = (id) => {
    setSelectedRevenueId((current) => (current === id ? null : id));
  };

  const handleEdit = (record) => {
    navigate("/rendas/nova", { state: { record } });
  };

  const handleDelete = async (record) => {
    if (!record?.id) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir esta renda?");
    if (!confirmed) return;

    setDeletingId(record.id);
    try {
      await deleteRevenue(record.id);
      setState((prev) => ({
        ...prev,
        data: prev.data.filter((item) => item.id !== record.id),
      }));
      setSelectedRevenueId((current) => (current === record.id ? null : current));
      toast.success("Renda excluida com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel excluir a renda.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Rendas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Acompanhe os canais de renda e compare com metas projetadas.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumo de entradas</h2>
            <Link
              to="/rendas/nova"
              className="inline-flex items-center rounded-md border border-transparent bg-temaSky px-4 py-2 text-sm font-medium text-white transition hover:bg-temaSky-dark dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
            >
              Registrar renda
            </Link>
          </div>

          <div className="mt-6">
            {isLoading && (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                Carregando rendas...
              </p>
            )}

            {showAuthNotice && !isLoading && (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                Entre na sua conta para visualizar as rendas cadastradas.
              </p>
            )}

            {!isLoading && !showAuthNotice && state.error && (
              <p className="rounded-lg border border-dashed border-rose-300/60 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                Nao foi possivel carregar as rendas. Tente novamente em instantes.
              </p>
            )}

            {!isLoading && !showAuthNotice && !state.error && revenues.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                Nenhuma renda cadastrada ate o momento.
              </p>
            )}

            {!isLoading && !showAuthNotice && !state.error && revenues.length > 0 && (
              <ul className="space-y-4">
                {revenues.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-4 transition hover:border-temaSky/60 dark:border-gray-800 dark:hover:border-temaEmerald/60 ${
                      selectedRevenueId === item.id
                        ? "border-temaSky/60 dark:border-temaEmerald/60"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-temaSky/10 px-3 py-1 text-xs font-medium text-temaSky dark:bg-temaEmerald/10 dark:text-temaEmerald">
                            {item.category}
                          </span>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.origin}
                          </p>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.formattedValue}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.formattedDate}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <RecordActions
                        onView={() => handleView(item.id)}
                        onEdit={() => handleEdit(item.raw)}
                        onDelete={() => handleDelete(item.raw)}
                        disabled={deletingId === item.id}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selectedRevenue && (
              <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Detalhes da renda selecionada
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Revise origem, notas e valores antes de editar ou excluir.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRevenueId(null)}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
                  >
                    Fechar
                  </button>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Categoria</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedRevenue.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Valor</dt>
                    <dd className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedRevenue.formattedValue}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Data</dt>
                    <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedRevenue.formattedDate}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Origem</dt>
                    <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selectedRevenue.origin}</dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Notas adicionais</dt>
                    <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedRevenue.notes || "Nenhuma observacao registrada."}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumo rapido</h2>
          {!isLoading && !showAuthNotice && !state.error && revenues.length === 0 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Cadastre sua primeira renda para visualizar o consolidado.
            </p>
          )}

          {isLoading && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
          )}

          {!isLoading && !showAuthNotice && !state.error && revenues.length > 0 && (
            <dl className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                <dt>Total recebido</dt>
                <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalValue)}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                <dt>Ticket medio</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{averageValue}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                <dt>Categorias</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {uniqueCategories}
                </dd>
              </div>
              {lastIncome && (
                <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                  <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">Ultima renda</dt>
                  <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {lastIncome.formattedDate}
                  </dd>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">
                    {lastIncome.origin}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {!showAuthNotice && state.error && !isLoading && (
            <p className="mt-4 text-sm text-rose-500 dark:text-rose-400">
              Nao foi possivel calcular o resumo.
            </p>
          )}

          {showAuthNotice && !isLoading && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Entre na sua conta para visualizar o resumo de rendas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
