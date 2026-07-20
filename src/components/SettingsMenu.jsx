import React from "react";
import { Settings, User, Sparkles, Bell, Shield, RotateCw, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  {
    id: "profile",
    label: "Meu Perfil",
    icon: User,
    description: "Preferências pessoais",
    action: (navigate, helpers) => {
      navigate("/configuracoes?tab=perfil");
      helpers.close();
    },
  },
  {
    id: "plans",
    label: "Planos e upgrade",
    icon: Sparkles,
    description: "Teste Premium e assinatura",
    action: (_navigate, helpers) => {
      helpers.openPlans?.();
      helpers.close();
    },
  },
  {
    id: "notifications",
    label: "Notificações",
    icon: Bell,
    description: "Central de alertas",
    action: (_navigate, helpers) => {
      helpers.openNotifications?.();
      helpers.close();
    },
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    description: "Ajustes de autenticação",
    action: (navigate, helpers) => {
      navigate("/configuracoes?tab=seguranca");
      helpers.close();
    },
  },
];

export default function SettingsMenu({ onSignOut, onReload, onOpenNotifications, onOpenPlans }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  React.useEffect(() => {
    const handleExternalClose = () => setOpen(false);
    window.addEventListener("essencia:close-settings-menu", handleExternalClose);
    return () => window.removeEventListener("essencia:close-settings-menu", handleExternalClose);
  }, []);

  const helpers = React.useMemo(
    () => ({
      close: () => setOpen(false),
      openNotifications: onOpenNotifications,
      openPlans: onOpenPlans,
    }),
    [onOpenNotifications, onOpenPlans],
  );

  const handleReload = () => {
    setOpen(false);
    onReload?.();
  };

  const handleSignOut = () => {
    setOpen(false);
    onSignOut?.();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="settings-menu"
        className={`flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-temaSky dark:hover:text-temaSky ${open ? "ring-2 ring-temaSky/30 dark:ring-temaSky/30" : ""}`}
        title="Abrir configurações do usuário"
      >
        <span className="sr-only">{open ? "Fechar configurações" : "Abrir configurações"}</span>
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div
          id="settings-menu"
          role="dialog"
          aria-modal="false"
          aria-label="Configurações"
          className="absolute right-0 top-12 z-40 flex w-80 max-h-[80vh] flex-col rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <header className="border-b border-gray-200 pb-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Configurações</p>
          </header>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {MENU_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.action(navigate, helpers)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition hover:border-temaSky/50 hover:bg-temaSky/10 hover:text-temaSky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:hover:border-temaSky/50 dark:hover:bg-temaSky/10 dark:hover:text-temaSky dark:focus-visible:ring-temaSky/40"
                  >
                    <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

          </div>

          <footer className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-800">
            <button
              type="button"
              onClick={handleReload}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-temaSky transition hover:bg-temaSky/10 hover:text-temaSky/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:text-temaSky dark:hover:bg-temaSky/10 dark:hover:text-temaSky/90 dark:focus-visible:ring-temaSky/40"
            >
              <RotateCw className="h-4 w-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-rose-500 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-rose-400 dark:hover:bg-rose-400/10"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

// Ícones agora vêm da lucide-react (Settings, User, Sparkles, Bell, Shield,
// RotateCw, LogOut) — importados no topo.
