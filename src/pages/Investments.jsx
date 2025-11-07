import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { listPriceHistory } from "../services/priceHistory.js";
import { getPortfolioRentability, listPortfolioPositions, deletePortfolioPosition } from "../services/portfolio.js";
import { getAssetBySymbol, upsertAsset } from "../services/assets.js";
import { formatCurrency } from "../utils/formatters.js";
import { ASSET_TYPES } from "../utils/constants.js";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function normalizeAssetSymbol(value) {
  const trimmed = (value ?? "").trim().toUpperCase();
  if (!trimmed) return "";
  if (!trimmed.includes(".") && /^[A-Z]{4}\d{1,2}$/.test(trimmed)) {
    return `${trimmed}.SA`;
  }
  return trimmed;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0,00%";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function buildHistoryOption(history = [], symbol = "", currency = "BRL") {
  const categories = history.map((point) => DATE_FORMATTER.format(new Date(point.data_registro)));
  const values = history.map((point) => Number(point.preco));

  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (val) => formatCurrency(val, { currency }),
    },
    grid: { left: 24, right: 12, top: 32, bottom: 28 },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLabel: { color: "#9CA3AF" },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.4)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#9CA3AF",
        formatter: (val) => formatCurrency(val, { currency }),
      },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } },
    },
    series: [
      {
        name: symbol,
        data: values,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#22d3ee" },
        areaStyle: { opacity: 0.15, color: "#22d3ee" },
      },
    ],
  };
}

function buildAllocationOption(allocation = []) {
  return {
    tooltip: {
      trigger: "item",
      formatter: ({ name, value, percent }) => `${name}: ${formatCurrency(value)} (${percent.toFixed(1)}%)`,
    },
    legend: {
      orient: "horizontal",
      top: "bottom",
      left: "center",
      textStyle: { color: "#94A3B8", fontSize: 12 },
    },
    series: [
      {
        name: "Distribuicao",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: { show: false, position: "center" },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "bold",
          },
        },
        labelLine: { show: false },
        data: allocation.map((entry) => ({
          name: entry.label ?? entry.type,
          value: entry.totalCurrent,
        })),
      },
    ],
  };
}

function SummaryCard({ title, value, helper, accent }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition shadow-sm dark:border-gray-800 ${
        accent ? "border-temaSky/30 bg-temaSky/5 dark:border-temaEmerald/30 dark:bg-temaEmerald/10" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {helper ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helper}</p> : null}
    </div>
  );
}

