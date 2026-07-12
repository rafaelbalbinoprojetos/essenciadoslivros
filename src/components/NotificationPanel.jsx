import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ensureCoverSrc } from "../utils/covers.js";

function NotificationSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/30 p-2.5 dark:border-white/5 dark:bg-white/5">
      <div className="h-16 w-12 flex-none rounded-lg bg-black/10 dark:bg-white/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-2.5 w-1/3 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-2 w-1/2 rounded-full bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}

const NotificationPanel = React.forwardRef(function NotificationPanel(
  { open, loading, error, notifications, onClose, container },
  ref,
) {
  const [mountNode, setMountNode] = React.useState(null);

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const target = container ?? document.body;
    setMountNode(target);
    return undefined;
  }, [container]);

  if (!open || !mountNode) return null;

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-auto fixed right-4 top-24 z-40 w-[22rem] rounded-3xl border border-white/20 bg-[rgba(var(--surface-card),0.97)] p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 md:right-8 md:top-28"
      role="dialog"
      aria-live="polite"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Novidades na biblioteca</p>
          <p className="mt-0.5 text-[11px] text-[rgb(var(--text-subtle))]">Obras adicionadas nos últimos 3 dias</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-xs text-[rgb(var(--text-secondary))] transition hover:bg-white/20"
          aria-label="Fechar notificações"
        >
          ×
        </button>
      </header>

      <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
        {loading ? (
          <>
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </>
        ) : error ? (
          <p className="px-1 text-sm text-red-500">{error}</p>
        ) : notifications?.length ? (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              to={`/biblioteca/${notification.obraId}`}
              onClick={onClose}
              className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/50 p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(var(--color-accent-primary),0.45)] hover:bg-white/85 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="relative flex-none">
                <img
                  src={ensureCoverSrc(notification.capaUrl)}
                  alt={notification.titulo}
                  className="h-16 w-12 rounded-lg object-cover shadow-md ring-1 ring-black/10 transition duration-200 group-hover:ring-[rgba(var(--color-accent-primary),0.5)]"
                />
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[rgb(var(--color-accent-primary))] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-md">
                  Novo
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{notification.titulo}</p>
                <span className="mt-1 inline-block rounded-full bg-[rgba(var(--color-accent-primary),0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--color-accent-dark))] dark:bg-white/10 dark:text-[#cfc2ff]">
                  {notification.tipoObraLabel}
                </span>
                <p className="mt-1 text-[11px] text-[rgb(var(--text-subtle))]">{notification.addedAgoLabel}</p>
              </div>
            </Link>
          ))
        ) : (
          <p className="px-1 py-6 text-center text-sm text-[rgb(var(--text-secondary))]">
            Nenhuma obra nova nos últimos 3 dias.
          </p>
        )}
      </div>

      {notifications?.length ? (
        <Link
          to="/biblioteca"
          onClick={onClose}
          className="mt-3 block rounded-xl px-2 py-1.5 text-center text-xs font-semibold text-[rgb(var(--color-accent-dark))] transition hover:bg-[rgba(var(--color-accent-primary),0.1)] dark:text-[#cfc2ff]"
        >
          Ver biblioteca completa
        </Link>
      ) : null}
    </div>,
    mountNode,
  );
});

export default NotificationPanel;
