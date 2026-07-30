import React from "react";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import { BOOK_SORT_OPTIONS } from "../utils/bookSorting.js";

export default function BookSortSelect({
  value,
  onChange,
  className = "",
  label = "Ordenar obras",
  variant = "default",
}) {
  const isDark = variant === "archive";

  return (
    <label className={`relative block min-w-[230px] ${className}`}>
      <span className="sr-only">{label}</span>
      <ArrowDownUp
        className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
          isDark ? "text-[#b7904d]" : "text-[rgb(var(--color-accent-primary))]"
        }`}
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full appearance-none rounded-xl py-2 pl-10 pr-9 text-sm font-semibold outline-none transition ${
          isDark
            ? "border border-[#8b6b32]/45 bg-[#0e0e0c]/90 text-[#ead7aa] hover:border-[#c59a4d]/70 focus:border-[#d4a657] focus:ring-2 focus:ring-[#d4a657]/15"
            : "border border-[rgba(var(--color-accent-primary),0.22)] bg-[rgba(var(--surface-card),0.78)] text-[rgb(var(--text-primary))] hover:border-[rgba(var(--color-accent-primary),0.38)] focus:border-[rgb(var(--color-accent-primary))] focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.16)]"
        }`}
      >
        {BOOK_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          isDark ? "text-[#b7904d]" : "text-[rgb(var(--text-subtle))]"
        }`}
      />
    </label>
  );
}
