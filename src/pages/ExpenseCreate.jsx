import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { createExpense, updateExpense } from "../services/expenses.js";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../utils/constants.js";
import { normalizeDateForSupabase, parseDecimalInput } from "../utils/forms.js";
import { toDateInputValue } from "../utils/formatters.js";

const INITIAL_STATE = {
  value: "",
  date: "",
  category: "",
  description: "",
  payment_method: "",
};

export default function ExpenseCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editingRecord = location.state?.record ?? null;
  const isEditing = Boolean(editingRecord?.id);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!editingRecord) {
      setFormData(INITIAL_STATE);
      return;
    }

    setFormData({
      value:
        editingRecord.value !== null && editingRecord.value !== undefined
          ? String(editingRecord.value)
          : "",
      date: toDateInputValue(editingRecord.date) ?? "",
      category: editingRecord.category ?? "",
      description: editingRecord.description ?? "",
      payment_method: editingRecord.payment_method ?? "",
    });
  }, [editingRecord]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const parsedValue = parseDecimalInput(formData.value);
      const normalizedDate = normalizeDateForSupabase(formData.date);

      if (parsedValue === null) {
        throw new Error("Informe um valor valido.");
      }

      if (!normalizedDate) {
        throw new Error("Informe uma data valida.");
      }

      const normalizedValue = Number(parsedValue.toFixed(2));

      const payload = {
        user_id: user.id,
        value: normalizedValue,
        date: normalizedDate.date,
        category: formData.category,
        payment_method: formData.payment_method || null,
        description: formData.description || null,
      };

      if (isEditing) {
        await updateExpense(editingRecord.id, payload);
        toast.success("Despesa atualizada com sucesso!");
      } else {
        await createExpense(payload);
        toast.success("Despesa cadastrada com sucesso!");
      }
      navigate("/despesas", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Nao foi possivel cadastrar a despesa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {isEditing ? "Editar despesa" : "Cadastrar despesa"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditing
            ? "Atualize os dados da despesa e salve as alteracoes."
            : "Preencha os campos abaixo para registrar uma nova despesa no Supabase."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Valor (R$)
            <input
              name="value"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.value}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Data
            <input
              name="date"
              type="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Categoria
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
            >
              <option value="">Selecione...</option>
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Forma de pagamento
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
            >
              <option value="">Selecione...</option>
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          Descricao
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
            placeholder="Informe algum detalhe adicional (opcional)."
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-temaSky px-4 py-2 text-sm font-semibold text-white transition hover:bg-temaSky-dark disabled:cursor-not-allowed disabled:opacity-60 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
          >
            {loading ? (isEditing ? "Atualizando..." : "Salvando...") : isEditing ? "Atualizar despesa" : "Salvar despesa"}
          </button>
        </div>
      </form>
    </div>
  );
}
