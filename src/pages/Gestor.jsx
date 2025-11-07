import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { listRevenues } from "../services/revenues.js";
import { listExpenses } from "../services/expenses.js";
import { listInvestments } from "../services/investments.js";
import { listOvertime } from "../services/overtime.js";
import { formatCurrency } from "../utils/formatters.js";
import { minutesToHours } from "../utils/overtime.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

function toCurrency(value) {
  return formatCurrency(value ?? 0, { fallback: "R$ 0,00" });
}

function parseScenarioNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

export default function GestorPage() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: {
      revenues: [],
      expenses: [],
      investments: [],
      overtime: [],
    },
  });
  const [scenarioForm, setScenarioForm] = useState({
    extraMonthly: "200",
    months: "12",
    rate: "0.8",
  });

  useEffect(() => {
    let ignore = false;
    if (authLoading) return undefined;

    if (!user) {
      setState({
        loading: false,
        error: null,
        data: { revenues: [], expenses: [], investments: [], overtime: [] },
      });
      return undefined;
    }

    async function fetchData() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [revenues, expenses, investments, overtime] = await Promise.all([
          listRevenues({ userId: user.id }),
          listExpenses({ userId: user.id }),
          listInvestments({ userId: user.id }),
          listOvertime({ userId: user.id }),
        ]);

        if (!ignore) {
          setState({
            loading: false,
            error: null,
            data: {
              revenues: revenues ?? [],
              expenses: expenses ?? [],
              investments: investments ?? [],
              overtime: overtime ?? [],
            },
          });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            loading: false,
            error,
            data: { revenues: [], expenses: [], investments: [], overtime: [] },
          });
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [authLoading, user, user?.id]);

  const scenarioInputs = useMemo(() => {
    const extra = Math.max(0, parseScenarioNumber(scenarioForm.extraMonthly, 0));
    const months = Math.max(1, Math.round(parseScenarioNumber(scenarioForm.months, 12)));
    const monthlyRate = Math.min(1, Math.max(-0.99, parseScenarioNumber(scenarioForm.rate, 0) / 100));
    return { extra, months, monthlyRate };
  }, [scenarioForm]);

  const scenarioProjection = useMemo(() => {
    const { extra, months, monthlyRate } = scenarioInputs;
    let balance = 0;
    let contributions = 0;
    for (let month = 0; month < months; month += 1) {
      balance = (balance + extra) * (1 + monthlyRate);
      contributions += extra;
    }
    return {
      contributions,
      interest: balance - contributions,
      balance,
    };
  }, [scenarioInputs]);

  const {
    loading: dataLoading,
    error,
    data: { revenues, expenses, investments, overtime },
  } = state;

  const totals = useMemo(() => {
    const income = revenues.reduce((acc, item) => acc + Number(item.value ?? 0), 0);
    const expense = expenses.reduce((acc, item) => acc + Math.abs(Number(item.value ?? 0)), 0);
    const invested = investments.reduce((acc, item) => acc + Number(item.value ?? 0), 0);
    const overtimeMinutes = overtime.reduce((acc, item) => {
      const start = item.start_time ? new Date(item.start_time) : null;
      const end = item.end_time ? new Date(item.end_time) : null;
      if (!start || !end || Number.isNaN(start) || Number.isNaN(end)) return acc;
      return acc + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    }, 0);
    return {
      income,
      expense,
      invested,
      overtimeMinutes,
    };
  }, [revenues, expenses, investments, overtime]);

  const counts = useMemo(
    () => ({
      revenues: revenues.length,
      expenses: expenses.length,
      investments: investments.length,
      overtime: overtime.length,
    }),
    [revenues.length, expenses.length, investments.length, overtime.length],
  );

  const lastRevenue = useMemo(() => {
    if (revenues.length === 0) return null;
    return revenues
      .map((item) => (item.date ? new Date(item.date) : null))
      .filter((date) => date && !Number.isNaN(date))
      .sort((a, b) => b - a)[0];
  }, [revenues]);

  const lastInvestment = useMemo(() => {
    if (investments.length === 0) return null;
    return investments
      .map((item) => (item.date ? new Date(item.date) : null))
      .filter((date) => date && !Number.isNaN(date))
      .sort((a, b) => b - a)[0];
  }, [investments]);

  const expenseRatio = totals.income > 0 ? totals.expense / totals.income : 0;
  const investmentRatio = totals.income > 0 ? totals.invested / totals.income : 0;
  const margin = totals.income > 0 ? (totals.income - totals.expense) / totals.income : 0;

  const hasData = counts.revenues > 0 || counts.expenses > 0 || counts.investments > 0 || counts.overtime > 0;

  const priority = useMemo(() => {
    if (!hasData) {
      return {
        title: "Comece registrando seu fluxo financeiro",
        summary: "Ainda não encontramos receitas, despesas ou aportes neste período.",
        reason: "Sem movimentações identificadas.",
        cta: { label: "Adicionar primeira receita", to: "/rendas/nova" },
      };
    }
    if (counts.revenues === 0) {
      return {
        title: "Reative suas fontes de receita",
        summary: "As despesas estão sendo registradas, mas não há entradas identificadas.",
        reason: "Nenhuma receita registrada recentemente.",
        cta: { label: "Registrar receita agora", to: "/rendas/nova" },
      };
    }
    if (expenseRatio >= 0.7) {
      return {
        title: "Reduza o peso das despesas",
        summary: "As saídas estão consumindo a maior parte de suas receitas no período.",
        reason: `Despesas consomem ${(expenseRatio * 100).toFixed(1)}% das entradas.`,
        cta: { label: "Revisar despesas", to: "/despesas" },
      };
    }
    if (investmentRatio < 0.1 && totals.income > 0) {
      return {
        title: "Reforce seus investimentos",
        summary: "Os aportes representam menos de 10% das receitas consolidadas.",
        reason: `Somente ${(investmentRatio * 100).toFixed(1)}% do que entra está virando investimento.`,
        cta: { label: "Planejar aporte", to: "/investir" },
      };
    }
    return {
      title: "Ótimo ritmo financeiro",
      summary: "Você mantém saldo positivo e aportes consistentes este mês.",
      reason: "Continue acompanhando os indicadores para preservar o ritmo.",
      cta: { label: "Explorar novas metas", to: "/investir" },
    };
  }, [counts.expenses, counts.income, counts.investments, counts.overtime, counts.revenues, expenseRatio, hasData, investmentRatio, totals.income, totals.expense]);

  const priorityActions = useMemo(() => {
    if (!hasData) {
      return [
        {
          title: "Cadastrar primeira receita",
          description: "Registre a principal fonte de entrada no módulo de rendas.",
          to: "/rendas/nova",
        },
        {
          title: "Registrar despesa essencial",
          description: "Inclua aluguel, alimentação ou contas fixas no módulo de despesas.",
          to: "/despesas/nova",
        },
        {
          title: "Personalizar atalhos",
          description: "Defina atalhos no menu inferior em Configurações.",
          to: "/configuracoes",
        },
      ];
    }

    const actions = [];

    if (expenseRatio >= 0.7) {
      actions.push({
        title: "Mapear despesas maiores",
        description: "Ordene despesas e renegocie valores acima da média.",
        to: "/despesas",
      });
    }
    if (investmentRatio < 0.1 && totals.income > 0) {
      actions.push({
        title: "Criar aporte automático",
        description: "Defina um valor fixo para investir sempre que receber renda.",
        to: "/investir",
      });
    }
    if (totals.overtimeMinutes > 0) {
      actions.push({
        title: "Transformar horas extras em renda",
        description: "Avalie direcionar parte das horas extras para novas fontes recorrentes.",
        to: "/extra",
      });
    }
    if (actions.length === 0) {
      actions.push({
        title: "Revisar painel financeiro",
        description: "Acompanhe gráficos e metas para manter o controle.",
        to: "/",
      });
    }

    return actions;
  }, [expenseRatio, hasData, investmentRatio, totals.income, totals.overtimeMinutes]);

  const guidanceAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();

    if (lastRevenue) {
      const days = Math.floor((now.getTime() - lastRevenue.getTime()) / ONE_DAY);
      if (days > 30) {
        alerts.push({
          tone: "warning",
          message: `Última receita registrada há ${days} dias. Considere atualizar suas entradas.`,
        });
      }
    } else {
      alerts.push({
        tone: "warning",
        message: "Nenhuma receita registrada recentemente.",
      });
    }

    if (lastInvestment) {
      const days = Math.floor((now.getTime() - lastInvestment.getTime()) / ONE_DAY);
      if (days > 90) {
        alerts.push({
          tone: "info",
          message: `Último aporte foi há ${days} dias. Avalie retomar os investimentos.`,
        });
      }
    } else {
      alerts.push({
        tone: "info",
        message: "Registre seus aportes para acompanhar a evolução do patrimônio.",
      });
    }

    if (margin < 0) {
      alerts.push({
        tone: "warning",
        message: "Saldo do mês negativo. Priorize revisão de despesas e novas fontes de renda.",
      });
    } else if (margin < 0.2 && totals.income > 0) {
      alerts.push({
        tone: "info",
        message: "Saldo positivo, mas margem apertada. Ajuste aportes e categorias para ganhar folga.",
      });
    }

    return alerts.slice(0, 3);
  }, [lastInvestment, lastRevenue, margin, totals.income]);

  const displayedActions = dataLoading ? Array.from({ length: 3 }).map((_, index) => ({
    title: `Analisando dados ${index + 1}`,
    description: "Estamos preparando o plano inteligente de ação.",
  })) : priorityActions;

  const displayedActionCount = displayedActions.length;

  const scenarioContributions = scenarioProjection.contributions;
  const scenarioInterest = scenarioProjection.interest;
  const scenarioTotal = scenarioProjection.balance;

  const handleScenarioChange = (event) => {
    const { name, value } = event.target;
    setScenarioForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScenarioSubmit = (event) => {
    event.preventDefault();
  };

  const handleScenarioReset = () => {
    setScenarioForm({ extraMonthly: "200", months: "12", rate: "0.8" });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Gestor financeiro</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Planeje próximos passos com recomendações inteligentes baseadas nos seus lançamentos.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          Não foi possível carregar os dados do gestor agora. Tente novamente em instantes.
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-temaSky/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-temaSky dark:bg-temaEmerald/15 dark:text-temaEmerald">
              Diagnóstico inteligente
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {dataLoading ? "Analisando movimentações recentes" : priority.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dataLoading
                  ? "Estamos cruzando receitas, despesas e investimentos para montar o plano ideal."
                  : priority.summary}
              </p>
            </div>
            {!dataLoading && priority.reason && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{priority.reason}</p>
            )}
            {!dataLoading && priority.cta?.to && priority.cta?.label && (
              <Link
                to={priority.cta.to}
                className="inline-flex w-fit items-center justify-center rounded-lg bg-temaSky px-4 py-2 text-xs font-semibold text-white transition hover:bg-temaSky-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
              >
                {priority.cta.label}
              </Link>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-white/80 p-5 dark:border-gray-700 dark:bg-gray-950">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Plano de ação rápido</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dataLoading
                  ? "Carregando..."
                  : `${displayedActionCount} passo${displayedActionCount === 1 ? "" : "s"} sugerido${displayedActionCount === 1 ? "" : "s"}`}
              </span>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {displayedActions.map((action, index) => (
                <li
                  key={`${action.title}-${index}`}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-temaSky/10 text-xs font-semibold text-temaSky dark:bg-temaEmerald/15 dark:text-temaEmerald">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{action.title}</p>
                      {action.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                      )}
                      {!dataLoading && action.to && (
                        <Link
                          to={action.to}
                          className="inline-flex text-xs font-semibold text-temaSky hover:text-temaSky-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-temaSky/40 dark:text-temaEmerald dark:hover:text-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
                        >
                          Abrir
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Simulação what-if</h3>
                <button
                  type="button"
                  onClick={handleScenarioReset}
                  className="text-xs font-semibold text-temaSky hover:text-temaSky-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-temaSky/40 dark:text-temaEmerald dark:hover:text-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
                >
                  Resetar
                </button>
              </div>
              <form className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300" onSubmit={handleScenarioSubmit}>
                <label className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Aporte extra mensal (R$)
                  <input
                    type="number"
                    name="extraMonthly"
                    min="0"
                    step="0.01"
                    value={scenarioForm.extraMonthly}
                    onChange={handleScenarioChange}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Período (meses)
                  <input
                    type="number"
                    name="months"
                    min="1"
                    step="1"
                    value={scenarioForm.months}
                    onChange={handleScenarioChange}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Taxa mensal estimada (%)
                  <input
                    type="number"
                    name="rate"
                    step="0.01"
                    value={scenarioForm.rate}
                    onChange={handleScenarioChange}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                  />
                </label>
              </form>
              <dl className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <dt>Aportes extras totais</dt>
                  <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {toCurrency(scenarioContributions)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Juros projetados</dt>
                  <dd className="text-sm font-semibold text-temaSky dark:text-temaEmerald">
                    {toCurrency(scenarioInterest)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Saldo projetado</dt>
                  <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {toCurrency(scenarioTotal)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                Considera apenas os aportes extras informados e a taxa mensal estimada. Ajuste para testar diferentes cenários.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Indicadores rápidos</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">Atualizado em tempo real</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center justify-between">
                  <span>Receitas acumuladas</span>
                  <strong className="text-gray-900 dark:text-gray-100">{toCurrency(totals.income)}</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>Despesas do período</span>
                  <strong className="text-gray-900 dark:text-gray-100">{toCurrency(totals.expense)}</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>Investimentos confirmados</span>
                  <strong className="text-gray-900 dark:text-gray-100">{toCurrency(totals.invested)}</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>Horas extras acumuladas</span>
                  <strong className="text-gray-900 dark:text-gray-100">
                    {totals.overtimeMinutes > 0 ? minutesToHours(totals.overtimeMinutes) : "Sem registros"}
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {!dataLoading && guidanceAlerts.length > 0 && (
          <div className="mt-6 grid gap-3 text-sm text-gray-600 dark:text-gray-300 lg:grid-cols-2 xl:grid-cols-3">
            {guidanceAlerts.map((alert) => (
              <div
                key={alert.message}
                className={`rounded-lg border px-4 py-3 transition ${
                  alert.tone === "warning"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                    : alert.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-temaSky/30 bg-temaSky/5 dark:border-temaEmerald/30 dark:bg-temaEmerald/5"
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
