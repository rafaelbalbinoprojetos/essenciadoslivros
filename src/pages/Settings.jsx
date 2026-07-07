import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import {
  DEFAULT_MOBILE_NAV_PATHS,
  MOBILE_NAV_LINKS,
  sanitizeMobileNavSelection,
} from "../data/navigation.js";

export default function SettingsPage() {
  const { user, updateUserMetadata } = useAuth();
  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);
  const plan = metadata.plan ?? "free";
  const trialStatus = metadata.trial_status ?? "eligible";
  const trialEndsAt = metadata.trial_expires_at ? new Date(metadata.trial_expires_at) : null;
  const trialExpired = trialEndsAt ? trialEndsAt.getTime() <= Date.now() : false;
  const trialActive = trialStatus === "active" && !trialExpired;
  const hasPremiumAccess = plan === "premium" || trialActive;
  const canStartTrial = !hasPremiumAccess && (!trialStatus || trialStatus === "eligible");

  const storedMobileNav = useMemo(() => {
    const sanitized = sanitizeMobileNavSelection(metadata.mobile_nav_paths);
    return sanitized.length > 0 ? sanitized : DEFAULT_MOBILE_NAV_PATHS;
  }, [metadata]);

  const alertMetadata = useMemo(() => metadata.alert_preferences ?? {}, [metadata]);
  const initialAlerts = useMemo(
    () => ({ showToasts: alertMetadata.show_toasts !== false }),
    [alertMetadata],
  );

  const initialDisplayName = metadata.display_name ?? metadata.full_name ?? "";

  // --- Perfil ---
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [profileSaving, setProfileSaving] = useState(false);
  const profileDirty = displayName.trim() !== initialDisplayName.trim();

  // --- Menu inferior (mobile) ---
  const [mobileNavSelection, setMobileNavSelection] = useState(storedMobileNav);
  const [mobileNavSaving, setMobileNavSaving] = useState(false);
  const mobileNavSelectionSet = useMemo(() => new Set(mobileNavSelection), [mobileNavSelection]);
  const mobileNavDirty = useMemo(() => {
    if (storedMobileNav.length !== mobileNavSelection.length) return true;
    return storedMobileNav.some((path, index) => path !== mobileNavSelection[index]);
  }, [mobileNavSelection, storedMobileNav]);

  // --- Notificações ---
  const [alertsForm, setAlertsForm] = useState(() => ({ showToasts: initialAlerts.showToasts }));
  const [alertsSaving, setAlertsSaving] = useState(false);
  const alertsDirty = useMemo(() => alertsForm.showToasts !== initialAlerts.showToasts, [alertsForm, initialAlerts]);

  useEffect(() => {
    setMobileNavSelection(storedMobileNav);
  }, [storedMobileNav]);
  useEffect(() => {
    setAlertsForm({ showToasts: initialAlerts.showToasts });
  }, [initialAlerts.showToasts]);
  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  const handleToggleMobileNav = (path) => {
    let blocked = false;
    setMobileNavSelection((prev) => {
      const exists = prev.includes(path);
      if (exists) {
        if (prev.length <= 1) {
          blocked = true;
          return prev;
        }
        const next = prev.filter((value) => value !== path);
        const sanitized = sanitizeMobileNavSelection(next);
        return sanitized.length > 0 ? sanitized : prev;
      }
      return sanitizeMobileNavSelection([...prev, path]);
    });
    if (blocked) {
      toast.error("Selecione pelo menos um atalho.");
    }
  };

  const handleAlertsToggle = () => {
    setAlertsForm((prev) => ({ showToasts: !prev.showToasts }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!profileDirty || !updateUserMetadata) return;
    try {
      setProfileSaving(true);
      await updateUserMetadata({ display_name: displayName.trim() });
      toast.success("Preferências de conta atualizadas.");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Não foi possível salvar agora.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveAlerts = async (event) => {
    event.preventDefault();
    if (!alertsDirty || !updateUserMetadata) return;
    try {
      setAlertsSaving(true);
      await updateUserMetadata({ alert_preferences: { show_toasts: alertsForm.showToasts } });
      toast.success("Preferências de notificação atualizadas.");
    } catch (error) {
      console.error("Erro ao salvar notificações:", error);
      toast.error("Não foi possível atualizar as notificações agora.");
    } finally {
      setAlertsSaving(false);
    }
  };

  const handleResetMobileNav = () => {
    setMobileNavSelection(DEFAULT_MOBILE_NAV_PATHS);
  };

  const handleSaveMobileNav = async (event) => {
    event.preventDefault();
    if (!mobileNavDirty || !updateUserMetadata) return;
    const sanitized = sanitizeMobileNavSelection(mobileNavSelection);
    if (sanitized.length === 0) {
      toast.error("Selecione pelo menos um atalho.");
      return;
    }
    try {
      setMobileNavSaving(true);
      await updateUserMetadata({ mobile_nav_paths: sanitized });
      toast.success("Preferências do menu inferior atualizadas.");
    } catch (error) {
      console.error("Erro ao salvar menu mobile:", error);
      toast.error("Não foi possível salvar as preferências agora.");
    } finally {
      setMobileNavSaving(false);
    }
  };

  const openPlans = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("essencia:open-plans"));
    }
  };

  const activateTrial = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("essencia:activate-trial"));
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ajuste seu perfil, notificações e preferências de leitura.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSaveProfile}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferências de conta</h2>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome de exibição
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Como você quer ser chamado"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email da conta
              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-400"
              />
            </label>
            <button
              type="submit"
              disabled={profileSaving || !profileDirty}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-transparent bg-temaSky px-4 py-2 text-sm font-semibold text-white transition hover:bg-temaSky-dark disabled:cursor-not-allowed disabled:opacity-60 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark"
            >
              {profileSaving ? "Salvando..." : "Salvar preferências"}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sua experiência de leitura</h2>
          <ul className="mt-4 space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-amber-500" aria-hidden="true" />
              Receba destaques e citações da curadoria Essência direto no seu painel.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-violet-500" aria-hidden="true" />
              O assistente literário sugere leituras com base no seu histórico e coleções.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-emerald-500" aria-hidden="true" />
              Seu progresso de leitura e escuta fica sincronizado em todos os dispositivos.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form className="flex flex-col gap-6" onSubmit={handleSaveMobileNav}>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu inferior (mobile)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Escolha os atalhos exibidos no menu inferior em dispositivos móveis. Pelo menos um item deve permanecer ativo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MOBILE_NAV_LINKS.map((link) => {
              const checked = mobileNavSelectionSet.has(link.to);
              return (
                <label
                  key={link.to}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                    checked
                      ? "border-temaSky/60 bg-temaSky/5 text-temaSky dark:border-temaEmerald/60 dark:bg-temaEmerald/10 dark:text-temaEmerald"
                      : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-temaSky focus:ring-temaSky dark:border-gray-600 dark:bg-gray-900 dark:text-temaEmerald dark:focus:ring-temaEmerald"
                    checked={checked}
                    onChange={() => handleToggleMobileNav(link.to)}
                  />
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{link.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Atalho: {link.shortLabel}</span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mobileNavSelection.length}{" "}
              {mobileNavSelection.length === 1 ? "atalho selecionado" : "atalhos selecionados"}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResetMobileNav}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/30 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-temaEmerald/30"
                disabled={mobileNavSaving || (mobileNavSelection.length === DEFAULT_MOBILE_NAV_PATHS.length &&
                  mobileNavSelection.every((path, index) => path === DEFAULT_MOBILE_NAV_PATHS[index]))}
              >
                Restaurar padrão
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-temaSky px-4 py-2 text-xs font-semibold text-white transition hover:bg-temaSky-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
                disabled={mobileNavSaving || !mobileNavDirty}
              >
                {mobileNavSaving ? "Salvando..." : "Salvar menu"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form className="flex flex-col gap-6" onSubmit={handleSaveAlerts}>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notificações</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ative ou desative avisos rápidos exibidos na tela enquanto você navega pela Essência.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mostrar avisos via toast</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Quando habilitado, mensagens de confirmação e novidades aparecem brevemente na tela.
              </p>
            </div>
            <label className="relative inline-flex h-6 w-12 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={alertsForm.showToasts}
                onChange={handleAlertsToggle}
              />
              <span className="h-6 w-12 rounded-full bg-gray-300 transition peer-checked:bg-temaSky dark:bg-gray-700 dark:peer-checked:bg-temaEmerald" />
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-6" />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-temaSky px-4 py-2 text-xs font-semibold text-white transition hover:bg-temaSky-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
              disabled={alertsSaving || !alertsDirty}
            >
              {alertsSaving ? "Salvando..." : "Salvar notificações"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/60 text-emerald-500 dark:bg-emerald-900/40">
              <span className="text-xl" aria-hidden="true">
                🔒
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Recursos Premium</h2>
              <p className="text-sm leading-relaxed">
                Desbloqueie a experiência completa da Essência: resumos inteligentes em vários formatos, audiobooks premium
                e o assistente literário sem limites.
              </p>
              <ul className="space-y-1 text-xs text-emerald-700/90 dark:text-emerald-200/80">
                <li>• Resumos em texto e áudio com curadoria atualizada semanalmente.</li>
                <li>• Audiobooks premium com sincronização de progresso e download temporário.</li>
                <li>• Assistente literário ilimitado com recomendações e roteiros de leitura.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-none flex-col gap-2">
            {hasPremiumAccess ? (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                {plan === "premium" ? "Plano Premium ativo" : "teste Premium em andamento"}
              </span>
            ) : (
              <>
                {canStartTrial && (
                  <button
                    type="button"
                    onClick={activateTrial}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  >
                    testar Premium por 7 dias
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPlans}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/70 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                >
                  Ver planos Premium
                </button>
                {!canStartTrial && !hasPremiumAccess && (
                  <span className="text-[11px] text-emerald-600/80 dark:text-emerald-200/80">
                    Seu período de teste já foi utilizado. Faça upgrade quando estiver pronto.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
