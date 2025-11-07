import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import SettingsMenu from "../components/SettingsMenu.jsx";
import WelcomeModal from "../components/WelcomeModal.jsx";
import PremiumPlansModal from "../components/PremiumPlansModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { NAV_LINKS, normalizeMobileNavSelection } from "../data/navigation.js";
import { DEFAULT_PLAN_ID } from "../data/plans.js";

const BRAND_NAME = "Essência dos Livros";
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const SUBSCRIPTION_ENDPOINT = `${API_BASE}/api/mercadopago/subscription`;
const METRICS_LOOKBACK_DAYS = 14;

const ICON_MAP = {
  dashboard: DashboardIcon,
  library: LibraryIcon,
  catalog: LibraryIcon,
  assistant: AssistantIcon,
  settings: SettingsIcon,
};

const NAV_ITEMS = NAV_LINKS.map((link) => ({
  ...link,
  icon: ICON_MAP[link.id] ?? DashboardIcon,
}));

const NAV_ITEMS_BY_PATH = new Map(NAV_ITEMS.map((item) => [item.to, item]));

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, updateUserMetadata } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const notificationContainerRef = React.useRef(null);

  const userMetadata = user?.user_metadata ?? {};
  const subscriptionTier = userMetadata.subscription_tier ?? userMetadata.plan ?? "free";
  const trialStatus = userMetadata.trial_status ?? "eligible";
  const trialEndsAt = userMetadata.trial_expires_at ? new Date(userMetadata.trial_expires_at) : null;
  const trialExpired = Boolean(trialEndsAt) && trialEndsAt.getTime() <= Date.now();
  const trialActive = trialStatus === "active" && Boolean(trialEndsAt) && !trialExpired;
  const onboardingComplete =
    userMetadata.completed_reading_onboarding ?? userMetadata.has_seen_welcome === true ?? false;
  const mobileNavPreference = userMetadata.mobile_nav_paths;

  const mobileNavItems = useMemo(() => {
    const paths = normalizeMobileNavSelection(mobileNavPreference);
    return paths.map((path) => NAV_ITEMS_BY_PATH.get(path)).filter(Boolean);
  }, [mobileNavPreference]);

  useEffect(() => {
    setWelcomeOpen(Boolean(user) && !onboardingComplete);
  }, [user, onboardingComplete]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const sampleMessages = [
      {
        id: `library-welcome-${user.id}`,
        type: "info",
        title: "Bem-vindo à Essência dos Livros",
        message: "Use o cadastro para adicionar novos títulos e acompanhar as leituras da sua comunidade.",
        time: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      },
    ];
    setNotifications(sampleMessages);
    setNotificationsError(null);
    setNotificationsLoading(false);
  }, [user, refreshVersion]);

  useEffect(() => {
    function handleOpenPlans() {
      setPlansOpen(true);
    }

    window.addEventListener("essencia:open-plans", handleOpenPlans);
    return () => window.removeEventListener("essencia:open-plans", handleOpenPlans);
  }, []);

  useEffect(() => {
    if (!updateUserMetadata || !user) return undefined;

    if (trialStatus === "active" && trialExpired) {
      updateUserMetadata({ trial_status: "expired" }).catch((error) => {
        console.error("[layout] Erro ao atualizar status do teste:", error);
      });
    }

    return undefined;
  }, [trialExpired, trialStatus, updateUserMetadata, user]);

  const handleCloseWelcome = useCallback(() => setWelcomeOpen(false), []);

  const handleStartOnboarding = useCallback(async () => {
    setWelcomeOpen(false);
    if (user && updateUserMetadata) {
      try {
        await updateUserMetadata({ completed_reading_onboarding: true, has_seen_welcome: true });
      } catch (error) {
        console.error("[layout] Erro ao confirmar onboarding:", error);
      }
    }
  }, [updateUserMetadata, user]);

  const handleSeePlans = useCallback(() => {
    setWelcomeOpen(false);
    setPlansOpen(true);
  }, []);

  const handleClosePlans = useCallback(() => {
    setPlansOpen(false);
    setSubscribingPlan(null);
  }, []);

  const handleOpenNotifications = useCallback(() => {
    setNotificationsOpen(true);
    setMenuOpen(false);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen((previous) => {
      const next = !previous;
      if (next) {
        const event = new CustomEvent("essencia:close-settings-menu");
        window.dispatchEvent(event);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (!notificationContainerRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [notificationsOpen]);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success("Até logo! Esperamos você para a próxima leitura.");
      navigate("/login");
    } catch (error) {
      toast.error(error?.message ?? "Não foi possível sair da conta agora.");
    }
  }, [navigate, signOut]);

  const handleAutomaticSubscription = useCallback(
    async (selectedPlan = DEFAULT_PLAN_ID) => {
      if (!user) {
        toast.error("Faça login para concluir a assinatura.");
        return;
      }

      try {
        toast.loading("Redirecionando para o Mercado Pago...", { id: "subscription" });

        const response = await fetch(SUBSCRIPTION_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            userId: user.id,
            email: user.email,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Não foi possível criar a assinatura agora.");
        }

        const payload = await response.json();
        toast.dismiss("subscription");

        if (payload.checkoutUrl) {
          window.location.href = payload.checkoutUrl;
          return;
        }

        toast.success("Assinatura criada! Verifique seu email para concluir o processo.");
      } catch (error) {
        toast.dismiss("subscription");
        toast.error(error?.message ?? "Erro inesperado ao criar a assinatura.");
        console.error("[layout] Erro ao criar assinatura automática:", error);
      }
    },
    [user],
  );

  const handleSubscribe = useCallback(
    (planId) => {
      setSubscribingPlan(planId);
      handleAutomaticSubscription(planId);
    },
    [handleAutomaticSubscription],
  );

  return (
    <div className="relative min-h-screen bg-essencia-radiance pb-20 md:flex md:pb-0">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "rounded-xl border border-white/40 bg-[#fffcf7]/95 px-4 py-3 text-sm text-[#1f2933] shadow-lg backdrop-blur",
        }}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[18rem] transform border-r border-white/40 bg-[#fffcf7]/90 backdrop-blur-md transition-transform duration-300 dark:border-white/10 dark:bg-slate-900/90 md:sticky md:top-0 md:inset-auto md:self-start md:z-20 md:h-screen md:w-[19rem] md:flex-shrink-0 md:translate-x-0 md:rounded-none md:bg-[#fffcf7]/85 md:shadow-none md:dark:bg-slate-900/85 lg:w-[21rem] ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between border-b border-white/35 px-5 py-4 dark:border-white/10">
          <div>
            <span className="text-xs uppercase tracking-[0.28em] text-[#7a6c5e]/70 dark:text-[#cfc2ff]/60">
              Plataforma de Leitura
            </span>
            <h1 className="mt-2 text-xl font-semibold text-[#1f2933] dark:text-[#f8f6ff]">{BRAND_NAME}</h1>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-[#7a6c5e] transition hover:bg-[#f2ede4]/80 hover:text-[#6c63ff] md:hidden"
            aria-label="Fechar navegação"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="sidebar-nav flex flex-col gap-1 px-3 py-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "sidebar-link group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition duration-200",
                  isActive
                    ? "sidebar-link--active text-[#4c3f8f] shadow-sm dark:text-[#cfc2ff]"
                    : "text-[#4b3f35]/80 hover:bg-[#f2ede4] hover:text-[#4c3f8f] dark:text-[#a89fc1] dark:hover:bg-white/5 dark:hover:text-white",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={() => setMenuOpen(false)}
            >
              {React.createElement(item.icon, {
                className: "h-5 w-5 flex-shrink-0",
              })}
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                {item.description ? (
                  <span className="text-xs text-[#7a6c5e]/70 dark:text-[#cfc2ff]/70">{item.description}</span>
                ) : null}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 px-5 pb-6">
          <div className="rounded-2xl border border-[#cdb18c]/30 bg-[#f2ede4]/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
            <span className="text-xs uppercase tracking-[0.28em] text-[#b38b59] dark:text-[#cfc2ff]">Plano</span>
            <p className="mt-2 text-base font-semibold text-[#4b3f35] dark:text-white">
              {subscriptionTier === "premium" ? "Essência Premium" : "Essência Free"}
            </p>
            {trialActive && trialEndsAt ? (
              <p className="mt-1 text-xs text-[#7a6c5e]/80 dark:text-[#cfc2ff]/80">
                Teste termina em {formatTrialCountdown(trialEndsAt)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setPlansOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#6c63ff] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4c3f8f]"
            >
              Explorar benefícios
            </button>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6c63ff]/20 bg-white/70 px-3 py-2 text-sm font-semibold text-[#4c3f8f] transition hover:border-[#6c63ff]/40 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:border-white/30"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          aria-label="Fechar navegação lateral"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="relative flex min-h-screen flex-1 flex-col bg-[rgb(var(--surface-base))]/95 backdrop-blur transition-[padding] md:ml-0">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-[rgb(var(--surface-card))]/90 backdrop-blur-md dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:flex-nowrap md:gap-6 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-[#6c63ff]/20 bg-white/80 p-2 text-[#4b3f35] transition hover:border-[#6c63ff]/40 hover:text-[#4c3f8f] md:hidden"
                  aria-label="Abrir navegação principal"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#7a6c5e]/70 dark:text-[#cfc2ff]/70">Bem-vindo</p>
                  <h2 className="text-lg font-semibold text-[#1f2933] dark:text-white">
                    {location.pathname === "/"
                      ? "Panorama da sua leitura"
                      : NAV_ITEMS_BY_PATH.get(location.pathname)?.label}
                  </h2>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end md:gap-3">
                <form className="hidden min-w-[220px] flex-1 items-center md:flex">
                  <div className="relative flex w-full items-center">
                    <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-[#7a6c5e]/70" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Busque por livros, resumos ou autores"
                      className="w-full rounded-xl border border-[#cdb18c]/40 bg-white py-2 pl-9 pr-4 text-sm text-[#1f2933] shadow-sm outline-none transition focus:border-[#6c63ff]/60 focus:ring-2 focus:ring-[#6c63ff]/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                    />
                  </div>
                </form>

                <div className="flex items-center justify-end gap-2 md:flex-none">
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#6c63ff]/25 bg-white text-[#4b3f35] shadow-sm transition hover:border-[#6c63ff]/45 hover:text-[#4c3f8f] dark:border-white/10 dark:bg-slate-900 dark:text-white ${notificationsOpen ? "ring-2 ring-[#6c63ff]/30 dark:ring-white/20" : ""}`}
                    aria-label="Abrir notificações"
                  >
                    <BellIcon className="h-5 w-5" />
                    {notifications.length > 0 ? (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#6c63ff] text-[11px] font-semibold text-white shadow">
                        {notifications.length}
                      </span>
                    ) : null}
                  </button>

                  <SettingsMenu
                    onSignOut={handleSignOut}
                    onReload={handleRefresh}
                    onOpenNotifications={handleOpenNotifications}
                    onOpenPlans={() => setPlansOpen(true)}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="relative flex flex-1 flex-col" ref={notificationContainerRef}>
            <NotificationPanel
              open={notificationsOpen}
              loading={notificationsLoading}
              error={notificationsError}
              notifications={notifications}
              onClose={handleCloseNotifications}
            />

            <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-8 bg-[rgb(var(--surface-base))]">
              <Outlet />
            </main>

        </div>

        <WelcomeModal
          open={welcomeOpen}
          onStart={handleStartOnboarding}
          onSeePlans={handleSeePlans}
          onClose={handleCloseWelcome}
        />

        <PremiumPlansModal
          open={plansOpen}
          onClose={handleClosePlans}
          onSubscribe={handleSubscribe}
          subscribingPlanId={subscribingPlan}
          hasPremiumAccess={subscriptionTier === "premium" || trialActive}
          currentPlanId={subscriptionTier}
          trialActive={trialActive}
          trialEndsAt={trialEndsAt}
        />
      </div>
      {(mobileNavItems.length || NAV_ITEMS.length) && (
        <nav className="pointer-events-auto md:hidden fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-t-3xl border border-[#6c63ff]/20 border-b-0 bg-white/95 px-4 py-3 shadow-[0_-20px_45px_-35px_rgba(108,99,255,0.5)] backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
            {(mobileNavItems.length ? mobileNavItems : NAV_ITEMS).map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              const itemColor = isActive
                ? "rgb(var(--color-accent-primary))"
                : "var(--text-secondary)";
              const iconColor = isActive
                ? "rgb(var(--color-accent-primary))"
                : "var(--text-subtle)";
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(var(--color-accent-primary),0.25)]"
                  style={{ color: itemColor }}
                >
                  {React.createElement(item.icon, {
                    className: "h-5 w-5",
                    style: { color: iconColor },
                  })}
                  <span>{item.shortLabel ?? item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function computeLibraryMetrics({ readingEntries = [], annotations = [], collections = [], listeningEntries = [] }) {
  const now = new Date();
  const lookback = new Date(now);
  lookback.setDate(lookback.getDate() - METRICS_LOOKBACK_DAYS);

  const readingSessions = readingEntries.map((entry) => {
    const startedAt = entry.date ?? entry.start_time ?? entry.created_at ?? null;
    return {
      id: entry.id ?? randomId(),
      title: entry.description ?? entry.title ?? entry.origin ?? "Sessão de leitura",
      startedAt: startedAt ? new Date(startedAt) : null,
      minutes: inferMinutes(entry),
    };
  });

  const highlights = annotations.map((annotation) => ({
    id: annotation.id ?? randomId(),
    title: annotation.description ?? annotation.category ?? "Nota salva",
    taggedAt: annotation.date
      ? new Date(annotation.date)
      : annotation.created_at
        ? new Date(annotation.created_at)
        : null,
    category: annotation.category ?? annotation.type ?? null,
  }));

  const processedCollections = (collections ?? []).map((item) => ({
    id: item.id ?? randomId(),
    bookId: item.book_id ?? item.ativo_symbol ?? item.symbol ?? item.id ?? randomId(),
    title: item.title ?? item.nome ?? item.asset_name ?? "Livro em andamento",
    addedAt: item.inserted_at ? new Date(item.inserted_at) : item.created_at ? new Date(item.created_at) : null,
    progress: Number(item.progress_percent ?? item.progress ?? 0),
  }));

  const listeningSessions = listeningEntries.map((entry) => {
    const start = entry.start_time ? new Date(entry.start_time) : null;
    const end = entry.end_time ? new Date(entry.end_time) : null;
    let minutes = 0;
    if (start && end && end > start) {
      minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    } else if (Number.isFinite(entry.total_minutes)) {
      minutes = Number(entry.total_minutes);
    }
    return {
      id: entry.id ?? randomId(),
      start,
      end,
      minutes,
      label: entry.description ?? entry.origin ?? "Sessão de escuta",
    };
  });

  const recentSessions = readingSessions.filter((session) => session.startedAt && session.startedAt >= lookback);
  const recentHighlights = highlights.filter((highlight) => highlight.taggedAt && highlight.taggedAt >= lookback);
  const recentCollections = processedCollections.filter(
    (collection) => collection.addedAt && collection.addedAt >= lookback,
  );

  const readingMinutes = readingSessions.reduce((total, session) => total + session.minutes, 0);
  const listeningMinutes = listeningSessions.reduce((total, session) => total + session.minutes, 0);
  const highlightCount = highlights.length;
  const activeBooks = new Set(processedCollections.map((collection) => collection.bookId)).size;
  const streakDays = computeReadingStreak(readingSessions);
  const totalSessions = readingSessions.length;

  const lastSession = readingSessions
    .filter((session) => session.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
    .at(0);

  return {
    readingMinutes,
    listeningMinutes,
    highlightCount,
    activeBooks,
    streakDays,
    totalSessions,
    recentSessions,
    recentHighlights,
    recentCollections,
    lastSession,
  };
}

function inferMinutes(entry) {
  if (!entry) return 0;
  const numericFields = [
    entry.minutes,
    entry.duration_minutes,
    entry.total_minutes,
    entry.duration,
    entry.amount,
  ];
  const numericValue = numericFields.find((value) => Number.isFinite(value));
  if (numericValue !== undefined) {
    return Number(numericValue);
  }

  const start = entry.start_time ? new Date(entry.start_time) : null;
  const end = entry.end_time ? new Date(entry.end_time) : null;
  if (start && end && end > start) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
  return 0;
}

function computeReadingStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const dates = new Set(
    sessions
      .filter((session) => session.startedAt)
      .map((session) => session.startedAt.toISOString().slice(0, 10)),
  );

  if (dates.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  while (streak <= dates.size) {
    const key = cursor.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak += 1;
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildLiteraryNotifications({ userId, metrics }) {
  const entries = [];
  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  if (metrics.recentCollections.length > 0) {
    const newest = metrics.recentCollections[0];
    entries.push({
      id: `collection-${userId}-${newest.id}`,
      type: "info",
      title: "Novo livro na estante",
      message: `Você adicionou "${newest.title}" recentemente. Que tal iniciar a leitura hoje?`,
      time: timeLabel,
    });
  }

  if (metrics.recentHighlights.length > 0) {
    entries.push({
      id: `highlight-${userId}-${metrics.recentHighlights[0].id}`,
      type: "success",
      title: "Insights fresquinhos",
      message: `Foram registradas ${metrics.recentHighlights.length} novas notas e destaques nos últimos dias.`,
      time: timeLabel,
    });
  }

  if (metrics.streakDays >= 3) {
    entries.push({
      id: `streak-${userId}`,
      type: "success",
      title: "Ritmo consistente",
      message: `Sua sequência de leitura está em ${metrics.streakDays} dias. Continue assim e desbloqueie novas recomendações.`,
      time: timeLabel,
    });
  }

  if (metrics.listeningMinutes === 0 && metrics.readingMinutes > 0) {
    entries.push({
      id: `audio-suggestion-${userId}`,
      type: "info",
      title: "Experimente um audiobook",
      message: "Transforme leituras em momentos de escuta. Experimente um audiobook da sua estante.",
      time: timeLabel,
    });
  }

  if (entries.length === 0) {
    entries.push({
      id: `welcome-${userId}`,
      type: "info",
      title: "Comece explorando a biblioteca",
      message: "Adicione livros, salve resumos e deixe que a IA sugira conteúdos alinhados ao seu estilo.",
      time: timeLabel,
    });
  }

  return entries;
}

function formatTrialCountdown(date) {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "encerrou";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function NotificationPanel({ open, loading, error, notifications, onClose }) {
  if (!open) return null;

  return (
    <div className="absolute right-4 top-4 z-30 w-[min(100%,360px)] max-w-full rounded-3xl border border-[#6c63ff]/15 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
      <div className="flex items-center justify-between border-b border-[#cdb18c]/30 pb-3 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-[#1f2933] dark:text-white">Atualizações da biblioteca</h3>
          <p className="text-xs text-[#7a6c5e]/70 dark:text-[#cfc2ff]/70">
            Sugestões e conquistas personalizadas para o seu momento de leitura.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-[#7a6c5e]/70 transition hover:bg-[#f2ede4]/80 hover:text-[#4c3f8f] dark:hover:bg-white/10"
          aria-label="Fechar notificações"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3">
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#b38b59]/30 bg-[#f9f5ef] p-4 text-sm text-[#4b3f35] dark:border-white/10 dark:bg-white/5 dark:text-white">
            {error}
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="rounded-xl border border-[#6c63ff]/15 bg-white/80 p-4 shadow-sm transition hover:border-[#6c63ff]/30 hover:shadow-md dark:border-white/10 dark:bg-slate-900/80"
            >
              <span className="text-xs uppercase tracking-[0.24em] text-[#7a6c5e]/70 dark:text-[#cfc2ff]/70">
                {notification.time}
              </span>
              <p className="mt-1 text-sm font-semibold text-[#1f2933] dark:text-white">{notification.title}</p>
              <p className="mt-1 text-sm text-[#7a6c5e]/80 dark:text-[#cfc2ff]/80">{notification.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[#6c63ff]/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/70">
      <div className="h-3 w-20 rounded bg-[#cfc2ff]/50 dark:bg-white/20" />
      <div className="mt-2 h-4 w-40 rounded bg-[#cfc2ff]/60 dark:bg-white/30" />
      <div className="mt-2 h-3 w-56 rounded bg-[#cfc2ff]/30 dark:bg-white/10" />
    </div>
  );
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function DashboardIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.25 3A2.25 2.25 0 009 5.25v13.5A2.25 2.25 0 0011.25 21h1.5A2.25 2.25 0 0015 18.75V5.25A2.25 2.25 0 0012.75 3z" />
      <path d="M4.5 6.75A2.25 2.25 0 016.75 4.5H7.5v15h-.75A2.25 2.25 0 014.5 17.25zM16.5 6.75A2.25 2.25 0 0118.75 4.5H19.5v15h-.75A2.25 2.25 0 0116.5 17.25z" />
    </svg>
  );
}

function ReadingIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 4.75A2.75 2.75 0 017.75 2h8.5A2.75 2.75 0 0119 4.75V21a.75.75 0 01-1.19.6L12 17.21l-5.81 4.39A.75.75 0 015 21z" />
    </svg>
  );
}

function SummaryIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5.25 3A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h8.5A2.25 2.25 0 0016 18.75V15.5h2.75A2.25 2.25 0 0021 13.25v-8A2.25 2.25 0 0018.75 3zm2.5 3.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3.5h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3.5H12a.75.75 0 010 1.5H7.75a.75.75 0 010-1.5z" />
      <path d="M16 4.5v9.25a.75.75 0 00.75.75H20.5z" />
    </svg>
  );
}

function AudioIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.75 3A2.75 2.75 0 004 5.75v12.5A2.75 2.75 0 006.75 21h1.5A2.75 2.75 0 0011 18.25v-12.5A2.75 2.75 0 008.25 3zm9 0A2.75 2.75 0 0013 5.75v12.5A2.75 2.75 0 0015.75 21h1.5A2.75 2.75 0 0020 18.25v-12.5A2.75 2.75 0 0017.25 3z" />
    </svg>
  );
}

function DiscoverIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm4.37 5.63l-1.6 5.46a1.25 1.25 0 01-.88.87l-5.46 1.6a.25.25 0 01-.31-.31l1.6-5.46a1.25 1.25 0 01.87-.88l5.46-1.6a.25.25 0 01.31.31z" />
    </svg>
  );
}

function AssistantIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.5 3A1.5 1.5 0 003 4.5v9A1.5 1.5 0 004.5 15H6v3.25a.75.75 0 001.22.58l3.8-3.18H16.5A1.5 1.5 0 0018 14.25v-9A1.5 1.5 0 0016.5 3z" />
      <path d="M19.5 6.75A1.5 1.5 0 0021 5.25v-1.5A1.5 1.5 0 0019.5 2H8.25a1.5 1.5 0 00-1.5 1.5V4.5a1.5 1.5 0 001.5 1.5zm-6.75 6.75a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v1.5a.75.75 0 01-.75.75zm4.5 0a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v1.5a.75.75 0 01-.75.75z" />
    </svg>
  );
}

function LibraryIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.25 4A2.25 2.25 0 004 6.25v11.5A2.25 2.25 0 006.25 20H9.5V4zm8.25 0v16h3.25A2.25 2.25 0 0020 17.75V6.25A2.25 2.25 0 0017.75 4z" />
      <path d="M11 4h2v16h-2z" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.303 1.518a1.75 1.75 0 011.394 0l1.41.582a1.75 1.75 0 012.09-.454l1.3.6a1.75 1.75 0 01.93 2.12l-.42 1.41a1.74 1.74 0 010 .894l.42 1.41a1.75 1.75 0 01-.93 2.12l-1.3.6a1.75 1.75 0 01-2.09-.455l-1.41.582a1.75 1.75 0 01-1.394 0l-1.41-.582a1.75 1.75 0 01-2.09.455l-1.3-.6a1.75 1.75 0 01-.93-2.12l.42-1.41a1.74 1.74 0 010-.894l-.42-1.41a1.75 1.75 0 01.93-2.12l1.3-.6a1.75 1.75 0 012.09.455l1.41-.582zM12 9.25a2.25 2.25 0 102.25 2.25A2.25 2.25 0 0012 9.25zm-6.5 4.5a.75.75 0 01.75.75v1.14a2.25 2.25 0 001.11 1.94l.99.57a2.25 2.25 0 001.98.05l1.25-.52.62 1.48a1.75 1.75 0 01-.83 2.18l-1.1.57a1.75 1.75 0 01-2.09-.45l-1.41.58a1.75 1.75 0 01-1.39 0l-1.41-.58a1.75 1.75 0 01-2.09.45l-1.1-.57a1.75 1.75 0 01-.83-2.18l.62-1.48-1.25-.52a2.25 2.25 0 01-1.98-.05l-.99-.57a2.25 2.25 0 01-1.11-1.94v-1.14a.75.75 0 01.75-.75h1.14a2.25 2.25 0 001.94-1.11l.57-.99a2.25 2.25 0 01.05-1.98l.52-1.25 1.48.62a1.75 1.75 0 002.18-.83l.57-1.1a1.75 1.75 0 012.18-.83l1.48.62-.52 1.25a2.25 2.25 0 01.05 1.98l-.57.99a2.25 2.25 0 001.94 1.11h1.14z" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a6 6 0 00-6 6v2.586c0 .414-.168.81-.469 1.098l-.97.97A1.5 1.5 0 006 15h12a1.5 1.5 0 001.06-2.56l-.97-.97A1.5 1.5 0 0018 10.586V8a6 6 0 00-6-6z" />
      <path d="M10.25 18.75a1.75 1.75 0 003.5 0z" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M11 19a8 8 0 118-8" />
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-2.6-2.6" />
    </svg>
  );
}

function MenuIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 6.75A.75.75 0 014.75 6h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 6.75zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 12zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      <path strokeWidth="1.7" strokeLinecap="round" d="M6 6l12 12" />
      <path strokeWidth="1.7" strokeLinecap="round" d="M6 18L18 6" />
    </svg>
  );
}