export default function InvestmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rentability, setRentability] = useState([]);
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const quoteRefreshRef = useRef(new Set());
  const unsupportedSymbolsRef = useRef(new Set());

  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);
  const plan = metadata.plan ?? "free";
  const trialStatus = metadata.trial_status ?? "eligible";
  const trialEndsAt = metadata.trial_expires_at ? new Date(metadata.trial_expires_at) : null;
  const trialExpired = trialEndsAt ? trialEndsAt.getTime() <= Date.now() : false;
  const trialActive = trialStatus === "active" && !trialExpired;
  const hasPremiumAccess = plan === "premium" || trialActive;
  const canStartTrial = !hasPremiumAccess && (!trialStatus || trialStatus === "eligible");


  useEffect(() => {
    quoteRefreshRef.current = new Set();
    unsupportedSymbolsRef.current = new Set();
  }, [user?.id]);
  const loadPortfolio = useCallback(async () => {
    if (!user) {
      setRentability([]);
      setPositions([]);
      setFetching(false);
      setError(null);
      return;
    }

    setFetching(true);
    setError(null);
    try {
      const [rentData, portfolioItems] = await Promise.all([
        getPortfolioRentability({ userId: user.id }),
        listPortfolioPositions({ userId: user.id }),
      ]);
      setRentability(rentData ?? []);
      setPositions(portfolioItems ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError);
      toast.error(loadError.message || "Nao foi possivel carregar sua carteira.");
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadPortfolio();
  }, [authLoading, loadPortfolio, refreshToken]);

  useEffect(() => {
    if (!hasPremiumAccess || !selectedSymbol) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    listPriceHistory({ symbol: selectedSymbol, limit: 120 })
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((historyError) => {
        console.error(historyError);
        if (!cancelled) {
          toast.error("Nao foi possivel carregar o historico de precos.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, hasPremiumAccess]);

  useEffect(() => {
    if (!selectedSymbol && rentability.length > 0) {
      setSelectedSymbol(normalizeAssetSymbol(rentability[0].ativo_symbol));
    }
  }, [rentability, selectedSymbol]);
  useEffect(() => {
    const availableSymbols = new Set(rentability.map((row) => normalizeAssetSymbol(row.ativo_symbol)));
    quoteRefreshRef.current = new Set(
      [...quoteRefreshRef.current].filter((symbol) => {
        const stillMissing = !availableSymbols.has(symbol);
        const existsInPositions = positions.some((position) => normalizeAssetSymbol(position.ativo_symbol) === symbol);
        return stillMissing && existsInPositions;
      }),
    );
    unsupportedSymbolsRef.current = new Set(
      [...unsupportedSymbolsRef.current].filter((symbol) => !availableSymbols.has(symbol)),
    );
  }, [rentability, positions]);

  useEffect(() => {
    if (!user || fetching) {
      return;
    }

    const positionSymbols = positions.map((position) => normalizeAssetSymbol(position.ativo_symbol)).filter(Boolean);
    const rentabilitySymbols = new Set(rentability.map((row) => normalizeAssetSymbol(row.ativo_symbol)));

    const missingRentRows = positionSymbols.filter((symbol) => !rentabilitySymbols.has(symbol));
    const missingPrices = rentability
      .filter((row) => {
        const price = Number(row.ultimo_preco);
        return !Number.isFinite(price) || price <= 0;
      })
      .map((row) => normalizeAssetSymbol(row.ativo_symbol));

    const candidates = [...new Set([...missingRentRows, ...missingPrices])].filter(Boolean);
    const pending = candidates.filter(
      (symbol) => !quoteRefreshRef.current.has(symbol) && !unsupportedSymbolsRef.current.has(symbol),
    );

    if (!pending.length) {
      return;
    }

    quoteRefreshRef.current = new Set([...quoteRefreshRef.current, ...pending]);

    fetch(API_BASE ? `${API_BASE}/api/investments/update-quotes` : "/api/investments/update-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: pending }),
    })
      .then((response) => response.json().catch(() => ({})).then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          throw new Error(data?.error || "Update quotes failed");
        }

        if (Array.isArray(data?.unauthorizedSymbols) && data.unauthorizedSymbols.length > 0) {
          const normalized = data.unauthorizedSymbols.map((symbol) => normalizeAssetSymbol(symbol));
          const newlyUnsupported = normalized.filter((symbol) => !unsupportedSymbolsRef.current.has(symbol));
          normalized.forEach((symbol) => {
            unsupportedSymbolsRef.current.add(symbol);
            quoteRefreshRef.current.delete(symbol);
          });
          if (newlyUnsupported.length > 0) {
            toast.error(
              "Nao foi possivel atualizar a cotacao automaticamente. Configure as credenciais da Yahoo Finance ou atualize manualmente.",
            );
          }
        }

        if ((data?.updated ?? 0) > 0 || (data?.history ?? 0) > 0) {
          setRefreshToken((token) => token + 1);
        }
      })
      .catch((updateError) => {
        console.warn("Nao foi possivel sincronizar cotacoes imediatamente:", updateError);
      });
  }, [fetching, rentability, positions, user]);

  const mergedRows = useMemo(() => {
    const rentabilityBySymbol = new Map(rentability.map((item) => [normalizeAssetSymbol(item.ativo_symbol), item]));
    return positions
      .map((position) => {
        const normalizedSymbol = normalizeAssetSymbol(position.ativo_symbol);
        const rentRow = rentabilityBySymbol.get(normalizedSymbol);
        const quantity = Number(position.quantidade ?? 0);
        const averagePrice = Number(position.preco_medio ?? 0);
        const investedTotal = quantity * averagePrice;
        const currentPrice = rentRow?.ultimo_preco ?? averagePrice;
        const currentTotal = quantity * currentPrice;
        const profit = rentRow?.lucro_total ?? currentTotal - investedTotal;
        const rentPercent =
          rentRow?.rentabilidade_percentual ?? (investedTotal > 0 ? ((currentTotal - investedTotal) / investedTotal) * 100 : 0);
        return {
          symbol: normalizedSymbol || position.ativo_symbol,
          rawSymbol: position.ativo_symbol,
          displaySymbol: normalizedSymbol || position.ativo_symbol,
          quantity,
          averagePrice,
          investedTotal,
          currentPrice,
          currentTotal,
          profit,
          rentPercent,
          type: position.tipo,
          origin: position.origem,
          notes: position.observacoes,
          currency: rentRow?.moeda ?? position.moeda ?? "BRL",
          lastUpdate: rentRow?.atualizado_em,
          dailyChange: rentRow?.variacao_diaria,
          name: rentRow?.nome ?? position.nome ?? normalizedSymbol,
        };
      })
      .sort((a, b) => b.currentTotal - a.currentTotal);
  }, [positions, rentability]);

  const positionBySymbol = useMemo(() => new Map(positions.map((position) => [position.ativo_symbol, position])), [positions]);

  const totals = useMemo(() => {
    if (!mergedRows.length) {
      return {
        totalInvested: 0,
        totalCurrent: 0,
        profit: 0,
        rentabilityPercent: 0,
        dailyChange: 0,
      };
    }

    let invested = 0;
    let current = 0;
    let weightedDaily = 0;

    mergedRows.forEach((row) => {
      invested += row.investedTotal;
      current += row.currentTotal;
      const change = Number(row.dailyChange ?? 0);
      weightedDaily += Number.isFinite(change) ? change * row.currentTotal : 0;
    });

    const profit = current - invested;
    const rentabilityPercent = invested > 0 ? (profit / invested) * 100 : 0;
    const dailyChange = current > 0 ? weightedDaily / current : 0;

    return {
      totalInvested: invested,
      totalCurrent: current,
      profit,
      rentabilityPercent,
      dailyChange,
    };
  }, [mergedRows]);

  const allocation = useMemo(() => {
    if (!mergedRows.length) return [];
    const group = new Map();
    mergedRows.forEach((row) => {
      const type = row.type ?? "outro";
      if (!group.has(type)) {
        group.set(type, { type, totalCurrent: 0 });
      }
      group.get(type).totalCurrent += row.currentTotal;
    });
    const labels = Object.fromEntries(ASSET_TYPES.map((item) => [item.value, item.label]));
    return Array.from(group.values())
      .map((entry) => ({
        ...entry,
        label: labels[entry.type] ?? entry.type,
      }))
      .sort((a, b) => b.totalCurrent - a.totalCurrent);
  }, [mergedRows]);

  const selectedRow = useMemo(() => mergedRows.find((row) => row.symbol === selectedSymbol) ?? null, [mergedRows, selectedSymbol]);

  const handleSelectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
  };

  const handleRemovePosition = useCallback(
    async (symbol) => {
      if (!user) return;

      const normalizedSymbol = normalizeAssetSymbol(symbol);
      const confirm = window.confirm(`Deseja remover ${normalizedSymbol} da sua carteira?`);
      if (!confirm) return;

      try {
        await deletePortfolioPosition({ userId: user.id, ativoSymbol: normalizedSymbol });
                toast.success(`${normalizedSymbol} removido da carteira.`);
        setRefreshToken((token) => token + 1);
      } catch (deleteError) {
        console.error(deleteError);
        toast.error(deleteError.message || "Nao foi possivel remover a posicao.");
      }
    },
    [user],
  );

  const handleEditPosition = useCallback(
    (symbol) => {
      const normalizedSymbol = normalizeAssetSymbol(symbol);
      const position = positionBySymbol.get(normalizedSymbol);
      if (position) {
        navigate("/investir/novo", { state: { position } });
      } else {
        navigate("/investir/novo", { state: { position: null, symbol: normalizedSymbol } });
      }
    },
    [navigate, positionBySymbol],
  );

  const handleRegisterAsset = useCallback(async () => {
    if (!selectedRow) return;
    try {
      const asset = await getAssetBySymbol(selectedRow.symbol);
      if (!asset) {
        await upsertAsset({
          symbol: selectedRow.symbol,
          nome: selectedRow.name ?? selectedRow.symbol,
          tipo: selectedRow.type ?? "outro",
          moeda: selectedRow.currency ?? "BRL",
        });
      }
      toast.success("Ativo registrado com sucesso.");
      setRefreshToken((token) => token + 1);
    } catch (err) {
      console.error(err);
      toast.error("Nao foi possivel registrar o ativo.");
    }
  }, [selectedRow]);

  const lineChartOption = useMemo(
    () =>
      selectedRow && history.length
        ? buildHistoryOption(history, selectedRow.symbol, selectedRow.currency)
        : buildHistoryOption([], selectedRow?.symbol ?? "", selectedRow?.currency ?? "BRL"),
    [history, selectedRow],
  );

  const allocationOption = useMemo(() => buildAllocationOption(allocation), [allocation]);

  const showAuthNotice = !authLoading && !user;
  const showEmptyState = !fetching && !showAuthNotice && mergedRows.length === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Investimentos e rentabilidade</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Consolide seus ativos, acompanhe a rentabilidade e visualize a evolucao da carteira em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/investir/novo"
            className="inline-flex items-center justify-center rounded-lg bg-temaSky px-4 py-2 text-sm font-semibold text-white transition hover:bg-temaSky-dark dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
          >
            Registrar ativo
          </Link>
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald"
          >
            Atualizar dados
          </button>
        </div>
      </header>

      {showAuthNotice && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          Entre na sua conta para visualizar a carteira de investimentos.
        </div>
      )}

      {error && !showAuthNotice && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
          Nao foi possivel carregar sua carteira. Tente novamente.
        </div>
      )}

      {!showAuthNotice && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Valor atual da carteira"
              value={formatCurrency(totals.totalCurrent)}
              helper={`Investimento inicial: ${formatCurrency(totals.totalInvested)}`}
              accent
            />
            <SummaryCard
              title="Lucro/prejuizo acumulado"
              value={formatCurrency(totals.profit, { sign: "auto" })}
              helper={formatPercent(totals.rentabilityPercent)}
            />
            <SummaryCard title="Variacao diaria" value={formatPercent(totals.dailyChange)} helper="Atualizado pela Yahoo Finance" />
            <SummaryCard title="Ativos monitorados" value={mergedRows.length} helper="Quantidade de posicoes" />
          </section>

          {!hasPremiumAccess && (
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Dados em tempo real sao exclusivos do plano Premium.</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-200/80">
                    As cotaAcoes exibidas podem estar desatualizadas. Faca upgrade para ativar atualizaAcoes automaticas a cada 15 minutos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canStartTrial && (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("granaapp:activate-trial"))}
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-sky-500"
                    >
                      Ativar teste Premium
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("granaapp:open-plans"))}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-400/70 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                  >
                    Ver planos
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Posicoes consolidadas</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">Fonte: Yahoo Finance</span>
              </div>

              {fetching && (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Carregando carteira...</p>
              )}

              {showEmptyState && (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum ativo na carteira ainda. Cadastre o primeiro para visualizar a rentabilidade.
                </p>
              )}

              {!fetching && !showEmptyState && (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                    <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Ativo</th>
                        <th className="px-4 py-3 text-right">Quantidade</th>
                        <th className="px-4 py-3 text-right">Preco medio</th>
                        <th className="px-4 py-3 text-right">Cotacao atual</th>
                        <th className="px-4 py-3 text-right">Rentabilidade %</th>
                        <th className="px-4 py-3 text-right">Lucro/Prejuizo</th>
                        <th className="px-4 py-3 text-right">AAcoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {mergedRows.map((row) => {
                        const isSelected = selectedSymbol === row.symbol;
                        return (
                          <tr
                            key={row.symbol}
                            className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSelected ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleSelectSymbol(row.symbol)}
                                className="text-left font-semibold text-temaSky hover:underline dark:text-temaEmerald"
                              >
                                {row.symbol}
                              </button>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {row.name ?? "Descricao indisponivel"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right">{row.quantity.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.averagePrice, { currency: row.currency })}</td>
                            <td className="px-4 py-3 text-right">
                              {hasPremiumAccess ? formatCurrency(row.currentPrice, { currency: row.currency }) : "--"}
                            </td>
                            <td className={`px-4 py-3 text-right ${row.rentPercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {formatPercent(row.rentPercent)}
                            </td>
                            <td className={`px-4 py-3 text-right ${row.profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {formatCurrency(row.profit, { currency: row.currency, sign: "auto" })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditPosition(row.symbol)}
                                  className="text-xs font-semibold text-temaSky hover:underline dark:text-temaEmerald"
                                >
                                  Ajustar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePosition(row.symbol)}
                                  className="text-xs font-semibold text-rose-500 hover:underline"
                                >
                                  Remover
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historico de precos</h2>
                  {selectedRow?.lastUpdate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Atualizado em {new Date(selectedRow.lastUpdate).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>

                {!hasPremiumAccess && (
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Liberado no plano Premium e durante o teste gratuito.
                  </p>
                )}

                {hasPremiumAccess && (
                  <>
                    {historyLoading ? (
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Carregando historico...</p>
                    ) : history.length ? (
                      <ReactECharts option={lineChartOption} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
                    ) : (
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Sem dados de historico para esta data. Aguarde a proxima atualizacao automatica.
                      </p>
                    )}
                  </>
                )}

                {selectedRow && (
                  <div className="mt-4 space-y-2 rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <p>
                      <strong>Moeda:</strong> {selectedRow.currency}
                    </p>
                    <p>
                      <strong>Origem do cadastro:</strong> {selectedRow.origin}
                    </p>
                    {selectedRow.notes ? <p className="text-gray-400 dark:text-gray-500">{selectedRow.notes}</p> : null}
                    <button
                      type="button"
                      onClick={handleRegisterAsset}
                      className="text-xs font-semibold text-temaSky hover:underline dark:text-temaEmerald"
                    >
                      Sincronizar informacoes do ativo
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Distribuicao da carteira</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Por tipo de ativo</span>
                </div>
                {allocation.length ? (
                  <ReactECharts option={allocationOption} notMerge lazyUpdate style={{ height: 260, width: "100%" }} />
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cadastre ativos para visualizar a distribuicao.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}



































