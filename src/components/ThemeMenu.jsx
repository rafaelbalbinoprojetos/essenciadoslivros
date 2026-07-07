import React from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeMenu() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const { themes, theme, selectTheme } = useTheme();

  const lightThemes = React.useMemo(() => themes.filter((preset) => preset.mode === "light"), [themes]);
  const darkThemes = React.useMemo(() => themes.filter((preset) => preset.mode === "dark"), [themes]);

  React.useEffect(() => {
    if (!open) return undefined;

    const closeOnOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEsc = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEsc);
    };
  }, [open]);

  const handleSelect = (themeId) => {
    selectTheme(themeId);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="theme-menu"
        className={`flex h-10 w-10 items-center justify-center rounded-lg border border-[#cdb18c]/60 bg-white text-[#4b3f35] shadow-sm transition hover:border-[rgb(var(--color-accent-primary))] hover:text-[rgb(var(--color-accent-dark))] dark:border-white/20 dark:bg-slate-900 dark:text-white dark:hover:border-[#cfc2ff] ${
          open ? "ring-2 ring-[rgba(var(--color-accent-primary),0.3)] dark:ring-white/25" : ""
        }`}
        title="Selecionar tema"
      >
        <span className="sr-only">{open ? "Fechar seleção de temas" : "Abrir seleção de temas"}</span>
        <Palette className="h-5 w-5" />
      </button>

      {open && (
        <div
          id="theme-menu"
          role="dialog"
          aria-modal="false"
          className="absolute right-0 top-12 z-40 flex w-80 max-h-[80vh] flex-col rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <header className="border-b border-gray-200 pb-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Temas Essência</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Altere rapidamente entre as paletas clara e escura.
            </p>
          </header>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <section>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Temas claros
              </span>
              <ThemeGrid themes={lightThemes} activeId={theme?.id} onSelect={handleSelect} />
            </section>

            <section className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Temas escuros
              </span>
              <ThemeGrid themes={darkThemes} activeId={theme?.id} onSelect={handleSelect} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeGrid({ themes, activeId, onSelect }) {
  if (!themes.length) {
    return (
      <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Nenhum tema disponível.
      </p>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {themes.map((preset) => {
        const isActive = preset.id === activeId;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            title={preset.description}
            className={`group relative flex flex-col gap-2 rounded-lg border px-2 pb-2 pt-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent-primary),0.4)] dark:focus-visible:ring-white/30 ${
              isActive
                ? "border-[rgba(var(--color-accent-primary),0.6)] ring-1 ring-[rgba(var(--color-accent-primary),0.4)] dark:border-white/40"
                : "border-gray-200 hover:border-[rgba(var(--color-accent-primary),0.5)] hover:bg-[rgba(var(--color-accent-primary),0.05)] dark:border-gray-700 dark:hover:border-white/40 dark:hover:bg-white/5"
            }`}
          >
            <span className="flex h-6 w-full overflow-hidden rounded-md shadow-inner">
              {preset.preview.map((color, index) => (
                <span key={`${preset.id}-color-${index}`} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </span>
            <span className="text-[11px] font-medium text-gray-600 transition group-hover:text-[rgb(var(--color-accent-primary))] dark:text-gray-300 dark:group-hover:text-white">
              {preset.name}
            </span>
            {isActive && <Check className="absolute right-1 top-1 h-4 w-4 text-[rgb(var(--color-accent-primary))] dark:text-white" />}
          </button>
        );
      })}
    </div>
  );
}

// Ícones agora vêm da lucide-react (Palette, Check) — importados no topo.
