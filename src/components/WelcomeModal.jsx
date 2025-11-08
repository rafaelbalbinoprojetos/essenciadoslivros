import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function WelcomeModal({ open, onStart, onSeePlans, onClose }) {
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!open || !portalTarget) {
      return undefined;
    }

    const { overflow } = portalTarget.style;
    portalTarget.style.overflow = "hidden";

    return () => {
      portalTarget.style.overflow = overflow;
    };
  }, [open, portalTarget]);

  if (!portalTarget) return null;
  if (!open) return null;

  const handleRootClick = () => {
    onClose?.();
  };

  const handleDialogClick = (event) => {
    event.stopPropagation();
  };

  const handleCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose?.();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-900/70 px-4 py-8 sm:py-12 backdrop-blur"
      onClick={handleRootClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b1530] via-[#2b1f44] to-[#46356d] text-white shadow-2xl shadow-[#6c63ff]/25"
        onClick={handleDialogClick}
      >
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#6c63ff]/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#b38b59]/25 blur-3xl" aria-hidden="true" />

        <button
          type="button"
          onClick={handleCloseClick}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Fechar boas-vindas"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
            <path strokeWidth="1.6" strokeLinecap="round" d="M6 6l12 12" />
            <path strokeWidth="1.6" strokeLinecap="round" d="M6 18L18 6" />
          </svg>
              </button>

        <div className="relative max-h-[min(90vh,640px)] overflow-y-auto px-8 py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Bem-vindo
          </span>

          <div className="mt-6 space-y-3">
            <h2 id="welcome-modal-title" className="text-2xl font-semibold leading-tight text-white">
              Bem-vindo à Essência dos Livros!
            </h2>
            <p className="text-sm text-[#e6ddff]/80">
              Você está no plano gratuito. Explore 7 dias de teste Premium com resumos inteligentes, audiobooks selecionados e
              curadoria de leitura com IA.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[#e6ddff]/85">
            <p className="font-medium text-white">Durante o teste gratuito você desbloqueia:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Resumos exclusivos com diferentes formatos (rápido, detalhado e insights da IA).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Audiobooks premium para acompanhar sua rotina em qualquer lugar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Assistente literário com recomendações personalizadas e registros ilimitados.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6c63ff] via-[#4c3f8f] to-[#b38b59] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6c63ff]/30 transition hover:from-[#574de3] hover:via-[#3c2f75] hover:to-[#8f683f] sm:w-auto"
            >
              Começar agora
            </button>
            <button
              type="button"
              onClick={onSeePlans}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/35 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Conhecer planos Premium
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#e6ddff]/70">
            Cancelamento simples, sem cartão até o fim do teste. Aproveite para descobrir novas histórias.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
}
