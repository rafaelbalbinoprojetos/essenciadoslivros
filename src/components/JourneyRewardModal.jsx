import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, ArrowRight, X } from "lucide-react";

export default function JourneyRewardModal({ open, reward, userName, onClose, onContinue }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && reward && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#0c0a13]/65 backdrop-blur-sm"
          />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-[rgba(var(--color-accent-primary),0.25)] bg-[rgb(var(--surface-card))] p-7 text-center shadow-[0_50px_120px_-40px_rgba(0,0,0,0.6)]"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[rgb(var(--text-subtle))] transition hover:bg-[rgba(var(--color-accent-primary),0.1)]"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--color-accent-light))] to-[rgb(var(--color-accent-dark))] text-white shadow-[0_20px_40px_-16px_rgba(186,123,79,0.7)]"
              initial={{ scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.05 }}
            >
              <Trophy className="h-10 w-10" />
            </motion.div>

            <h2 className="mt-5 font-display text-2xl font-semibold text-[rgb(var(--text-primary))]">
              Parabéns{userName ? `, ${userName}` : ""}!
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">Você concluiu</p>
            <p className="mt-1 font-display text-lg font-semibold text-[color:rgb(var(--color-accent-dark))]">
              {reward.bookTitle}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[rgba(var(--color-accent-primary),0.14)] px-4 py-1.5 text-sm font-semibold text-[color:rgb(var(--color-accent-dark))]">
              <Sparkles className="h-4 w-4" />
              +{reward.xp} XP
            </div>

            <div className="mt-5 rounded-2xl bg-[rgba(var(--color-accent-primary),0.08)] p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">
                Progresso da jornada
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(var(--color-accent-primary),0.18)]">
                <motion.div
                  className="h-full rounded-full bg-[rgb(var(--color-accent-primary))]"
                  initial={{ width: 0 }}
                  animate={{ width: `${reward.percent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-right text-xs font-semibold text-[rgb(var(--text-secondary))]">{reward.percent}%</p>
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[rgb(var(--color-accent-dark))]"
            >
              {reward.finished ? "Concluir jornada" : "Continuar jornada"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
